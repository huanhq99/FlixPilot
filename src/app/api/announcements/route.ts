import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser } from '@/lib/auth'
import { 
  loadAnnouncements, 
  getActiveAnnouncements, 
  getPinnedAnnouncements,
  createAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement,
  getAnnouncement
} from '@/lib/announcements'

// GET - 获取公告列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    // 获取弹窗公告（不需要登录）
    if (type === 'pinned') {
      const announcements = getPinnedAnnouncements()
      return NextResponse.json({ announcements })
    }
    
    // 获取所有启用的公告
    if (type === 'active') {
      const announcements = getActiveAnnouncements()
      return NextResponse.json({ announcements })
    }
    
    // 获取单个公告
    const id = searchParams.get('id')
    if (id) {
      const announcement = getAnnouncement(id)
      if (!announcement) {
        return NextResponse.json({ error: '公告不存在' }, { status: 404 })
      }
      return NextResponse.json({ announcement })
    }
    
    // 获取所有公告（管理员用）
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
    
    const announcements = loadAnnouncements()
    return NextResponse.json({ announcements })
  } catch (error) {
    console.error('Get announcements error:', error)
    return NextResponse.json({ error: '获取公告失败' }, { status: 500 })
  }
}

// POST - 创建公告
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
    
    const user = getUser(payload.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    
    const body = await request.json()
    const { title, content, type, priority, isActive, isPinned } = body
    
    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 })
    }
    
    const announcement = createAnnouncement({
      title,
      content,
      type,
      priority,
      isActive,
      isPinned,
      createdBy: user.username
    })
    
    return NextResponse.json({ success: true, announcement })
  } catch (error) {
    console.error('Create announcement error:', error)
    return NextResponse.json({ error: '创建公告失败' }, { status: 500 })
  }
}

// PUT - 更新公告
export async function PUT(request: NextRequest) {
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
    
    const user = getUser(payload.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id, ...data } = body
    
    if (!id) {
      return NextResponse.json({ error: '公告ID不能为空' }, { status: 400 })
    }
    
    const announcement = updateAnnouncement(id, data)
    if (!announcement) {
      return NextResponse.json({ error: '公告不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, announcement })
  } catch (error) {
    console.error('Update announcement error:', error)
    return NextResponse.json({ error: '更新公告失败' }, { status: 500 })
  }
}

// DELETE - 删除公告
export async function DELETE(request: NextRequest) {
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
    
    const user = getUser(payload.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: '公告ID不能为空' }, { status: 400 })
    }
    
    const success = deleteAnnouncement(id)
    if (!success) {
      return NextResponse.json({ error: '公告不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete announcement error:', error)
    return NextResponse.json({ error: '删除公告失败' }, { status: 500 })
  }
}
