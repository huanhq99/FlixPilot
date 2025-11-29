import { NextResponse } from 'next/server'
import { login, generateToken, initializeSystem, needsInitialization } from '@/lib/auth'

// GET - 检查首次启动状态
export async function GET() {
  try {
    if (needsInitialization()) {
      const credentials = initializeSystem()
      if (credentials) {
        return NextResponse.json({
          firstTime: true,
          credentials
        })
      }
    }
    return NextResponse.json({ firstTime: false })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 })
    }
    
    const user = login(username, password)
    
    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }
    
    const token = generateToken(user)
    
    // 设置 httpOnly cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        popcorn: user.popcorn,
        embyUsername: user.embyUsername,
        signInStreak: user.signInStreak || 0
      }
    })
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60  // 7天
    })
    
    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
