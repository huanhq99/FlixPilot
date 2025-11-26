from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import httpx
from app.services import get_trending
from app.schemas import MediaItem, ProxyRequest
from app.config_manager import config_manager
from app.config import settings

app = FastAPI(title="StreamHub Backend", version="2.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "StreamHub Backend API"}

@app.get("/api/config")
async def get_config():
    """
    Get backend configuration (safe to expose to frontend).
    Merges env vars and config.json
    """
    # 1. Get base config from config.json
    json_config = config_manager.get_all()
    
    # 2. Process sections to add 'configured' flag expected by frontend
    
    # MoviePilot
    mp_config = json_config.get("moviepilot", {})
    if mp_config.get("url"):
        mp_config["configured"] = True
        
    # Telegram
    tg_config = json_config.get("telegram", {})
    if tg_config.get("botToken") and tg_config.get("chatId"):
        tg_config["configured"] = True
        
    # TMDB
    tmdb_config = json_config.get("tmdb", {})
    if tmdb_config.get("apiKey"):
        tmdb_config["configured"] = True

    # Emby
    emby_config = json_config.get("emby", {})
    # Update with env vars if present
    if settings.EMBY_SERVER_URL:
        emby_config["serverUrl"] = settings.EMBY_SERVER_URL
    if settings.EMBY_API_KEY:
        emby_config["apiKey"] = settings.EMBY_API_KEY

    response_config = {
        "version": "2.0.0",
        "emby": emby_config,
        "moviepilot": mp_config,
        "telegram": tg_config,
        "tmdb": tmdb_config
    }
        
    return response_config

@app.get("/api/trending", response_model=List[MediaItem])
async def trending(
    media_type: str = Query("all", enum=["all", "movie", "tv"]),
    time_window: str = Query("week", enum=["day", "week"])
):
    return await get_trending(media_type, time_window)

@app.post("/api/proxy/moviepilot")
async def proxy_moviepilot(request: ProxyRequest):
    """
    Proxy requests to MoviePilot to bypass CORS and manage connectivity.
    """
    async with httpx.AsyncClient(verify=False) as client:
        try:
            # Prepare headers - remove host to avoid conflicts
            headers = request.headers.copy() if request.headers else {}
            if 'host' in headers:
                del headers['host']
                
            response = await client.request(
                method=request.method,
                url=request.target_url,
                headers=headers,
                json=request.body if request.body else None,
                timeout=10.0
            )
            
            # Forward response
            try:
                content = response.json()
            except:
                content = response.text
                
            return JSONResponse(
                content=content,
                status_code=response.status_code
            )
            
        except httpx.RequestError as exc:
            raise HTTPException(status_code=500, detail=f"Proxy request failed: {str(exc)}")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Proxy error: {str(exc)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
