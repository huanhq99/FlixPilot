import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser } from '@/lib/auth'
import { getDefaultEmbyConnection, type EmbyConnection } from '@/lib/embyClient'
import { performDuplicateScan, type ScanMode } from '@/lib/embyScanner'

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

    const body = await request.json().catch(() => ({}))
    const mode: ScanMode = body.mode === 'loose' ? 'loose' : 'strict'
    const libraryIds = Array.isArray(body.libraryIds) ? body.libraryIds.filter((id: unknown) => typeof id === 'string') : undefined

    // 支持手动配置或使用系统配置
    let connection: EmbyConnection | null = null
    if (body.serverUrl && body.apiKey) {
      connection = {
        name: '手动配置',
        serverUrl: body.serverUrl.replace(/\/$/, ''),
        apiKey: body.apiKey
      }
    } else {
      connection = await getDefaultEmbyConnection()
    }

    if (!connection) {
      return NextResponse.json({ error: '未配置 Emby 服务器' }, { status: 400 })
    }

    const result = await performDuplicateScan(connection, {
      mode,
      libraryIds
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('[EmbyScanner] Scan error:', error)
    return NextResponse.json({ error: error.message || '扫描失败，请稍后重试' }, { status: 500 })
  }
}
