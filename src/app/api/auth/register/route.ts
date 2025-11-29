import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { createUser, generateToken } from '@/lib/auth'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return {}
  }
}

// POST - 用户注册
export async function POST(request: Request) {
  try {
    const config = await loadConfig()
    const registerConfig = config.register || { enabled: false }
    
    // 检查是否开放注册
    if (!registerConfig.enabled) {
      return NextResponse.json({ error: '注册功能已关闭' }, { status: 403 })
    }
    
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 })
    }
    
    // 用户名验证
    if (username.length < 3) {
      return NextResponse.json({ error: '用户名至少3个字符' }, { status: 400 })
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: '用户名只能包含字母、数字和下划线' }, { status: 400 })
    }
    
    // 密码验证
    const minLength = registerConfig.minPasswordLength || 6
    if (password.length < minLength) {
      return NextResponse.json({ error: `密码至少${minLength}个字符` }, { status: 400 })
    }
    
    if (registerConfig.requireUppercase && !/[A-Z]/.test(password)) {
      return NextResponse.json({ error: '密码需要包含大写字母' }, { status: 400 })
    }
    
    if (registerConfig.requireNumber && !/[0-9]/.test(password)) {
      return NextResponse.json({ error: '密码需要包含数字' }, { status: 400 })
    }
    
    // 创建用户
    const user = createUser(username, password, 'user')
    
    if (!user) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 })
    }
    
    // 设置默认爆米花
    const defaultPopcorn = registerConfig.defaultPopcorn || 50
    if (defaultPopcorn > 0) {
      // 更新用户爆米花（createUser 默认是 0）
      const { loadUsers, saveUsers } = await import('@/lib/auth')
      const users = loadUsers()
      const userIndex = users.findIndex(u => u.id === user.id)
      if (userIndex >= 0) {
        users[userIndex].popcorn = defaultPopcorn
        saveUsers(users)
      }
    }
    
    // 自动登录
    const token = generateToken(user)
    
    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        popcorn: defaultPopcorn,
        signInStreak: 0
      }
    })
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    })
    
    return response
  } catch (error: any) {
    console.error('Register error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - 获取注册配置
export async function GET() {
  try {
    const config = await loadConfig()
    const registerConfig = config.register || { enabled: false }
    
    return NextResponse.json({
      enabled: registerConfig.enabled,
      minPasswordLength: registerConfig.minPasswordLength || 6,
      requireUppercase: registerConfig.requireUppercase || false,
      requireNumber: registerConfig.requireNumber || false
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
