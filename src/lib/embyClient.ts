import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

export interface EmbyConnection {
  name: string
  serverUrl: string
  apiKey: string
}

export interface EmbyLibraryItem {
  Id: string
  Name: string
  CollectionType?: string
  Type?: string
}

async function loadRawConfig(): Promise<any | null> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('[EmbyClient] Failed to load config:', error)
    return null
  }
}

export async function getDefaultEmbyConnection(): Promise<EmbyConnection | null> {
  const config = await loadRawConfig()
  if (!config) return null

  const list = Array.isArray(config.emby) ? config.emby : config.emby ? [config.emby] : []
  if (!list.length) return null

  const primary = list[0]
  if (!primary?.serverUrl || !primary?.apiKey) return null

  return {
    name: primary.name || '默认服务器',
    serverUrl: primary.serverUrl,
    apiKey: primary.apiKey
  }
}

function buildEmbyUrl(connection: EmbyConnection, endpoint: string, params?: Record<string, any>) {
  const base = connection.serverUrl.replace(/\/$/, '')
  const url = new URL(`${base}/emby/${endpoint.replace(/^\//, '')}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      url.searchParams.append(key, String(value))
    })
  }

  url.searchParams.append('api_key', connection.apiKey)
  return url
}

export async function requestEmby(
  connection: EmbyConnection,
  endpoint: string,
  params?: Record<string, any>,
  init: RequestInit = {}
) {
  const url = buildEmbyUrl(connection, endpoint, params)
  const headers = {
    Accept: 'application/json',
    'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Dashboard", DeviceId="flixpilot-dashboard", Version="1.0", Token="${connection.apiKey}"`,
    ...(init.headers as Record<string, string> | undefined)
  }

  return fetch(url.toString(), { ...init, headers })
}

export async function fetchEmbyJson<T>(
  connection: EmbyConnection,
  endpoint: string,
  params?: Record<string, any>,
  init?: RequestInit
): Promise<T> {
  const response = await requestEmby(connection, endpoint, params, init)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Emby API error ${response.status}: ${text || response.statusText}`)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}
