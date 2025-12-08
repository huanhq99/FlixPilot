import { NextResponse } from 'next/server'
import { loadUsers, saveUsers, verifyToken, getUser } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // 验证登录
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }
    
    const currentUser = getUser(payload.userId)
    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const body = await request.json()
    const { newUsername } = body

    if (!newUsername || typeof newUsername !== 'string') {
      return NextResponse.json({ error: '请输入新用户名' }, { status: 400 })
    }

    const trimmedUsername = newUsername.trim()

    if (trimmedUsername.length < 2) {
      return NextResponse.json({ error: '用户名至少2个字符' }, { status: 400 })
    }

    if (trimmedUsername.length > 20) {
      return NextResponse.json({ error: '用户名最多20个字符' }, { status: 400 })
    }

    // 检查用户名是否只包含有效字符
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(trimmedUsername)) {
      return NextResponse.json({ error: '用户名只能包含字母、数字、下划线和中文' }, { status: 400 })
    }

    const users = loadUsers()
    
    // 检查用户名是否已被使用
    const existingUser = users.find(u => u.username.toLowerCase() === trimmedUsername.toLowerCase() && u.id !== currentUser.id)
    if (existingUser) {
      return NextResponse.json({ error: '用户名已被使用' }, { status: 400 })
    }

    // 更新用户名
    const userIndex = users.findIndex(u => u.id === currentUser.id)
    if (userIndex < 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    users[userIndex].username = trimmedUsername
    saveUsers(users)

    return NextResponse.json({ 
      success: true, 
      message: '用户名修改成功',
      username: trimmedUsername
    })
  } catch (error) {
    console.error('Change username error:', error)
    return NextResponse.json({ error: '修改失败' }, { status: 500 })
  }
}
