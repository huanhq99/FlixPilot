import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs/promises'
import path from 'path'
import { verifyToken, loadUsers, saveUsers } from '@/lib/auth'

const DATA_DIR = process.env.DATA_DIR || './data'
const REQUESTS_FILE = path.join(DATA_DIR, 'media-requests.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const LIBRARY_FILE = path.join(DATA_DIR, 'library.json')

export interface MediaRequest {
  id: string
  tmdbId: number
  type: 'movie' | 'tv'
  title: string
  originalTitle?: string
  poster?: string
  backdrop?: string
  year: string
  overview?: string
  searchKeyword?: string  // 用户搜索的关键词
  status: 'pending' | 'approved' | 'available' | 'deleted'
  requestedBy: string     // 请求的用户名
  userId?: string         // Emby 用户 ID
  requestedAt: string
  reviewedBy?: string
  reviewedAt?: string
  availableAt?: string    // 入库时间
  note?: string
  autoApproved?: boolean  // 是否自动入库通过
}

async function loadRequests(): Promise<MediaRequest[]> {
  try {
    const data = await fs.readFile(REQUESTS_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    // 兼容两种格式
    return Array.isArray(parsed) ? parsed : (parsed.requests || [])
  } catch (e) {
    return []
  }
}

async function saveRequests(requests: MediaRequest[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2))
}

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return {}
  }
}

async function loadLibrary() {
  try {
    const data = await fs.readFile(LIBRARY_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return { items: [], movieIds: [], tvIds: [] }
  }
}

// 发送 Telegram 通知（支持图片）
async function sendTelegramNotification(message: string, photo?: string, caption?: string) {
  try {
    const config = await loadConfig()
    const { botToken, chatId, enabled } = config.telegram || {}
    
    if (!botToken || !chatId) return
    
    const body: any = {
      chat_id: chatId,
      parse_mode: 'HTML'
    }
    
    let url: string
    if (photo) {
      url = `https://api.telegram.org/bot${botToken}/sendPhoto`
      body.photo = photo
      body.caption = caption || message
    } else {
      url = `https://api.telegram.org/bot${botToken}/sendMessage`
      body.text = message
      body.disable_web_page_preview = false
    }
    
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (e) {
    console.error('Send Telegram notification failed:', e)
  }
}

// 检查媒体是否已入库
function checkInLibrary(tmdbId: number, type: 'movie' | 'tv', library: any): boolean {
  const key = `${type}-${tmdbId}`
  return library.items?.includes(key) || false
}

// GET - 获取所有请求
export async function GET() {
  const requests = await loadRequests()
  const library = await loadLibrary()
  
  // 检查每个请求是否已入库，自动更新状态
  let hasUpdates = false
  const updatedRequests = requests.map(req => {
    if (req.status === 'pending' || req.status === 'approved') {
      const inLibrary = checkInLibrary(req.tmdbId, req.type, library)
      if (inLibrary) {
        hasUpdates = true
        return {
          ...req,
          status: 'available' as const,
          availableAt: new Date().toISOString(),
          autoApproved: req.status === 'pending' // 如果从 pending 直接变成 available，说明是自动入库
        }
      }
    }
    return req
  })
  
  // 如果有更新，保存并发送通知
  if (hasUpdates) {
    await saveRequests(updatedRequests)
    
    // 发送入库通知
    const newlyAvailable = updatedRequests.filter(
      (req, i) => req.status === 'available' && requests[i].status !== 'available'
    )
    
    for (const req of newlyAvailable) {
      const caption = 
        `<b>🎉 媒体已入库</b>\n\n` +
        `<b>名称：${req.title} (${req.year})</b>\n` +
        `📁 类型：#${req.type === 'movie' ? '电影' : '剧集'}\n` +
        `👤 请求者：${req.requestedBy}\n` +
        `${req.autoApproved ? '✨ 自动入库（无需审核）' : '✅ 资源已入库可观看'}\n\n` +
        `🔗 <a href="https://www.themoviedb.org/${req.type}/${req.tmdbId}">TMDB链接</a>`
      
      const posterUrl = req.poster ? `https://image.tmdb.org/t/p/w500${req.poster}` : undefined
      await sendTelegramNotification(caption, posterUrl, caption)
    }
  }
  
  return NextResponse.json({ 
    requests: updatedRequests
      .filter(r => r.status !== 'deleted')
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
  })
}

// POST - 创建新请求
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const requests = await loadRequests()
    const library = await loadLibrary()
    const config = await loadConfig()
    
    // 获取当前用户
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    let currentUser: any = null
    
    if (token) {
      const payload = await verifyToken(token)
      if (payload) {
        const users = await loadUsers()
        currentUser = users.find(u => u.id === payload.userId)
      }
    }
    
    // 获取求片配置
    const requestConfig = config.request || { 
      enabled: true, 
      movieCost: 10, 
      tvCost: 20,
      monthlyQuota: 3,
      quotaExchangeRate: 50
    }
    
    // 检查求片额度（非管理员需要检查）
    if (currentUser && currentUser.role !== 'admin') {
      // 计算当月已用额度
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      
      const myMonthlyRequests = requests.filter(r => 
        r.userId === currentUser.id && 
        r.status !== 'deleted' &&
        new Date(r.requestedAt) >= monthStart
      )
      
      const monthlyQuota = requestConfig.monthlyQuota || 3
      const exchangedQuota = (currentUser as any).exchangedQuota || 0
      const totalQuota = monthlyQuota + exchangedQuota
      const usedQuota = myMonthlyRequests.length
      
      if (usedQuota >= totalQuota) {
        return NextResponse.json({ 
          error: `本月求片额度已用完！已使用 ${usedQuota}/${totalQuota} 次，请用爆米花兑换额外额度`,
          usedQuota,
          totalQuota,
          canExchange: Math.floor(currentUser.popcorn / (requestConfig.quotaExchangeRate || 50))
        }, { status: 400 })
      }
    }
    
    // 检查是否已在库中
    const inLibrary = checkInLibrary(body.tmdbId, body.type, library)
    if (inLibrary) {
      return NextResponse.json({ 
        error: '该影片已在媒体库中',
        status: 'available'
      }, { status: 400 })
    }
    
    // 检查是否已存在相同请求
    const existing = requests.find(r => 
      r.tmdbId === body.tmdbId && r.type === body.type && r.status !== 'deleted'
    )
    
    if (existing) {
      return NextResponse.json({ 
        error: '该影片已在求片列表中',
        existingStatus: existing.status,
        existingRequest: existing
      }, { status: 400 })
    }
    
    const newRequest: MediaRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tmdbId: body.tmdbId,
      type: body.type,
      title: body.title,
      originalTitle: body.originalTitle,
      poster: body.poster,
      backdrop: body.backdrop,
      year: body.year,
      overview: body.overview,
      searchKeyword: body.searchKeyword,  // 用户搜索的关键词
      status: 'pending',
      requestedBy: currentUser?.username || body.requestedBy || 'Anonymous',
      userId: currentUser?.id || body.userId,  // 使用当前登录用户的 ID
      requestedAt: new Date().toISOString()
    }
    
    requests.push(newRequest)
    await saveRequests(requests)
    
    // 发送 Telegram 通知给管理员（带海报图片）
    const caption = 
      `<b>名称：${newRequest.title} (${newRequest.year})</b>\n` +
      `👤 用户：${newRequest.requestedBy} 给您发来一条求片信息\n` +
      `🏷 标签：#用户提交求片\n` +
      `📁 类型：#${newRequest.type === 'movie' ? '电影' : '剧集'}\n\n` +
      `📝 简介：${newRequest.overview ? newRequest.overview.substring(0, 200) + (newRequest.overview.length > 200 ? '...' : '') : '暂无简介'}\n\n` +
      `🔗 <a href="https://www.themoviedb.org/${newRequest.type}/${newRequest.tmdbId}">TMDB链接</a>`
    
    // 使用 TMDB 海报图片
    const posterUrl = newRequest.poster ? `https://image.tmdb.org/t/p/w500${newRequest.poster}` : undefined
    
    await sendTelegramNotification(caption, posterUrl, caption)
    
    return NextResponse.json({ success: true, request: newRequest })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
