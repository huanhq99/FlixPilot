import { NextResponse } from 'next/server'
import { loadDeviceConfig, ClientRule } from '@/lib/devices'
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

function matchClient(clientName: string, rule: ClientRule): boolean {
  if (!clientName) return false
  
  if (rule.isRegex) {
    try {
      const regex = new RegExp(rule.pattern, 'i')
      return regex.test(clientName)
    } catch {
      return false
    }
  }
  
  return clientName.toLowerCase().includes(rule.pattern.toLowerCase())
}

function isClientBlocked(clientName: string, blacklist: ClientRule[]): { blocked: boolean; rule?: ClientRule } {
  for (const rule of blacklist) {
    if (matchClient(clientName, rule)) {
      return { blocked: true, rule }
    }
  }
  return { blocked: false }
}

function isClientAllowed(clientName: string, whitelist: ClientRule[]): boolean {
  if (whitelist.length === 0) return true
  
  for (const rule of whitelist) {
    if (matchClient(clientName, rule)) {
      return true
    }
  }
  return false
}

// GET - 实时监控会话并踢掉违规客户端
export async function GET(request: Request) {
  try {
    // 简单的安全验证
    const url = new URL(request.url)
    const secret = url.searchParams.get('secret')
    const expectedSecret = process.env.AUTO_SCAN_SECRET || 'flixpilot-auto-scan'
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: '无效的密钥' }, { status: 401 })
    }
    
    // 获取设备配置
    const deviceConfig = loadDeviceConfig()
    const { whitelist, blacklist } = deviceConfig.clientConfig
    
    // 获取 Emby 配置
    const config = await loadConfig()
    const embyConfig = getEmbyConfig(config)
    
    if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
      return NextResponse.json({ error: '未配置 Emby 服务器' }, { status: 500 })
    }
    
    const baseUrl = embyConfig.serverUrl.replace(/\/$/, '')
    const apiKey = embyConfig.apiKey
    
    // 获取当前正在播放的会话
    const sessionsRes = await fetch(`${baseUrl}/emby/Sessions?api_key=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Monitor", DeviceId="flixpilot-monitor", Version="1.0", Token="${apiKey}"`
      }
    })
    
    if (!sessionsRes.ok) {
      return NextResponse.json({ error: '获取会话失败' }, { status: 500 })
    }
    
    const sessions = await sessionsRes.json()
    
    const results = {
      totalSessions: sessions.length,
      activePlaying: 0,
      kicked: 0,
      kickedSessions: [] as any[]
    }
    
    // 检查每个会话
    for (const session of sessions) {
      const clientName = session.Client || session.DeviceName || ''
      const sessionId = session.Id
      const userId = session.UserId
      const deviceId = session.DeviceId
      const userName = session.UserName || 'Unknown'
      const nowPlaying = session.NowPlayingItem
      
      // 检查是否在播放
      if (nowPlaying) {
        results.activePlaying++
      }
      
      // 检查黑名单
      const blockCheck = isClientBlocked(clientName, blacklist)
      if (blockCheck.blocked) {
        // 踢掉用户 - 停止播放
        if (nowPlaying) {
          try {
            await fetch(`${baseUrl}/emby/Sessions/${sessionId}/Playing/Stop?api_key=${apiKey}`, {
              method: 'POST',
              headers: {
                'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Monitor", DeviceId="flixpilot-monitor", Version="1.0", Token="${apiKey}"`
              }
            })
          } catch (e) {
            console.error('停止播放失败:', e)
          }
        }
        
        // 发送消息通知用户
        try {
          await fetch(`${baseUrl}/emby/Sessions/${sessionId}/Message?api_key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Monitor", DeviceId="flixpilot-monitor", Version="1.0", Token="${apiKey}"`
            },
            body: JSON.stringify({
              Header: '客户端已被禁止',
              Text: `您使用的客户端 ${clientName} 已被管理员禁止，请更换其他客户端。`,
              TimeoutMs: 10000
            })
          })
        } catch (e) {
          console.error('发送消息失败:', e)
        }
        
        // 删除设备
        try {
          await fetch(`${baseUrl}/emby/Devices?Id=${encodeURIComponent(deviceId)}&api_key=${apiKey}`, {
            method: 'DELETE',
            headers: {
              'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Monitor", DeviceId="flixpilot-monitor", Version="1.0", Token="${apiKey}"`
            }
          })
        } catch (e) {
          console.error('删除设备失败:', e)
        }
        
        results.kicked++
        results.kickedSessions.push({
          sessionId,
          userName,
          client: clientName,
          reason: `黑名单: ${blockCheck.rule?.name}`,
          wasPlaying: !!nowPlaying
        })
        continue
      }
      
      // 检查白名单
      if (whitelist.length > 0 && !isClientAllowed(clientName, whitelist)) {
        // 同样踢掉
        if (nowPlaying) {
          try {
            await fetch(`${baseUrl}/emby/Sessions/${sessionId}/Playing/Stop?api_key=${apiKey}`, {
              method: 'POST',
              headers: {
                'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Monitor", DeviceId="flixpilot-monitor", Version="1.0", Token="${apiKey}"`
              }
            })
          } catch (e) {
            console.error('停止播放失败:', e)
          }
        }
        
        // 发送消息
        try {
          await fetch(`${baseUrl}/emby/Sessions/${sessionId}/Message?api_key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Monitor", DeviceId="flixpilot-monitor", Version="1.0", Token="${apiKey}"`
            },
            body: JSON.stringify({
              Header: '客户端不在白名单',
              Text: `您使用的客户端 ${clientName} 不在允许列表中，请更换其他客户端。`,
              TimeoutMs: 10000
            })
          })
        } catch (e) {
          console.error('发送消息失败:', e)
        }
        
        // 删除设备
        try {
          await fetch(`${baseUrl}/emby/Devices?Id=${encodeURIComponent(deviceId)}&api_key=${apiKey}`, {
            method: 'DELETE',
            headers: {
              'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Monitor", DeviceId="flixpilot-monitor", Version="1.0", Token="${apiKey}"`
            }
          })
        } catch (e) {
          console.error('删除设备失败:', e)
        }
        
        results.kicked++
        results.kickedSessions.push({
          sessionId,
          userName,
          client: clientName,
          reason: '不在白名单',
          wasPlaying: !!nowPlaying
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    })
    
  } catch (error: any) {
    console.error('会话监控失败:', error)
    return NextResponse.json({ error: error.message || '监控失败' }, { status: 500 })
  }
}
