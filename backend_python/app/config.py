import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "StreamHub Monitor"
    DEBUG: bool = False
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # TMDB Settings
    TMDB_API_KEY: str
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

settings = Settings()
