import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
from pydantic_settings import BaseSettings
from pydantic import BaseModel

# 定义数据目录
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = os.getenv("DATA_DIR", str(BASE_DIR / "data"))
CONFIG_FILE = Path(DATA_DIR) / "config.json"

# 确保数据目录存在
os.makedirs(DATA_DIR, exist_ok=True)

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "StreamHub"
    VERSION: str = "3.0.0"
    
    # 默认配置结构
    DEFAULT_CONFIG: Dict[str, Any] = {
        "server": {"port": 8000},
        "auth": {"enabled": True, "username": "admin", "password": ""},
        "tmdb": {"apiKey": "", "baseUrl": "https://api.themoviedb.org/3"},
        "moviepilot": {
            "url": "https://mp.111107.xyz:7777",
            "username": "",
            "password": "",
            "useProxy": False  # 关键：允许单独控制 MP 是否走代理
        },
        "emby": {"serverUrl": "", "apiKey": ""},
        "telegram": {"botToken": "", "chatId": ""},
        "proxy": {"http": "", "https": ""}
    }

    def get_config(self) -> Dict[str, Any]:
        if not CONFIG_FILE.exists():
            self.save_config(self.DEFAULT_CONFIG)
            return self.DEFAULT_CONFIG
        
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                config = json.load(f)
                # 简单的合并逻辑，确保新字段存在
                merged = {**self.DEFAULT_CONFIG, **config}
                # 深度合并 moviepilot
                if "moviepilot" in config:
                    merged["moviepilot"] = {**self.DEFAULT_CONFIG["moviepilot"], **config["moviepilot"]}
                return merged
        except Exception as e:
            print(f"Error loading config: {e}")
            return self.DEFAULT_CONFIG

    def save_config(self, config: Dict[str, Any]):
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

settings = Settings()
