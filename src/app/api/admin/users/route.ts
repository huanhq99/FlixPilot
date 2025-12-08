import { NextResponse } from 'next/server'
import { loadUsers, verifyToken, getUser } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - 获取所有用户
export async function GET() {
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

    const users = loadUsers()
    
    // 移除敏感信息，但保留会员相关字段
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      popcorn: u.popcorn || 0,
      signInStreak: u.signInStreak || 0,
      embyUserId: u.embyUserId,
      embyUsername: u.embyUsername,
      membershipExpiry: u.membershipExpiry,
      membershipStartedAt: u.membershipStartedAt,
      isWhitelist: u.isWhitelist || false,
      createdAt: u.createdAt,
      lastSignIn: u.lastSignIn,
      monthlyTraffic: u.monthlyTraffic || 0,
      usedTraffic: u.usedTraffic || 0,
      trafficStats: u.trafficStats || null
    }))
    
    return NextResponse.json({ users: safeUsers })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '未知错误' }, { status: 500 })
  }
}
