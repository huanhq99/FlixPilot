import { NextResponse } from 'next/server'
import { loadUsers } from '@/lib/auth'

// GET - 获取所有用户
export async function GET() {
  try {
    const users = await loadUsers()
    
    // 移除敏感信息
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      popcorn: u.popcorn,
      signInStreak: u.signInStreak,
      embyUsername: u.embyUsername,
      createdAt: u.createdAt,
      lastSignIn: u.lastSignIn
    }))
    
    return NextResponse.json({ users: safeUsers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
