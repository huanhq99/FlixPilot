import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser } from '@/lib/auth'
import { 
  loadTickets,
  createTicket, 
  getTicket,
  getUserTickets,
  getAllTickets,
  updateTicketStatus,
  addTicketReply,
  deleteTicket,
  getTicketStats
} from '@/lib/tickets'

// GET - 获取工单列表
export async function GET(request: NextRequest) {
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
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status') as any
    
    // 获取单个工单
    if (id) {
      const ticket = getTicket(id)
      if (!ticket) {
        return NextResponse.json({ error: '工单不存在' }, { status: 404 })
      }
      // 普通用户只能查看自己的工单
      if (user.role !== 'admin' && ticket.userId !== user.id) {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }
      return NextResponse.json({ ticket })
    }
    
    // 获取统计数据
    if (searchParams.get('stats') === 'true') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }
      const stats = getTicketStats()
      return NextResponse.json({ stats })
    }
    
    // 管理员获取所有工单，普通用户只能获取自己的
    if (user.role === 'admin') {
      const tickets = getAllTickets(status)
      return NextResponse.json({ tickets })
    } else {
      const tickets = getUserTickets(user.id)
      return NextResponse.json({ tickets })
    }
  } catch (error) {
    console.error('Get tickets error:', error)
    return NextResponse.json({ error: '获取工单失败' }, { status: 500 })
  }
}

// POST - 创建工单或添加回复
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
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    const body = await request.json()
    const { action } = body
    
    // 添加回复
    if (action === 'reply') {
      const { ticketId, content } = body
      
      if (!ticketId || !content) {
        return NextResponse.json({ error: '工单ID和内容不能为空' }, { status: 400 })
      }
      
      const ticket = getTicket(ticketId)
      if (!ticket) {
        return NextResponse.json({ error: '工单不存在' }, { status: 404 })
      }
      
      // 普通用户只能回复自己的工单
      if (user.role !== 'admin' && ticket.userId !== user.id) {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }
      
      const updatedTicket = addTicketReply(ticketId, {
        content,
        userId: user.id,
        username: user.username,
        isAdmin: user.role === 'admin'
      })
      
      return NextResponse.json({ success: true, ticket: updatedTicket })
    }
    
    // 创建工单
    const { title, content, category } = body
    
    if (!title || !content || !category) {
      return NextResponse.json({ error: '标题、内容和分类不能为空' }, { status: 400 })
    }
    
    const ticket = createTicket({
      title,
      content,
      category,
      userId: user.id,
      username: user.username
    })
    
    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json({ error: '创建工单失败' }, { status: 500 })
  }
}

// PUT - 更新工单状态
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
    const { id, status } = body
    
    if (!id || !status) {
      return NextResponse.json({ error: '工单ID和状态不能为空' }, { status: 400 })
    }
    
    const ticket = updateTicketStatus(id, status, user.username)
    if (!ticket) {
      return NextResponse.json({ error: '工单不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json({ error: '更新工单失败' }, { status: 500 })
  }
}

// DELETE - 删除工单
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
      return NextResponse.json({ error: '工单ID不能为空' }, { status: 400 })
    }
    
    const success = deleteTicket(id)
    if (!success) {
      return NextResponse.json({ error: '工单不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete ticket error:', error)
    return NextResponse.json({ error: '删除工单失败' }, { status: 500 })
  }
}
