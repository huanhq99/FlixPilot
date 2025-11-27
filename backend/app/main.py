from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.services.proxy_service import proxy_service
import logging
import os

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

# 挂载静态文件 (前端构建产物)
# 确保 static 目录存在，避免启动报错
if not os.path.exists("static"):
    os.makedirs("static")

app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

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

# SPA 路由处理：所有非 API 请求返回 index.html
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # 如果是 API 请求但未匹配到路由，返回 404
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # 否则返回前端入口文件
    index_path = "static/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not built or static files missing"}

if __name__ == "__main__":
    import uvicorn
    config = settings.get_config()
    port = config.get("server", {}).get("port", 8000)
    uvicorn.run(app, host="0.0.0.0", port=port)
