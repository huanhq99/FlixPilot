import os
from pydantic_settings import BaseSettings
from typing import Optional
from app.config_manager import config_manager

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "StreamHub Monitor"
    DEBUG: bool = False
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # TMDB Settings
    TMDB_API_KEY: Optional[str] = None
    TMDB_BASE_URL: str = "https://api.themoviedb.org/3"
    IMAGE_BASE_URL: str = "https://image.tmdb.org/t/p/w500"
    BACKDROP_BASE_URL: str = "https://image.tmdb.org/t/p/original"
    
    # Emby Settings
    EMBY_SERVER_URL: str = ""
    EMBY_API_KEY: str = ""
    EMBY_USER_ID: str = ""

    # Proxy Settings (Optional)
    HTTP_PROXY: str = ""
    HTTPS_PROXY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

    def __init__(self, **values):
        super().__init__(**values)
        # Override with config.json values if not set in env or if config.json is preferred source
        # Usually env vars take precedence, but if user says they use config.json, let's respect that fallback
        
        json_tmdb = config_manager.get("tmdb", {})
        if not self.TMDB_API_KEY and json_tmdb.get("apiKey"):
             self.TMDB_API_KEY = json_tmdb.get("apiKey")
             
        json_emby = config_manager.get("emby", {})
        if not self.EMBY_SERVER_URL and json_emby.get("serverUrl"):
             self.EMBY_SERVER_URL = json_emby.get("serverUrl")
        if not self.EMBY_API_KEY and json_emby.get("apiKey"):
             self.EMBY_API_KEY = json_emby.get("apiKey")
             
        # Proxy
        json_proxy = config_manager.get("proxy", {})
        if not self.HTTP_PROXY and json_proxy.get("http"):
             self.HTTP_PROXY = json_proxy.get("http")
        if not self.HTTPS_PROXY and json_proxy.get("https"):
             self.HTTPS_PROXY = json_proxy.get("https")

settings = Settings()
