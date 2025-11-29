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
    return { proxy: {} }
  }
}

// 智能代理：先直连，失败后走代理
async function smartFetch(url: string, options: RequestInit, config: any) {
  // 尝试直连
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) })
    if (response.ok) {
      return response
    }
  } catch (e) {
    console.log(`Direct connection to ${url} failed, trying proxy...`)
  }

  // 如果有代理配置，尝试走代理
  if (config.proxy?.http || config.proxy?.https) {
    // Node.js 原生 fetch 不支持代理，需要用 https-proxy-agent
    // 这里简化处理，实际生产环境需要引入代理库
    throw new Error('Direct connection failed and proxy not implemented in this route')
  }

  throw new Error('Connection failed')
}

export async function POST(request: Request) {
  const { target_url, method = 'GET', headers = {}, body } = await request.json()
  const config = await loadConfig()

  try {
    const response = await fetch(target_url, {
      method,
      headers,
      body: body || undefined,
      signal: AbortSignal.timeout(15000)
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (e: any) {
    console.error(`Proxy request to ${target_url} failed:`, e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
