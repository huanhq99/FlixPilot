// TMDB 服务
const TMDB_BASE_URL = '/api/tmdb'

export interface MediaItem {
  id: number
  title: string
  originalTitle: string
  year: number
  rating: number
  poster: string
  backdrop: string
  type: 'movie' | 'tv'
  platform: string
  releaseDate: string
  overview: string
  genres: string[]
}

// 平台映射
const PROVIDER_MAP: Record<string, string> = {
  'Netflix': 'Netflix',
  'Amazon Prime Video': 'Prime Video',
  'Disney Plus': 'Disney+',
  'Apple TV Plus': 'Apple TV+',
  'HBO Max': 'HBO Max',
  'Hulu': 'Hulu',
  'Paramount Plus': 'Paramount+',
  'iQIYI': '爱奇艺',
  'Tencent Video': '腾讯视频',
  'Youku': '优酷',
  'Bilibili': 'B站'
}

// 获取平台颜色
export const getPlatformColor = (platform: string): string => {
  const colors: Record<string, string> = {
    'Netflix': '#E50914',
    'Prime Video': '#00A8E1',
    'Disney+': '#113CCF',
    'Apple TV+': '#000000',
    'HBO Max': '#B535F6',
    'Hulu': '#1CE783',
    '爱奇艺': '#00BE06',
    '腾讯视频': '#FF6600',
    'B站': '#FB7299'
  }
  return colors[platform] || '#666666'
}

// 处理媒体数据
const processMediaItem = (item: any, type: 'movie' | 'tv', providers?: any): MediaItem => {
  let platform = ''
  
  if (providers?.results) {
    const checkRegions = ['CN', 'US', 'HK', 'TW', 'JP', 'KR']
    for (const region of checkRegions) {
      if (providers.results[region]?.flatrate?.[0]) {
        const rawName = providers.results[region].flatrate[0].provider_name
        platform = PROVIDER_MAP[rawName] || rawName
        break
      }
    }
  }

  return {
    id: item.id,
    title: item.title || item.name || '',
    originalTitle: item.original_title || item.original_name || '',
    year: new Date(item.release_date || item.first_air_date || '').getFullYear() || 0,
    rating: Math.round((item.vote_average || 0) * 10) / 10,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
    backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
    type,
    platform,
    releaseDate: item.release_date || item.first_air_date || '',
    overview: item.overview || '',
    genres: item.genre_ids || []
  }
}

// 获取热门内容
export async function fetchTrending(
  mediaType: 'all' | 'movie' | 'tv' = 'all',
  page: number = 1
): Promise<{ results: MediaItem[], totalPages: number, error?: string }> {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/trending/${mediaType}/week?page=${page}`)
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const errorMsg = data.error || `请求失败 (${res.status})`
      console.error('fetchTrending error:', errorMsg)
      return { results: [], totalPages: 0, error: errorMsg }
    }
    
    const data = await res.json()
    const results = (data.results || []).map((item: any) => 
      processMediaItem(item, item.media_type || (item.title ? 'movie' : 'tv'))
    )
    
    return { results, totalPages: data.total_pages || 0 }
  } catch (error: any) {
    console.error('fetchTrending error:', error)
    return { results: [], totalPages: 0, error: '网络错误，请检查连接' }
  }
}

// 搜索内容
export async function searchMedia(
  query: string,
  page: number = 1
): Promise<{ results: MediaItem[], totalPages: number }> {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=${page}`)
    if (!res.ok) throw new Error('Failed to search')
    
    const data = await res.json()
    const results = data.results
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item: any) => processMediaItem(item, item.media_type))
    
    return { results, totalPages: data.total_pages }
  } catch (error) {
    console.error('searchMedia error:', error)
    return { results: [], totalPages: 0 }
  }
}

// 发现内容 (带筛选)
export async function discoverMedia(
  type: 'movie' | 'tv',
  options: {
    page?: number
    year?: string
    genre?: string
    region?: string
    sortBy?: string
  } = {}
): Promise<{ results: MediaItem[], totalPages: number, error?: string }> {
  try {
    const params = new URLSearchParams()
    params.set('page', String(options.page || 1))
    params.set('sort_by', options.sortBy || 'popularity.desc')
    
    if (options.year && options.year !== '全部') {
      if (type === 'movie') {
        params.set('primary_release_year', options.year)
      } else {
        params.set('first_air_date_year', options.year)
      }
    }
    
    if (options.genre) {
      params.set('with_genres', options.genre)
    }
    
    if (options.region) {
      params.set('with_origin_country', options.region)
    }

    const res = await fetch(`${TMDB_BASE_URL}/discover/${type}?${params}`)
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const errorMsg = data.error || `请求失败 (${res.status})`
      return { results: [], totalPages: 0, error: errorMsg }
    }
    
    const data = await res.json()
    const results = (data.results || []).map((item: any) => processMediaItem(item, type))
    
    return { results, totalPages: data.total_pages || 0 }
  } catch (error: any) {
    console.error('discoverMedia error:', error)
    return { results: [], totalPages: 0, error: '网络错误，请检查连接' }
  }
}

// 获取详情
export async function getMediaDetails(
  id: number,
  type: 'movie' | 'tv'
): Promise<MediaItem | null> {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/${type}/${id}?append_to_response=watch/providers,credits`)
    if (!res.ok) throw new Error('Failed to get details')
    
    const data = await res.json()
    return processMediaItem(data, type, data['watch/providers'])
  } catch (error) {
    console.error('getMediaDetails error:', error)
    return null
  }
}
