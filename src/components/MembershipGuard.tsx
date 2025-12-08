'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'

interface UserInfo {
  id: string
  username: string
  role: 'admin' | 'user'
  embyUserId?: string
  embyUsername?: string
  membershipExpiry?: string
  isWhitelist?: boolean
}

interface MembershipGuardProps {
  children: React.ReactNode
}

// 检查用户是否是管理员
export function isAdmin(user: UserInfo | null): boolean {
  return user?.role === 'admin'
}

// 检查是否有 Emby 账号
export function hasEmbyAccount(user: UserInfo | null): boolean {
  if (!user) return false
  return !!user.embyUserId
}

// 检查会员是否有效（白名单或未过期）
export function isMembershipValid(user: UserInfo | null): boolean {
  if (!user) return false
  
  // 白名单用户（永久会员）
  if (user.isWhitelist) return true
  
  // 检查会员是否过期
  if (user.membershipExpiry) {
    const expiry = new Date(user.membershipExpiry)
    return expiry > new Date()
  }
  
  return false
}

// 获取用户状态
export type UserStatus = 'admin' | 'active' | 'expired' | 'no-emby' | 'unknown'

export function getUserStatus(user: UserInfo | null): UserStatus {
  if (!user) return 'unknown'
  
  // 1. 管理员 - 最高权限
  if (user.role === 'admin') return 'admin'
  
  // 2. 没有 Emby 账号 - 需要激活/绑定
  if (!user.embyUserId) return 'no-emby'
  
  // 3. 有 Emby 账号，检查会员状态
  if (user.isWhitelist) return 'active'
  
  if (user.membershipExpiry) {
    const expiry = new Date(user.membershipExpiry)
    return expiry > new Date() ? 'active' : 'expired'
  }
  
  // 有 Emby 但没有会员信息，视为过期
  return 'expired'
}

// 会员守卫组件 - 用于包裹需要会员权限的页面
export default function MembershipGuard({ children }: MembershipGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch (e) {
        console.error('Load user failed:', e)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton variant='rounded' height={200} />
      </Box>
    )
  }

  const status = getUserStatus(user)

  // 管理员或有效会员 - 直接放行
  if (status === 'admin' || status === 'active') {
    return <>{children}</>
  }

  // 没有 Emby 账号 - 提示激活/绑定
  if (status === 'no-emby') {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        p: 4 
      }}>
        <Card sx={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ py: 6 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'primary.lighter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}
            >
              <i 
                className='ri-vip-crown-2-line'
                style={{ fontSize: 40, color: 'var(--mui-palette-primary-main)' }} 
              />
            </Box>

            <Typography variant='h5' fontWeight={700} gutterBottom>
              请先激活会员
            </Typography>

            <Typography color='text.secondary' sx={{ mb: 3 }}>
              您还未激活会员，请使用卡密激活或绑定已有 Emby 账号后使用。
            </Typography>

            <Button
              variant='contained'
              size='large'
              startIcon={<i className='ri-vip-crown-line' />}
              onClick={() => router.push('/account')}
            >
              前往激活
            </Button>

            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 3 }}>
              如有疑问，请联系管理员或提交工单
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // 会员已过期 - 提示续费
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh',
      p: 4 
    }}>
      <Card sx={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
        <CardContent sx={{ py: 6 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'error.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}
          >
            <i 
              className='ri-time-line'
              style={{ fontSize: 40, color: 'var(--mui-palette-error-main)' }} 
            />
          </Box>

          <Typography variant='h5' fontWeight={700} gutterBottom>
            会员已过期
          </Typography>

          <Typography color='text.secondary' sx={{ mb: 3 }}>
            您的会员已到期，Emby 账号已被暂停。请续费后继续使用。
          </Typography>

          {user?.membershipExpiry && (
            <Alert severity='error' sx={{ mb: 3, textAlign: 'left' }}>
              到期时间：{new Date(user.membershipExpiry).toLocaleString('zh-CN')}
            </Alert>
          )}

          <Button
            variant='contained'
            size='large'
            startIcon={<i className='ri-vip-crown-line' />}
            onClick={() => router.push('/account')}
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            }}
          >
            立即续费
          </Button>

          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 3 }}>
            如有疑问，请联系管理员或提交工单
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
