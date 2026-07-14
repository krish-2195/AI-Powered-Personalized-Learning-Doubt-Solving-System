from dataclasses import dataclass
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import httpx
from backend.config import settings

@dataclass
class OAuthUserInfo:
    provider: str
    provider_user_id: str
    email: str
    name: str
    picture: Optional[str]

class OAuthProvider:
    def get_authorization_url(self) -> str:
        raise NotImplementedError

    async def exchange_code_for_user(self, code: str) -> OAuthUserInfo:
        raise NotImplementedError

    async def verify_id_token(self, token: str) -> OAuthUserInfo:
        raise NotImplementedError

class GoogleOAuthProvider(OAuthProvider):
    async def verify_id_token(self, token: str) -> OAuthUserInfo:
        try:
            # We use the synchronous google-auth library with a transport
            request = google_requests.Request()
            id_info = id_token.verify_oauth2_token(
                token, request, settings.GOOGLE_CLIENT_ID
            )

            return OAuthUserInfo(
                provider="google",
                provider_user_id=id_info["sub"],
                email=id_info["email"],
                name=id_info.get("name", ""),
                picture=id_info.get("picture")
            )
        except ValueError as e:
            raise ValueError(f"Invalid Google ID token: {e}")

class GitHubOAuthProvider(OAuthProvider):
    def get_authorization_url(self) -> str:
        return f"https://github.com/login/oauth/authorize?client_id={settings.GITHUB_CLIENT_ID}&scope=user:email"

    async def exchange_code_for_user(self, code: str) -> OAuthUserInfo:
        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                }
            )
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            if not access_token:
                raise ValueError("Failed to retrieve GitHub access token")

            # Get user info
            user_response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_data = user_response.json()

            # Get user emails (GitHub doesn't always return email in the main /user endpoint if private)
            email = user_data.get("email")
            if not email:
                emails_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                emails_data = emails_response.json()
                primary_email = next((e["email"] for e in emails_data if e["primary"]), None)
                if primary_email:
                    email = primary_email
                elif emails_data:
                    email = emails_data[0]["email"]

            if not email:
                raise ValueError("Could not get email from GitHub")

            return OAuthUserInfo(
                provider="github",
                provider_user_id=str(user_data["id"]),
                email=email,
                name=user_data.get("name") or user_data.get("login", ""),
                picture=user_data.get("avatar_url")
            )

class MicrosoftOAuthProvider(OAuthProvider):
    def get_authorization_url(self) -> str:
        # Construct Microsoft Graph OAuth URL
        return f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id={settings.MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri={settings.FRONTEND_URL}/oauth/callback&scope=openid profile email User.Read"

    async def exchange_code_for_user(self, code: str) -> OAuthUserInfo:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                data={
                    "client_id": settings.MICROSOFT_CLIENT_ID,
                    "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": f"{settings.FRONTEND_URL}/oauth/callback",
                    "grant_type": "authorization_code",
                }
            )
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            if not access_token:
                raise ValueError("Failed to retrieve Microsoft access token")

            user_response = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_data = user_response.json()

            return OAuthUserInfo(
                provider="microsoft",
                provider_user_id=user_data.get("id"),
                email=user_data.get("mail") or user_data.get("userPrincipalName"),
                name=user_data.get("displayName", ""),
                picture=None # Graph API requires separate call for picture
            )

class AppleOAuthProvider(OAuthProvider):
    def get_authorization_url(self) -> str:
        return f"https://appleid.apple.com/auth/authorize?client_id={settings.APPLE_CLIENT_ID}&response_type=code id_token&response_mode=form_post&scope=name email&redirect_uri={settings.FRONTEND_URL}/oauth/callback"

    async def exchange_code_for_user(self, code: str) -> OAuthUserInfo:
        # Apple usually requires client_secret generation via JWT using the private key.
        # This is a mocked/simplified flow. In a real scenario, we'd sign a JWT here.
        async with httpx.AsyncClient() as client:
            # We mock the validation for demonstration without actual keys
            if not settings.APPLE_CLIENT_ID:
                return OAuthUserInfo(
                    provider="apple",
                    provider_user_id="mock_apple_user_id",
                    email="mock_apple@user.com",
                    name="Apple User",
                    picture=None
                )
            # Real flow would hit https://appleid.apple.com/auth/token
            raise NotImplementedError("Real Apple token exchange requires signed JWTs which needs actual private keys.")

class OAuthService:
    PROVIDERS = {
        "google": GoogleOAuthProvider(),
        "github": GitHubOAuthProvider(),
        "microsoft": MicrosoftOAuthProvider(),
        "apple": AppleOAuthProvider(),
    }
    
    @classmethod
    def get_provider(cls, provider_name: str) -> OAuthProvider:
        if provider_name not in cls.PROVIDERS:
            raise ValueError(f"Unsupported OAuth provider: {provider_name}")
        return cls.PROVIDERS[provider_name]

