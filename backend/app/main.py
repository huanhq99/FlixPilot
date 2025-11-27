from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.services.proxy_service import proxy_service
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "StreamHub Backend is running", "version": settings.VERSION}

@app.get("/api/config")
async def get_config():
    return settings.get_config()

# 核心：MoviePilot 代理测试接口
@app.post("/api/proxy/moviepilot")
async def proxy_moviepilot(request: Request):
    try:
        body = await request.json()
        target_url = body.get("target_url")
        method = body.get("method", "POST")
        headers = body.get("headers", {})
        data = body.get("body")
        
        if not target_url:
            raise HTTPException(status_code=400, detail="Missing target_url")

        # 清理 headers
        headers.pop("host", None)
        headers.pop("content-length", None)
        
        # 发送请求
        response = await proxy_service.request(
            url=target_url,
            method=method,
            headers=headers,
            json_data=data if isinstance(data, dict) else None,
            data=data if isinstance(data, str) else None
        )
        
        # 尝试解析 JSON
        try:
            content = response.json()
        except:
            content = response.text

        return JSONResponse(
            content=content,
            status_code=response.status_code
        )

    except Exception as e:
        logger.error(f"Proxy error: {str(e)}")
        return JSONResponse(
            content={"error": str(e), "code": "PROXY_ERROR"},
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    config = settings.get_config()
    port = config.get("server", {}).get("port", 8000)
    uvicorn.run(app, host="0.0.0.0", port=port)
