from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel

class ProxyRequest(BaseModel):
    target_url: str
    method: str = "GET"
    headers: Optional[Dict[str, str]] = None
    body: Optional[Any] = None

class Episode(BaseModel):
    id: int
    name: str
    overview: str
    still_path: Optional[str] = None
    air_date: Optional[str] = None
    episode_number: int
    vote_average: float
    runtime: Optional[int] = None

class Season(BaseModel):
    id: int
    name: str
    season_number: int
    episode_count: int
    poster_path: Optional[str] = None
    air_date: Optional[str] = None

class MediaItem(BaseModel):
    id: int
    title: str
    subtitle: Optional[str] = None
    overview: str
    type: str  # '电影' | '剧集'
    mediaType: str # 'movie' | 'tv'
    platform: Optional[str] = None
    hasProvider: bool
    providerRegion: str
    status: str # 'streaming' | 'released' | 'pending'
    badgeLabel: str
    badgeColorClass: str = ""
    
    # Date Info
    releaseDate: str
    releaseDates: Dict[str, Optional[str]] = {}
    
    year: str
    region: str
    voteAverage: float
    posterUrl: Optional[str] = None
    backdropUrl: Optional[str] = None
    posterColor: str
    posterText: str
    
    # Details
    genres: Optional[List[Dict[str, Any]]] = None
    runtime: Optional[int] = None
    cast: Optional[List[Dict[str, Any]]] = None
    videos: Optional[List[Dict[str, Any]]] = None
    collectionId: Optional[int] = None
    collectionName: Optional[str] = None
    
    # TV Specific
    numberOfSeasons: Optional[int] = None
    numberOfEpisodes: Optional[int] = None
    seasons: Optional[List[Season]] = None
    lastEpisodeToAir: Optional[Dict[str, Any]] = None
    nextEpisodeToAir: Optional[Dict[str, Any]] = None

class EmbyConfig(BaseModel):
    serverUrl: str
    apiKey: str
    userId: Optional[str] = None

class EmbyUser(BaseModel):
    Id: str
    Name: str
    HasPassword: Optional[bool] = None
    PrimaryImageTag: Optional[str] = None
    Policy: Optional[Dict[str, Any]] = None

