import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser } from '@/lib/auth'
import { loadDeviceConfig, ClientRule } from '@/lib/devices'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return { emby: [] }
  }
}

function getEmbyConfig(config: any) {
  if (Array.isArray(config.emby) && config.emby.length > 0) {
    return config.emby[0]
  }
  if (config.emby?.serverUrl) {
    return config.emby
  }
  return null
}

// 检查客户端是否匹配规则
function matchClient(clientName: string, rule: ClientRule): boolean {
  if (!clientName) return false
  
  if (rule.isRegex) {
    try {
      const regex = new RegExp(rule.pattern, 'i')
      return regex.test(clientName)
    } catch {
      return false
    }
  }
  
  // 普通匹配 - 包含即可
  return clientName.toLowerCase().includes(rule.pattern.toLowerCase())
}

// 检查客户端是否在黑名单中
function isClientBlocked(clientName: string, blacklist: ClientRule[]): { blocked: boolean; rule?: ClientRule } {
  for (const rule of blacklist) {
    if (matchClient(clientName, rule)) {
      return { blocked: true, rule }
    }
  }
  return { blocked: false }
}

// 检查客户端是否在白名单中（如果白名单不为空）
function isClientAllowed(clientName: string, whitelist: ClientRule[]): boolean {
  // 白名单为空，允许所有
  if (whitelist.length === 0) return true
  
  for (const rule of whitelist) {
    if (matchClient(clientName, rule)) {
      return true
    }
  }
  return false
}

// POST - 扫描并处理违规设备
export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '无效的登录状态' }, { status: 401 })
    }
    
    const user = getUser(payload.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    
    // 获取 Emby 配置
    const config = await loadConfig()
    const embyConfig = getEmbyConfig(config)
    
    if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
      return NextResponse.json({ error: '请先配置 Emby 服务器' }, { status: 500 })
    }
    
    // 获取设备配置（黑白名单）
    const deviceConfig = loadDeviceConfig()
    const { whitelist, blacklist } = deviceConfig.clientConfig
    
    // 获取 Emby 设备列表
    const devicesUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/Devices?api_key=${embyConfig.apiKey}`
    const devicesRes = await fetch(devicesUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Web", DeviceId="flixpilot-web", Version="1.0", Token="${embyConfig.apiKey}"`
      }
    })
    
    if (!devicesRes.ok) {
      throw new Error('获取设备列表失败')
    }
    
    const devicesData = await devicesRes.json()
    const devices = devicesData.Items || []
    
    const results = {
      scanned: devices.length,
      blocked: 0,
      deleted: 0,
      notInWhitelist: 0,
      errors: [] as string[],
      blockedDevices: [] as any[]
    }
    
    // 检查每个设备
    for (const device of devices) {
      const clientName = device.AppName || device.Client || ''
      const deviceId = device.Id
      
      // 检查黑名单
      const blockCheck = isClientBlocked(clientName, blacklist)
      if (blockCheck.blocked) {
        results.blocked++
        results.blockedDevices.push({
          id: deviceId,
          name: device.Name,
          client: clientName,
          user: device.LastUserName,
          reason: `匹配黑名单规则: ${blockCheck.rule?.name}`,
          lastActivity: device.DateLastActivity
        })
        
        // 删除设备
        try {
          const deleteUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/Devices?Id=${deviceId}&api_key=${embyConfig.apiKey}`
          const deleteRes = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Web", DeviceId="flixpilot-web", Version="1.0", Token="${embyConfig.apiKey}"`
            }
          })
          
          if (deleteRes.ok) {
            results.deleted++
          } else {
            results.errors.push(`删除设备 ${device.Name} 失败: ${deleteRes.status}`)
          }
        } catch (e: any) {
          results.errors.push(`删除设备 ${device.Name} 失败: ${e.message}`)
        }
        continue
      }
      
      // 检查白名单（如果白名单不为空）
      if (whitelist.length > 0 && !isClientAllowed(clientName, whitelist)) {
        results.notInWhitelist++
        results.blockedDevices.push({
          id: deviceId,
          name: device.Name,
          client: clientName,
          user: device.LastUserName,
          reason: '不在白名单中',
          lastActivity: device.DateLastActivity
        })
        
        // 删除设备
        try {
          const deleteUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/Devices?Id=${deviceId}&api_key=${embyConfig.apiKey}`
          const deleteRes = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Web", DeviceId="flixpilot-web", Version="1.0", Token="${embyConfig.apiKey}"`
            }
          })
          
          if (deleteRes.ok) {
            results.deleted++
          } else {
            results.errors.push(`删除设备 ${device.Name} 失败: ${deleteRes.status}`)
          }
        } catch (e: any) {
          results.errors.push(`删除设备 ${device.Name} 失败: ${e.message}`)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    })
  } catch (error: any) {
    console.error('Scan devices error:', error)
    return NextResponse.json({ error: error.message || '扫描失败' }, { status: 500 })
  }
}

// GET - 预览违规设备（不删除）
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '无效的登录状态' }, { status: 401 })
    }
    
    const user = getUser(payload.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    
    // 获取 Emby 配置
    const config = await loadConfig()
    const embyConfig = getEmbyConfig(config)
    
    if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
      return NextResponse.json({ error: '请先配置 Emby 服务器' }, { status: 500 })
    }
    
    // 获取设备配置
    const deviceConfig = loadDeviceConfig()
    const { whitelist, blacklist } = deviceConfig.clientConfig
    
    // 获取 Emby 设备列表
    const devicesUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/Devices?api_key=${embyConfig.apiKey}`
    const devicesRes = await fetch(devicesUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Web", DeviceId="flixpilot-web", Version="1.0", Token="${embyConfig.apiKey}"`
      }
    })
    
    if (!devicesRes.ok) {
      throw new Error('获取设备列表失败')
    }
    
    const devicesData = await devicesRes.json()
    const devices = devicesData.Items || []
    
    const violatingDevices = []
    
    for (const device of devices) {
      const clientName = device.AppName || device.Client || ''
      
      // 检查黑名单
      const blockCheck = isClientBlocked(clientName, blacklist)
      if (blockCheck.blocked) {
        violatingDevices.push({
          id: device.Id,
          name: device.Name,
          client: clientName,
          user: device.LastUserName,
          reason: `匹配黑名单规则: ${blockCheck.rule?.name}`,
          lastActivity: device.DateLastActivity
        })
        continue
      }
      
      // 检查白名单
      if (whitelist.length > 0 && !isClientAllowed(clientName, whitelist)) {
        violatingDevices.push({
          id: device.Id,
          name: device.Name,
          client: clientName,
          user: device.LastUserName,
          reason: '不在白名单中',
          lastActivity: device.DateLastActivity
        })
      }
    }
    
    return NextResponse.json({
      total: devices.length,
      violating: violatingDevices.length,
      devices: violatingDevices
    })
  } catch (error: any) {
    console.error('Preview scan error:', error)
    return NextResponse.json({ error: error.message || '预览失败' }, { status: 500 })
  }
}
