import { NextResponse } from 'next/server'
import { loadUsers, saveUsers, verifyToken, getUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'flixpilot-secret-key-2024'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex')
}

// POST - 重置用户密码
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { password } = body

    if (!password || password.length < 6) {
      return NextResponse.json({ error: '密码至少需要6位' }, { status: 400 })
    }

    const users = loadUsers()
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex < 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    users[userIndex].passwordHash = hashPassword(password)
    saveUsers(users)

    return NextResponse.json({ success: true, message: '密码已重置' })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '未知错误' }, { status: 500 })
  }
}
