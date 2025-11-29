import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

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

// 检查电视剧每一集的入库状态
// GET /api/library/episodes?tmdbId=12345&seasons=1,2,3
export async function GET(request: Request) {
  const url = new URL(request.url)
  const tmdbId = url.searchParams.get('tmdbId')
  const seasonsParam = url.searchParams.get('seasons') // 逗号分隔的季数

  if (!tmdbId) {
    return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 })
  }

  const config = await loadConfig()
  const embyConfig = getEmbyConfig(config)

  if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
    return NextResponse.json({ 
      error: 'Emby not configured',
      episodes: {} 
    })
  }

  try {
    // 1. 在 Emby 中搜索这个 TMDB ID 对应的电视剧
    const searchUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/Items?api_key=${embyConfig.apiKey}&IncludeItemTypes=Series&Recursive=true&AnyProviderIdEquals=tmdb.${tmdbId}`
    
    const searchRes = await fetch(searchUrl, {
      headers: { 'X-Emby-Token': embyConfig.apiKey }
    })
    
    if (!searchRes.ok) {
      throw new Error('Failed to search Emby')
    }
    
    const searchData = await searchRes.json()
    
    if (!searchData.Items || searchData.Items.length === 0) {
      // 电视剧不在 Emby 中
      return NextResponse.json({ 
        found: false,
        episodes: {} 
      })
    }
    
    // 3. 构建入库状态 Map - 合并所有匹配的电视剧（可能在不同媒体库中）
    // 格式: { "S01E01": true, "S01E02": true, ... }
    const episodeStatus: Record<string, boolean> = {}
    const seriesNames: string[] = []
    
    // 遍历所有匹配的电视剧条目（可能来自不同媒体库）
    for (const series of searchData.Items) {
      const seriesId = series.Id
      seriesNames.push(`${series.Name} (${series.Id})`)
      
      // 获取该电视剧的所有剧集 - 包含 MediaSources 和 Path 字段
      const episodesUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/Shows/${seriesId}/Episodes?api_key=${embyConfig.apiKey}&Fields=Overview,MediaSources,Path`
      
      try {
        const episodesRes = await fetch(episodesUrl, {
          headers: { 'X-Emby-Token': embyConfig.apiKey }
        })
        
        if (!episodesRes.ok) {
          console.warn(`Failed to get episodes for series ${seriesId}`)
          continue
        }
        
        const episodesData = await episodesRes.json()
        
        for (const ep of episodesData.Items || []) {
          const seasonNum = ep.ParentIndexNumber
          const epNum = ep.IndexNumber
          
          if (seasonNum !== undefined && epNum !== undefined) {
            const key = `S${String(seasonNum).padStart(2, '0')}E${String(epNum).padStart(2, '0')}`
            // 检查是否有视频文件:
            // 1. LocationType 不是 Virtual 表示有实际文件
            // 2. 或者有 MediaSources
            // 3. 或者有 Path 属性
            const hasFile = ep.LocationType !== 'Virtual' || 
                           (ep.MediaSources && ep.MediaSources.length > 0) ||
                           ep.Path
            // 只要有一个库有这集，就标记为已入库
            if (hasFile) {
              episodeStatus[key] = true
            }
          }
        }
      } catch (e) {
        console.warn(`Error fetching episodes for series ${seriesId}:`, e)
      }
    }
    
    return NextResponse.json({
      found: true,
      seriesCount: searchData.Items.length,
      seriesNames,
      episodes: episodeStatus
    })
    
  } catch (e: any) {
    console.error('Check episodes error:', e)
    return NextResponse.json({ 
      error: e.message,
      episodes: {} 
    })
  }
}
