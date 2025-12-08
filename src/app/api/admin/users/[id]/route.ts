import { NextResponse } from 'next/server'
import { loadUsers, saveUsers, verifyToken, getUser } from '@/lib/auth'
import { loadEmbyConfig, deleteEmbyUser, createEmbyUser } from '@/lib/embyUser'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'flixpilot-secret-key-2024'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex')
}

// 验证管理员权限
async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null
  
  const payload = verifyToken(token)
  if (!payload) return null
  
  const user = getUser(payload.userId)
  if (!user || user.role !== 'admin') return null
  
  return payload
}

// PUT - 更新用户完整信息
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const users = loadUsers()
    
    const userIndex = users.findIndex(u => u.id === id)
    if (userIndex < 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const currentUser = users[userIndex]
    
    // 检查是否需要创建 Emby 账号
    // 条件：设置了新的 embyUsername，但当前没有 embyUserId
    if (body.embyUsername && !currentUser.embyUserId && body.embyUsername !== currentUser.embyUsername) {
      const embyConfig = loadEmbyConfig()
      if (embyConfig) {
        // 使用本站用户名作为 Emby 用户名，使用本站密码或生成随机密码
        const embyUsername = body.embyUsername
        // 生成一个临时密码（用户可以后续修改）
        const tempPassword = body.embyPassword || crypto.randomBytes(8).toString('hex')
        
        const result = await createEmbyUser(embyUsername, tempPassword, embyConfig)
        if (result.success && result.userId) {
          users[userIndex].embyUserId = result.userId
          users[userIndex].embyUsername = embyUsername
        } else {
          return NextResponse.json({ error: result.error || '创建 Emby 账号失败' }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: '请先配置 Emby 服务器' }, { status: 400 })
      }
    } else {
      // 普通更新 Emby 字段（支持解绑：null 或空字符串表示解绑）
      if ('embyUserId' in body) {
        users[userIndex].embyUserId = body.embyUserId || undefined
      }
      if ('embyUsername' in body) {
        users[userIndex].embyUsername = body.embyUsername || undefined
      }
    }
    
    // 更新其他字段
    if (body.username) users[userIndex].username = body.username
    if (body.email !== undefined) users[userIndex].email = body.email || undefined
    if (body.role === 'admin' || body.role === 'user') users[userIndex].role = body.role
    if (typeof body.popcorn === 'number') users[userIndex].popcorn = body.popcorn
    if (typeof body.isWhitelist === 'boolean') users[userIndex].isWhitelist = body.isWhitelist
    if (body.membershipExpiry !== undefined) users[userIndex].membershipExpiry = body.membershipExpiry || undefined
    
    saveUsers(users)
    
    return NextResponse.json({ success: true, user: users[userIndex] })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '未知错误' }, { status: 500 })
  }
}

// PATCH - 更新用户
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const users = loadUsers()
    
    const userIndex = users.findIndex(u => u.id === id)
    if (userIndex < 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    // 更新允许的字段
    if (typeof body.popcorn === 'number') {
      users[userIndex].popcorn = body.popcorn
    }
    if (body.role === 'admin' || body.role === 'user') {
      users[userIndex].role = body.role
    }
    
    // 管理员重置密码
    if (body.newPassword && typeof body.newPassword === 'string') {
      if (body.newPassword.length < 6) {
        return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
      }
      users[userIndex].passwordHash = hashPassword(body.newPassword)
    }
    
    saveUsers(users)
    
    return NextResponse.json({ success: true, user: users[userIndex] })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '未知错误' }, { status: 500 })
  }
}

// DELETE - 删除用户
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params
    const users = loadUsers()
    
    const userIndex = users.findIndex(u => u.id === id)
    if (userIndex < 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    // 不允许删除管理员
    if (users[userIndex].role === 'admin') {
      return NextResponse.json({ error: '不能删除管理员账号' }, { status: 400 })
    }

    const targetUser = users[userIndex]
    
    // 如果用户有关联的 Emby 账号，一并删除
    if (targetUser.embyUserId) {
      try {
        const embyConfig = loadEmbyConfig()
        if (embyConfig) {
          await deleteEmbyUser(targetUser.embyUserId, embyConfig)
        }
      } catch (embyError) {
        console.error('删除 Emby 用户失败:', embyError)
        // 继续删除本站用户，不中断流程
      }
    }
    
    users.splice(userIndex, 1)
    saveUsers(users)
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '未知错误' }, { status: 500 })
  }
}
