'use client'

import { useEffect, useRef } from 'react'

// 自动同步检查组件 - 在后台定期检查是否需要同步
export default function AutoSyncChecker() {
  const hasChecked = useRef(false)

  useEffect(() => {
    // 只在组件首次挂载时检查一次
    if (hasChecked.current) return
    hasChecked.current = true

    const checkAndSync = async () => {
      try {
        // 调用自动同步接口
        const res = await fetch('/api/cron/sync-library')
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            console.log('[AutoSync] 自动同步完成:', data.message)
          } else if (data.message) {
            console.log('[AutoSync]', data.message)
          }
        }
      } catch (error) {
        console.error('[AutoSync] 检查同步状态失败:', error)
      }
    }

    const checkExpiredUsers = async () => {
      try {
        // 检查过期用户并禁用 Emby 账号
        const res = await fetch('/api/cron/check-expiry')
        if (res.ok) {
          const data = await res.json()
          if (data.disabledCount > 0) {
            console.log('[AutoSync] 禁用过期用户:', data.message)
          }
        }
      } catch (error) {
        console.error('[AutoSync] 检查过期用户失败:', error)
      }
    }

    // 延迟 5 秒后执行检查，避免影响页面加载
    const timer = setTimeout(() => {
      checkAndSync()
      checkExpiredUsers()
    }, 5000)

    // 每小时检查一次
    const interval = setInterval(() => {
      checkAndSync()
      checkExpiredUsers()
    }, 60 * 60 * 1000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  // 这个组件不渲染任何内容
  return null
}
