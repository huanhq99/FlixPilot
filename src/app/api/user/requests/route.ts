import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, loadUsers, saveUsers } from '@/lib/auth'
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
  userId?: string
  requestedAt: string
  autoApproved?: boolean
}

// 加载配置
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

// 加载求片列表
async function loadRequests(): Promise<MediaRequest[]> {
  try {
    const data = await fs.readFile(REQUESTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// 用户名脱敏：只显示前2位，其余用*代替
function maskUsername(username: string): string {
  if (!username || username.length <= 2) {
    return username
  }
  const visible = username.substring(0, 2)
  const masked = '*'.repeat(Math.min(username.length - 2, 4))
  return visible + masked
}

// 获取当月开始时间
function getMonthStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// GET - 获取求片列表和用户额度信息
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }
    
    const users = await loadUsers()
    const currentUser = users.find(u => u.id === payload.userId)
    
    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 })
    }
    
    const requests = await loadRequests()
    const config = await loadConfig()
    
    const requestConfig = config.request || {
      enabled: true,
      movieCost: 10,
      tvCost: 20,
      monthlyQuota: 3,
      quotaExchangeRate: 50
    }
    
    // 过滤掉已删除的请求
    const activeRequests = requests.filter(r => r.status !== 'deleted')
    
    // 计算当月用户的求片次数
    const monthStart = getMonthStart()
    const myMonthlyRequests = activeRequests.filter(r => 
      r.userId === currentUser.id && 
      new Date(r.requestedAt) >= monthStart
    )
    
    // 脱敏处理：非自己的请求隐藏用户名
    const maskedRequests = activeRequests.map(r => ({
      ...r,
      requestedBy: r.userId === currentUser.id ? r.requestedBy : maskUsername(r.requestedBy),
      isMyRequest: r.userId === currentUser.id
    }))
    
    // 我的求片记录
    const myRequests = maskedRequests.filter(r => r.isMyRequest)
    
    // 计算剩余额度
    const monthlyQuota = requestConfig.monthlyQuota || 3
    const usedQuota = myMonthlyRequests.length
    const remainingQuota = Math.max(0, monthlyQuota - usedQuota)
    
    // 计算可兑换的额度数量
    const exchangeRate = requestConfig.quotaExchangeRate || 50
    const canExchange = Math.floor(currentUser.popcorn / exchangeRate)
    
    return NextResponse.json({
      requests: maskedRequests.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      ),
      myRequests: myRequests.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      ),
      quota: {
        monthly: monthlyQuota,
        used: usedQuota,
        remaining: remainingQuota,
        exchanged: (currentUser as any).exchangedQuota || 0  // 已兑换的额外额度
      },
      popcorn: currentUser.popcorn,
      exchangeRate,
      config: {
        enabled: requestConfig.enabled,
        movieCost: requestConfig.movieCost,
        tvCost: requestConfig.tvCost
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - 兑换求片额度
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }
    
    const users = await loadUsers()
    const userIndex = users.findIndex(u => u.id === payload.userId)
    
    if (userIndex < 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 })
    }
    
    const currentUser = users[userIndex]
    const body = await request.json()
    const { action, amount = 1 } = body
    
    if (action !== 'exchange') {
      return NextResponse.json({ error: '无效操作' }, { status: 400 })
    }
    
    const config = await loadConfig()
    const exchangeRate = config.request?.quotaExchangeRate || 50
    const totalCost = exchangeRate * amount
    
    if (currentUser.popcorn < totalCost) {
      return NextResponse.json({ 
        error: `爆米花不足！需要 ${totalCost} 🍿，当前余额 ${currentUser.popcorn} 🍿`,
        needPopcorn: totalCost,
        currentPopcorn: currentUser.popcorn
      }, { status: 400 })
    }
    
    // 扣除爆米花
    users[userIndex].popcorn -= totalCost
    // 增加兑换的额度计数
    ;(users[userIndex] as any).exchangedQuota = ((users[userIndex] as any).exchangedQuota || 0) + amount
    
    await saveUsers(users)
    
    return NextResponse.json({
      success: true,
      message: `成功兑换 ${amount} 次求片额度`,
      newPopcorn: users[userIndex].popcorn,
      newExchangedQuota: (users[userIndex] as any).exchangedQuota
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
