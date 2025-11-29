import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, loadUsers, saveUsers } from '@/lib/auth'
import crypto from 'crypto'

// 生成 Telegram 绑定码
export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }
    
    const users = await loadUsers()
    const userIndex = users.findIndex(u => u.id === payload.userId)
    
    if (userIndex === -1) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    // 生成 6 位随机绑定码
    const bindCode = crypto.randomBytes(3).toString('hex').toUpperCase()
    
    // 保存到用户信息（5分钟有效）
    users[userIndex].telegramBindCode = bindCode
    users[userIndex].telegramBindCodeExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    
    await saveUsers(users)
    
    return NextResponse.json({ 
      code: bindCode,
      expiresIn: 300 // 5分钟
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// 获取当前绑定状态
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }
    
    const users = await loadUsers()
    const user = users.find(u => u.id === payload.userId)
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    return NextResponse.json({
      bound: !!user.telegramId,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// 解除绑定
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }
    
    const users = await loadUsers()
    const userIndex = users.findIndex(u => u.id === payload.userId)
    
    if (userIndex === -1) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    // 清除绑定
    delete users[userIndex].telegramId
    delete users[userIndex].telegramUsername
    delete users[userIndex].telegramBindCode
    
    await saveUsers(users)
    
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
