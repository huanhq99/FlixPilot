import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser } from '@/lib/auth'
import { getDefaultEmbyConnection, requestEmby, type EmbyConnection } from '@/lib/embyClient'

interface DeleteResult {
  itemId: string
  success: boolean
  status: number
  message?: string
}

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
    const items: string[] = Array.isArray(body.items) ? body.items.filter((id: unknown) => typeof id === 'string') : []

    if (!items.length) {
      return NextResponse.json({ error: '请选择至少一个要删除的条目' }, { status: 400 })
    }

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

    const uniqueIds = Array.from(new Set(items))
    const results: DeleteResult[] = []

    for (const itemId of uniqueIds) {
      try {
        const response = await requestEmby(connection, `Items/${itemId}`, undefined, { method: 'DELETE' })
        if (!response.ok) {
          const text = await response.text().catch(() => response.statusText)
          results.push({ itemId, success: false, status: response.status, message: text })
        } else {
          results.push({ itemId, success: true, status: response.status })
        }
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error: any) {
        results.push({ itemId, success: false, status: 500, message: error.message })
      }
    }

    const successCount = results.filter(result => result.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: failureCount === 0,
      summary: { successCount, failureCount },
      results
    })
  } catch (error) {
    console.error('[EmbyScanner] Delete error:', error)
    return NextResponse.json({ error: '删除失败，请稍后重试' }, { status: 500 })
  }
}
