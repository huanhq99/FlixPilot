import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

// 默认配置
const defaultConfig = {
  tmdb: { apiKey: '', baseUrl: 'https://api.themoviedb.org/3' },
  moviepilot: { url: '', username: '', password: '' },
  emby: [{ name: '服务器1', serverUrl: '', apiKey: '' }],
  telegram: { botToken: '', chatId: '' },
  proxy: { http: '', https: '' }
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (e) {
    // ignore
  }
}

async function loadConfig() {
  await ensureDataDir()
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return defaultConfig
  }
}

async function saveConfig(config: any) {
  await ensureDataDir()
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export async function GET() {
  const config = await loadConfig()
  return NextResponse.json(config)
}

export async function POST(request: Request) {
  try {
    const config = await request.json()
    await saveConfig(config)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
