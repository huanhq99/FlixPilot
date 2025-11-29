import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const LIBRARY_FILE = path.join(DATA_DIR, 'library.json')

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return { emby: [] }
  }
}

function getEmbyConfig(config: any) {
  if (Array.isArray(config.emby) && config.emby.length > 0) {
    return config.emby[0]
  }
  if (config.emby?.serverUrl) {
    return config.emby
  }
  return null
}

// 执行 Emby 同步 - 优化版本：并行请求 + 减少 API 调用
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const libraryIds = body.libraryId ? [body.libraryId] : (body.libraries || [])
    
    const config = await loadConfig()
    const embyConfig = getEmbyConfig(config)

    if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
      return NextResponse.json({ error: '请先配置 Emby 服务器' }, { status: 400 })
    }

    const baseUrl = embyConfig.serverUrl.replace(/\/$/, '')
    const apiKey = embyConfig.apiKey

    // 获取用户ID
    const usersRes = await fetch(`${baseUrl}/emby/Users?api_key=${apiKey}`)
    if (!usersRes.ok) throw new Error('获取用户列表失败')
    
    const users = await usersRes.json()
    const adminUser = users.find((u: any) => u.Policy?.IsAdministrator) || users[0]
    if (!adminUser) throw new Error('未找到用户')

    const userId = adminUser.Id
    const movieIds: string[] = []
    const tvIds: string[] = []
    const episodes: Record<string, string[]> = {}

    // 并行处理所有媒体库
    const libraryPromises = libraryIds.map(async (libraryId: string) => {
      // 一次性获取所有项目 (Movie, Series, Episode)，只需一个请求
      const allItemsRes = await fetch(
        `${baseUrl}/emby/Users/${userId}/Items?ParentId=${libraryId}&Recursive=true&IncludeItemTypes=Movie,Series,Episode&Fields=ProviderIds,SeriesId,ParentIndexNumber,IndexNumber&Limit=50000&api_key=${apiKey}`
      )

      if (!allItemsRes.ok) {
        console.log(`Library ${libraryId}: failed to fetch`)
        return { movies: 0, series: 0 }
      }

      const allItemsData = await allItemsRes.json()
      const items = allItemsData.Items || []
      console.log(`Library ${libraryId}: fetched ${items.length} items`)

      // 第一遍：处理 Movie 和 Series，构建 Series ID -> TMDB ID 映射
      const seriesMap: Record<string, string> = {}
      const pendingEpisodes: any[] = []

      for (const item of items) {
        const tmdbId = item.ProviderIds?.Tmdb

        if (item.Type === 'Movie' && tmdbId) {
          movieIds.push(tmdbId)
        } else if (item.Type === 'Series' && tmdbId) {
          tvIds.push(tmdbId)
          seriesMap[item.Id] = tmdbId
        } else if (item.Type === 'Episode') {
          pendingEpisodes.push(item)
        }
      }

      // 第二遍：处理 Episode（使用已构建的 seriesMap）
      for (const ep of pendingEpisodes) {
        const seriesTmdbId = ep.SeriesId ? seriesMap[ep.SeriesId] : null
        if (seriesTmdbId) {
          const seasonNum = ep.ParentIndexNumber || 0
          const episodeNum = ep.IndexNumber || 0
          const key = `tv-${seriesTmdbId}`
          const epKey = `S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}`
          
          if (!episodes[key]) episodes[key] = []
          if (!episodes[key].includes(epKey)) {
            episodes[key].push(epKey)
          }
        }
      }

      return {
        movies: items.filter((i: any) => i.Type === 'Movie').length,
        series: items.filter((i: any) => i.Type === 'Series').length
      }
    })

    const results = await Promise.all(libraryPromises)
    
    console.log(`Synced: ${movieIds.length} movies, ${tvIds.length} series`)

    // 构建最终的 items 列表
    const items = [
      ...movieIds.map(id => `movie-${id}`),
      ...tvIds.map(id => `tv-${id}`)
    ]

    // 保存同步数据
    let existingData: any = {}
    try {
      const data = await fs.readFile(LIBRARY_FILE, 'utf-8')
      existingData = JSON.parse(data)
    } catch (e) {}

    const newData = {
      ...existingData,
      items: [...new Set([...(existingData.items || []), ...items])],
      movieIds: [...new Set([...(existingData.movieIds || []), ...movieIds])],
      tvIds: [...new Set([...(existingData.tvIds || []), ...tvIds])],
      episodes: { ...existingData.episodes, ...episodes },
      lastSync: new Date().toISOString(),
      syncConfig: {
        ...existingData.syncConfig,
        libraries: libraryIds
      }
    }

    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(LIBRARY_FILE, JSON.stringify(newData, null, 2))

    return NextResponse.json({ 
      success: true, 
      synced: items.length,
      itemCount: newData.items.length,
      movieCount: newData.movieIds?.length || 0,
      tvCount: newData.tvIds?.length || 0,
      episodeCount: Object.values(newData.episodes).flat().length
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
