import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const REQUESTS_FILE = path.join(DATA_DIR, 'media-requests.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

interface MediaRequest {
  id: string
  tmdbId: number
  type: 'movie' | 'tv'
  title: string
  originalTitle?: string
  poster?: string
  year: string
  status: 'pending' | 'approved' | 'available' | 'deleted'
  requestedBy: string
  reviewedBy?: string
  reviewedAt?: string
}

async function loadRequests(): Promise<MediaRequest[]> {
  try {
    const data = await fs.readFile(REQUESTS_FILE, 'utf-8')
    const parsed = JSON.parse(data)
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

async function sendTelegramNotification(message: string, photo?: string, caption?: string) {
  try {
    const config = await loadConfig()
    const { botToken, chatId } = config.telegram || {}
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
    }
    
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (e) {
    console.error('Telegram notification failed:', e)
  }
}

// 获取 MoviePilot Token
async function getMoviePilotToken(baseUrl: string, username: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/login/access-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    })
    
    if (res.ok) {
      const data = await res.json()
      return data.access_token
    }
    console.error('MoviePilot 登录失败:', res.status)
    return null
  } catch (e) {
    console.error('MoviePilot 登录异常:', e)
    return null
  }
}

// 推送到 MoviePilot 订阅
async function subscribeToMoviePilot(req: MediaRequest) {
  try {
    const config = await loadConfig()
    const { serverUrl, username, password, enabled } = config.moviepilot || {}
    
    if (!enabled || !serverUrl || !username || !password) {
      console.log('MoviePilot 未配置，跳过订阅')
      return { success: false, reason: 'not_configured' }
    }
    
    const baseUrl = serverUrl.replace(/\/$/, '')
    
    // 先获取 Token
    const token = await getMoviePilotToken(baseUrl, username, password)
    if (!token) {
      return { success: false, error: '登录失败，请检查用户名密码' }
    }
    
    // 调用 MoviePilot 订阅接口（注意末尾需要 /）
    const res = await fetch(`${baseUrl}/api/v1/subscribe/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: req.title,
        type: req.type === 'movie' ? '电影' : '电视剧',
        tmdbid: req.tmdbId,
        year: req.year,
        username: req.requestedBy
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      console.log('MoviePilot 订阅成功:', data)
      return { success: true, data }
    } else {
      const error = await res.text()
      console.error('MoviePilot 订阅失败:', res.status, error)
      return { success: false, error, status: res.status }
    }
  } catch (e: any) {
    console.error('MoviePilot 订阅异常:', e.message)
    return { success: false, error: e.message }
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const requests = await loadRequests()
  const index = requests.findIndex(r => r.id === id)
  
  if (index === -1) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  
  const req = requests[index]
  req.status = 'approved'
  req.reviewedBy = 'Admin'
  req.reviewedAt = new Date().toISOString()
  
  await saveRequests(requests)
  
  // 推送到 MoviePilot 订阅
  const mpResult = await subscribeToMoviePilot(req)
  
  // 发送通知（带海报图片）
  // 构建标签
  const tags = ['#审核通过']
  if (mpResult.success) {
    tags.push('#已订阅')
  }
  
  let caption = `<b>✅ 求片已通过审核</b>\n\n` +
    `<b>名称：${req.title} (${req.year})</b>\n` +
    `📁 类型：#${req.type === 'movie' ? '电影' : '剧集'}\n` +
    `👤 请求者：${req.requestedBy}\n` +
    `🏷 标签：${tags.join(' ')}\n\n` +
    `🔗 <a href="https://www.themoviedb.org/${req.type}/${req.tmdbId}">TMDB链接</a>`
  
  const posterUrl = req.poster ? `https://image.tmdb.org/t/p/w500${req.poster}` : undefined
  await sendTelegramNotification(caption, posterUrl, caption)
  
  return NextResponse.json({ 
    success: true, 
    request: req,
    moviepilot: mpResult
  })
}
