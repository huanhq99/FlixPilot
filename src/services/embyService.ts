// Emby 服务

export interface EmbyLibrary {
  Id: string
  Name: string
  Type: string
  CollectionType: string
  ImageTags: {
    Primary?: string
    Backdrop?: string
  }
  BackdropImageTags?: string[]
  PrimaryImageAspectRatio?: number
}

export interface EmbyStats {
  movieCount: number
  seriesCount: number
  episodeCount: number
  albumCount: number
  artistCount: number
  songCount: number
}

export interface EmbyServerInfo {
  ServerName: string
  Version: string
  Id: string
  LocalAddress: string
  WanAddress: string
  OperatingSystem: string
}

// 获取服务器信息
export async function getServerInfo(): Promise<EmbyServerInfo | null> {
  try {
    const res = await fetch('/api/emby/System/Info')
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new Error(error.error || '获取服务器信息失败')
    }
    return await res.json()
  } catch (error) {
    console.error('getServerInfo error:', error)
    return null
  }
}

// 获取媒体库列表 (使用 Users/xxx/Views 获取带封面的媒体库)
export async function getLibraries(): Promise<EmbyLibrary[]> {
  try {
    // 先获取管理员用户ID
    const usersRes = await fetch('/api/emby/Users')
    if (!usersRes.ok) return []
    
    const users = await usersRes.json()
    const adminUser = users.find((u: any) => u.Policy?.IsAdministrator) || users[0]
    
    if (!adminUser) return []
    
    // 使用 Views API 获取媒体库（包含封面）
    const viewsRes = await fetch(`/api/emby/Users/${adminUser.Id}/Views`)
    if (!viewsRes.ok) return []
    
    const data = await viewsRes.json()
    return data.Items || []
  } catch (error) {
    console.error('getLibraries error:', error)
    return []
  }
}

// 获取媒体统计
export async function getMediaStats(): Promise<EmbyStats> {
  const defaultStats: EmbyStats = {
    movieCount: 0,
    seriesCount: 0,
    episodeCount: 0,
    albumCount: 0,
    artistCount: 0,
    songCount: 0
  }

  try {
    const res = await fetch('/api/emby/Items/Counts')
    if (res.ok) {
      const data = await res.json()
      return {
        movieCount: data.MovieCount || 0,
        seriesCount: data.SeriesCount || 0,
        episodeCount: data.EpisodeCount || 0,
        albumCount: data.AlbumCount || 0,
        artistCount: data.ArtistCount || 0,
        songCount: data.SongCount || 0
      }
    }
    return defaultStats
  } catch (error) {
    console.error('getMediaStats error:', error)
    return defaultStats
  }
}

// 获取用户数量
export async function getUserCount(): Promise<number> {
  try {
    const res = await fetch('/api/emby/Users')
    if (!res.ok) return 0
    const users = await res.json()
    return users.length
  } catch (error) {
    console.error('getUserCount error:', error)
    return 0
  }
}

// 生成图片URL - 使用 Primary 图片作为封面
export function getLibraryImageUrl(libraryId: string, tag?: string): string {
  if (!tag) return ''
  return `/api/emby/Items/${libraryId}/Images/Primary?tag=${tag}&quality=90&maxWidth=600`
}

// 生成背景图片URL
export function getLibraryBackdropUrl(libraryId: string, tag?: string): string {
  if (!tag) return ''
  return `/api/emby/Items/${libraryId}/Images/Backdrop?tag=${tag}&quality=80&maxWidth=800`
}
