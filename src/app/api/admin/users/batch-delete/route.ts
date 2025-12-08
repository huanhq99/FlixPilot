import { NextResponse } from 'next/server'
import { loadUsers, saveUsers, verifyToken, getUser } from '@/lib/auth'
import { loadEmbyConfig, deleteEmbyUser } from '@/lib/embyUser'
import { cookies } from 'next/headers'

// POST - 批量删除用户
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
    const { userIds } = body

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: '请选择用户' }, { status: 400 })
    }

    const users = loadUsers()
    const embyConfig = loadEmbyConfig()
    let deletedCount = 0

    // 过滤出要保留的用户（排除要删除的非管理员用户）
    const remainingUsers = users.filter(u => {
      if (userIds.includes(u.id)) {
        // 不允许删除管理员
        if (u.role === 'admin') {
          return true // 保留管理员
        }
        
        // 删除关联的 Emby 账号
        if (u.embyUserId && embyConfig) {
          deleteEmbyUser(u.embyUserId, embyConfig).catch(err => {
            console.error(`删除用户 ${u.username} 的 Emby 账号失败:`, err)
          })
        }
        
        deletedCount++
        return false // 删除普通用户
      }
      return true // 保留未选中的用户
    })

    saveUsers(remainingUsers)

    return NextResponse.json({ success: true, deleted: deletedCount })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '未知错误' }, { status: 500 })
  }
}
