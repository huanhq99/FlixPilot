'use server'

import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const HISTORY_FILE = path.join(DATA_DIR, 'play-history.json')

export interface PlayHistoryRecord {
  id: string
  time: string
  timestamp: number
  userName: string
  userId: string
  ip: string
  region?: string
  client: string
  device: string
  deviceId: string
  content: string
  contentId: string
  contentType: string
  seriesName?: string
  seasonEpisode?: string
  poster?: string
  backdrop?: string
}

interface HistoryData {
  records: PlayHistoryRecord[]
  lastUpdated: string
}

// 获取历史记录
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const user = searchParams.get('user')
  const date = searchParams.get('date')
  
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf-8')
    const parsed: HistoryData = JSON.parse(data)
    
    let records = parsed.records || []
    
    // 筛选
    if (user) {
      records = records.filter(r => r.userName.toLowerCase().includes(user.toLowerCase()))
    }
    if (date) {
      records = records.filter(r => r.time.startsWith(date))
    }
    
    // 分页
    const total = records.length
    const start = (page - 1) * limit
    const paginatedRecords = records.slice(start, start + limit)
    
    // 检测共享账号行为
    const userRegions: Record<string, Set<string>> = {}
    for (const record of parsed.records) {
      if (record.region) {
        if (!userRegions[record.userName]) {
          userRegions[record.userName] = new Set()
        }
        userRegions[record.userName].add(record.region)
      }
    }
    
    const sharedAccounts: Record<string, string[]> = {}
    for (const [userName, regions] of Object.entries(userRegions)) {
      if (regions.size > 1) {
        sharedAccounts[userName] = Array.from(regions)
      }
    }
    
    // 统计
    const stats = {
      totalRecords: parsed.records.length,
      uniqueUsers: new Set(parsed.records.map(r => r.userName)).size,
      todayRecords: parsed.records.filter(r => {
        const today = new Date().toISOString().slice(0, 10)
        return r.time.includes(today.replace(/-/g, '/').slice(5))
      }).length,
      sharedAccounts
    }
    
    return NextResponse.json({
      records: paginatedRecords,
      total,
      page,
      limit,
      stats
    })
  } catch (e) {
    return NextResponse.json({
      records: [],
      total: 0,
      page: 1,
      limit: 50,
      stats: {
        totalRecords: 0,
        uniqueUsers: 0,
        todayRecords: 0,
        sharedAccounts: {}
      }
    })
  }
}

// 添加记录
export async function POST(request: Request) {
  try {
    const record: PlayHistoryRecord = await request.json()
    
    await fs.mkdir(DATA_DIR, { recursive: true })
    
    let data: HistoryData = { records: [], lastUpdated: '' }
    
    try {
      const existing = await fs.readFile(HISTORY_FILE, 'utf-8')
      data = JSON.parse(existing)
    } catch (e) {
      // 文件不存在
    }
    
    // 检查是否重复（同一用户同一内容5分钟内不重复记录）
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const isDuplicate = data.records.some(r => 
      r.userName === record.userName && 
      r.contentId === record.contentId &&
      r.timestamp > fiveMinutesAgo
    )
    
    if (!isDuplicate) {
      data.records.unshift(record)
      // 保留最近1000条记录
      data.records = data.records.slice(0, 1000)
      data.lastUpdated = new Date().toISOString()
      
      await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2))
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Save play history error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
