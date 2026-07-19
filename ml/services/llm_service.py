import os
import openai
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self, default_provider="gemini"):
        self.default_provider = default_provider
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
        self.gemini_fallback_model = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.1-flash-lite")
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
            
        self._gemini_client = None
        if self.gemini_api_key:
            from google import genai
            self._gemini_client = genai.Client(api_key=self.gemini_api_key)

    def generate_response(self, system_prompt: str, user_message: str, chat_history: list = None, provider: str = None, 
                          db=None, user_id: int = None, feature: str = "Unknown") -> str:
        """
        Abstracted method to generate an LLM response and optionally log usage.
        """
        import time
        start_time = time.time()
        
        if not provider:
            provider = self.default_provider
            
        result = {
            "text": "Error: Unsupported provider",
            "model": provider,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "status": "error"
        }
            
        try:
            if provider == "openai":
                result = self._call_openai(system_prompt, user_message, chat_history)
            elif provider == "gemini":
                result = self._call_gemini(system_prompt, user_message, chat_history)
        except Exception as e:
            result["text"] = f"Error: {str(e)}"
            result["status"] = "error"
            
        request_time_ms = int((time.time() - start_time) * 1000)
        
        if db and user_id:
            try:
                from database.models.postgres_models import AIUsageLog
                total_tokens = result.get("prompt_tokens", 0) + result.get("completion_tokens", 0)
                # Note: estimated_cost calculation can be added here if needed based on model rates
                log_entry = AIUsageLog(
                    user_id=user_id,
                    feature=feature,
                    model=result.get("model", provider),
                    prompt_tokens=result.get("prompt_tokens", 0),
                    completion_tokens=result.get("completion_tokens", 0),
                    total_tokens=total_tokens,
                    request_time_ms=request_time_ms,
                    status=result.get("status", "success")
                )
                db.add(log_entry)
                db.commit()
            except Exception as db_e:
                print(f"Failed to log AI usage: {db_e}")
                
        return result["text"]

    def _call_openai(self, system_prompt: str, user_message: str, chat_history: list) -> dict:
        if not self.openai_api_key:
            return {"text": "OpenAI API Key is missing.", "status": "error", "model": "openai"}
            
        messages = [{"role": "system", "content": system_prompt}]
        
        if chat_history:
            for msg in chat_history[-10:]:
                messages.append({"role": msg["role"], "content": msg["content"]})
                
        messages.append({"role": "user", "content": user_message})
        
        try:
            model_name = "gpt-3.5-turbo"
            response = openai.ChatCompletion.create(
                model=model_name,
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            return {
                "text": response.choices[0].message['content'].strip(),
                "model": model_name,
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "status": "success"
            }
        except Exception as e:
            return {"text": f"Error connecting to OpenAI: {e}", "status": "error", "model": "gpt-3.5-turbo"}

    def _call_gemini(self, system_prompt: str, user_message: str, chat_history: list) -> dict:
        if not self.gemini_api_key:
            return {"text": "Gemini API Key is missing.", "status": "error", "model": "gemini"}
            
        client = self._gemini_client
        gemini_history = []
        
        try:
            from google.genai import types
            if chat_history:
                for msg in chat_history[-10:]:
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_history.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=msg["content"])]
                        )
                    )
                    
            chat = client.chats.create(
                model=self.gemini_model,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.7
                ),
                history=gemini_history if gemini_history else None
            )
            
            response = chat.send_message(user_message)
            usage = response.usage_metadata
            return {
                "text": response.text.strip(),
                "model": self.gemini_model,
                "prompt_tokens": getattr(usage, 'prompt_token_count', 0) if usage else 0,
                "completion_tokens": getattr(usage, 'candidates_token_count', 0) if usage else 0,
                "status": "success"
            }
            
        except Exception as e:
            print(f"Warning: Primary Gemini model {self.gemini_model} failed ({e}). Falling back to {self.gemini_fallback_model}.")
            try:
                chat = client.chats.create(
                    model=self.gemini_fallback_model,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.7
                    ),
                    history=gemini_history if gemini_history else None
                )
                response = chat.send_message(user_message)
                usage = response.usage_metadata
                return {
                    "text": response.text.strip(),
                    "model": self.gemini_fallback_model,
                    "prompt_tokens": getattr(usage, 'prompt_token_count', 0) if usage else 0,
                    "completion_tokens": getattr(usage, 'candidates_token_count', 0) if usage else 0,
                    "status": "success"
                }
            except Exception as fallback_e:
                return {"text": f"Error connecting to Gemini (including fallback): {fallback_e}", "status": "error", "model": "gemini"}

llm_service = LLMService()
