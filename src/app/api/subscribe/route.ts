import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// 文件路径
const configPath = path.join(process.cwd(), 'data', 'config.json')
const requestsPath = path.join(process.cwd(), 'data', 'media-requests.json')

function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      // 获取 Telegram 配置
      if (config.telegram) {
        return {
          telegramBotToken: config.telegram.botToken,
          telegramChatId: config.telegram.chatId,
          telegramEnabled: config.telegram.enabled,
          ...config
        }
      }
      return config
    }
  } catch (e) {
    console.error('读取配置失败:', e)
  }
  return null
}

function getRequests() {
  try {
    if (fs.existsSync(requestsPath)) {
      return JSON.parse(fs.readFileSync(requestsPath, 'utf-8'))
    }
  } catch (e) {
    console.error('读取请求列表失败:', e)
  }
  return { requests: [] }
}

function saveRequests(data: any) {
  try {
    const dir = path.dirname(requestsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(requestsPath, JSON.stringify(data, null, 2))
    return true
  } catch (e) {
    console.error('保存请求失败:', e)
    return false
  }
}

// 发送 Telegram 通知
async function sendTelegramNotification(config: any, request: any) {
  if (!config?.telegramBotToken || !config?.telegramChatId) {
    console.log('Telegram 未配置，跳过通知')
    return false
  }
  
  try {
    const message = `🎬 <b>新的媒体订阅请求</b>\n\n` +
      `📺 <b>${request.name}</b> (${request.year || '未知年份'})\n` +
      `📁 类型: ${request.type === 'movie' ? '电影' : request.type === 'tv' ? '剧集' : request.type}\n` +
      `🔗 TMDB: <a href="https://www.themoviedb.org/${request.type}/${request.tmdbId}">${request.tmdbId}</a>\n` +
      `👤 请求者: ${request.requestedBy || '匿名'}\n` +
      `📝 备注: ${request.note || '无'}\n` +
      `⏰ 时间: ${new Date(request.requestedAt).toLocaleString('zh-CN')}`
    
    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    })
    
    if (res.ok) {
      console.log('Telegram 通知发送成功')
      return true
    } else {
      const error = await res.text()
      console.error('Telegram 通知发送失败:', error)
      return false
    }
  } catch (e) {
    console.error('发送 Telegram 通知异常:', e)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tmdbId, type, name, year, poster, overview, note, requestedBy } = body
    
    if (!tmdbId || !type || !name) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数: tmdbId, type, name'
      }, { status: 400 })
    }
    
    const config = getConfig()
    const requestsData = getRequests()
    
    // 检查是否已经请求过
    const existingRequest = requestsData.requests.find(
      (r: any) => r.tmdbId === tmdbId && r.type === type
    )
    
    if (existingRequest) {
      return NextResponse.json({
        success: false,
        error: '该媒体已经在请求列表中',
        existingRequest
      }, { status: 409 })
    }
    
    // 创建新请求
    const newRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tmdbId,
      type,
      name,
      year,
      poster,
      overview,
      note,
      requestedBy: requestedBy || '匿名用户',
      requestedAt: new Date().toISOString(),
      status: 'pending', // pending, approved, rejected, completed
      statusHistory: [{
        status: 'pending',
        timestamp: new Date().toISOString(),
        note: '用户提交请求'
      }]
    }
    
    // 添加到请求列表
    requestsData.requests.unshift(newRequest)
    
    if (!saveRequests(requestsData)) {
      return NextResponse.json({
        success: false,
        error: '保存请求失败'
      }, { status: 500 })
    }
    
    // 发送 Telegram 通知（异步，不阻塞响应）
    sendTelegramNotification(config, newRequest)
    
    return NextResponse.json({
      success: true,
      message: '订阅请求已提交',
      request: newRequest
    })
    
  } catch (error) {
    console.error('处理订阅请求失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

export async function GET() {
  const requestsData = getRequests()
  return NextResponse.json({
    success: true,
    requests: requestsData.requests
  })
}
