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
    return { tmdb: { apiKey: '', baseUrl: 'https://api.themoviedb.org/3' } }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params
  const config = await loadConfig()
  
  const apiKey = config.tmdb?.apiKey
  const baseUrl = config.tmdb?.baseUrl || 'https://api.themoviedb.org/3'
  
  if (!apiKey) {
    return NextResponse.json({ error: 'TMDB API Key not configured' }, { status: 500 })
  }

  try {
    const url = new URL(request.url)
    const tmdbPath = pathSegments.join('/')
    const queryString = url.search
    
    const tmdbUrl = `${baseUrl}/${tmdbPath}${queryString}${queryString ? '&' : '?'}api_key=${apiKey}&language=zh-CN`
    
    const response = await fetch(tmdbUrl, {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('TMDB Proxy error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
