import json
import os
from typing import Dict, Any, Optional

class ConfigManager:
    def __init__(self, config_path: str = "../config.json"):
        # Resolve absolute path relative to this file
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Assuming backend_python is the working dir or similar structure, 
        # but let's be robust. config.json is in project root.
        # If we are in backend_python/app, project root is ../../
        
        # Let's try to find config.json
        # 1. Check relative to current working directory
        if os.path.exists("config.json"):
            self.config_path = "config.json"
        elif os.path.exists("../config.json"):
            self.config_path = "../config.json"
        else:
            # Fallback for when running from backend_python subdir
            self.config_path = os.path.join(os.path.dirname(base_dir), "config.json")
            
        self._config: Dict[str, Any] = {}
        self.load_config()

    def load_config(self):
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    self._config = json.load(f)
                    print(f"Loaded config from {self.config_path}")
            except Exception as e:
                print(f"Error loading config from {self.config_path}: {e}")
                self._config = {}
        else:
            print(f"Config file not found at {self.config_path}")
            self._config = {}

    def get(self, key: str, default: Any = None) -> Any:
        return self._config.get(key, default)

    def get_all(self) -> Dict[str, Any]:
        return self._config

config_manager = ConfigManager()

