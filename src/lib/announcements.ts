import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json')

export interface Announcement {
  id: string
  title: string
  content: string  // Markdown 格式
  type: 'info' | 'warning' | 'success' | 'error'  // 公告类型
  priority: number  // 优先级，数字越大越靠前
  isActive: boolean  // 是否启用
  isPinned: boolean  // 是否置顶显示弹窗
  createdAt: string
  updatedAt: string
  createdBy: string
}

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// 加载公告列表
export function loadAnnouncements(): Announcement[] {
  ensureDataDir()
  if (!fs.existsSync(ANNOUNCEMENTS_FILE)) {
    return []
  }
  try {
    const data = fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// 保存公告列表
export function saveAnnouncements(announcements: Announcement[]) {
  ensureDataDir()
  fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(announcements, null, 2))
}

// 获取所有启用的公告
export function getActiveAnnouncements(): Announcement[] {
  const announcements = loadAnnouncements()
  return announcements
    .filter(a => a.isActive)
    .sort((a, b) => {
      // 先按置顶排序，再按优先级，最后按创建时间
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1
      if (a.priority !== b.priority) return b.priority - a.priority
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
}

// 获取需要弹窗显示的公告
export function getPinnedAnnouncements(): Announcement[] {
  const announcements = loadAnnouncements()
  return announcements
    .filter(a => a.isActive && a.isPinned)
    .sort((a, b) => b.priority - a.priority)
}

// 创建公告
export function createAnnouncement(data: {
  title: string
  content: string
  type?: 'info' | 'warning' | 'success' | 'error'
  priority?: number
  isActive?: boolean
  isPinned?: boolean
  createdBy: string
}): Announcement {
  const announcements = loadAnnouncements()
  
  const announcement: Announcement = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    title: data.title,
    content: data.content,
    type: data.type || 'info',
    priority: data.priority || 0,
    isActive: data.isActive !== false,
    isPinned: data.isPinned || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: data.createdBy
  }
  
  announcements.push(announcement)
  saveAnnouncements(announcements)
  
  return announcement
}

// 更新公告
export function updateAnnouncement(id: string, data: Partial<Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>>): Announcement | null {
  const announcements = loadAnnouncements()
  const index = announcements.findIndex(a => a.id === id)
  
  if (index === -1) return null
  
  announcements[index] = {
    ...announcements[index],
    ...data,
    updatedAt: new Date().toISOString()
  }
  
  saveAnnouncements(announcements)
  return announcements[index]
}

// 删除公告
export function deleteAnnouncement(id: string): boolean {
  const announcements = loadAnnouncements()
  const index = announcements.findIndex(a => a.id === id)
  
  if (index === -1) return false
  
  announcements.splice(index, 1)
  saveAnnouncements(announcements)
  return true
}

// 获取单个公告
export function getAnnouncement(id: string): Announcement | null {
  const announcements = loadAnnouncements()
  return announcements.find(a => a.id === id) || null
}
