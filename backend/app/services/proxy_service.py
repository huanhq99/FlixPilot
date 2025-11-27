import httpx
from typing import Optional, Dict, Any
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class ProxyService:
    def __init__(self):
        self.config = settings.get_config()
        self.proxy_url = self.config.get("proxy", {}).get("https") or self.config.get("proxy", {}).get("http")
        
    def _get_client(self, use_proxy: bool = True) -> httpx.AsyncClient:
        """
        获取 HTTP 客户端
        :param use_proxy: 是否使用代理
        """
        mounts = {}
        proxies = None
        
        if use_proxy and self.proxy_url:
            proxies = self.proxy_url
            logger.info(f"Using proxy: {self.proxy_url}")
        else:
            logger.info("Using DIRECT connection")

        # 关键：配置 verify=False 忽略 SSL 错误，timeout 设置为 30s
        return httpx.AsyncClient(
            proxies=proxies,
            verify=False,
            timeout=30.0,
            follow_redirects=True
        )

    async def request(self, url: str, method: str = "GET", headers: Optional[Dict] = None, json_data: Any = None, data: Any = None, use_proxy_override: Optional[bool] = None):
        """
        通用请求方法
        :param use_proxy_override: 强制指定是否使用代理，None 则根据配置自动判断
        """
        # 重新加载配置以获取最新设置
        self.config = settings.get_config()
        self.proxy_url = self.config.get("proxy", {}).get("https") or self.config.get("proxy", {}).get("http")

        # 智能判断代理策略
        should_use_proxy = False
        
        if use_proxy_override is not None:
            should_use_proxy = use_proxy_override
        else:
            # 默认策略：如果有代理配置，则默认使用
            # 但如果是 MoviePilot，我们需要检查它的专属配置
            mp_url = self.config.get("moviepilot", {}).get("url", "")
            if mp_url and url.startswith(mp_url):
                # MP 默认不走代理，除非配置了 useProxy=True
                should_use_proxy = self.config.get("moviepilot", {}).get("useProxy", False)
            elif self.proxy_url:
                # 其他请求（如 TMDB/TG），如果有代理则走代理
                should_use_proxy = True

        logger.info(f"Requesting {method} {url} | Proxy: {should_use_proxy}")

        async with self._get_client(use_proxy=should_use_proxy) as client:
            try:
                response = await client.request(method, url, headers=headers, json=json_data, data=data)
                return response
            except httpx.RequestError as e:
                logger.error(f"Request error: {e}")
                raise e

proxy_service = ProxyService()
