import httpx
from typing import List, Optional, Dict, Any
from app.config import settings
from app.schemas import MediaItem, Episode, Season

# Constants map
PROVIDER_MAP = {
    "Netflix": "Netflix",
    "Disney Plus": "Disney+",
    "Amazon Prime Video": "Prime Video",
    "Apple TV Plus": "Apple TV+",
    "HBO Max": "HBO Max",
    "Hulu": "Hulu",
    "Peacock": "Peacock",
    "Paramount Plus": "Paramount+",
    "Bilibili": "Bilibili",
    "Tencent Video": "腾讯视频",
    "iQIYI": "爱奇艺",
    "Youku": "优酷",
    "Mango TV": "芒果TV"
}

POSTER_COLORS = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", 
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500", 
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500", 
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500", 
    "bg-rose-500"
]

PLATFORM_BADGE_STYLES = {
    "Netflix": "bg-[#E50914] text-white",
    "Disney+": "bg-[#113CCF] text-white",
    "Prime Video": "bg-[#00A8E1] text-white",
    "Apple TV+": "bg-[#000000] text-white border border-gray-700",
    "HBO": "bg-[#240E3D] text-white",
    "Hulu": "bg-[#1CE783] text-black",
    "Bilibili": "bg-[#23ADE5] text-white",
    "腾讯视频": "bg-[#FF7F00] text-white",
    "爱奇艺": "bg-[#00CC4C] text-white",
    "优酷": "bg-[#00A4FF] text-white",
    "芒果TV": "bg-[#FF5F00] text-white"
}

import random
from datetime import datetime

async def fetch_tmdb(url: str, params: dict = None) -> Dict[str, Any]:
    if params is None:
        params = {}
    params["api_key"] = settings.TMDB_API_KEY
    params["language"] = "zh-CN"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            print(f"TMDB API Error: {e}")
            return {}

def process_media_item(base_item: Dict[str, Any], detail_data: Dict[str, Any], media_type: str) -> MediaItem:
    # Logic ported from services/tmdbService.ts
    title = base_item.get("title", base_item.get("name", ""))
    providers = detail_data.get("watch/providers", {}).get("results", {})
    platform = None
    provider_region = ""
    
    check_regions = ['CN', 'US', 'HK', 'TW', 'JP', 'KR', 'SG', 'GB']
    check_types = ['flatrate', 'buy', 'rent']
    
    # Provider Logic
    for region in check_regions:
        if region in providers:
            for p_type in check_types:
                if providers[region].get(p_type):
                    raw_name = providers[region][p_type][0]["provider_name"]
                    mapped_name = PROVIDER_MAP.get(raw_name, raw_name)
                    suffix = "(购)" if p_type == 'buy' else ("(租)" if p_type == 'rent' else "")
                    platform = f"{mapped_name}{suffix}"
                    provider_region = region
                    break
        if platform:
            break
            
    if not platform and providers:
        for region in providers:
            for p_type in check_types:
                 if providers[region].get(p_type):
                    raw_name = providers[region][p_type][0]["provider_name"]
                    mapped_name = PROVIDER_MAP.get(raw_name, raw_name)
                    platform = f"{mapped_name} ({region})"
                    provider_region = region
                    break
            if platform:
                break

    badge_color_class = ""
    if platform:
        for key, style in PLATFORM_BADGE_STYLES.items():
            if key in platform:
                badge_color_class = style
                break
    
    # Status Logic
    status = "pending"
    badge_label = "待上映"
    release_date_str = "TBA"
    release_dates = {}
    
    today = datetime.now()
    digital_date = None
    theatrical_date = base_item.get("release_date") or detail_data.get("release_date")
    
    if media_type == 'movie':
        # Simplify date logic for Python port for now, can be expanded
        if platform:
            status = 'streaming'
            badge_label = platform
            release_date_str = theatrical_date or '已上线'
        elif theatrical_date:
            t_date = datetime.strptime(theatrical_date, "%Y-%m-%d")
            if t_date <= today:
                status = 'released'
                badge_label = '已上映'
                release_date_str = theatrical_date
            else:
                status = 'pending'
                badge_label = '待上映'
                release_date_str = theatrical_date
    else:
        first_air = base_item.get("first_air_date")
        if platform:
            status = 'streaming'
            badge_label = platform
            release_date_str = '热播中'
        elif first_air:
            f_date = datetime.strptime(first_air, "%Y-%m-%d")
            if f_date <= today:
                status = 'released'
                badge_label = '已开播'
                release_date_str = first_air
            else:
                status = 'pending'
                badge_label = '待开播'
                release_date_str = first_air

    raw_date = (base_item.get("release_date") or detail_data.get("release_date")) if media_type == 'movie' else base_item.get("first_air_date")
    year_str = raw_date[:4] if raw_date else "TBA"
    
    poster_path = base_item.get("poster_path") or detail_data.get("poster_path")
    backdrop_path = base_item.get("backdrop_path") or detail_data.get("backdrop_path")
    
    return MediaItem(
        id=base_item.get("id"),
        title=title,
        subtitle=base_item.get("original_title") or base_item.get("original_name"),
        overview=base_item.get("overview", ""),
        type='电影' if media_type == 'movie' else '剧集',
        mediaType=media_type,
        platform=platform,
        hasProvider=bool(platform),
        providerRegion=provider_region,
        status=status,
        badgeLabel=badge_label,
        badgeColorClass=badge_color_class,
        releaseDate=release_date_str,
        releaseDates=release_dates,
        year=year_str,
        region=base_item.get("original_language", "en"), # Simplified
        voteAverage=base_item.get("vote_average", 0),
        posterUrl=f"{settings.IMAGE_BASE_URL}{poster_path}" if poster_path else None,
        backdropUrl=f"{settings.BACKDROP_BASE_URL}{backdrop_path}" if backdrop_path else None,
        posterColor=random.choice(POSTER_COLORS),
        posterText=(title or "N/A")[:2].upper()
    )

async def get_trending(media_type: str = "all", time_window: str = "week") -> List[MediaItem]:
    data = await fetch_tmdb(f"{settings.TMDB_BASE_URL}/trending/{media_type}/{time_window}")
    results = []
    for item in data.get("results", []):
        m_type = item.get("media_type") or ("movie" if "title" in item else "tv")
        results.append(process_media_item(item, {}, m_type))
    return results

