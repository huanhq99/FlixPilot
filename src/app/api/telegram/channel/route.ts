import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return {}
  }
}

// 发送入库通知到频道
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      title, 
      year, 
      type, 
      poster, 
      rating,
      category,
      quality,
      size,
      seasonEpisode  // 如 "S01 E11"
    } = body
    
    const config = await loadConfig()
    const { botToken, channelId } = config.telegram || {}
    
    if (!botToken || !channelId) {
      return NextResponse.json({ 
        error: '未配置 Telegram 频道通知' 
      }, { status: 400 })
    }
    
    // 构建消息
    const caption = `<b>${title} (${year})${seasonEpisode ? ` ${seasonEpisode}` : ''} 已入库</b>
${rating ? `评分：${rating}，` : ''}类别：${category || (type === 'movie' ? '电影' : '剧集')}，质量：${quality || 'unknown'}，大小：${size || 'unknown'}`

    // 发送到频道
    const posterUrl = poster?.startsWith('http') ? poster : 
                      poster ? `https://image.tmdb.org/t/p/w500${poster}` : null
    
    let url: string
    const messageBody: any = {
      chat_id: channelId,
      parse_mode: 'HTML'
    }
    
    if (posterUrl) {
      url = `https://api.telegram.org/bot${botToken}/sendPhoto`
      messageBody.photo = posterUrl
      messageBody.caption = caption
    } else {
      url = `https://api.telegram.org/bot${botToken}/sendMessage`
      messageBody.text = caption
    }
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageBody)
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      console.error('Send channel notification failed:', data)
      return NextResponse.json({ error: data.description }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, messageId: data.result?.message_id })
  } catch (e: any) {
    console.error('Channel notification error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
