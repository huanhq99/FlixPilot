import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// 配置文件路径
const configPath = path.join(process.cwd(), 'data', 'config.json')

function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      // 获取第一个 Emby 服务器配置
      if (config.emby && Array.isArray(config.emby) && config.emby.length > 0) {
        const embyServer = config.emby[0]
        return {
          embyUrl: embyServer.serverUrl,
          embyApiKey: embyServer.apiKey,
          ...config
        }
      }
      return config
    }
  } catch (e) {
    console.error('读取配置失败:', e)
  }
  return null
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get('period') || 'today' // today, week, month, all
  
  const config = getConfig()
  if (!config?.embyUrl || !config?.embyApiKey) {
    return NextResponse.json({ 
      error: '请先配置 Emby 服务器',
      mediaRank: [],
      userRank: []
    })
  }

  try {
    const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365
    
    // 使用 PlaybackReporting 插件的 UserPlaylist API
    const reportUrl = `${config.embyUrl}/emby/user_usage_stats/UserPlaylist?days=${days}&limit=5000&api_key=${config.embyApiKey}`
    const reportRes = await fetch(reportUrl, { 
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    })
    
    if (!reportRes.ok) {
      throw new Error(`获取播放数据失败: ${reportRes.status}`)
    }
    
    const playHistory: any[] = await reportRes.json()
    
    if (!Array.isArray(playHistory) || playHistory.length === 0) {
      return NextResponse.json({
        mediaRank: [],
        userRank: []
      })
    }
    
    // 统计每个媒体的播放次数和总时长
    // 对于剧集，按剧集名聚合
    const mediaStats: Map<string, {
      id: number,
      name: string,
      type: string,
      playCount: number,
      totalDuration: number,
      userDetails: Map<string, { playCount: number, duration: number, lastPlay: string }>
    }> = new Map()

    // 统计用户播放数据
    const userStats: Map<string, {
      userName: string,
      playCount: number,
      totalDuration: number
    }> = new Map()
    
    for (const record of playHistory) {
      // item_name 格式: "剧名 - s01e01 - 集名" 或 "电影名"
      const itemName = record.item_name || ''
      const itemId = record.item_id
      const itemType = record.item_type || 'Unknown'
      const duration = parseInt(record.duration) || 0
      const userName = record.user_name || 'Unknown'
      const playDate = record.date || ''
      
      // 统计用户数据
      if (userStats.has(userName)) {
        const stat = userStats.get(userName)!
        stat.playCount++
        stat.totalDuration += duration
      } else {
        userStats.set(userName, {
          userName,
          playCount: 1,
          totalDuration: duration
        })
      }
      
      // 对于剧集，提取剧名作为聚合键
      let aggregateKey: string
      let displayName: string
      
      if (itemType === 'Episode') {
        // 提取剧名: "知否知否应是绿肥红瘦 - s01e39 - 盛长柏撞破如兰恋情" -> "知否知否应是绿肥红瘦"
        const match = itemName.match(/^(.+?)\s*-\s*s\d+e\d+/i)
        if (match) {
          displayName = match[1].trim()
          aggregateKey = `series:${displayName}`
        } else {
          displayName = itemName
          aggregateKey = `episode:${itemId}`
        }
      } else {
        displayName = itemName
        aggregateKey = `${itemType}:${itemId}`
      }
      
      if (mediaStats.has(aggregateKey)) {
        const stat = mediaStats.get(aggregateKey)!
        stat.playCount++
        stat.totalDuration += duration
        // 更新用户详情
        if (stat.userDetails.has(userName)) {
          const userDetail = stat.userDetails.get(userName)!
          userDetail.playCount++
          userDetail.duration += duration
          if (playDate > userDetail.lastPlay) userDetail.lastPlay = playDate
        } else {
          stat.userDetails.set(userName, { playCount: 1, duration, lastPlay: playDate })
        }
      } else {
        const userDetails = new Map<string, { playCount: number, duration: number, lastPlay: string }>()
        userDetails.set(userName, { playCount: 1, duration, lastPlay: playDate })
        mediaStats.set(aggregateKey, {
          id: itemId,
          name: displayName,
          type: itemType === 'Episode' ? 'tv' : 'movie',
          playCount: 1,
          totalDuration: duration,
          userDetails
        })
      }
    }
    
    // 媒体排行
    const mediaRank = Array.from(mediaStats.values())
      .sort((a, b) => b.playCount - a.playCount || b.totalDuration - a.totalDuration)
      .slice(0, 30)
      .map((item, index) => ({
        rank: index + 1,
        title: item.name,
        type: item.type,
        playCount: item.playCount,
        users: item.userDetails.size,
        totalDuration: Math.round(item.totalDuration / 60), // 分钟
        poster: `${config.embyUrl}/emby/Items/${item.id}/Images/Primary?maxHeight=300&api_key=${config.embyApiKey}`,
        // 用户详情列表
        userList: Array.from(item.userDetails.entries())
          .map(([name, detail]) => ({
            userName: name,
            playCount: detail.playCount,
            duration: Math.round(detail.duration / 60),
            lastPlay: detail.lastPlay
          }))
          .sort((a, b) => b.duration - a.duration)
      }))

    // 用户排行 (按播放时长)
    const userRank = Array.from(userStats.values())
      .sort((a, b) => b.totalDuration - a.totalDuration || b.playCount - a.playCount)
      .slice(0, 10)
      .map((user, index) => ({
        rank: index + 1,
        userName: user.userName,
        playCount: user.playCount,
        watchTime: Math.round(user.totalDuration / 60) // 转换为分钟
      }))

    return NextResponse.json({
      mediaRank,
      userRank
    })

  } catch (error) {
    console.error('获取播放排行失败:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '未知错误',
      mediaRank: [],
      userRank: []
    })
  }
}
