import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, loadUsers, saveUsers, verifyPassword } from '@/lib/auth'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'flixpilot-secret-key-2024'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex')
}

// 用户修改自己的密码
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

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码至少6位' }, { status: 400 })
    }

    const users = loadUsers()
    const userIndex = users.findIndex(u => u.id === payload.userId)
    
    if (userIndex === -1) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const user = users[userIndex]

    // 验证当前密码
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: '当前密码错误' }, { status: 400 })
    }

    // 更新密码
    users[userIndex].passwordHash = hashPassword(newPassword)
    saveUsers(users)

    return NextResponse.json({ success: true, message: '密码修改成功' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 })
  }
}
