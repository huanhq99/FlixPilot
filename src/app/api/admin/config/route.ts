import { NextRequest, NextResponse } from 'next/server'
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
  } catch (e: any) {
    console.error('[Config API] 创建数据目录失败:', e.message)
    throw new Error(`无法创建数据目录: ${e.message}`)
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
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (e: any) {
    console.error('[Config API] 写入配置文件失败:', e.message)
    throw new Error(`无法保存配置文件: ${e.message}`)
  }
}

// 验证管理员权限
async function checkAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  
  if (!token) {
    return { error: '未登录', status: 401 }
  }
  
  const payload = verifyToken(token)
  if (!payload) {
    return { error: '登录已过期', status: 401 }
  }
  
  const user = getUser(payload.userId)
  if (!user || user.role !== 'admin') {
    return { error: '需要管理员权限', status: 403 }
  }
  
  return { user }
}

// GET - 获取完整配置（仅管理员）
export async function GET() {
  try {
    const authResult = await checkAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    
    const config = await loadConfig()
    return NextResponse.json(config)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - 保存配置（仅管理员）
export async function POST(request: Request) {
  try {
    const authResult = await checkAdmin()
    if ('error' in authResult) {
      console.error('[Config API] 权限验证失败:', authResult.error)
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    
    const config = await request.json()
    await saveConfig(config)
    console.log('[Config API] 配置保存成功')
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[Config API] 保存配置失败:', e)
    return NextResponse.json({ error: e.message || '保存配置时出错' }, { status: 500 })
  }
}
