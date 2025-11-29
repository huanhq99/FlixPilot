// TMDB 详情服务

const TMDB_BASE = '/api/tmdb'

// 媒体详情
export interface MediaDetail {
  id: number
  title: string
  originalTitle: string
  tagline: string
  overview: string
  poster: string
  backdrop: string
  rating: number
  voteCount: number
  releaseDate: string
  runtime: number  // 电影时长（分钟）
  status: string   // Released, In Production, etc.
  genres: { id: number; name: string }[]
  productionCountries: { iso_3166_1: string; name: string }[]
  spokenLanguages: { iso_639_1: string; name: string }[]
  type: 'movie' | 'tv'
  // 电视剧特有
  numberOfSeasons?: number
  numberOfEpisodes?: number
  seasons?: Season[]
  lastAirDate?: string
  inProduction?: boolean
  // TMDB 链接
  tmdbUrl: string
}

export interface Season {
  id: number
  seasonNumber: number
  name: string
  overview: string
  poster: string
  airDate: string
  episodeCount: number
  episodes?: Episode[]
}

export interface Episode {
  id: number
  episodeNumber: number
  seasonNumber: number
  name: string
  overview: string
  stillPath: string
  airDate: string
  runtime: number
  voteAverage: number
}

export interface CastMember {
  id: number
  name: string
  character: string
  profilePath: string
  order: number
}

export interface CollectionInfo {
  id: number
  name: string
  poster: string
  backdrop: string
  parts: {
    id: number
    title: string
    poster: string
    releaseDate: string
  }[]
}

// 获取媒体详情
export async function getMediaDetail(id: number, type: 'movie' | 'tv'): Promise<MediaDetail | null> {
  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${id}?append_to_response=credits,recommendations,similar`)
    if (!res.ok) return null
    
    const data = await res.json()
    
    return {
      id: data.id,
      title: data.title || data.name,
      originalTitle: data.original_title || data.original_name,
      tagline: data.tagline || '',
      overview: data.overview || '',
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
      backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '',
      rating: Math.round((data.vote_average || 0) * 10) / 10,
      voteCount: data.vote_count || 0,
      releaseDate: data.release_date || data.first_air_date || '',
      runtime: data.runtime || (data.episode_run_time?.[0] || 0),
      status: data.status || '',
      genres: data.genres || [],
      productionCountries: data.production_countries || [],
      spokenLanguages: data.spoken_languages || [],
      type,
      numberOfSeasons: data.number_of_seasons,
      numberOfEpisodes: data.number_of_episodes,
      seasons: data.seasons?.map((s: any) => ({
        id: s.id,
        seasonNumber: s.season_number,
        name: s.name,
        overview: s.overview,
        poster: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : '',
        airDate: s.air_date || '',
        episodeCount: s.episode_count
      })),
      lastAirDate: data.last_air_date,
      inProduction: data.in_production,
      tmdbUrl: `https://www.themoviedb.org/${type}/${data.id}`
    }
  } catch (error) {
    console.error('getMediaDetail error:', error)
    return null
  }
}

// 获取演员列表
export async function getCredits(id: number, type: 'movie' | 'tv'): Promise<CastMember[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${id}/credits`)
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.cast || []).slice(0, 20).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '',
      order: c.order
    }))
  } catch (error) {
    console.error('getCredits error:', error)
    return []
  }
}

// 获取季的剧集列表
export async function getSeasonEpisodes(tvId: number, seasonNumber: number): Promise<Episode[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/${tvId}/season/${seasonNumber}`)
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.episodes || []).map((e: any) => ({
      id: e.id,
      episodeNumber: e.episode_number,
      seasonNumber: e.season_number,
      name: e.name,
      overview: e.overview,
      stillPath: e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : '',
      airDate: e.air_date || '',
      runtime: e.runtime || 0,
      voteAverage: Math.round((e.vote_average || 0) * 10) / 10
    }))
  } catch (error) {
    console.error('getSeasonEpisodes error:', error)
    return []
  }
}

// 获取系列/合集信息
export async function getCollection(collectionId: number): Promise<CollectionInfo | null> {
  try {
    const res = await fetch(`${TMDB_BASE}/collection/${collectionId}`)
    if (!res.ok) return null
    
    const data = await res.json()
    return {
      id: data.id,
      name: data.name,
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : '',
      backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '',
      parts: (data.parts || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        poster: p.poster_path ? `https://image.tmdb.org/t/p/w200${p.poster_path}` : '',
        releaseDate: p.release_date || ''
      }))
    }
  } catch (error) {
    console.error('getCollection error:', error)
    return null
  }
}

// 获取演员作品
export async function getPersonCredits(personId: number): Promise<{movies: any[], tv: any[]}> {
  try {
    const res = await fetch(`${TMDB_BASE}/person/${personId}/combined_credits`)
    if (!res.ok) return { movies: [], tv: [] }
    
    const data = await res.json()
    const cast = data.cast || []
    
    const movies = cast
      .filter((c: any) => c.media_type === 'movie')
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 10)
      .map((m: any) => ({
        id: m.id,
        title: m.title,
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : '',
        character: m.character,
        releaseDate: m.release_date || ''
      }))
    
    const tv = cast
      .filter((c: any) => c.media_type === 'tv')
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 10)
      .map((t: any) => ({
        id: t.id,
        title: t.name,
        poster: t.poster_path ? `https://image.tmdb.org/t/p/w200${t.poster_path}` : '',
        character: t.character,
        firstAirDate: t.first_air_date || ''
      }))
    
    return { movies, tv }
  } catch (error) {
    console.error('getPersonCredits error:', error)
    return { movies: [], tv: [] }
  }
}

// 获取演员详情
export async function getPersonDetail(personId: number): Promise<any> {
  try {
    const res = await fetch(`${TMDB_BASE}/person/${personId}`)
    if (!res.ok) return null
    
    const data = await res.json()
    return {
      id: data.id,
      name: data.name,
      biography: data.biography,
      birthday: data.birthday,
      placeOfBirth: data.place_of_birth,
      profilePath: data.profile_path ? `https://image.tmdb.org/t/p/w300${data.profile_path}` : '',
      knownFor: data.known_for_department
    }
  } catch (error) {
    console.error('getPersonDetail error:', error)
    return null
  }
}

// 推荐媒体项
export interface RecommendedMedia {
  id: number
  title: string
  poster: string
  rating: number
  releaseDate: string
  type: 'movie' | 'tv'
}

// 获取推荐内容
export async function getRecommendations(id: number, type: 'movie' | 'tv'): Promise<RecommendedMedia[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${id}/recommendations`)
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.results || []).slice(0, 12).map((r: any) => ({
      id: r.id,
      title: r.title || r.name,
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w200${r.poster_path}` : '',
      rating: Math.round((r.vote_average || 0) * 10) / 10,
      releaseDate: r.release_date || r.first_air_date || '',
      type
    }))
  } catch (error) {
    console.error('getRecommendations error:', error)
    return []
  }
}

// 获取相似内容
export async function getSimilar(id: number, type: 'movie' | 'tv'): Promise<RecommendedMedia[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${id}/similar`)
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.results || []).slice(0, 12).map((r: any) => ({
      id: r.id,
      title: r.title || r.name,
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w200${r.poster_path}` : '',
      rating: Math.round((r.vote_average || 0) * 10) / 10,
      releaseDate: r.release_date || r.first_air_date || '',
      type
    }))
  } catch (error) {
    console.error('getSimilar error:', error)
    return []
  }
}

// 获取电影所属系列（如：变形金刚系列）
export async function getMovieCollection(movieId: number): Promise<CollectionInfo | null> {
  try {
    // 先获取电影详情，看是否属于某个系列
    const res = await fetch(`${TMDB_BASE}/movie/${movieId}`)
    if (!res.ok) return null
    
    const data = await res.json()
    if (!data.belongs_to_collection) return null
    
    // 获取系列详情
    return getCollection(data.belongs_to_collection.id)
  } catch (error) {
    console.error('getMovieCollection error:', error)
    return null
  }
}

