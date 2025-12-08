import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser, loadUsers, saveUsers, verifyPassword } from '@/lib/auth'
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
    return { emby: [] }
  }
}

// 获取 Emby 配置
function getEmbyConfig(config: any) {
  if (Array.isArray(config.emby) && config.emby.length > 0) {
    return config.emby[0]
  }
  if (config.emby?.serverUrl) {
    return config.emby
  }
  return null
}

// 在 Emby 创建用户
async function createEmbyUser(username: string, password: string, embyConfig: any): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const serverUrl = embyConfig.serverUrl.replace(/\/$/, '')
    const apiKey = embyConfig.apiKey

    // 1. 先检查用户是否已存在
    const usersRes = await fetch(`${serverUrl}/emby/Users?api_key=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      }
    })

    if (usersRes.ok) {
      const users = await usersRes.json()
      const existingUser = users.find((u: any) => u.Name.toLowerCase() === username.toLowerCase())
      if (existingUser) {
        // 用户已存在，返回用户ID
        return { success: true, userId: existingUser.Id }
      }
    }

    // 2. 创建新用户
    const createRes = await fetch(`${serverUrl}/emby/Users/New?api_key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      },
      body: JSON.stringify({
        Name: username
      })
    })

    if (!createRes.ok) {
      const errorText = await createRes.text()
      console.error('Create Emby user failed:', errorText)
      return { success: false, error: '创建 Emby 用户失败' }
    }

    const newUser = await createRes.json()
    const userId = newUser.Id

    // 3. 设置用户密码
    const passwordRes = await fetch(`${serverUrl}/emby/Users/${userId}/Password?api_key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      },
      body: JSON.stringify({
        NewPw: password,
        ResetPassword: false
      })
    })

    if (!passwordRes.ok) {
      console.error('Set Emby user password failed')
    }

    return { success: true, userId }
  } catch (error) {
    console.error('createEmbyUser error:', error)
    return { success: false, error: '创建 Emby 用户时发生错误' }
  }
}

// POST - 为有会员但没有 Emby 账号的用户创建账号
export async function POST(request: NextRequest) {
  try {
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
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: '请输入网站密码' }, { status: 400 })
    }

    // 验证用户密码是否正确
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: '密码错误' }, { status: 400 })
    }

    // 检查是否已有 Emby 账号
    if (user.embyUserId) {
      return NextResponse.json({ error: '您已有 Emby 账号' }, { status: 400 })
    }

    // 检查是否有会员资格
    const hasMembership = user.isWhitelist || 
      (user.membershipExpiry && new Date(user.membershipExpiry) > new Date())
    
    if (!hasMembership) {
      return NextResponse.json({ error: '请先激活会员' }, { status: 400 })
    }

    // 加载配置
    const config = await loadConfig()
    const embyConfig = getEmbyConfig(config)

    if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
      return NextResponse.json({ error: '管理员尚未配置 Emby 服务器' }, { status: 500 })
    }

    // 创建 Emby 用户（使用用户提供的密码）
    const embyResult = await createEmbyUser(user.username, password, embyConfig)

    if (!embyResult.success) {
      return NextResponse.json({ error: embyResult.error || '创建 Emby 用户失败' }, { status: 500 })
    }

    // 更新用户数据
    const users = loadUsers()
    const userIndex = users.findIndex(u => u.id === user.id)
    
    if (userIndex !== -1) {
      users[userIndex].embyUserId = embyResult.userId
      users[userIndex].embyUsername = user.username
      saveUsers(users)
    }

    return NextResponse.json({
      success: true,
      message: `Emby 账号创建成功！\n用户名: ${user.username}\n服务器: ${embyConfig.serverUrl}`,
      emby: {
        userId: embyResult.userId,
        username: user.username,
        serverUrl: embyConfig.serverUrl
      }
    })
  } catch (error) {
    console.error('Create Emby account error:', error)
    return NextResponse.json({ error: '创建 Emby 账号失败' }, { status: 500 })
  }
}
