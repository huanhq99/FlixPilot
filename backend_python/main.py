from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from app.services import get_trending
from app.schemas import MediaItem

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

@app.get("/api/trending", response_model=List[MediaItem])
async def trending(
    media_type: str = Query("all", enum=["all", "movie", "tv"]),
    time_window: str = Query("week", enum=["day", "week"])
):
    return await get_trending(media_type, time_window)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

