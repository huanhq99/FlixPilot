import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser, loadUsers, saveUsers } from '@/lib/auth'
import { findCardByCode, useCard, CARD_DAYS, CARD_TYPE_NAMES, type CardType } from '@/lib/cards'
import { loadEmbyConfig, createEmbyUser, enableEmbyUser } from '@/lib/embyUser'

// POST - 使用卡密
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
    
    const { code, password } = await request.json()
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '请输入卡密' }, { status: 400 })
    }

    // 如果用户没有 Emby 账号，需要密码来创建
    if (!user.embyUserId && (!password || password.length < 4)) {
      return NextResponse.json({ error: '请设置 Emby 密码（至少4位）' }, { status: 400 })
    }
    
    // 格式化卡密（去除空格，转大写）
    const formattedCode = code.trim().toUpperCase()
    
    // 查找卡密
    const card = findCardByCode(formattedCode)
    if (!card) {
      return NextResponse.json({ error: '卡密不存在' }, { status: 404 })
    }
    
    if (card.status === 'used') {
      return NextResponse.json({ error: '卡密已被使用' }, { status: 400 })
    }
    
    // 使用卡密
    const result = useCard(formattedCode, user.id, user.username)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    // 加载配置和用户数据
    const embyConfig = await loadEmbyConfig()
    const users = loadUsers()
    const userIndex = users.findIndex(u => u.id === user.id)
    
    if (userIndex === -1) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    // 如果用户还没有绑定 Emby，自动创建 Emby 账号
    let embyMessage = ''
    if (!users[userIndex].embyUserId && embyConfig?.serverUrl && embyConfig?.apiKey) {
      // 使用用户提供的密码创建 Emby 账号
      const embyResult = await createEmbyUser(user.username, password, embyConfig)
      
      if (embyResult.success && embyResult.userId) {
        users[userIndex].embyUserId = embyResult.userId
        users[userIndex].embyUsername = user.username
        embyMessage = `\nEmby 账号已创建成功！\n用户名: ${user.username}\n服务器: ${embyConfig.serverUrl}`
      } else {
        embyMessage = '\n注意: Emby 账号创建失败，请稍后在账户页面手动创建。'
      }
    } else if (users[userIndex].embyUserId && embyConfig?.serverUrl && embyConfig?.apiKey) {
      // 已有 Emby 账号，续费时自动启用（可能之前被禁用了）
      await enableEmbyUser(users[userIndex].embyUserId, embyConfig)
      embyMessage = '\nEmby 账号已启用！'
    }
    
    // 更新会员时间
    const cardType = card.type as CardType
    const days = CARD_DAYS[cardType]
    
    if (days === -1) {
      // 白名单，永久会员
      users[userIndex].isWhitelist = true
      users[userIndex].membershipExpiry = undefined
    } else {
      // 计算新的到期时间
      const now = new Date()
      let expiryDate: Date
      
      // 如果已有有效会员，则在原有基础上续期
      if (users[userIndex].membershipExpiry) {
        const currentExpiry = new Date(users[userIndex].membershipExpiry!)
        if (currentExpiry > now) {
          expiryDate = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000)
        } else {
          expiryDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
        }
      } else {
        expiryDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
      }
      
      users[userIndex].membershipExpiry = expiryDate.toISOString()
      users[userIndex].isWhitelist = false
    }
    
    saveUsers(users)
    
    const typeName = CARD_TYPE_NAMES[cardType]
    const expiryStr = new Date(users[userIndex].membershipExpiry!).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    const message = days === -1 
      ? `🎉 恭喜！您已成为永久会员（白名单）${embyMessage}`
      : `🎉 恭喜！${typeName}激活成功，会员有效期至 ${expiryStr}${embyMessage}`
    
    return NextResponse.json({ 
      success: true, 
      message,
      membership: {
        isWhitelist: users[userIndex].isWhitelist,
        expiry: users[userIndex].membershipExpiry
      },
      emby: {
        userId: users[userIndex].embyUserId,
        username: users[userIndex].embyUsername
      }
    })
  } catch (error) {
    console.error('Use card error:', error)
    return NextResponse.json({ error: '使用卡密失败' }, { status: 500 })
  }
}
