// 自动同步媒体库的定时任务
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
    return { emby: [], sync: {} }
  }
}

async function saveConfig(config: any) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2))
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

// GET - 检查是否需要同步，如需要则执行同步
export async function GET(request: Request) {
  try {
    const config = await loadConfig()
    const syncConfig = config.sync || {}
    const interval = syncConfig.interval || 0
    
    // 如果禁用自动同步，直接返回
    if (interval === 0) {
      return NextResponse.json({ 
        message: '自动同步已禁用',
        enabled: false
      })
    }

    const embyConfig = getEmbyConfig(config)
    if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
      return NextResponse.json({ error: 'Emby 未配置' }, { status: 400 })
    }

    // 检查是否需要同步
    const lastSync = syncConfig.lastSync ? new Date(syncConfig.lastSync) : null
    const now = new Date()
    const hoursSinceLastSync = lastSync 
      ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
      : Infinity

    if (hoursSinceLastSync < interval) {
      return NextResponse.json({
        message: '距离上次同步时间不足，跳过同步',
        lastSync: lastSync?.toISOString(),
        hoursSinceLastSync: Math.round(hoursSinceLastSync * 10) / 10,
        interval,
        nextSyncIn: Math.round((interval - hoursSinceLastSync) * 10) / 10
      })
    }

    // 需要同步，获取配置的媒体库
    const libraries = syncConfig.libraries || []
    if (libraries.length === 0) {
      return NextResponse.json({ 
        message: '未配置要同步的媒体库',
        needsConfiguration: true
      })
    }

    // 执行同步
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
    const libraryPromises = libraries.map(async (libraryId: string) => {
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

    await Promise.all(libraryPromises)

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
      lastSync: now.toISOString(),
      syncConfig: {
        ...existingData.syncConfig,
        libraries
      }
    }

    await fs.writeFile(LIBRARY_FILE, JSON.stringify(newData, null, 2))

    // 更新配置中的 lastSync
    config.sync = {
      ...config.sync,
      lastSync: now.toISOString()
    }
    await saveConfig(config)

    return NextResponse.json({ 
      success: true,
      message: '自动同步完成',
      synced: items.length,
      movieCount: movieIds.length,
      tvCount: tvIds.length,
      lastSync: now.toISOString()
    })
  } catch (error) {
    console.error('Auto sync error:', error)
    return NextResponse.json({ 
      error: '自动同步失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
