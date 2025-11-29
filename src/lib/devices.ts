import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json')
const DEVICE_CONFIG_FILE = path.join(DATA_DIR, 'device-config.json')

// 设备信息
export interface Device {
  id: string
  userId: string  // 系统用户ID
  username: string  // 用户名
  embyUserId?: string  // Emby用户ID
  deviceId: string  // 设备唯一标识
  deviceName: string  // 设备名称
  client: string  // 客户端类型 (Emby Web, Emby for Android, etc.)
  clientVersion?: string  // 客户端版本
  deviceType?: string  // 设备类型
  appName?: string  // 应用名称
  lastActiveAt: string  // 最后活动时间
  lastIp?: string  // 最后活动IP
  isActive: boolean  // 是否活跃（7天内有活动）
  createdAt: string
}

// 客户端白名单/黑名单配置
export interface ClientConfig {
  // 白名单 - 允许的客户端
  whitelist: ClientRule[]
  // 黑名单 - 禁止的客户端
  blacklist: ClientRule[]
}

export interface ClientRule {
  id: string
  name: string  // 规则名称
  pattern: string  // 匹配模式（客户端名称或正则）
  isRegex: boolean  // 是否是正则表达式
  description?: string
  createdAt: string
}

// 设备限制配置
export interface DeviceLimitConfig {
  enabled: boolean  // 是否启用设备限制
  maxDevices: number  // 最大设备数
  inactiveDays: number  // 多少天内算活跃设备
  blockAction: 'warn' | 'block'  // 超出限制时的动作
}

// 自动扫描配置
export interface AutoScanConfig {
  enabled: boolean  // 是否启用自动扫描
  intervalMinutes: number  // 扫描间隔（分钟）
  lastScanAt?: string  // 上次扫描时间
  lastScanResult?: {
    scanned: number
    deleted: number
  }
}

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// 加载设备列表
export function loadDevices(): Device[] {
  ensureDataDir()
  if (!fs.existsSync(DEVICES_FILE)) {
    return []
  }
  try {
    const data = fs.readFileSync(DEVICES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// 保存设备列表
export function saveDevices(devices: Device[]) {
  ensureDataDir()
  fs.writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2))
}

// 加载设备配置
export function loadDeviceConfig(): { clientConfig: ClientConfig; limitConfig: DeviceLimitConfig; autoScanConfig: AutoScanConfig } {
  ensureDataDir()
  const defaultConfig = {
    clientConfig: {
      whitelist: [
        { id: '1', name: 'Emby Web', pattern: 'Emby Web', isRegex: false, createdAt: new Date().toISOString() },
        { id: '2', name: 'Emby Theater', pattern: 'Emby Theater', isRegex: false, createdAt: new Date().toISOString() },
        { id: '3', name: 'Emby for Android', pattern: 'Emby for Android', isRegex: false, createdAt: new Date().toISOString() },
        { id: '4', name: 'Emby for iOS', pattern: 'Emby for iOS', isRegex: false, createdAt: new Date().toISOString() },
        { id: '5', name: 'Emby for Android TV', pattern: 'Emby for Android TV', isRegex: false, createdAt: new Date().toISOString() },
        { id: '6', name: 'Infuse', pattern: 'Infuse', isRegex: false, createdAt: new Date().toISOString() },
        { id: '7', name: 'Jellyfin Media Player', pattern: 'Jellyfin Media Player', isRegex: false, createdAt: new Date().toISOString() },
        { id: '8', name: 'Fileball', pattern: 'Fileball', isRegex: false, createdAt: new Date().toISOString() },
        { id: '9', name: 'VidHub', pattern: 'VidHub', isRegex: false, createdAt: new Date().toISOString() },
        { id: '10', name: 'SenPlayer', pattern: 'SenPlayer', isRegex: false, createdAt: new Date().toISOString() },
        { id: '11', name: 'Conflux', pattern: 'Conflux', isRegex: false, createdAt: new Date().toISOString() },
        { id: '12', name: 'Yamby', pattern: 'Yamby', isRegex: false, createdAt: new Date().toISOString() },
        { id: '13', name: 'Ember', pattern: 'Ember', isRegex: false, createdAt: new Date().toISOString() },
        { id: '14', name: 'Emby for Kodi', pattern: 'Kodi', isRegex: false, createdAt: new Date().toISOString() },
        { id: '15', name: 'Emby for Apple TV', pattern: 'Apple TV', isRegex: false, createdAt: new Date().toISOString() },
        { id: '16', name: 'Emby for Roku', pattern: 'Roku', isRegex: false, createdAt: new Date().toISOString() },
        { id: '17', name: 'Emby for Samsung', pattern: 'Samsung', isRegex: false, createdAt: new Date().toISOString() },
        { id: '18', name: 'Emby for LG', pattern: 'LG', isRegex: false, createdAt: new Date().toISOString() },
        { id: '19', name: 'Emby for Xbox', pattern: 'Xbox', isRegex: false, createdAt: new Date().toISOString() },
        { id: '20', name: 'Emby for PlayStation', pattern: 'PlayStation', isRegex: false, createdAt: new Date().toISOString() },
        { id: '21', name: 'Tsundoku', pattern: 'Tsundoku', isRegex: false, createdAt: new Date().toISOString() },
      ],
      blacklist: [
        { id: '1', name: 'Plex', pattern: 'Plex', isRegex: false, description: '禁止使用 Plex 客户端', createdAt: new Date().toISOString() },
        { id: '2', name: 'DLNA', pattern: 'DLNA', isRegex: false, description: '禁止 DLNA 播放', createdAt: new Date().toISOString() },
        { id: '3', name: 'Unknown', pattern: 'Unknown', isRegex: false, description: '禁止未知客户端', createdAt: new Date().toISOString() },
        { id: '4', name: 'VLC', pattern: 'VLC', isRegex: false, description: '禁止 VLC 客户端', createdAt: new Date().toISOString() },
      ]
    },
    limitConfig: {
      enabled: true,
      maxDevices: 10,
      inactiveDays: 7,
      blockAction: 'warn' as const
    },
    autoScanConfig: {
      enabled: false,
      intervalMinutes: 5
    }
  }
  
  if (!fs.existsSync(DEVICE_CONFIG_FILE)) {
    fs.writeFileSync(DEVICE_CONFIG_FILE, JSON.stringify(defaultConfig, null, 2))
    return defaultConfig
  }
  
  try {
    const data = fs.readFileSync(DEVICE_CONFIG_FILE, 'utf-8')
    const saved = JSON.parse(data)
    return { 
      clientConfig: saved.clientConfig || defaultConfig.clientConfig,
      limitConfig: saved.limitConfig || defaultConfig.limitConfig,
      autoScanConfig: saved.autoScanConfig || defaultConfig.autoScanConfig
    }
  } catch {
    return defaultConfig
  }
}

// 保存设备配置
export function saveDeviceConfig(config: { clientConfig?: ClientConfig; limitConfig?: DeviceLimitConfig; autoScanConfig?: AutoScanConfig }) {
  ensureDataDir()
  const currentConfig = loadDeviceConfig()
  const newConfig = {
    clientConfig: config.clientConfig || currentConfig.clientConfig,
    limitConfig: config.limitConfig || currentConfig.limitConfig,
    autoScanConfig: config.autoScanConfig || currentConfig.autoScanConfig
  }
  fs.writeFileSync(DEVICE_CONFIG_FILE, JSON.stringify(newConfig, null, 2))
}

// 获取用户的设备列表
export function getUserDevices(userId: string): Device[] {
  const devices = loadDevices()
  const config = loadDeviceConfig()
  const inactiveDate = new Date()
  inactiveDate.setDate(inactiveDate.getDate() - config.limitConfig.inactiveDays)
  
  return devices
    .filter(d => d.userId === userId)
    .map(d => ({
      ...d,
      isActive: new Date(d.lastActiveAt) > inactiveDate
    }))
    .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
}

// 获取用户的活跃设备数
export function getActiveDeviceCount(userId: string): number {
  const devices = getUserDevices(userId)
  return devices.filter(d => d.isActive).length
}

// 检查用户是否超出设备限制
export function checkDeviceLimit(userId: string): { allowed: boolean; activeCount: number; maxDevices: number } {
  const config = loadDeviceConfig()
  if (!config.limitConfig.enabled) {
    return { allowed: true, activeCount: 0, maxDevices: 0 }
  }
  
  const activeCount = getActiveDeviceCount(userId)
  return {
    allowed: activeCount < config.limitConfig.maxDevices,
    activeCount,
    maxDevices: config.limitConfig.maxDevices
  }
}

// 检查客户端是否被允许
export function checkClientAllowed(clientName: string): { allowed: boolean; reason?: string } {
  const config = loadDeviceConfig()
  
  // 先检查黑名单
  for (const rule of config.clientConfig.blacklist) {
    if (matchClient(clientName, rule)) {
      return { allowed: false, reason: `客户端 ${clientName} 在黑名单中` }
    }
  }
  
  // 如果白名单为空，则允许所有（除了黑名单）
  if (config.clientConfig.whitelist.length === 0) {
    return { allowed: true }
  }
  
  // 检查白名单
  for (const rule of config.clientConfig.whitelist) {
    if (matchClient(clientName, rule)) {
      return { allowed: true }
    }
  }
  
  return { allowed: false, reason: `客户端 ${clientName} 不在白名单中` }
}

// 匹配客户端规则
function matchClient(clientName: string, rule: ClientRule): boolean {
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

// 记录/更新设备
export function recordDevice(data: {
  userId: string
  username: string
  embyUserId?: string
  deviceId: string
  deviceName: string
  client: string
  clientVersion?: string
  deviceType?: string
  appName?: string
  lastIp?: string
}): Device {
  const devices = loadDevices()
  const existingIndex = devices.findIndex(
    d => d.userId === data.userId && d.deviceId === data.deviceId
  )
  
  const now = new Date().toISOString()
  
  if (existingIndex !== -1) {
    // 更新现有设备
    devices[existingIndex] = {
      ...devices[existingIndex],
      ...data,
      lastActiveAt: now,
      isActive: true
    }
    saveDevices(devices)
    return devices[existingIndex]
  }
  
  // 新设备
  const device: Device = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    ...data,
    lastActiveAt: now,
    isActive: true,
    createdAt: now
  }
  
  devices.push(device)
  saveDevices(devices)
  return device
}

// 删除设备
export function deleteDevice(deviceId: string): boolean {
  const devices = loadDevices()
  const index = devices.findIndex(d => d.id === deviceId)
  
  if (index === -1) return false
  
  devices.splice(index, 1)
  saveDevices(devices)
  return true
}

// 设置设备为不活跃
export function setDeviceInactive(deviceId: string): boolean {
  const devices = loadDevices()
  const index = devices.findIndex(d => d.id === deviceId)
  
  if (index === -1) return false
  
  // 将最后活动时间设置为很久以前
  const oldDate = new Date()
  oldDate.setDate(oldDate.getDate() - 30)
  devices[index].lastActiveAt = oldDate.toISOString()
  devices[index].isActive = false
  
  saveDevices(devices)
  return true
}

// 添加客户端规则
export function addClientRule(type: 'whitelist' | 'blacklist', rule: Omit<ClientRule, 'id' | 'createdAt'>): ClientRule {
  const config = loadDeviceConfig()
  
  const newRule: ClientRule = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    ...rule,
    createdAt: new Date().toISOString()
  }
  
  config.clientConfig[type].push(newRule)
  saveDeviceConfig(config)
  
  return newRule
}

// 删除客户端规则
export function deleteClientRule(type: 'whitelist' | 'blacklist', ruleId: string): boolean {
  const config = loadDeviceConfig()
  const index = config.clientConfig[type].findIndex(r => r.id === ruleId)
  
  if (index === -1) return false
  
  config.clientConfig[type].splice(index, 1)
  saveDeviceConfig(config)
  
  return true
}
