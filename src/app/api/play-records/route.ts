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
  const config = getConfig()
  
  if (!config?.embyUrl || !config?.embyApiKey) {
    return NextResponse.json({ 
      success: false, 
      error: '请先配置 Emby 服务器',
      sessions: []
    })
  }

  try {
    // 获取当前活动会话
    const sessionsUrl = `${config.embyUrl}/emby/Sessions?api_key=${config.embyApiKey}`
    const sessionsRes = await fetch(sessionsUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    })
    
    if (!sessionsRes.ok) {
      throw new Error(`获取会话失败: ${sessionsRes.status}`)
    }
    
    const sessions = await sessionsRes.json()
    
    // 过滤正在播放的会话
    const activeSessions = sessions
      .filter((session: any) => session.NowPlayingItem)
      .map((session: any) => {
        const item = session.NowPlayingItem
        const playState = session.PlayState || {}
        
        // 计算播放进度
        const positionTicks = playState.PositionTicks || 0
        const durationTicks = item.RunTimeTicks || 1
        const progress = Math.round((positionTicks / durationTicks) * 100)
        
        // 格式化播放时间
        const positionSeconds = Math.floor(positionTicks / 10000000)
        const durationSeconds = Math.floor(durationTicks / 10000000)
        
        const formatTime = (seconds: number) => {
          const h = Math.floor(seconds / 3600)
          const m = Math.floor((seconds % 3600) / 60)
          const s = seconds % 60
          if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
          }
          return `${m}:${s.toString().padStart(2, '0')}`
        }
        
        return {
          sessionId: session.Id,
          user: {
            id: session.UserId,
            name: session.UserName,
            avatar: session.UserId ? `${config.embyUrl}/emby/Users/${session.UserId}/Images/Primary?api_key=${config.embyApiKey}` : null
          },
          device: {
            name: session.DeviceName,
            client: session.Client,
            id: session.DeviceId
          },
          media: {
            id: item.Id,
            name: item.SeriesName ? `${item.SeriesName} - S${item.ParentIndexNumber}E${item.IndexNumber} - ${item.Name}` : item.Name,
            type: item.Type,
            year: item.ProductionYear,
            poster: `${config.embyUrl}/emby/Items/${item.Id}/Images/Primary?maxHeight=200&api_key=${config.embyApiKey}`,
            backdrop: item.ParentBackdropItemId 
              ? `${config.embyUrl}/emby/Items/${item.ParentBackdropItemId}/Images/Backdrop?api_key=${config.embyApiKey}`
              : null
          },
          playback: {
            progress,
            position: formatTime(positionSeconds),
            duration: formatTime(durationSeconds),
            isPaused: playState.IsPaused || false,
            isMuted: playState.IsMuted || false,
            playMethod: playState.PlayMethod || 'Unknown',
            audioStreamIndex: playState.AudioStreamIndex,
            subtitleStreamIndex: playState.SubtitleStreamIndex
          },
          transcodingInfo: session.TranscodingInfo ? {
            isTranscoding: true,
            videoCodec: session.TranscodingInfo.VideoCodec,
            audioCodec: session.TranscodingInfo.AudioCodec,
            container: session.TranscodingInfo.Container,
            bitrate: session.TranscodingInfo.Bitrate,
            completionPercentage: session.TranscodingInfo.CompletionPercentage
          } : {
            isTranscoding: false
          },
          lastActivityDate: session.LastActivityDate
        }
      })
    
    return NextResponse.json({
      success: true,
      sessions: activeSessions,
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('获取播放会话失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误',
      sessions: []
    })
  }
}
