import { NextResponse } from 'next/server'
import { loadUsers, saveUsers, verifyToken, getUser } from '@/lib/auth'
import { cookies } from 'next/headers'

// POST - 批量更新用户
export async function POST(request: Request) {
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

    const body = await request.json()
    const { userIds, ...updates } = body

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: '请选择用户' }, { status: 400 })
    }

    const users = loadUsers()
    let updatedCount = 0

    for (const userId of userIds) {
      const userIndex = users.findIndex(u => u.id === userId)
      if (userIndex < 0) continue

      // 更新字段
      if (typeof updates.isWhitelist === 'boolean') {
        users[userIndex].isWhitelist = updates.isWhitelist
      }
      if (updates.membershipExpiry !== undefined) {
        users[userIndex].membershipExpiry = updates.membershipExpiry || undefined
        // 如果设置了到期时间且没有开通时间，设置开通时间
        if (updates.membershipExpiry && !users[userIndex].membershipStartedAt) {
          users[userIndex].membershipStartedAt = new Date().toISOString()
        }
      }
      if (typeof updates.popcorn === 'number') {
        users[userIndex].popcorn = updates.popcorn
      }

      updatedCount++
    }

    saveUsers(users)

    return NextResponse.json({ success: true, updated: updatedCount })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '未知错误' }, { status: 500 })
  }
}
