import os
import openai
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self, default_provider="gemini"):
        self.default_provider = default_provider
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        
        if self.openai_api_key:
            openai.api_key = self.openai_api_key

    def generate_response(self, system_prompt: str, user_message: str, chat_history: list = None, provider: str = None) -> str:
        """
        Abstracted method to generate an LLM response.
        """
        if not provider:
            provider = self.default_provider
            
        if provider == "openai":
            return self._call_openai(system_prompt, user_message, chat_history)
        elif provider == "gemini":
            return self._call_gemini(system_prompt, user_message, chat_history)
        else:
            return f"Error: Unsupported provider {provider}"

    def _call_openai(self, system_prompt: str, user_message: str, chat_history: list) -> str:
        if not self.openai_api_key:
            return "OpenAI API Key is missing."
            
        messages = [{"role": "system", "content": system_prompt}]
        
        if chat_history:
            for msg in chat_history[-10:]:
                messages.append({"role": msg["role"], "content": msg["content"]})
                
        messages.append({"role": "user", "content": user_message})
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            return response.choices[0].message['content'].strip()
        except Exception as e:
            return f"Error connecting to OpenAI: {e}"

    def _call_gemini(self, system_prompt: str, user_message: str, chat_history: list) -> str:
        if not self.gemini_api_key:
            return "Gemini API Key is missing."
            
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.gemini_api_key)
            
            # Use model from .env (defaults to gemini-2.5-flash)
            model = genai.GenerativeModel(self.gemini_model)
            
            # Gemini expects system prompt either in a specific system_instruction param 
            # or pre-pended to the chat. We will prepend it to the first user message for simplicity.
            gemini_history = []
            
            if chat_history:
                for msg in chat_history[-10:]:
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_history.append({"role": role, "parts": [msg["content"]]})
                    
            chat = model.start_chat(history=gemini_history)
            
            # Inject system prompt dynamically into the user's latest query
            full_query = f"System Context: {system_prompt}\n\nUser Query: {user_message}"
            
            response = chat.send_message(full_query)
            return response.text.strip()
            
        except ImportError:
            return "Error: 'google-generativeai' package is not installed. Run `pip install google-generativeai`."
        except Exception as e:
            return f"Error connecting to Gemini: {e}"

llm_service = LLMService()
