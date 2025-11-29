import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getLicenseStatus, activateLicense, clearLicenseCache } from '@/lib/license'
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

// 获取授权状态
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const status = await getLicenseStatus()
    
    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 保存授权配置 / 激活授权
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }

    const { domain, licenseKey } = await request.json()

    if (!domain || !licenseKey) {
      return NextResponse.json({ error: '请填写授权域名和授权码' }, { status: 400 })
    }

    // 先尝试激活
    const activateResult = await activateLicense(domain, licenseKey)

    if (!activateResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: activateResult.message 
      })
    }

    // 激活成功，保存到配置文件
    let config: any = {}
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
    }

    config.license = {
      domain,
      licenseKey
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
    
    // 清除缓存
    clearLicenseCache()

    return NextResponse.json({
      success: true,
      message: '授权激活成功',
      license: activateResult.license
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 删除授权配置
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }

    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
      delete config.license
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
    }

    clearLicenseCache()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
