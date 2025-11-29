// 检查会员到期并禁用 Emby 账号的定时任务
import { NextResponse } from 'next/server'
import { loadUsers, saveUsers } from '@/lib/auth'
import { loadEmbyConfig, disableEmbyUser } from '@/lib/embyUser'

// GET - 检查过期会员并禁用
export async function GET() {
  try {
    const embyConfig = await loadEmbyConfig()
    if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
      return NextResponse.json({ message: 'Emby 未配置' })
    }

    const users = loadUsers()
    const now = new Date()
    let disabledCount = 0
    const disabledUsers: string[] = []

    for (const user of users) {
      // 跳过管理员和白名单用户
      if (user.role === 'admin' || user.isWhitelist) continue
      
      // 跳过没有 Emby 账号的用户
      if (!user.embyUserId) continue
      
      // 检查是否过期
      if (user.membershipExpiry) {
        const expiry = new Date(user.membershipExpiry)
        if (expiry <= now) {
          // 会员已过期，禁用 Emby 账号
          const success = await disableEmbyUser(user.embyUserId, embyConfig)
          if (success) {
            disabledCount++
            disabledUsers.push(user.username)
          }
        }
      } else {
        // 没有会员时间，也禁用
        const success = await disableEmbyUser(user.embyUserId, embyConfig)
        if (success) {
          disabledCount++
          disabledUsers.push(user.username)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `检查完成，禁用了 ${disabledCount} 个过期用户`,
      disabledUsers
    })
  } catch (error) {
    console.error('Check expired users error:', error)
    return NextResponse.json({ error: '检查失败' }, { status: 500 })
  }
}
