// Emby 基础功能库
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

// 加载配置
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return {}
  }
}

// 获取 Emby 配置
async function getEmbyConfig() {
  const config = await loadConfig()
  if (Array.isArray(config.emby) && config.emby.length > 0) {
    return config.emby[0]
  }
  if (config.emby?.serverUrl) {
    return config.emby
  }
  return null
}

// 获取所有 Emby 用户
export async function getEmbyUsers() {
  const embyConfig = await getEmbyConfig()
  
  if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
    return []
  }
  
  const serverUrl = embyConfig.serverUrl.replace(/\/$/, '')
  const apiKey = embyConfig.apiKey
  
  try {
    const res = await fetch(`${serverUrl}/emby/Users?api_key=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      },
      cache: 'no-store'
    })
    
    if (!res.ok) {
      console.error('Failed to fetch Emby users:', res.status)
      return []
    }
    
    return await res.json()
  } catch (e) {
    console.error('Error fetching Emby users:', e)
    return []
  }
}
