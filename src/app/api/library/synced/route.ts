import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const LIBRARY_FILE = path.join(DATA_DIR, 'library.json')

// 获取已同步的入库数据
export async function GET() {
  try {
    const data = await fs.readFile(LIBRARY_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    
    // 从 items 数组中提取 movieIds 和 tvIds
    const movieIds: number[] = []
    const tvIds: number[] = []
    
    for (const item of parsed.items || []) {
      if (typeof item === 'string') {
        if (item.startsWith('movie-')) {
          const id = parseInt(item.replace('movie-', ''), 10)
          if (!isNaN(id)) movieIds.push(id)
        } else if (item.startsWith('tv-')) {
          const id = parseInt(item.replace('tv-', ''), 10)
          if (!isNaN(id)) tvIds.push(id)
        }
      }
    }
    
    return NextResponse.json({ 
      ...parsed,
      movieIds,
      tvIds
    })
  } catch (e) {
    // 文件不存在，返回空数据
    return NextResponse.json({ 
      items: [], 
      movieIds: [],
      tvIds: [],
      episodes: {},
      lastSync: null,
      syncConfig: {
        enabled: false,
        interval: 60, // 分钟
        libraries: []
      }
    })
  }
}

// 更新同步数据
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 确保数据目录存在
    await fs.mkdir(DATA_DIR, { recursive: true })
    
    // 读取现有数据
    let existingData = { 
      items: [], 
      episodes: {},
      lastSync: null,
      syncConfig: { enabled: false, interval: 60, libraries: [] }
    }
    
    try {
      const data = await fs.readFile(LIBRARY_FILE, 'utf-8')
      existingData = JSON.parse(data)
    } catch (e) {
      // 文件不存在
    }
    
    // 合并更新
    const newData = {
      ...existingData,
      ...body,
      lastSync: new Date().toISOString()
    }
    
    await fs.writeFile(LIBRARY_FILE, JSON.stringify(newData, null, 2))
    
    return NextResponse.json({ success: true, data: newData })
  } catch (error: any) {
    console.error('Save library data error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
