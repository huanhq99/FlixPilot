import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser } from '@/lib/auth'
import { 
  loadDevices,
  getUserDevices,
  getActiveDeviceCount,
  checkDeviceLimit,
  checkClientAllowed,
  recordDevice,
  deleteDevice,
  setDeviceInactive,
  loadDeviceConfig,
  saveDeviceConfig,
  addClientRule,
  deleteClientRule
} from '@/lib/devices'

// GET - 获取设备列表或配置
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
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    // 获取配置（管理员获取完整配置，普通用户获取白名单/黑名单）
    if (type === 'config') {
      const config = loadDeviceConfig()
      
      // 管理员返回完整配置
      if (user.role === 'admin') {
        return NextResponse.json({ config })
      }
      
      // 普通用户只返回白名单和黑名单（只读）
      return NextResponse.json({ 
        config: {
          clientConfig: {
            whitelist: config.clientConfig.whitelist,
            blacklist: config.clientConfig.blacklist
          }
        }
      })
    }
    
    // 获取所有设备（管理员）
    if (type === 'all') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }
      const devices = loadDevices()
      const config = loadDeviceConfig()
      
      // 更新活跃状态
      const inactiveDate = new Date()
      inactiveDate.setDate(inactiveDate.getDate() - config.limitConfig.inactiveDays)
      
      const devicesWithStatus = devices.map(d => ({
        ...d,
        isActive: new Date(d.lastActiveAt) > inactiveDate
      }))
      
      return NextResponse.json({ devices: devicesWithStatus })
    }
    
    // 检查设备限制
    if (type === 'check-limit') {
      const result = checkDeviceLimit(user.id)
      return NextResponse.json(result)
    }
    
    // 检查客户端是否允许
    const client = searchParams.get('client')
    if (type === 'check-client' && client) {
      const result = checkClientAllowed(client)
      return NextResponse.json(result)
    }
    
    // 获取当前用户的设备
    const devices = getUserDevices(user.id)
    const activeCount = getActiveDeviceCount(user.id)
    const config = loadDeviceConfig()
    
    return NextResponse.json({ 
      devices, 
      activeCount,
      maxDevices: config.limitConfig.maxDevices,
      limitEnabled: config.limitConfig.enabled
    })
  } catch (error) {
    console.error('Get devices error:', error)
    return NextResponse.json({ error: '获取设备失败' }, { status: 500 })
  }
}

// POST - 记录设备或添加规则
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
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    const body = await request.json()
    const { action } = body
    
    // 添加客户端规则（管理员）
    if (action === 'add-rule') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }
      
      const { type, name, pattern, isRegex, description } = body
      if (!type || !name || !pattern) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 })
      }
      
      const rule = addClientRule(type, { name, pattern, isRegex: isRegex || false, description })
      return NextResponse.json({ success: true, rule })
    }
    
    // 记录设备
    if (action === 'record') {
      const { deviceId, deviceName, client, clientVersion, deviceType, appName, lastIp, embyUserId } = body
      
      if (!deviceId || !client) {
        return NextResponse.json({ error: '设备信息不完整' }, { status: 400 })
      }
      
      // 检查客户端是否允许
      const clientCheck = checkClientAllowed(client)
      if (!clientCheck.allowed) {
        return NextResponse.json({ error: clientCheck.reason, blocked: true }, { status: 403 })
      }
      
      // 检查设备限制
      const limitCheck = checkDeviceLimit(user.id)
      if (!limitCheck.allowed) {
        // 检查是否是已有设备
        const devices = getUserDevices(user.id)
        const existingDevice = devices.find(d => d.deviceId === deviceId)
        
        if (!existingDevice) {
          return NextResponse.json({ 
            error: `设备数量已达上限 (${limitCheck.activeCount}/${limitCheck.maxDevices})`,
            blocked: true,
            activeCount: limitCheck.activeCount,
            maxDevices: limitCheck.maxDevices
          }, { status: 403 })
        }
      }
      
      const device = recordDevice({
        userId: user.id,
        username: user.username,
        embyUserId,
        deviceId,
        deviceName: deviceName || '未知设备',
        client,
        clientVersion,
        deviceType,
        appName,
        lastIp
      })
      
      return NextResponse.json({ success: true, device })
    }
    
    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (error) {
    console.error('Post device error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}

// PUT - 更新配置
export async function PUT(request: NextRequest) {
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
    const { action } = body
    
    // 更新限制配置
    if (action === 'update-limit') {
      const { enabled, maxDevices, inactiveDays, blockAction } = body
      saveDeviceConfig({
        limitConfig: {
          enabled: enabled !== undefined ? enabled : true,
          maxDevices: maxDevices || 10,
          inactiveDays: inactiveDays || 7,
          blockAction: blockAction || 'warn'
        }
      })
      return NextResponse.json({ success: true })
    }
    
    // 更新自动扫描配置
    if (action === 'update-auto-scan') {
      const { enabled, intervalMinutes } = body
      saveDeviceConfig({
        autoScanConfig: {
          enabled: enabled || false,
          intervalMinutes: intervalMinutes || 5
        }
      })
      return NextResponse.json({ success: true })
    }
    
    // 设置设备为不活跃
    if (action === 'set-inactive') {
      const { deviceId } = body
      if (!deviceId) {
        return NextResponse.json({ error: '设备ID不能为空' }, { status: 400 })
      }
      
      const success = setDeviceInactive(deviceId)
      if (!success) {
        return NextResponse.json({ error: '设备不存在' }, { status: 404 })
      }
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (error) {
    console.error('Put device error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}

// DELETE - 删除设备或规则
export async function DELETE(request: NextRequest) {
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
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID不能为空' }, { status: 400 })
    }
    
    // 删除客户端规则（管理员）
    if (type === 'whitelist' || type === 'blacklist') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }
      
      const success = deleteClientRule(type, id)
      if (!success) {
        return NextResponse.json({ error: '规则不存在' }, { status: 404 })
      }
      
      return NextResponse.json({ success: true })
    }
    
    // 删除设备
    // 普通用户只能删除自己的设备
    if (user.role !== 'admin') {
      const devices = getUserDevices(user.id)
      const device = devices.find(d => d.id === id)
      if (!device) {
        return NextResponse.json({ error: '设备不存在或无权限' }, { status: 403 })
      }
    }
    
    const success = deleteDevice(id)
    if (!success) {
      return NextResponse.json({ error: '设备不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete device error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
