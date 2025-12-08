import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs/promises'
import path from 'path'
import { verifyToken, getUser } from '@/lib/auth'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

// 默认配置
const defaultConfig = {
  tmdb: { apiKey: '', baseUrl: 'https://api.themoviedb.org/3' },
  moviepilot: { url: '', username: '', password: '' },
  emby: [{ name: '服务器1', serverUrl: '', apiKey: '' }],
  telegram: { botToken: '', chatId: '' },
  proxy: { http: '', https: '' }
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (e) {
    // ignore
  }
}

async function loadConfig() {
  await ensureDataDir()
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return defaultConfig
  }
}

async function saveConfig(config: any) {
  await ensureDataDir()
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2))
}

// 提取公开配置（完全不包含任何敏感信息）
function getPublicConfig(config: any) {
  return {
    // 站点基本信息
    site: config.site ? {
      name: config.site.name || 'FlixPilot',
      description: config.site.description || '',
      logo: config.site.logo || ''
    } : { name: 'FlixPilot', description: '', logo: '' },
    // 注册设置（只返回是否开放）
    register: config.register ? {
      enabled: config.register.enabled || false
    } : { enabled: false },
    // 首页模块配置
    homeModules: config.homeModules || {
      welcome: true,
      libraryOverview: true,
      libraryList: true,
      systemStatus: true,
      livePlayback: true,
      todayStats: true,
      recentItems: true,
      quickActions: true
    },
    // 求片配置（只返回额度相关）
    request: config.request ? {
      monthlyQuota: config.request.monthlyQuota || 3,
      quotaExchangeRate: config.request.quotaExchangeRate || 50
    } : { monthlyQuota: 3, quotaExchangeRate: 50 }
  }
}

export async function GET() {
  const config = await loadConfig()
  // 只返回公开配置，不包含任何敏感信息
  return NextResponse.json(getPublicConfig(config))
}

export async function POST(request: Request) {
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
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }
    
    const config = await request.json()
    await saveConfig(config)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
