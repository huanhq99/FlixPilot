import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser } from '@/lib/auth'
import { getDefaultEmbyConnection, type EmbyConnection } from '@/lib/embyClient'
import { listScannerLibraries } from '@/lib/embyScanner'

// GET - 使用系统配置的 Emby 连接
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const user = getUser(payload.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const connection = await getDefaultEmbyConnection()
    if (!connection) {
      return NextResponse.json({ error: '未配置 Emby 服务器' }, { status: 400 })
    }

    const libraries = await listScannerLibraries(connection)
    return NextResponse.json({ libraries })
  } catch (error) {
    console.error('[EmbyScanner] Failed to list libraries:', error)
    return NextResponse.json({ error: '获取媒体库列表失败' }, { status: 500 })
  }
}

// POST - 使用手动提供的 Emby 连接配置
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const user = getUser(payload.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { serverUrl, apiKey } = body

    if (!serverUrl || !apiKey) {
      return NextResponse.json({ error: '请提供 Emby 服务器地址和 API Key' }, { status: 400 })
    }

    const connection: EmbyConnection = {
      name: '手动配置',
      serverUrl: serverUrl.replace(/\/$/, ''),
      apiKey
    }

    const libraries = await listScannerLibraries(connection)
    return NextResponse.json({ libraries })
  } catch (error: any) {
    console.error('[EmbyScanner] Failed to list libraries with custom config:', error)
    const message = error.message?.includes('fetch') ? '无法连接到 Emby 服务器，请检查地址' : (error.message || '获取媒体库列表失败')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
