import { NextResponse } from 'next/server'
import { loadDeviceConfig, ClientRule } from '@/lib/devices'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const DEVICE_CONFIG_FILE = path.join(DATA_DIR, 'device-config.json')

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
  
  return clientName.toLowerCase().includes(rule.pattern.toLowerCase())
}

function isClientBlocked(clientName: string, blacklist: ClientRule[]): boolean {
  for (const rule of blacklist) {
    if (matchClient(clientName, rule)) {
      return true
    }
  }
  return false
}

function isClientAllowed(clientName: string, whitelist: ClientRule[]): boolean {
  if (whitelist.length === 0) return true
  
  for (const rule of whitelist) {
    if (matchClient(clientName, rule)) {
      return true
    }
  }
  return false
}

// 更新自动扫描结果
async function updateAutoScanResult(scanned: number, deleted: number) {
  try {
    const data = await fs.readFile(DEVICE_CONFIG_FILE, 'utf-8')
    const config = JSON.parse(data)
    config.autoScanConfig = {
      ...config.autoScanConfig,
      lastScanAt: new Date().toISOString(),
      lastScanResult: { scanned, deleted }
    }
    await fs.writeFile(DEVICE_CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (e) {
    console.error('更新扫描结果失败:', e)
  }
}

// GET - 自动扫描（由定时任务调用，无需认证）
export async function GET(request: Request) {
  try {
    // 检查是否有 secret key（简单的安全验证）
    const url = new URL(request.url)
    const secret = url.searchParams.get('secret')
    const expectedSecret = process.env.AUTO_SCAN_SECRET || 'streamhub-auto-scan'
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: '无效的密钥' }, { status: 401 })
    }
    
    // 获取设备配置
    const deviceConfig = loadDeviceConfig()
    
    // 检查是否启用自动扫描
    if (!deviceConfig.autoScanConfig?.enabled) {
      return NextResponse.json({ 
        success: false, 
        message: '自动扫描未启用',
        enabled: false 
      })
    }
    
    // 获取 Emby 配置
    const config = await loadConfig()
    const embyConfig = getEmbyConfig(config)
    
    if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
      return NextResponse.json({ error: '未配置 Emby 服务器' }, { status: 500 })
    }
    
    const { whitelist, blacklist } = deviceConfig.clientConfig
    
    // 获取 Emby 设备列表
    const devicesUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/Devices?api_key=${embyConfig.apiKey}`
    const devicesRes = await fetch(devicesUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="StreamHub", Device="Web", DeviceId="streamhub-auto-scan", Version="1.0", Token="${embyConfig.apiKey}"`
      }
    })
    
    if (!devicesRes.ok) {
      return NextResponse.json({ error: '获取设备列表失败' }, { status: 500 })
    }
    
    const devicesData = await devicesRes.json()
    const devices = devicesData.Items || []
    
    let scanned = devices.length
    let deleted = 0
    const deletedDevices: string[] = []
    
    // 检查并删除违规设备
    for (const device of devices) {
      const clientName = device.AppName || device.Client || ''
      const deviceId = device.Id
      
      // 检查黑名单
      if (isClientBlocked(clientName, blacklist)) {
        try {
          const deleteUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/Devices?Id=${deviceId}&api_key=${embyConfig.apiKey}`
          const deleteRes = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'X-Emby-Authorization': `MediaBrowser Client="StreamHub", Device="Web", DeviceId="streamhub-auto-scan", Version="1.0", Token="${embyConfig.apiKey}"`
            }
          })
          
          if (deleteRes.ok) {
            deleted++
            deletedDevices.push(`${device.Name} (${clientName}) - 黑名单`)
          }
        } catch (e) {
          console.error(`删除设备 ${device.Name} 失败:`, e)
        }
        continue
      }
      
      // 检查白名单
      if (whitelist.length > 0 && !isClientAllowed(clientName, whitelist)) {
        try {
          const deleteUrl = `${embyConfig.serverUrl.replace(/\/$/, '')}/emby/Devices?Id=${deviceId}&api_key=${embyConfig.apiKey}`
          const deleteRes = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'X-Emby-Authorization': `MediaBrowser Client="StreamHub", Device="Web", DeviceId="streamhub-auto-scan", Version="1.0", Token="${embyConfig.apiKey}"`
            }
          })
          
          if (deleteRes.ok) {
            deleted++
            deletedDevices.push(`${device.Name} (${clientName}) - 不在白名单`)
          }
        } catch (e) {
          console.error(`删除设备 ${device.Name} 失败:`, e)
        }
      }
    }
    
    // 更新扫描结果
    await updateAutoScanResult(scanned, deleted)
    
    return NextResponse.json({
      success: true,
      scanned,
      deleted,
      deletedDevices,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('自动扫描失败:', error)
    return NextResponse.json({ error: error.message || '扫描失败' }, { status: 500 })
  }
}
