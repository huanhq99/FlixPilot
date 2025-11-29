import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, bindEmbyAccount, getUser } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

function getEmbyConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
      if (Array.isArray(config.emby) && config.emby.length > 0) {
        return config.emby[0]
      }
    }
  } catch (e) {}
  return null
}

// 验证 Emby 账号密码
async function verifyEmbyCredentials(serverUrl: string, username: string, password: string) {
  try {
    const baseUrl = serverUrl.replace(/\/$/, '')
    
    const res = await fetch(`${baseUrl}/emby/Users/AuthenticateByName`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': 'MediaBrowser Client="StreamHub", Device="Web", DeviceId="streamhub", Version="1.0"'
      },
      body: JSON.stringify({
        Username: username,
        Pw: password
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      return {
        success: true,
        userId: data.User.Id,
        username: data.User.Name
      }
    }
    
    return { success: false, error: '账号或密码错误' }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// 绑定 Emby 账号
export async function POST(request: Request) {
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
    
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json({ error: '请输入 Emby 账号密码' }, { status: 400 })
    }
    
    const embyConfig = getEmbyConfig()
    if (!embyConfig) {
      return NextResponse.json({ error: '管理员未配置 Emby 服务器' }, { status: 400 })
    }
    
    // 验证 Emby 账号
    const result = await verifyEmbyCredentials(embyConfig.serverUrl, username, password)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }
    
    // 绑定账号
    bindEmbyAccount(payload.userId, result.userId, result.username)
    
    return NextResponse.json({
      success: true,
      embyUsername: result.username,
      message: '绑定成功'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 获取绑定状态和 Emby 服务器信息
export async function GET() {
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
    const embyConfig = getEmbyConfig()
    
    return NextResponse.json({
      bound: !!user?.embyUserId,
      embyUsername: user?.embyUsername,
      serverUrl: user?.embyUserId ? embyConfig?.serverUrl : null,  // 只有绑定后才显示服务器地址
      serverConfigured: !!embyConfig
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
