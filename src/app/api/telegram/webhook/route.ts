import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { translateSubtitleLines, detectLanguage } from '@/services/geminiService'
import {
  detectSubtitleFormat,
  parseSrt,
  parseAss,
  generateSrt,
  generateAss,
  cleanAssText,
  SrtEntry,
  AssFile
} from '@/utils/subtitleParser'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const REQUESTS_FILE = path.join(DATA_DIR, 'media-requests.json')
const TG_BINDINGS_FILE = path.join(DATA_DIR, 'telegram-bindings.json')
const USER_DOWNLOADS_FILE = path.join(DATA_DIR, 'user-downloads.json')

// 翻译任务缓存（等待用户上传字幕文件）
interface TranslateTask {
  targetLang: string
  bilingual: boolean
  expiry: number
}
const translateTasks: Record<string, TranslateTask> = {}

// 用户下载记录接口
interface UserDownload {
  id: string              // 下载ID（MoviePilot的hash或任务ID）
  siteUserId: string      // 网站用户ID
  title: string           // 资源名称
  size: number            // 文件大小（字节）
  downloadedSize: number  // 已下载大小
  status: 'downloading' | 'completed' | 'error' | 'paused'
  progress: number        // 进度 0-100
  speed: number           // 下载速度
  startedAt: string       // 开始时间
  completedAt?: string    // 完成时间
  trafficDeducted: boolean // 是否已扣减流量
  site: string            // 来源站点
}

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
    const parsed = JSON.parse(data)
    // 确保返回数组
    if (Array.isArray(parsed)) {
      return parsed
    }
    // 如果是对象且有 users 属性
    if (parsed && Array.isArray(parsed.users)) {
      return parsed.users
    }
    return []
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

// 加载用户下载记录
async function loadUserDownloads(): Promise<UserDownload[]> {
  try {
    const data = await fs.readFile(USER_DOWNLOADS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return []
  }
}

// 保存用户下载记录
async function saveUserDownloads(downloads: UserDownload[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(USER_DOWNLOADS_FILE, JSON.stringify(downloads, null, 2))
}

// 添加用户下载记录
async function addUserDownload(siteUserId: string, downloadInfo: Partial<UserDownload>): Promise<UserDownload> {
  const downloads = await loadUserDownloads()
  const newDownload: UserDownload = {
    id: downloadInfo.id || `dl_${Date.now()}`,
    siteUserId,
    title: downloadInfo.title || '未知',
    size: downloadInfo.size || 0,
    downloadedSize: 0,
    status: 'downloading',
    progress: 0,
    speed: 0,
    startedAt: new Date().toISOString(),
    trafficDeducted: false,
    site: downloadInfo.site || '未知'
  }
  downloads.push(newDownload)
  await saveUserDownloads(downloads)
  return newDownload
}

// 更新用户下载状态
async function updateUserDownload(downloadId: string, updates: Partial<UserDownload>) {
  const downloads = await loadUserDownloads()
  const index = downloads.findIndex(d => d.id === downloadId)
  if (index !== -1) {
    downloads[index] = { ...downloads[index], ...updates }
    await saveUserDownloads(downloads)
  }
}

// 获取用户的下载记录
async function getUserDownloads(siteUserId: string): Promise<UserDownload[]> {
  const downloads = await loadUserDownloads()
  return downloads.filter(d => d.siteUserId === siteUserId)
}

// 扣减用户流量
async function deductUserTraffic(siteUserId: string, bytes: number): Promise<boolean> {
  const users = await loadUsers()
  const userIndex = users.findIndex((u: any) => u.id === siteUserId)
  
  if (userIndex === -1) return false
  
  const user = users[userIndex]
  const trafficGB = bytes / (1024 * 1024 * 1024)
  const currentTraffic = user.monthlyTraffic || 0
  
  if (currentTraffic < trafficGB) {
    return false // 流量不足
  }
  
  users[userIndex].monthlyTraffic = Math.max(0, currentTraffic - trafficGB)
  users[userIndex].usedTraffic = (user.usedTraffic || 0) + trafficGB

  const existingStats = user.trafficStats || {}
  const currentDownloadBytes = existingStats.downloadBytes ?? ((user.usedTraffic || 0) * 1024 * 1024 * 1024)
  const currentUploadBytes = existingStats.uploadBytes ?? 0
  users[userIndex].trafficStats = {
    downloadBytes: currentDownloadBytes + bytes,
    uploadBytes: currentUploadBytes
  }
  await saveUsers(users)
  return true
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

async function sendMediaGroup(chatId: string | number, media: any[]) {
  const config = await loadConfig()
  const { botToken } = config.telegram || {}
  if (!botToken) return
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      media
    })
  })
}

async function editMessage(chatId: string | number, messageId: number, text: string, options: any = {}) {
  const config = await loadConfig()
  const { botToken } = config.telegram || {}
  if (!botToken) return
  
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...options
    })
  })
}

async function answerCallback(callbackQueryId: string, text?: string) {
  const config = await loadConfig()
  const { botToken } = config.telegram || {}
  if (!botToken) return
  
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text
    })
  })
}

// 发送文档
async function sendDocument(chatId: string | number, document: Buffer, filename: string, caption?: string) {
  const config = await loadConfig()
  const { botToken } = config.telegram || {}
  if (!botToken) return
  
  const formData = new FormData()
  formData.append('chat_id', String(chatId))
  // 将 Buffer 转换为 Uint8Array 以兼容 Blob
  formData.append('document', new Blob([new Uint8Array(document)]), filename)
  if (caption) {
    formData.append('caption', caption)
    formData.append('parse_mode', 'HTML')
  }
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: formData
  })
}

// 获取文件
async function getFile(fileId: string): Promise<Buffer | null> {
  const config = await loadConfig()
  const { botToken } = config.telegram || {}
  if (!botToken) return null
  
  try {
    // 获取文件路径
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
    const data = await res.json()
    
    if (!data.ok || !data.result?.file_path) {
      return null
    }
    
    // 下载文件
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`
    const fileRes = await fetch(fileUrl)
    const buffer = await fileRes.arrayBuffer()
    
    return Buffer.from(buffer)
  } catch (e) {
    console.error('Failed to get file:', e)
    return null
  }
}

// ============ MoviePilot API ============

async function getMoviePilotToken(): Promise<{ token: string; baseUrl: string } | null> {
  const config = await loadConfig()
  const { serverUrl, username, password, enabled } = config.moviepilot || {}
  
  if (!enabled || !serverUrl || !username || !password) {
    return null
  }
  
  const baseUrl = serverUrl.replace(/\/$/, '')
  
  try {
    const res = await fetch(`${baseUrl}/api/v1/login/access-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    })
    
    if (res.ok) {
      const data = await res.json()
      return { token: data.access_token, baseUrl }
    }
    return null
  } catch (e) {
    console.error('MoviePilot login error:', e)
    return null
  }
}

async function searchMoviePilotResources(keyword: string, page: number = 1): Promise<any> {
  const auth = await getMoviePilotToken()
  if (!auth) return { success: false, error: 'MoviePilot 未配置' }
  
  try {
    // MoviePilot API: /api/v1/search/title?keyword=xxx&page=0 (page 从 0 开始)
    const mpPage = page - 1 // 转换为 0-indexed
    console.log(`[MoviePilot] Searching resources: ${keyword}, page: ${mpPage}`)
    const res = await fetch(`${auth.baseUrl}/api/v1/search/title?keyword=${encodeURIComponent(keyword)}&page=${mpPage}`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
    
    console.log(`[MoviePilot] Search response status: ${res.status}`)
    
    if (res.ok) {
      const data = await res.json()
      console.log(`[MoviePilot] Search result:`, JSON.stringify(data).substring(0, 500))
      // MoviePilot 返回格式: { success: true, data: [...] }
      if (data.success && data.data) {
        return { success: true, data: { torrents: data.data } }
      }
      return { success: false, error: data.message || '未搜索到资源' }
    }
    const errorText = await res.text()
    console.log(`[MoviePilot] Search failed: ${res.status}`, errorText)
    return { success: false, error: `搜索失败 (${res.status})` }
  } catch (e: any) {
    console.log(`[MoviePilot] Search error:`, e.message)
    return { success: false, error: e.message }
  }
}

async function startMoviePilotDownload(torrentInfo: any): Promise<any> {
  const auth = await getMoviePilotToken()
  if (!auth) return { success: false, error: 'MoviePilot 未配置' }
  
  try {
    const res = await fetch(`${auth.baseUrl}/api/v1/download/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}` 
      },
      body: JSON.stringify(torrentInfo)
    })
    
    if (res.ok) {
      const data = await res.json()
      return { success: true, data }
    }
    const error = await res.text()
    return { success: false, error }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

async function getMoviePilotDownloading(): Promise<any> {
  const auth = await getMoviePilotToken()
  if (!auth) return { success: false, error: 'MoviePilot 未配置' }
  
  try {
    const res = await fetch(`${auth.baseUrl}/api/v1/download/`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    })
    
    if (res.ok) {
      const data = await res.json()
      return { success: true, data }
    }
    return { success: false, error: '获取下载列表失败' }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// 存储搜索结果的临时缓存（用于分页和下载）
const searchCache: Record<string, { results: any[]; keyword: string; expiry: number }> = {}

// ============ 命令处理 ============

async function handleStart(chatId: number, userId: number, username: string) {
  const config = await loadConfig()
  const siteName = config.siteName || 'FlixPilot'
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

📥 <b>资源下载</b>
/resource 关键词 - 搜索 PT 资源
/mydownloads - 我的下载/进度
/downloading - 全部下载任务

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

<b>积分与流量</b>
├ 🍿 爆米花：${user.popcorn || 0}
├ 📊 剩余流量：${formatSize((user.monthlyTraffic || 0) * 1024 * 1024 * 1024)}
├ 📈 已用流量：${formatSize((user.usedTraffic || 0) * 1024 * 1024 * 1024)}
└ 📅 连续签到：${user.checkinStreak || 0} 天

<b>求片额度</b>
├ 基础额度：${monthlyQuota} 次/月
├ 兑换额度：${exchangedQuota} 次
├ 已用额度：${usedQuota} 次
└ 剩余额度：${Math.max(0, totalQuota - usedQuota)} 次

💡 使用 /mydownloads 查看下载记录`

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
    
    // 为每个搜索结果发送带海报的消息
    for (const item of results) {
      const title = item.title || item.name
      const year = (item.release_date || item.first_air_date || '').substring(0, 4)
      const type = item.media_type === 'movie' ? '电影' : '剧集'
      const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A'
      const overview = item.overview ? (item.overview.length > 100 ? item.overview.substring(0, 100) + '...' : item.overview) : ''
      
      const caption = `🎬 <b>${title}</b> (${year})\n` +
        `📺 类型：${type} | ⭐ 评分：${rating}\n` +
        (overview ? `📝 ${overview}\n\n` : '\n') +
        `👉 求片：/request_${item.media_type}_${item.id}`
      
      if (item.poster_path) {
        const posterUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`
        await sendPhoto(chatId, posterUrl, caption)
      } else {
        await sendMessage(chatId, caption)
      }
    }
    
    await sendMessage(chatId, `✅ 共找到 ${results.length} 个结果，点击上方命令即可求片`)
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
    user.monthlyTraffic = (user.monthlyTraffic || 0) + amount
    await saveUsers(users)
    
    await sendMessage(chatId, `✅ 兑换成功！\n\n📊 获得流量：+${amount} GB\n🍿 消耗爆米花：-${cost}\n\n当前剩余流量：${formatSize((user.monthlyTraffic || 0) * 1024 * 1024 * 1024)}`)
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

// 处理资源搜索（MoviePilot）
async function handleResourceSearch(chatId: number, tgUserId: number, query: string, page: number = 1) {
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  if (!query) {
    await sendMessage(chatId, '🔍 请输入要搜索的资源名称\n\n用法：/resource 资源名称\n示例：/resource 斗罗大陆')
    return
  }
  
  await sendMessage(chatId, `🔍 正在搜索资源 "${query}"...`)
  
  const result = await searchMoviePilotResources(query, page)
  
  if (!result.success) {
    await sendMessage(chatId, `❌ 搜索失败：${result.error}`)
    return
  }
  
  const torrents = result.data?.torrents || result.data || []
  
  if (!Array.isArray(torrents) || torrents.length === 0) {
    await sendMessage(chatId, `😔 未找到 "${query}" 相关的资源`)
    return
  }
  
  // 缓存搜索结果
  const cacheKey = `${tgUserId}_resource`
  searchCache[cacheKey] = {
    results: torrents,
    keyword: query,
    expiry: Date.now() + 30 * 60 * 1000 // 30分钟过期
  }
  
  // 每页显示数量
  const pageSize = 5
  const totalPages = Math.ceil(torrents.length / pageSize)
  const startIdx = (page - 1) * pageSize
  const endIdx = Math.min(startIdx + pageSize, torrents.length)
  const pageTorrents = torrents.slice(startIdx, endIdx)
  
  let text = `📦 <b>资源搜索结果</b>：${query}\n\n`
  
  for (let i = 0; i < pageTorrents.length; i++) {
    const t = pageTorrents[i]
    const globalIdx = startIdx + i
    const title = t.title || t.name || '未知标题'
    const size = t.size ? formatSize(t.size) : 'N/A'
    const seeders = t.seeders ?? 'N/A'
    const site = t.site_name || t.site || '未知站点'
    const resolution = t.resolution || ''
    const effect = t.video_encode || ''
    
    text += `📺 <b>${title}</b>\n`
    if (resolution || effect) {
      text += `├ 质量：${resolution} ${effect}\n`
    }
    text += `├ 大小：${size} | 做种：${seeders}\n`
    text += `├ 站点：${site}\n`
    text += `└ 下载：/download_${globalIdx}\n\n`
  }
  
  text += `📄 第 ${page}/${totalPages} 页（共 ${torrents.length} 个结果）\n`
  
  if (totalPages > 1) {
    text += `\n翻页：`
    if (page > 1) text += `/resource_page_${page - 1} 上一页 | `
    if (page < totalPages) text += `/resource_page_${page + 1} 下一页`
  }
  
  await sendMessage(chatId, text)
}

// 处理下载命令
async function handleDownload(chatId: number, tgUserId: number, indexStr: string) {
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  const cacheKey = `${tgUserId}_resource`
  const cache = searchCache[cacheKey]
  
  if (!cache || cache.expiry < Date.now()) {
    await sendMessage(chatId, '❌ 搜索结果已过期，请重新搜索')
    return
  }
  
  const index = parseInt(indexStr)
  if (isNaN(index) || index < 0 || index >= cache.results.length) {
    await sendMessage(chatId, '❌ 无效的资源编号')
    return
  }
  
  const torrent = cache.results[index]
  const title = torrent.title || torrent.name || '未知'
  const size = torrent.size || 0
  const sizeStr = formatSize(size)
  const site = torrent.site_name || torrent.site || '未知'
  
  // 检查用户流量是否足够
  const users = await loadUsers()
  const user = users.find((u: any) => u.id === siteUserId)
  
  if (!user) {
    await sendMessage(chatId, '❌ 用户不存在')
    return
  }
  
  const trafficGB = size / (1024 * 1024 * 1024)
  const userTraffic = user.monthlyTraffic || 0
  
  if (userTraffic < trafficGB) {
    await sendMessage(chatId, `❌ <b>流量不足</b>\n\n📦 资源大小：${sizeStr}\n🎫 剩余流量：${formatSize(userTraffic * 1024 * 1024 * 1024)}\n\n请使用 /exchange traffic 兑换更多流量`)
    return
  }
  
  await sendMessage(chatId, `📥 <b>正在添加下载任务...</b>\n\n📺 ${title}\n📦 大小：${sizeStr}\n🎫 将消耗流量：${sizeStr}`)
  
  const result = await startMoviePilotDownload(torrent)
  
  if (result.success) {
    // 记录用户下载
    const downloadId = result.data?.hash || result.data?.id || `dl_${Date.now()}`
    await addUserDownload(siteUserId, {
      id: downloadId,
      title,
      size,
      site
    })
    
    await sendMessage(chatId, `✅ <b>下载任务已添加</b>\n\n📺 ${title}\n📦 大小：${sizeStr}\n📍 站点：${site}\n\n⚠️ 下载完成后将自动扣除 ${sizeStr} 流量\n\n使用 /mydownloads 查看我的下载`)
  } else {
    await sendMessage(chatId, `❌ 添加下载失败：${result.error}`)
  }
}

// 处理我的下载列表
async function handleMyDownloads(chatId: number, tgUserId: number) {
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  // 获取用户信息
  const users = await loadUsers()
  const user = users.find((u: any) => u.id === siteUserId)
  const monthlyTraffic = user?.monthlyTraffic || 0
  const usedTraffic = user?.usedTraffic || 0
  
  // 获取用户下载记录
  const userDownloads = await getUserDownloads(siteUserId)
  
  // 获取 MoviePilot 当前下载状态
  const mpResult = await getMoviePilotDownloading()
  const mpDownloads = mpResult.success ? (mpResult.data || []) : []
  
  // 更新下载记录状态
  for (const dl of userDownloads) {
    if (dl.status === 'downloading') {
      // 查找对应的 MoviePilot 下载
      const mpDl = mpDownloads.find((m: any) => 
        m.hash === dl.id || m.id === dl.id || 
        (m.name && dl.title && m.name.includes(dl.title.substring(0, 20)))
      )
      
      if (mpDl) {
        const newProgress = mpDl.progress !== undefined ? mpDl.progress * 100 : 
                           (mpDl.size ? (mpDl.completed || 0) / mpDl.size * 100 : 0)
        const newStatus = mpDl.state === 'completed' || mpDl.state === 'seeding' ? 'completed' : 
                         mpDl.state === 'error' ? 'error' : 'downloading'
        
        dl.progress = newProgress
        dl.speed = mpDl.speed || mpDl.dlspeed || 0
        dl.downloadedSize = mpDl.completed || mpDl.downloaded_size || 0
        dl.status = newStatus
        
        // 下载完成，扣减流量
        if (newStatus === 'completed' && !dl.trafficDeducted) {
          const deducted = await deductUserTraffic(siteUserId, dl.size)
          if (deducted) {
            dl.trafficDeducted = true
            dl.completedAt = new Date().toISOString()
          }
        }
      }
    }
  }
  
  // 保存更新后的记录
  const allDownloads = await loadUserDownloads()
  const otherDownloads = allDownloads.filter(d => d.siteUserId !== siteUserId)
  await saveUserDownloads([...otherDownloads, ...userDownloads])
  
  // 生成消息
  let text = `📥 <b>我的下载</b>\n\n`
  text += `🎫 剩余流量：${formatSize(monthlyTraffic * 1024 * 1024 * 1024)}\n`
  text += `📊 已用流量：${formatSize(usedTraffic * 1024 * 1024 * 1024)}\n\n`
  
  if (userDownloads.length === 0) {
    text += `📭 暂无下载记录\n\n使用 /resource 关键词 搜索资源`
  } else {
    // 按时间倒序，最多显示10条
    const recentDownloads = userDownloads.slice(-10).reverse()
    
    for (const dl of recentDownloads) {
      const stateEmoji: Record<string, string> = {
        'downloading': '⬇️',
        'completed': '✅',
        'error': '❌',
        'paused': '⏸️'
      }
      const emoji = stateEmoji[dl.status] || '📦'
      const shortTitle = dl.title.length > 25 ? dl.title.substring(0, 25) + '...' : dl.title
      
      text += `${emoji} <b>${shortTitle}</b>\n`
      text += `├ 大小：${formatSize(dl.size)}\n`
      
      if (dl.status === 'downloading') {
        const progressNum = Math.min(100, Math.max(0, dl.progress))
        const filled = Math.floor(progressNum / 10)
        const progressBar = '█'.repeat(filled) + '░'.repeat(10 - filled)
        const speedStr = formatSize(dl.speed) + '/s'
        const eta = dl.speed > 0 ? formatTime((dl.size - dl.downloadedSize) / dl.speed) : '计算中'
        
        text += `├ 进度：${progressBar} ${progressNum.toFixed(1)}%\n`
        text += `├ 速度：${speedStr}\n`
        text += `└ 预计：${eta}\n\n`
      } else if (dl.status === 'completed') {
        text += `├ 状态：已完成${dl.trafficDeducted ? ' ✓已扣流量' : ''}\n`
        text += `└ 时间：${dl.completedAt ? new Date(dl.completedAt).toLocaleString('zh-CN') : '-'}\n\n`
      } else {
        text += `└ 状态：${dl.status}\n\n`
      }
    }
  }
  
  text += `\n🔄 刷新：/mydownloads`
  
  await sendMessage(chatId, text)
}

// 处理全局下载列表查看（所有下载）
async function handleDownloading(chatId: number, tgUserId: number) {
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  const result = await getMoviePilotDownloading()
  
  if (!result.success) {
    await sendMessage(chatId, `❌ 获取下载列表失败：${result.error}`)
    return
  }
  
  const downloads = result.data || []
  
  if (downloads.length === 0) {
    await sendMessage(chatId, '📭 当前没有下载任务')
    return
  }
  
  // 获取用户流量配额
  const users = await loadUsers()
  const user = users.find((u: any) => u.id === siteUserId)
  const monthlyTraffic = user?.monthlyTraffic || 0
  
  let text = `📥 <b>下载任务列表</b>\n\n`
  text += `🎫 本月剩余流量：${formatSize(monthlyTraffic * 1024 * 1024 * 1024)}\n\n`
  
  for (const dl of downloads.slice(0, 10)) {
    const name = dl.name || dl.title || '未知'
    const shortName = name.length > 30 ? name.substring(0, 30) + '...' : name
    const size = dl.size ? formatSize(dl.size) : 'N/A'
    const downloaded = dl.downloaded_size || dl.completed || 0
    const speed = dl.speed || dl.dlspeed || 0
    const progress = dl.progress !== undefined ? (dl.progress * 100).toFixed(1) : 
                     (dl.size ? ((downloaded / dl.size) * 100).toFixed(1) : '0')
    const state = dl.state || dl.status || 'unknown'
    
    const stateEmoji: Record<string, string> = {
      'downloading': '⬇️',
      'seeding': '⬆️',
      'completed': '✅',
      'paused': '⏸️',
      'error': '❌',
      'queued': '🕐'
    }
    
    const emoji = stateEmoji[state] || '📦'
    
    text += `${emoji} <b>${shortName}</b>\n`
    text += `├ 大小：${size}\n`
    
    if (state === 'downloading') {
      const remaining = formatSize(dl.size - downloaded)
      const speedStr = formatSize(speed) + '/s'
      const eta = speed > 0 ? formatTime((dl.size - downloaded) / speed) : '计算中'
      
      // 进度条
      const progressNum = parseFloat(progress)
      const filled = Math.floor(progressNum / 10)
      const progressBar = '█'.repeat(filled) + '░'.repeat(10 - filled)
      
      text += `├ 进度：${progressBar} ${progress}%\n`
      text += `├ 速度：${speedStr} | 剩余：${remaining}\n`
      text += `└ 预计：${eta}\n\n`
    } else {
      text += `└ 状态：${state}\n\n`
    }
  }
  
  text += `\n🔄 刷新：/downloading`
  
  await sendMessage(chatId, text)
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i]
}

// 格式化时间
function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0秒'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}小时${m}分`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

async function handleHelp(chatId: number) {
  const text = `📖 <b>帮助信息</b>

<b>账号相关</b>
/start - 开始使用
/bind 绑定码 - 绑定网站账号
/me - 查看个人信息
/checkin - 每日签到

<b>媒体相关</b>
/search 关键词 - 搜索媒体（TMDB）
/requests - 查看我的求片

<b>资源下载</b>
/resource 关键词 - 搜索资源（PT站）
/mydownloads - 查看我的下载/进度
/downloading - 查看全部下载任务

<b>积分相关</b>
/exchange - 兑换额度/流量

<b>字幕翻译</b>
/translate - AI字幕翻译（支持SRT/ASS）

如有问题请联系管理员`

  await sendMessage(chatId, text)
}

// ============ 字幕翻译处理 ============

// 支持的目标语言
const SUPPORTED_LANGUAGES: Record<string, string> = {
  'zh': '简体中文',
  'zh-tw': '繁体中文',
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
  'fr': 'Français',
  'de': 'Deutsch',
  'es': 'Español',
  'ru': 'Русский',
  'th': 'ภาษาไทย',
  'vi': 'Tiếng Việt'
}

async function handleTranslate(chatId: number, tgUserId: number, args: string) {
  const bindings = await loadTgBindings()
  const siteUserId = bindings[String(tgUserId)]
  
  if (!siteUserId) {
    await sendMessage(chatId, '❌ 您还未绑定网站账号，请使用 /bind 命令绑定')
    return
  }
  
  // 检查 Gemini API 是否配置
  const config = await loadConfig()
  if (!config.gemini?.apiKey) {
    await sendMessage(chatId, '❌ AI 翻译服务未配置，请联系管理员')
    return
  }
  
  if (!args) {
    // 显示帮助
    let langList = ''
    for (const [code, name] of Object.entries(SUPPORTED_LANGUAGES)) {
      langList += `  <code>${code}</code> - ${name}\n`
    }
    
    const text = `🌐 <b>AI 字幕翻译</b>

使用方法：
1️⃣ 发送命令选择目标语言
2️⃣ 上传字幕文件（SRT/ASS）
3️⃣ 等待翻译完成

<b>命令格式</b>
/translate 语言代码 - 仅翻译
/translate 语言代码 bi - 双语字幕

<b>支持的语言</b>
${langList}
<b>示例</b>
/translate zh - 翻译为简体中文
/translate en bi - 翻译为英文双语字幕`
    
    await sendMessage(chatId, text)
    return
  }
  
  // 解析参数
  const parts = args.toLowerCase().split(/\s+/)
  const langCode = parts[0]
  const bilingual = parts.includes('bi') || parts.includes('bilingual')
  
  if (!SUPPORTED_LANGUAGES[langCode]) {
    await sendMessage(chatId, `❌ 不支持的语言代码: ${langCode}\n\n使用 /translate 查看支持的语言`)
    return
  }
  
  // 保存翻译任务，等待用户上传文件
  translateTasks[String(tgUserId)] = {
    targetLang: SUPPORTED_LANGUAGES[langCode],
    bilingual,
    expiry: Date.now() + 5 * 60 * 1000 // 5分钟过期
  }
  
  const modeText = bilingual ? '双语字幕' : '仅翻译'
  await sendMessage(chatId, `✅ 已设置目标语言：<b>${SUPPORTED_LANGUAGES[langCode]}</b>\n模式：${modeText}\n\n📎 请上传字幕文件（SRT 或 ASS 格式）\n⏰ 5分钟内有效`)
}

// 处理字幕文件翻译
async function handleSubtitleFile(chatId: number, tgUserId: number, document: any) {
  const task = translateTasks[String(tgUserId)]
  
  if (!task || task.expiry < Date.now()) {
    // 没有翻译任务，忽略文件
    return false
  }
  
  // 检查文件类型
  const fileName = document.file_name || ''
  const ext = fileName.toLowerCase().split('.').pop()
  
  if (!['srt', 'ass', 'ssa'].includes(ext || '')) {
    await sendMessage(chatId, '❌ 不支持的文件格式，请上传 SRT 或 ASS 字幕文件')
    return true
  }
  
  // 清除任务
  delete translateTasks[String(tgUserId)]
  
  // 下载文件
  const fileBuffer = await getFile(document.file_id)
  if (!fileBuffer) {
    await sendMessage(chatId, '❌ 下载文件失败，请重试')
    return true
  }
  
  const fileContent = fileBuffer.toString('utf-8')
  const format = detectSubtitleFormat(fileContent)
  
  if (format === 'unknown') {
    await sendMessage(chatId, '❌ 无法识别字幕格式，请确保文件是有效的 SRT 或 ASS 字幕')
    return true
  }
  
  try {
    const config = await loadConfig()
    const geminiConfig = {
      apiKey: config.gemini.apiKey,
      model: config.gemini.model || 'gemini-2.0-flash',
      baseUrl: config.gemini.baseUrl,
      maxRetries: 3
    }
    
    let translatedContent: string
    let outputFileName: string
    let subtitleCount: number
    let sourceLanguage: string
    
    if (format === 'srt') {
      const entries = parseSrt(fileContent)
      
      if (entries.length === 0) {
        await sendMessage(chatId, '❌ 字幕文件为空或格式错误')
        return true
      }
      
      subtitleCount = entries.length
      const sampleText = entries.slice(0, 5).map(e => e.text).join(' ')
      sourceLanguage = detectLanguage(sampleText)
      
      // 发送初始状态
      const estimatedTime = Math.ceil(entries.length / 25 * 3) // 大约每批3秒
      const statusMsg = await sendMessageWithReturn(chatId, 
        `🔄 <b>正在翻译字幕...</b>\n\n` +
        `📄 文件：${fileName}\n` +
        `📝 字幕条数：${subtitleCount}\n` +
        `🌐 ${sourceLanguage} → ${task.targetLang}\n` +
        `📊 模式：${task.bilingual ? '双语' : '仅翻译'}\n` +
        `⏱ 预计时间：约 ${estimatedTime} 秒\n\n` +
        `⏳ 请稍候...`
      )
      
      // 提取文本
      const texts = entries.map(e => e.text)
      
      // 使用新的批量翻译函数
      const result = await translateSubtitleLines(
        texts,
        task.targetLang,
        geminiConfig,
        25, // 批次大小
        async (current: number, total: number, message: string) => {
          if (statusMsg) {
            const progress = Math.round(current / total * 100)
            await editMessage(chatId, statusMsg, 
              `🔄 <b>正在翻译字幕...</b>\n\n` +
              `📄 文件：${fileName}\n` +
              `📊 进度：${current}/${total} 批次 (${progress}%)\n\n` +
              `⏳ ${message}`
            )
          }
        }
      )
      
      if (!result.success || !result.translatedLines) {
        await sendMessage(chatId, `❌ 翻译失败：${result.error}`)
        return true
      }
      
      const translatedTexts = result.translatedLines
      
      // 生成翻译后的字幕
      let outputEntries: SrtEntry[]
      
      if (task.bilingual) {
        outputEntries = entries.map((entry, idx) => ({
          ...entry,
          text: `${entry.text}\n${translatedTexts[idx] || ''}`
        }))
      } else {
        outputEntries = entries.map((entry, idx) => ({
          ...entry,
          text: translatedTexts[idx] || entry.text
        }))
      }
      
      translatedContent = generateSrt(outputEntries)
      
      const baseName = fileName.replace(/\.[^.]+$/, '')
      const langSuffix = task.bilingual ? `${task.targetLang}_bilingual` : task.targetLang
      outputFileName = `${baseName}.${langSuffix}.srt`
      
    } else {
      // ASS 格式
      const assFile = parseAss(fileContent)
      
      if (assFile.events.dialogues.length === 0) {
        await sendMessage(chatId, '❌ 字幕文件为空或格式错误')
        return true
      }
      
      subtitleCount = assFile.events.dialogues.length
      const dialogueTexts = assFile.events.dialogues.map(d => cleanAssText(d.text))
      const sampleText = dialogueTexts.slice(0, 5).join(' ')
      sourceLanguage = detectLanguage(sampleText)
      
      const estimatedTime = Math.ceil(dialogueTexts.length / 25 * 3)
      const statusMsg = await sendMessageWithReturn(chatId, 
        `🔄 <b>正在翻译字幕...</b>\n\n` +
        `📄 文件：${fileName}\n` +
        `📝 字幕条数：${subtitleCount}\n` +
        `🌐 ${sourceLanguage} → ${task.targetLang}\n` +
        `📊 模式：${task.bilingual ? '双语' : '仅翻译'}\n` +
        `⏱ 预计时间：约 ${estimatedTime} 秒\n\n` +
        `⏳ 请稍候...`
      )
      
      // 使用新的批量翻译函数
      const result = await translateSubtitleLines(
        dialogueTexts,
        task.targetLang,
        geminiConfig,
        25,
        async (current: number, total: number, message: string) => {
          if (statusMsg) {
            const progress = Math.round(current / total * 100)
            await editMessage(chatId, statusMsg, 
              `🔄 <b>正在翻译字幕...</b>\n\n` +
              `📄 文件：${fileName}\n` +
              `📊 进度：${current}/${total} 批次 (${progress}%)\n\n` +
              `⏳ ${message}`
            )
          }
        }
      )
      
      if (!result.success || !result.translatedLines) {
        await sendMessage(chatId, `❌ 翻译失败：${result.error}`)
        return true
      }
      
      const translatedTexts = result.translatedLines
      
      // 生成翻译后的 ASS
      const newDialogues = assFile.events.dialogues.map((dialogue, idx) => {
        if (task.bilingual) {
          return {
            ...dialogue,
            text: `${dialogue.text}\\N{\\c&HFFFFFF&}${translatedTexts[idx] || ''}`
          }
        } else {
          return {
            ...dialogue,
            text: translatedTexts[idx] || dialogue.text
          }
        }
      })
      
      const outputAss: AssFile = {
        ...assFile,
        events: {
          ...assFile.events,
          dialogues: newDialogues
        }
      }
      
      translatedContent = generateAss(outputAss)
      
      const baseName = fileName.replace(/\.[^.]+$/, '')
      const langSuffix = task.bilingual ? `${task.targetLang}_bilingual` : task.targetLang
      outputFileName = `${baseName}.${langSuffix}.ass`
    }
    
    // 发送翻译后的文件
    await sendDocument(
      chatId,
      Buffer.from(translatedContent, 'utf-8'),
      outputFileName,
      `✅ <b>翻译完成！</b>\n\n` +
      `📄 ${outputFileName}\n` +
      `📝 字幕条数：${subtitleCount}\n` +
      `🌐 ${sourceLanguage} → ${task.targetLang}\n` +
      `📊 模式：${task.bilingual ? '双语字幕' : '仅翻译'}`
    )
    
  } catch (error: any) {
    console.error('[Subtitle Translation] Error:', error)
    await sendMessage(chatId, `❌ 翻译过程出错：${error.message}`)
  }
  
  return true
}

// 发送消息并返回消息ID
async function sendMessageWithReturn(chatId: string | number, text: string): Promise<number | null> {
  const config = await loadConfig()
  const { botToken } = config.telegram || {}
  if (!botToken) return null
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    })
    
    const data = await res.json()
    return data.ok ? data.result.message_id : null
  } catch (e) {
    return null
  }
}

// ============ Webhook 处理 ============

export async function POST(request: Request) {
  try {
    const update = await request.json()
    
    console.log('[Telegram Webhook] Received update:', JSON.stringify(update, null, 2))
    
    // 处理消息
    if (update.message) {
      const message = update.message
      const chatId = message.chat.id
      const userId = message.from.id
      const username = message.from.username || message.from.first_name
      const text = message.text || ''
      
      console.log('[Telegram Webhook] Processing message:', { chatId, userId, username, text })
      
      // 解析命令（处理 /command@botname 格式）
      const [rawCommand, ...args] = text.split(' ')
      const command = rawCommand.split('@')[0] // 移除 @botname 部分
      const argsStr = args.join(' ')
      
      console.log('[Telegram Webhook] Parsed command:', { command, argsStr })
      
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
        case '/resource':
          await handleResourceSearch(chatId, userId, argsStr)
          break
        case '/downloading':
          await handleDownloading(chatId, userId)
          break
        case '/mydownloads':
          await handleMyDownloads(chatId, userId)
          break
        case '/help':
          await handleHelp(chatId)
          break
        case '/translate':
          await handleTranslate(chatId, userId, argsStr)
          break
        default:
          // 检查是否是求片命令 /request_movie_12345
          if (command.startsWith('/request_')) {
            const mediaInfo = command.replace('/request_', '')
            await handleRequest(chatId, userId, mediaInfo)
          }
          // 检查是否是下载命令 /download_0
          else if (command.startsWith('/download_')) {
            const indexStr = command.replace('/download_', '')
            await handleDownload(chatId, userId, indexStr)
          }
          // 检查是否是资源翻页命令 /resource_page_2
          else if (command.startsWith('/resource_page_')) {
            const page = parseInt(command.replace('/resource_page_', ''))
            const cacheKey = `${userId}_resource`
            const cache = searchCache[cacheKey]
            if (cache && cache.expiry > Date.now()) {
              await handleResourceSearch(chatId, userId, cache.keyword, page)
            } else {
              await sendMessage(chatId, '❌ 搜索结果已过期，请重新搜索')
            }
          }
          break
      }
      
      // 检查是否有文档上传（字幕文件）
      if (message.document) {
        const handled = await handleSubtitleFile(chatId, userId, message.document)
        if (handled) {
          return NextResponse.json({ ok: true })
        }
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
