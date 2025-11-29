import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const REQUESTS_FILE = path.join(DATA_DIR, 'media-requests.json')
const TG_BINDINGS_FILE = path.join(DATA_DIR, 'telegram-bindings.json')

// ============ 数据加载函数 ============

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return {}
  }
}

async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return []
  }
}

async function saveUsers(users: any[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2))
}

async function loadTgBindings(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(TG_BINDINGS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return {}
  }
}

async function saveTgBindings(bindings: Record<string, string>) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(TG_BINDINGS_FILE, JSON.stringify(bindings, null, 2))
}

async function loadRequests() {
  try {
    const data = await fs.readFile(REQUESTS_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : (parsed.requests || [])
  } catch (e) {
    return []
  }
}

// ============ Telegram API ============

async function sendMessage(chatId: string | number, text: string, options: any = {}) {
  const config = await loadConfig()
  const { botToken } = config.telegram || {}
  if (!botToken) return
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options
    })
  })
}

async function sendPhoto(chatId: string | number, photo: string, caption: string, options: any = {}) {
  const config = await loadConfig()
  const { botToken } = config.telegram || {}
  if (!botToken) return
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo,
      caption,
      parse_mode: 'HTML',
      ...options
    })
  })
}

// ============ 命令处理 ============

async function handleStart(chatId: number, userId: number, username: string) {
  const config = await loadConfig()
  const siteName = config.siteName || 'StreamHub'
  const siteUrl = config.siteUrl || ''
  
  const text = `🎬 <b>欢迎使用 ${siteName} 机器人！</b>

您可以通过以下命令使用本机器人：

📌 <b>基础功能</b>
/bind 绑定码 - 绑定网站账号
/me - 查看个人信息
/checkin - 每日签到

📺 <b>媒体功能</b>
/search 关键词 - 搜索媒体
/requests - 查看我的求片
/request TMDB链接 - 提交求片

💎 <b>积分功能</b>
/exchange - 兑换额度/流量

${siteUrl ? `🔗 网站地址：${siteUrl}` : ''}

请先使用 /bind 命令绑定您的网站账号！`

  await sendMessage(chatId, text)
}

async function handleBind(chatId: number, tgUserId: number, tgUsername: string, bindCode: string) {
  if (!bindCode) {
    const text = `📝 <b>绑定账号</b>

请在网站个人设置页面获取绑定码，然后使用：
/bind 您的绑定码

绑定后可享受：
• 📱 机器人签到
• 📺 查看求片状态
• 🔔 接收个人通知`
    await sendMessage(chatId, text)
    return
  }
  
  const users = await loadUsers()
  const user = users.find((u: any) => u.telegramBindCode === bindCode)
  
  if (!user) {
    await sendMessage(chatId, '❌ 绑定码无效或已过期，请重新获取')
    return
  }
  
  // 检查是否已被其他 TG 账号绑定
  const bindings = await loadTgBindings()
  const existingBinding = Object.entries(bindings).find(([_, siteUserId]) => siteUserId === user.id)
  if (existingBinding && existingBinding[0] !== String(tgUserId)) {
    await sendMessage(chatId, '❌ 该网站账号已被其他 Telegram 账号绑定')
    return
  }
  
  // 保存绑定关系
  bindings[String(tgUserId)] = user.id
  await saveTgBindings(bindings)
  
  // 更新用户信息
  user.telegramId = tgUserId
  user.telegramUsername = tgUsername
  user.telegramBindCode = undefined // 清除绑定码
  await saveUsers(users)
  
  const text = `✅ <b>绑定成功！</b>

👤 网站账号：${user.username}
🎬 Emby 账号：${user.embyUsername || '未绑定'}

现在您可以使用所有机器人功能了！`
  await sendMessage(chatId, text)
}

async function handleMe(chatId: number, tgUserId: number) {
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  const users = await loadUsers()
  const user = users.find((u: any) => u.id === siteUserId)
  
  if (!user) {
    await sendMessage(chatId, '❌ 账号信息异常，请重新绑定')
    return
  }
  
  const config = await loadConfig()
  const requestConfig = config.request || { monthlyQuota: 3 }
  
  // 计算当月已用额度
  const requests = await loadRequests()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  
  const myMonthlyRequests = requests.filter((r: any) => 
    r.userId === user.id && 
    r.status !== 'deleted' &&
    new Date(r.requestedAt) >= monthStart
  )
  
  const monthlyQuota = requestConfig.monthlyQuota || 3
  const exchangedQuota = user.exchangedQuota || 0
  const totalQuota = monthlyQuota + exchangedQuota
  const usedQuota = myMonthlyRequests.length
  
  const text = `👤 <b>个人信息</b>

<b>账号信息</b>
├ 网站账号：${user.username}
├ 用户角色：${user.role === 'admin' ? '管理员' : '普通用户'}
└ Emby 账号：${user.embyUsername || '未绑定'}

<b>积分信息</b>
├ 🍿 爆米花：${user.popcorn || 0}
├ 📊 流量：${(user.traffic || 0).toFixed(2)} GB
└ 📅 连续签到：${user.checkinStreak || 0} 天

<b>求片额度</b>
├ 基础额度：${monthlyQuota} 次/月
├ 兑换额度：${exchangedQuota} 次
├ 已用额度：${usedQuota} 次
└ 剩余额度：${Math.max(0, totalQuota - usedQuota)} 次`

  await sendMessage(chatId, text)
}

async function handleCheckin(chatId: number, tgUserId: number) {
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  const users = await loadUsers()
  const userIndex = users.findIndex((u: any) => u.id === siteUserId)
  
  if (userIndex === -1) {
    await sendMessage(chatId, '❌ 账号信息异常，请重新绑定')
    return
  }
  
  const user = users[userIndex]
  const today = new Date().toDateString()
  
  if (user.lastCheckin === today) {
    await sendMessage(chatId, '⏰ 今天已经签到过了，明天再来吧~')
    return
  }
  
  const config = await loadConfig()
  const checkinConfig = config.checkin || { baseReward: 5, streakBonus: 1, maxStreak: 30 }
  
  // 计算连续签到
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const wasYesterday = user.lastCheckin === yesterday.toDateString()
  
  const newStreak = wasYesterday ? (user.checkinStreak || 0) + 1 : 1
  const cappedStreak = Math.min(newStreak, checkinConfig.maxStreak || 30)
  
  // 计算奖励
  const baseReward = checkinConfig.baseReward || 5
  const streakBonus = (checkinConfig.streakBonus || 1) * (cappedStreak - 1)
  const totalReward = baseReward + streakBonus
  
  // 更新用户
  user.lastCheckin = today
  user.checkinStreak = cappedStreak
  user.popcorn = (user.popcorn || 0) + totalReward
  
  await saveUsers(users)
  
  const text = `🎉 <b>签到成功！</b>

📅 连续签到：${cappedStreak} 天
🍿 获得爆米花：+${totalReward}
├ 基础奖励：+${baseReward}
${streakBonus > 0 ? `└ 连续奖励：+${streakBonus}` : ''}

💰 当前爆米花：${user.popcorn}`

  await sendMessage(chatId, text)
}

async function handleRequests(chatId: number, tgUserId: number) {
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  const requests = await loadRequests()
  const myRequests = requests
    .filter((r: any) => r.userId === siteUserId && r.status !== 'deleted')
    .sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    .slice(0, 10)
  
  if (myRequests.length === 0) {
    await sendMessage(chatId, '📭 您还没有求片记录\n\n使用 /search 关键词 搜索媒体后可以求片')
    return
  }
  
  const statusMap: Record<string, string> = {
    pending: '⏳ 待审核',
    approved: '📥 订阅中',
    available: '✅ 已入库',
    deleted: '🗑 已删除'
  }
  
  let text = `📋 <b>我的求片记录</b>（最近10条）\n\n`
  
  for (const req of myRequests) {
    const status = statusMap[req.status] || req.status
    text += `${status} <b>${req.title}</b> (${req.year})\n`
    text += `└ ${req.type === 'movie' ? '电影' : '剧集'} | ${new Date(req.requestedAt).toLocaleDateString()}\n\n`
  }
  
  await sendMessage(chatId, text)
}

async function handleSearch(chatId: number, tgUserId: number, query: string) {
  if (!query) {
    await sendMessage(chatId, '🔍 请输入搜索关键词\n\n用法：/search 关键词')
    return
  }
  
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  await sendMessage(chatId, `🔍 正在搜索 "${query}"...`)
  
  try {
    const config = await loadConfig()
    const tmdbApiKey = config.tmdb?.apiKey
    
    if (!tmdbApiKey) {
      await sendMessage(chatId, '❌ TMDB API 未配置，请联系管理员')
      return
    }
    
    const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&language=zh-CN`
    const res = await fetch(searchUrl)
    const data = await res.json()
    
    const results = (data.results || [])
      .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 5)
    
    if (results.length === 0) {
      await sendMessage(chatId, `😔 未找到 "${query}" 相关的结果`)
      return
    }
    
    let text = `🔍 <b>搜索结果</b>：${query}\n\n`
    
    for (const item of results) {
      const title = item.title || item.name
      const year = (item.release_date || item.first_air_date || '').substring(0, 4)
      const type = item.media_type === 'movie' ? '电影' : '剧集'
      const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A'
      
      text += `📺 <b>${title}</b> (${year})\n`
      text += `├ 类型：${type} | 评分：⭐${rating}\n`
      text += `└ 求片：/request_${item.media_type}_${item.id}\n\n`
    }
    
    text += `点击上方命令即可求片`
    
    await sendMessage(chatId, text)
  } catch (e) {
    console.error('Search failed:', e)
    await sendMessage(chatId, '❌ 搜索失败，请稍后重试')
  }
}

async function handleExchange(chatId: number, tgUserId: number, args: string) {
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  const config = await loadConfig()
  const exchangeConfig = config.exchange || { 
    quotaRate: 50,      // 50 爆米花 = 1 额度
    trafficRate: 10     // 10 爆米花 = 1 GB 流量
  }
  
  if (!args) {
    const text = `💱 <b>兑换中心</b>

<b>可兑换项目</b>
├ 🎫 求片额度：${exchangeConfig.quotaRate} 爆米花/次
└ 📊 下载流量：${exchangeConfig.trafficRate} 爆米花/GB

<b>使用方法</b>
/exchange quota 数量 - 兑换求片额度
/exchange traffic 数量 - 兑换下载流量

示例：/exchange quota 1`
    await sendMessage(chatId, text)
    return
  }
  
  const [type, amountStr] = args.split(' ')
  const amount = parseInt(amountStr) || 1
  
  if (!['quota', 'traffic'].includes(type)) {
    await sendMessage(chatId, '❌ 无效的兑换类型，请使用 quota 或 traffic')
    return
  }
  
  const users = await loadUsers()
  const userIndex = users.findIndex((u: any) => u.id === siteUserId)
  const user = users[userIndex]
  
  if (type === 'quota') {
    const cost = amount * exchangeConfig.quotaRate
    if ((user.popcorn || 0) < cost) {
      await sendMessage(chatId, `❌ 爆米花不足\n需要：${cost}\n当前：${user.popcorn || 0}`)
      return
    }
    
    user.popcorn = (user.popcorn || 0) - cost
    user.exchangedQuota = (user.exchangedQuota || 0) + amount
    await saveUsers(users)
    
    await sendMessage(chatId, `✅ 兑换成功！\n\n🎫 获得额度：+${amount}\n🍿 消耗爆米花：-${cost}\n\n当前额度：${user.exchangedQuota}`)
  } else if (type === 'traffic') {
    const cost = amount * exchangeConfig.trafficRate
    if ((user.popcorn || 0) < cost) {
      await sendMessage(chatId, `❌ 爆米花不足\n需要：${cost}\n当前：${user.popcorn || 0}`)
      return
    }
    
    user.popcorn = (user.popcorn || 0) - cost
    user.traffic = (user.traffic || 0) + amount
    await saveUsers(users)
    
    await sendMessage(chatId, `✅ 兑换成功！\n\n📊 获得流量：+${amount} GB\n🍿 消耗爆米花：-${cost}\n\n当前流量：${user.traffic.toFixed(2)} GB`)
  }
}

async function handleRequest(chatId: number, tgUserId: number, mediaInfo: string) {
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  // 解析 /request_movie_12345 或 /request_tv_12345
  const match = mediaInfo.match(/^(movie|tv)_(\d+)$/)
  if (!match) {
    await sendMessage(chatId, '❌ 无效的求片格式\n\n请先使用 /search 搜索媒体，然后点击求片命令')
    return
  }
  
  const [, mediaType, tmdbId] = match
  
  // 调用网站的求片 API
  try {
    const config = await loadConfig()
    const siteUrl = config.siteUrl || 'http://localhost:3005'
    
    // 先获取媒体详情
    const tmdbApiKey = config.tmdb?.apiKey
    const detailUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${tmdbApiKey}&language=zh-CN`
    const detailRes = await fetch(detailUrl)
    const detail = await detailRes.json()
    
    const users = await loadUsers()
    const user = users.find((u: any) => u.id === siteUserId)
    
    // 提交求片请求
    const requestData = {
      tmdbId: parseInt(tmdbId),
      type: mediaType,
      title: detail.title || detail.name,
      originalTitle: detail.original_title || detail.original_name,
      poster: detail.poster_path,
      year: (detail.release_date || detail.first_air_date || '').substring(0, 4),
      overview: detail.overview,
      requestedBy: user?.username || 'TG用户',
      userId: siteUserId
    }
    
    // 直接写入请求文件
    const requests = await loadRequests()
    
    // 检查是否已存在
    const existing = requests.find((r: any) => 
      r.tmdbId === requestData.tmdbId && r.type === requestData.type && r.status !== 'deleted'
    )
    
    if (existing) {
      const statusMap: Record<string, string> = {
        pending: '待审核',
        approved: '订阅中',
        available: '已入库'
      }
      await sendMessage(chatId, `ℹ️ 该影片已在求片列表中\n状态：${statusMap[existing.status] || existing.status}`)
      return
    }
    
    const newRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...requestData,
      status: 'pending',
      requestedAt: new Date().toISOString()
    }
    
    requests.push(newRequest)
    await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2))
    
    // 发送确认消息
    const posterUrl = detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null
    const caption = `✅ <b>求片已提交！</b>

<b>${requestData.title}</b> (${requestData.year})
📁 类型：${mediaType === 'movie' ? '电影' : '剧集'}
📝 状态：待审核

管理员审核通过后将自动订阅下载`
    
    if (posterUrl) {
      await sendPhoto(chatId, posterUrl, caption)
    } else {
      await sendMessage(chatId, caption)
    }
    
  } catch (e) {
    console.error('Request failed:', e)
    await sendMessage(chatId, '❌ 求片失败，请稍后重试')
  }
}

async function handleHelp(chatId: number) {
  const text = `📖 <b>帮助信息</b>

<b>账号相关</b>
/start - 开始使用
/bind 绑定码 - 绑定网站账号
/me - 查看个人信息
/checkin - 每日签到

<b>媒体相关</b>
/search 关键词 - 搜索媒体
/requests - 查看我的求片

<b>积分相关</b>
/exchange - 兑换额度/流量

如有问题请联系管理员`

  await sendMessage(chatId, text)
}

// ============ Webhook 处理 ============

export async function POST(request: Request) {
  try {
    const update = await request.json()
    
    // 处理消息
    if (update.message) {
      const message = update.message
      const chatId = message.chat.id
      const userId = message.from.id
      const username = message.from.username || message.from.first_name
      const text = message.text || ''
      
      // 解析命令
      const [command, ...args] = text.split(' ')
      const argsStr = args.join(' ')
      
      switch (command) {
        case '/start':
          await handleStart(chatId, userId, username)
          break
        case '/bind':
          await handleBind(chatId, userId, username, argsStr)
          break
        case '/me':
          await handleMe(chatId, userId)
          break
        case '/checkin':
          await handleCheckin(chatId, userId)
          break
        case '/requests':
          await handleRequests(chatId, userId)
          break
        case '/search':
          await handleSearch(chatId, userId, argsStr)
          break
        case '/exchange':
          await handleExchange(chatId, userId, argsStr)
          break
        case '/help':
          await handleHelp(chatId)
          break
        default:
          // 检查是否是求片命令 /request_movie_12345
          if (command.startsWith('/request_')) {
            const mediaInfo = command.replace('/request_', '')
            await handleRequest(chatId, userId, mediaInfo)
          }
          break
      }
    }
    
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ ok: false })
  }
}

// GET 用于设置 webhook
export async function GET(request: Request) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  
  if (action === 'setWebhook') {
    const config = await loadConfig()
    const { botToken } = config.telegram || {}
    const webhookUrl = url.searchParams.get('url')
    
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 })
    }
    
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook URL required' }, { status: 400 })
    }
    
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    })
    
    const data = await res.json()
    return NextResponse.json(data)
  }
  
  if (action === 'getWebhookInfo') {
    const config = await loadConfig()
    const { botToken } = config.telegram || {}
    
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 })
    }
    
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
    const data = await res.json()
    return NextResponse.json(data)
  }
  
  return NextResponse.json({ 
    message: 'Telegram Bot Webhook',
    actions: ['setWebhook', 'getWebhookInfo'],
    usage: '?action=setWebhook&url=YOUR_WEBHOOK_URL'
  })
}
