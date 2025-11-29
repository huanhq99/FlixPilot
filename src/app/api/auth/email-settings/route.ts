import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser, updateUser } from '@/lib/auth'

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
      return NextResponse.json({ error: '用户不存在' }, { status: 401 })
    }
    
    const body = await request.json()
    const { email, emailNotifications } = body
    
    // 验证邮箱格式
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }
    
    // 更新用户邮箱设置
    updateUser(user.id, {
      email: email || '',
      emailNotifications: emailNotifications !== false
    })
    
    return NextResponse.json({ 
      success: true, 
      message: '邮箱设置已更新' 
    })
  } catch (error) {
    console.error('更新邮箱设置失败:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
