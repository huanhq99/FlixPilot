import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const configPath = path.join(process.cwd(), 'data', 'config.json')

function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch (e) {
    console.error('读取配置失败:', e)
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { message, type, photo, caption } = await request.json()
    
    const config = getConfig()
    const botToken = config?.telegram?.botToken
    const chatId = config?.telegram?.chatId
    
    if (!botToken || !chatId) {
      return NextResponse.json({ 
        success: false, 
        error: '请先配置 Telegram Bot Token 和 Chat ID' 
      }, { status: 400 })
    }

    let res: Response

    // 如果有图片，使用 sendPhoto
    if (photo) {
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`
      res = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photo,
          caption: caption || message,
          parse_mode: 'HTML'
        })
      })
    } else {
      // 普通文本消息
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
      res = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        })
      })
    }

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.description || 'Telegram API 错误')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('发送 Telegram 消息失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '发送失败' 
    }, { status: 500 })
  }
}
