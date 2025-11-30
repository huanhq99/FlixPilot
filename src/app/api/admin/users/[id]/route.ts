import { NextResponse } from 'next/server'
import { loadUsers, saveUsers } from '@/lib/auth'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'flixpilot-secret-key-2024'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex')
}

// PATCH - 更新用户
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - 删除用户
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    
    users.splice(userIndex, 1)
    saveUsers(users)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
