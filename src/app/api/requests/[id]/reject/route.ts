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
  status: 'pending' | 'approved' | 'rejected' | 'available'
  requestedBy: string
  reviewedBy?: string
  reviewedAt?: string
  rejectReason?: string
}

async function loadRequests(): Promise<MediaRequest[]> {
  try {
    const data = await fs.readFile(REQUESTS_FILE, 'utf-8')
    return JSON.parse(data)
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

async function sendTelegramNotification(message: string) {
  try {
    const config = await loadConfig()
    const { botToken, chatId } = config.telegram || {}
    if (!botToken || !chatId) return
    
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })
  } catch (e) {
    console.error('Telegram notification failed:', e)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { reason } = body
  
  const requests = await loadRequests()
  const index = requests.findIndex(r => r.id === id)
  
  if (index === -1) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  
  const req = requests[index]
  req.status = 'rejected'
  req.reviewedBy = 'Admin'
  req.reviewedAt = new Date().toISOString()
  if (reason) req.rejectReason = reason
  
  await saveRequests(requests)
  
  // 发送通知
  await sendTelegramNotification(
    `❌ <b>求片被拒绝</b>\n\n` +
    `📺 ${req.title}\n` +
    `👤 请求者: ${req.requestedBy}\n` +
    (reason ? `📝 原因: ${reason}\n` : '') +
    `如有疑问请联系管理员。`
  )
  
  return NextResponse.json({ success: true, request: req })
}
