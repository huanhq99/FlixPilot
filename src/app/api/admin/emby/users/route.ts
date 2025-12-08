import { NextResponse } from 'next/server'
import { verifyToken, getUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { emby: [] }
  }
}

function getEmbyConfig(config: Record<string, unknown>) {
  const emby = config.emby as Record<string, unknown>[] | { serverUrl?: string; apiKey?: string }
  if (Array.isArray(emby) && emby.length > 0) {
    return emby[0] as { serverUrl: string; apiKey: string }
  }
  if (emby && typeof emby === 'object' && 'serverUrl' in emby) {
    return emby as { serverUrl: string; apiKey: string }
  }
  return null
}

// GET - 获取Emby用户列表
export async function GET() {
  try {
    // 验证管理员权限
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }
    
    const user = getUser(payload.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const config = await loadConfig()
    const embyConfig = getEmbyConfig(config)

    if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
      return NextResponse.json({ error: '请先配置Emby服务器' }, { status: 400 })
    }

    // 获取Emby用户列表
    const embyUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/Users?api_key=${embyConfig.apiKey}`
    
    const response = await fetch(embyUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Web", DeviceId="flixpilot-web", Version="1.0", Token="${embyConfig.apiKey}"`
      }
    })

    if (!response.ok) {
      throw new Error(`Emby API error: ${response.status}`)
    }

    const users = await response.json()
    
    return NextResponse.json({ users })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '未知错误' }, { status: 500 })
  }
}
