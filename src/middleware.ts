import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 不需要登录的路径
const publicPaths = ['/login', '/api/auth/login', '/api/auth/register', '/api/announcements', '/api/devices/auto-scan', '/api/devices/monitor', '/api/telegram/webhook', '/api/traffic/report']

// 普通用户可访问的路径
const userPaths = ['/home', '/streaming', '/trending', '/request', '/account', '/tickets', '/knowledge', '/devices']

// API 路径的权限
const userApiPaths = ['/api/auth', '/api/tmdb', '/api/requests', '/api/library/synced', '/api/config', '/api/cards/use', '/api/emby', '/api/tickets', '/api/knowledge', '/api/announcements', '/api/devices', '/api/user/requests']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 静态资源跳过
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }
  
  // 公开路径
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }
  
  // 检查登录状态
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    // 未登录，重定向到登录页
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // 解析 token 获取用户角色
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token')
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    
    // 检查过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: '登录已过期' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // 管理员可以访问所有页面
    if (payload.role === 'admin') {
      return NextResponse.next()
    }
    
    // 普通用户权限检查
    const isUserPath = userPaths.some(p => pathname.startsWith(p))
    const isUserApi = userApiPaths.some(p => pathname.startsWith(p))
    
    if (pathname.startsWith('/api/')) {
      if (!isUserApi) {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }
    } else {
      if (!isUserPath) {
        // 重定向到首页
        return NextResponse.redirect(new URL('/home', request.url))
      }
    }
    
    return NextResponse.next()
  } catch (e) {
    // Token 无效
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '无效的登录状态' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
