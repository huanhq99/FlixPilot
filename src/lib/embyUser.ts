// Emby 用户管理库
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

// 加载配置
export async function loadEmbyConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    const config = JSON.parse(data)
    if (Array.isArray(config.emby) && config.emby.length > 0) {
      return config.emby[0]
    }
    if (config.emby?.serverUrl) {
      return config.emby
    }
  } catch (e) {}
  return null
}

// 创建 Emby 用户
export async function createEmbyUser(
  username: string, 
  password: string, 
  embyConfig: any
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const serverUrl = embyConfig.serverUrl.replace(/\/$/, '')
    const apiKey = embyConfig.apiKey

    // 1. 先检查用户是否已存在
    const usersRes = await fetch(`${serverUrl}/emby/Users?api_key=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      }
    })

    if (usersRes.ok) {
      const users = await usersRes.json()
      const existingUser = users.find((u: any) => u.Name.toLowerCase() === username.toLowerCase())
      if (existingUser) {
        // 用户已存在，启用该用户并返回
        await enableEmbyUser(existingUser.Id, embyConfig)
        return { success: true, userId: existingUser.Id }
      }
    }

    // 2. 创建新用户
    const createRes = await fetch(`${serverUrl}/emby/Users/New?api_key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      },
      body: JSON.stringify({
        Name: username
      })
    })

    if (!createRes.ok) {
      const errorText = await createRes.text()
      console.error('Create Emby user failed:', errorText)
      return { success: false, error: '创建 Emby 用户失败' }
    }

    const newUser = await createRes.json()
    const userId = newUser.Id

    // 3. 设置用户密码
    await fetch(`${serverUrl}/emby/Users/${userId}/Password?api_key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      },
      body: JSON.stringify({
        NewPw: password,
        ResetPassword: false
      })
    })

    return { success: true, userId }
  } catch (error) {
    console.error('createEmbyUser error:', error)
    return { success: false, error: '创建 Emby 用户时发生错误' }
  }
}

// 禁用 Emby 用户
export async function disableEmbyUser(userId: string, embyConfig: any): Promise<boolean> {
  try {
    const serverUrl = embyConfig.serverUrl.replace(/\/$/, '')
    const apiKey = embyConfig.apiKey

    // 获取用户当前策略
    const userRes = await fetch(`${serverUrl}/emby/Users/${userId}?api_key=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      }
    })

    if (!userRes.ok) return false

    const user = await userRes.json()
    const policy = user.Policy || {}

    // 更新策略，禁用用户
    const updateRes = await fetch(`${serverUrl}/emby/Users/${userId}/Policy?api_key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      },
      body: JSON.stringify({
        ...policy,
        IsDisabled: true
      })
    })

    return updateRes.ok
  } catch (error) {
    console.error('disableEmbyUser error:', error)
    return false
  }
}

// 启用 Emby 用户
export async function enableEmbyUser(userId: string, embyConfig: any): Promise<boolean> {
  try {
    const serverUrl = embyConfig.serverUrl.replace(/\/$/, '')
    const apiKey = embyConfig.apiKey

    // 获取用户当前策略
    const userRes = await fetch(`${serverUrl}/emby/Users/${userId}?api_key=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      }
    })

    if (!userRes.ok) return false

    const user = await userRes.json()
    const policy = user.Policy || {}

    // 更新策略，启用用户
    const updateRes = await fetch(`${serverUrl}/emby/Users/${userId}/Policy?api_key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      },
      body: JSON.stringify({
        ...policy,
        IsDisabled: false
      })
    })

    return updateRes.ok
  } catch (error) {
    console.error('enableEmbyUser error:', error)
    return false
  }
}

// 检查 Emby 用户是否被禁用
export async function isEmbyUserDisabled(userId: string, embyConfig: any): Promise<boolean> {
  try {
    const serverUrl = embyConfig.serverUrl.replace(/\/$/, '')
    const apiKey = embyConfig.apiKey

    const userRes = await fetch(`${serverUrl}/emby/Users/${userId}?api_key=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      }
    })

    if (!userRes.ok) return false

    const user = await userRes.json()
    return user.Policy?.IsDisabled === true
  } catch (error) {
    console.error('isEmbyUserDisabled error:', error)
    return false
  }
}

// 删除 Emby 用户
export async function deleteEmbyUser(userId: string, embyConfig: any): Promise<boolean> {
  try {
    const serverUrl = embyConfig.serverUrl.replace(/\/$/, '')
    const apiKey = embyConfig.apiKey

    const res = await fetch(`${serverUrl}/emby/Users/${userId}?api_key=${apiKey}`, {
      method: 'DELETE',
      headers: {
        'X-Emby-Authorization': `MediaBrowser Client="FlixPilot", Device="Server", DeviceId="flixpilot", Version="1.0", Token="${apiKey}"`
      }
    })

    return res.ok
  } catch (error) {
    console.error('deleteEmbyUser error:', error)
    return false
  }
}
