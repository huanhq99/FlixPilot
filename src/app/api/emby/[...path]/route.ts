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
    return { emby: [] }
  }
}

// 获取第一个配置的 Emby 服务器
function getEmbyConfig(config: any) {
  if (Array.isArray(config.emby) && config.emby.length > 0) {
    return config.emby[0]
  }
  // 兼容旧格式
  if (config.emby?.serverUrl) {
    return config.emby
  }
  return null
}

// 通用的 Emby API 请求函数
async function embyFetch(embyConfig: any, embyPath: string, method: string = 'GET', queryString: string = '') {
  let embyUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/${embyPath}`
  const separator = queryString ? '&' : '?'
  embyUrl += `${queryString}${separator}api_key=${embyConfig.apiKey}`

  return fetch(embyUrl, {
    method,
    headers: {
      'Accept': 'application/json',
      'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Web", DeviceId="flixpilot-web", Version="1.0", Token="${embyConfig.apiKey}"`
    }
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params
  const config = await loadConfig()
  const embyConfig = getEmbyConfig(config)

  if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
    return NextResponse.json(
      { error: '请先在设置中配置 Emby 服务器地址和 API Key' },
      { status: 500 }
    )
  }

  try {
    const url = new URL(request.url)
    const embyPath = pathSegments.join('/')
    const queryString = url.search

    // 构建 Emby API URL
    let embyUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/${embyPath}`
    
    // 添加 API Key
    const separator = queryString ? '&' : '?'
    embyUrl += `${queryString}${separator}api_key=${embyConfig.apiKey}`

    const response = await fetch(embyUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Web", DeviceId="flixpilot-web", Version="1.0", Token="${embyConfig.apiKey}"`
      }
    })

    // 如果是图片请求，直接返回图片
    if (embyPath.includes('/Images/')) {
      const contentType = response.headers.get('Content-Type') || 'image/jpeg'
      const buffer = await response.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400'
        }
      })
    }

    if (!response.ok) {
      throw new Error(`Emby API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Emby Proxy error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - 删除 Emby 设备
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params
  const config = await loadConfig()
  const embyConfig = getEmbyConfig(config)

  if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
    return NextResponse.json(
      { error: '请先在设置中配置 Emby 服务器地址和 API Key' },
      { status: 500 }
    )
  }

  try {
    const url = new URL(request.url)
    const embyPath = pathSegments.join('/')
    const queryString = url.search

    const response = await embyFetch(embyConfig, embyPath, 'DELETE', queryString)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Emby API error: ${response.status} - ${text}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Emby DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
