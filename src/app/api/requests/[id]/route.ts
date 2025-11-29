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
  poster?: string
  year: string
  status: 'pending' | 'approved' | 'rejected' | 'available'
  requestedBy: string
  requestedAt: string
  reviewedBy?: string
  reviewedAt?: string
  note?: string
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

// DELETE - 删除请求
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const requests = await loadRequests()
  const filtered = requests.filter(r => r.id !== id)
  
  if (filtered.length === requests.length) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  
  await saveRequests(filtered)
  return NextResponse.json({ success: true })
}

// GET - 获取单个请求
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const requests = await loadRequests()
  const found = requests.find(r => r.id === id)
  
  if (!found) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  
  return NextResponse.json(found)
}
