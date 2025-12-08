import { NextResponse } from 'next/server'
import { loadUsers, saveUsers, verifyToken, getUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const JWT_SECRET = process.env.JWT_SECRET || 'flixpilot-secret-key-2024'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex')
}

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

interface EmbyUser {
  Id: string
  Name: string
  Policy?: {
    IsDisabled?: boolean
    IsAdministrator?: boolean
  }
}

// POST - 从Emby导入用户
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
    
    const authUser = getUser(payload.userId)
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { embyUserIds, password, isWhitelist } = body

    if (!Array.isArray(embyUserIds) || embyUserIds.length === 0) {
      return NextResponse.json({ error: '请选择要导入的用户' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: '密码至少需要6位' }, { status: 400 })
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

    const embyUsers: EmbyUser[] = await response.json()
    
    // 加载现有用户
    const users = loadUsers()
    const existingEmbyIds = new Set(users.filter(u => u.embyUserId).map(u => u.embyUserId))
    const existingUsernames = new Set(users.map(u => u.username.toLowerCase()))
    
    let importedCount = 0
    const now = new Date().toISOString()
    const passwordHash = hashPassword(password)

    for (const embyUserId of embyUserIds) {
      // 跳过已绑定的
      if (existingEmbyIds.has(embyUserId)) continue

      const embyUser = embyUsers.find(u => u.Id === embyUserId)
      if (!embyUser) continue

      // 检查用户名是否已存在
      let username = embyUser.Name
      if (existingUsernames.has(username.toLowerCase())) {
        // 如果用户名已存在，添加后缀
        let suffix = 1
        while (existingUsernames.has(`${username.toLowerCase()}_${suffix}`)) {
          suffix++
        }
        username = `${username}_${suffix}`
      }
      existingUsernames.add(username.toLowerCase())

      // 创建新用户
      const newUser = {
        id: crypto.randomUUID(),
        username,
        passwordHash,
        role: 'user' as const,
        popcorn: 0,
        signInStreak: 0,
        embyUserId: embyUser.Id,
        embyUsername: embyUser.Name,
        createdAt: now,
        isWhitelist: isWhitelist || false,
        membershipStartedAt: isWhitelist ? now : undefined
      }

      users.push(newUser)
      importedCount++
    }

    saveUsers(users)

    return NextResponse.json({ success: true, imported: importedCount })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '未知错误' }, { status: 500 })
  }
}
