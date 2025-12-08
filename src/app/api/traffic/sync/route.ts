import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const TRAFFIC_FILE = path.join(DATA_DIR, 'emby-traffic.json')
const STATE_FILE = path.join(DATA_DIR, 'goedge-sync-state.json')

interface GoEdgeConfig {
  enabled: boolean
  mysql: {
    host: string
    port: number
    user: string
    password: string
    database: string
  }
  embyDomain: string
  syncInterval: number // 分钟
}

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

interface SyncState {
  lastId: number
  date: string
  lastSyncTime: string | null
}

function loadConfig(): { goedge?: GoEdgeConfig } {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
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

function loadSyncState(): SyncState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch {
    // ignore
  }
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return { lastId: 0, date: today, lastSyncTime: null }
}

function saveSyncState(state: SyncState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function extractUserId(content: Record<string, unknown>): string | null {
  try {
    const header = content.header as Record<string, { values?: string[] }> | undefined
    if (!header) return null
    
    const authHeader = header['X-Emby-Authorization']?.values || []
    
    for (const auth of authHeader) {
      const match = auth.match(/UserId="([a-fA-F0-9]+)"/)
      if (match) {
        return match[1]
      }
    }
    return null
  } catch {
    return null
  }
}

async function syncFromGoEdge(config: GoEdgeConfig): Promise<{
  success: boolean
  usersUpdated: number
  logsProcessed: number
  error?: string
}> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const tableName = `edgeHTTPAccessLogs_${today}`
  
  let state = loadSyncState()
  
  // 如果日期变了，重置 lastId
  if (state.date !== today) {
    state = { lastId: 0, date: today, lastSyncTime: null }
  }
  
  let connection: mysql.Connection | null = null
  
  try {
    connection = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
    })
    
    // 检查表是否存在
    const [tables] = await connection.execute(
      `SHOW TABLES LIKE '${tableName}'`
    )
    
    if (!Array.isArray(tables) || tables.length === 0) {
      return { success: true, usersUpdated: 0, logsProcessed: 0, error: `Table ${tableName} not found` }
    }
    
    // 查询视频请求日志
    const [rows] = await connection.execute(
      `SELECT id, content
       FROM ${tableName}
       WHERE id > ?
         AND domain = ?
         AND JSON_EXTRACT(content, '$.requestPath') LIKE '%/videos/%'
         AND JSON_EXTRACT(content, '$.bytesSent') > 0
       ORDER BY id ASC
       LIMIT 5000`,
      [state.lastId, config.embyDomain]
    )
    
    const logs = rows as Array<{ id: number; content: string | Record<string, unknown> }>
    
    if (logs.length === 0) {
      state.lastSyncTime = new Date().toISOString()
      saveSyncState(state)
      return { success: true, usersUpdated: 0, logsProcessed: 0 }
    }
    
    // 统计流量
    const trafficByUser: Record<string, number> = {}
    let maxId = state.lastId
    
    for (const log of logs) {
      maxId = Math.max(maxId, log.id)
      
      let content: Record<string, unknown>
      try {
        content = typeof log.content === 'string' ? JSON.parse(log.content) : log.content
      } catch {
        continue
      }
      
      const userId = extractUserId(content)
      if (!userId) continue
      
      const bytesSent = (content.bytesSent as number) || (content.bodyBytesSent as number) || 0
      if (bytesSent > 0) {
        trafficByUser[userId] = (trafficByUser[userId] || 0) + bytesSent
      }
    }
    
    // 更新流量数据
    const trafficData = loadTrafficData()
    const now = new Date().toISOString()
    
    for (const [userId, bytes] of Object.entries(trafficByUser)) {
      if (!trafficData.users[userId]) {
        trafficData.users[userId] = {
          downloadBytes: 0,
          uploadBytes: 0,
          lastUpdated: now
        }
      }
      trafficData.users[userId].downloadBytes += bytes
      trafficData.users[userId].lastUpdated = now
    }
    
    trafficData.lastUpdated = now
    saveTrafficData(trafficData)
    
    // 保存状态
    state.lastId = maxId
    state.lastSyncTime = now
    saveSyncState(state)
    
    return {
      success: true,
      usersUpdated: Object.keys(trafficByUser).length,
      logsProcessed: logs.length
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, usersUpdated: 0, logsProcessed: 0, error: message }
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// 全局定时器
let syncInterval: NodeJS.Timeout | null = null

function startSyncScheduler(config: GoEdgeConfig) {
  if (syncInterval) {
    clearInterval(syncInterval)
  }
  
  const intervalMs = (config.syncInterval || 5) * 60 * 1000
  
  syncInterval = setInterval(async () => {
    console.log('[GoEdge Sync] Running scheduled sync...')
    const result = await syncFromGoEdge(config)
    console.log('[GoEdge Sync] Result:', result)
  }, intervalMs)
  
  console.log(`[GoEdge Sync] Scheduler started, interval: ${config.syncInterval || 5} minutes`)
}

// 检查是否需要自动同步
async function checkAndAutoSync(): Promise<{ synced: boolean; result?: Awaited<ReturnType<typeof syncFromGoEdge>> }> {
  const config = loadConfig()
  
  if (!config.goedge?.enabled) {
    return { synced: false }
  }
  
  const state = loadSyncState()
  const intervalMs = (config.goedge.syncInterval || 5) * 60 * 1000
  
  // 如果没有上次同步时间，或者距离上次同步超过了间隔
  if (!state.lastSyncTime) {
    const result = await syncFromGoEdge(config.goedge)
    return { synced: true, result }
  }
  
  const lastSync = new Date(state.lastSyncTime).getTime()
  const now = Date.now()
  
  if (now - lastSync >= intervalMs) {
    const result = await syncFromGoEdge(config.goedge)
    return { synced: true, result }
  }
  
  return { synced: false }
}

// POST: 手动触发同步
export async function POST() {
  try {
    const config = loadConfig()
    
    if (!config.goedge?.enabled) {
      return NextResponse.json({ error: 'GoEdge sync not enabled' }, { status: 400 })
    }
    
    const result = await syncFromGoEdge(config.goedge)
    
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET: 获取同步状态（并自动触发同步如果超过间隔）
export async function GET() {
  try {
    const config = loadConfig()
    const state = loadSyncState()
    
    // 自动同步检查
    const autoSyncResult = await checkAndAutoSync()
    
    // 如果刚刚同步了，重新加载状态
    const finalState = autoSyncResult.synced ? loadSyncState() : state
    
    return NextResponse.json({
      enabled: config.goedge?.enabled || false,
      config: config.goedge ? {
        host: config.goedge.mysql.host,
        embyDomain: config.goedge.embyDomain,
        syncInterval: config.goedge.syncInterval
      } : null,
      state: {
        lastId: finalState.lastId,
        date: finalState.date,
        lastSyncTime: finalState.lastSyncTime
      },
      autoSynced: autoSyncResult.synced,
      autoSyncResult: autoSyncResult.result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
