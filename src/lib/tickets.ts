import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json')

export type TicketStatus = 'pending' | 'processing' | 'resolved' | 'closed'
export type TicketCategory = 'missing_subtitle' | 'video_quality' | 'playback_issue' | 'request_content' | 'account_issue' | 'other'

export interface TicketReply {
  id: string
  content: string
  userId: string
  username: string
  isAdmin: boolean
  createdAt: string
}

export interface Ticket {
  id: string
  title: string
  content: string
  category: TicketCategory
  status: TicketStatus
  priority: 'low' | 'medium' | 'high'
  userId: string
  username: string
  replies: TicketReply[]
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  resolvedBy?: string
}

// 工单分类名称
export const TICKET_CATEGORY_NAMES: Record<TicketCategory, string> = {
  missing_subtitle: '缺少字幕',
  video_quality: '画质问题',
  playback_issue: '播放问题',
  request_content: '内容请求',
  account_issue: '账户问题',
  other: '其他问题'
}

// 工单状态名称
export const TICKET_STATUS_NAMES: Record<TicketStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭'
}

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// 加载工单列表
export function loadTickets(): Ticket[] {
  ensureDataDir()
  if (!fs.existsSync(TICKETS_FILE)) {
    return []
  }
  try {
    const data = fs.readFileSync(TICKETS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// 保存工单列表
export function saveTickets(tickets: Ticket[]) {
  ensureDataDir()
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2))
}

// 创建工单
export function createTicket(data: {
  title: string
  content: string
  category: TicketCategory
  userId: string
  username: string
}): Ticket {
  const tickets = loadTickets()
  
  const ticket: Ticket = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    title: data.title,
    content: data.content,
    category: data.category,
    status: 'pending',
    priority: 'medium',
    userId: data.userId,
    username: data.username,
    replies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  tickets.push(ticket)
  saveTickets(tickets)
  
  return ticket
}

// 获取用户的工单
export function getUserTickets(userId: string): Ticket[] {
  const tickets = loadTickets()
  return tickets
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// 获取所有工单（管理员用）
export function getAllTickets(status?: TicketStatus): Ticket[] {
  const tickets = loadTickets()
  const filtered = status ? tickets.filter(t => t.status === status) : tickets
  return filtered.sort((a, b) => {
    // 待处理的排前面，然后按时间倒序
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

// 获取单个工单
export function getTicket(id: string): Ticket | null {
  const tickets = loadTickets()
  return tickets.find(t => t.id === id) || null
}

// 更新工单状态
export function updateTicketStatus(id: string, status: TicketStatus, resolvedBy?: string): Ticket | null {
  const tickets = loadTickets()
  const index = tickets.findIndex(t => t.id === id)
  
  if (index === -1) return null
  
  tickets[index].status = status
  tickets[index].updatedAt = new Date().toISOString()
  
  if (status === 'resolved' && resolvedBy) {
    tickets[index].resolvedAt = new Date().toISOString()
    tickets[index].resolvedBy = resolvedBy
  }
  
  saveTickets(tickets)
  return tickets[index]
}

// 添加回复
export function addTicketReply(ticketId: string, data: {
  content: string
  userId: string
  username: string
  isAdmin: boolean
}): Ticket | null {
  const tickets = loadTickets()
  const index = tickets.findIndex(t => t.id === ticketId)
  
  if (index === -1) return null
  
  const reply: TicketReply = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    content: data.content,
    userId: data.userId,
    username: data.username,
    isAdmin: data.isAdmin,
    createdAt: new Date().toISOString()
  }
  
  tickets[index].replies.push(reply)
  tickets[index].updatedAt = new Date().toISOString()
  
  // 如果是管理员回复，自动将状态改为处理中
  if (data.isAdmin && tickets[index].status === 'pending') {
    tickets[index].status = 'processing'
  }
  
  saveTickets(tickets)
  return tickets[index]
}

// 删除工单
export function deleteTicket(id: string): boolean {
  const tickets = loadTickets()
  const index = tickets.findIndex(t => t.id === id)
  
  if (index === -1) return false
  
  tickets.splice(index, 1)
  saveTickets(tickets)
  return true
}

// 获取工单统计
export function getTicketStats() {
  const tickets = loadTickets()
  return {
    total: tickets.length,
    pending: tickets.filter(t => t.status === 'pending').length,
    processing: tickets.filter(t => t.status === 'processing').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length
  }
}
