import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const TRAFFIC_FILE = path.join(DATA_DIR, 'emby-traffic.json')

interface TrafficData {
  users: {
    [embyUserId: string]: {
      downloadBytes: number
      uploadBytes: number
      lastUpdated: string
    }
  }
  lastUpdated: string | null
}

function loadTrafficData(): TrafficData {
  try {
    if (fs.existsSync(TRAFFIC_FILE)) {
      const data = fs.readFileSync(TRAFFIC_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load traffic data:', e)
  }
  return { users: {}, lastUpdated: null }
}

function saveTrafficData(data: TrafficData) {
  fs.writeFileSync(TRAFFIC_FILE, JSON.stringify(data, null, 2))
}

// POST: 上报流量（CDN/Nginx 调用）
export async function POST(request: NextRequest) {
  try {
    // 验证密钥（可选，从配置读取）
    const authHeader = request.headers.get('Authorization')
    const expectedKey = process.env.TRAFFIC_REPORT_KEY || 'flixpilot-traffic-key'
    
    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // 支持单条或批量上报
    // 单条: { embyUserId: "xxx", bytes: 12345, type: "download" }
    // 批量: { reports: [{ embyUserId: "xxx", bytes: 12345, type: "download" }, ...] }
    
    const reports = body.reports || [body]
    const data = loadTrafficData()
    
    for (const report of reports) {
      const { embyUserId, bytes, type = 'download' } = report
      
      if (!embyUserId || !bytes) continue
      
      if (!data.users[embyUserId]) {
        data.users[embyUserId] = {
          downloadBytes: 0,
          uploadBytes: 0,
          lastUpdated: new Date().toISOString()
        }
      }
      
      if (type === 'upload') {
        data.users[embyUserId].uploadBytes += bytes
      } else {
        data.users[embyUserId].downloadBytes += bytes
      }
      
      data.users[embyUserId].lastUpdated = new Date().toISOString()
    }
    
    data.lastUpdated = new Date().toISOString()
    saveTrafficData(data)
    
    return NextResponse.json({ success: true, processed: reports.length })
  } catch (error) {
    console.error('Traffic report error:', error)
    return NextResponse.json({ error: 'Failed to process traffic report' }, { status: 500 })
  }
}

// GET: 查询流量（管理后台调用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const embyUserId = searchParams.get('embyUserId')
    
    const data = loadTrafficData()
    
    if (embyUserId) {
      // 查询单个用户
      const userTraffic = data.users[embyUserId]
      if (!userTraffic) {
        return NextResponse.json({ 
          embyUserId, 
          downloadBytes: 0, 
          uploadBytes: 0,
          totalBytes: 0 
        })
      }
      return NextResponse.json({
        embyUserId,
        ...userTraffic,
        totalBytes: userTraffic.downloadBytes + userTraffic.uploadBytes
      })
    }
    
    // 返回所有用户流量
    return NextResponse.json(data)
  } catch (error) {
    console.error('Traffic query error:', error)
    return NextResponse.json({ error: 'Failed to query traffic' }, { status: 500 })
  }
}
