'use client'

// React Imports
import { useRef, useState, useEffect } from 'react'
import type { MouseEvent } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import { styled } from '@mui/material/styles'
import Badge from '@mui/material/Badge'
import Avatar from '@mui/material/Avatar'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Styled component for badge content
const BadgeContentSpan = styled('span')({
  width: 8,
  height: 8,
  borderRadius: '50%',
  cursor: 'pointer',
  backgroundColor: 'var(--mui-palette-success-main)',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)'
})

interface UserInfo {
  id: string
  name: string
  isAdmin: boolean
  popcorn: number
  avatarUrl?: string
}

const UserDropdown = () => {
  // States
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Refs
  const anchorRef = useRef<HTMLDivElement>(null)

  // Hooks
  const router = useRouter()
  const { settings } = useSettings()

  // 获取用户信息
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch (e) {
        console.error('获取用户信息失败:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleDropdownOpen = () => {
    !open ? setOpen(true) : setOpen(false)
  }

  const handleDropdownClose = (event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent), url?: string) => {
    if (url) {
      router.push(url)
    }

    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) {
      return
    }

    setOpen(false)
  }

  const handleUserLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('登出失败:', e)
    }
    router.push('/login')
  }

  // 生成头像（使用用户名首字母或默认头像）
  const getAvatarContent = () => {
    if (user?.avatarUrl) {
      return <Avatar src={user.avatarUrl} className='cursor-pointer bs-[38px] is-[38px]' onClick={handleDropdownOpen} />
    }
    
    const initial = user?.name?.charAt(0)?.toUpperCase() || 'U'
    return (
      <Avatar 
        className='cursor-pointer bs-[38px] is-[38px]'
        onClick={handleDropdownOpen}
        sx={{ 
          bgcolor: 'primary.main',
          fontSize: '1rem',
          fontWeight: 600
        }}
      >
        {initial}
      </Avatar>
    )
  }

  return (
    <>
      <Badge
        ref={anchorRef}
        overlap='circular'
        badgeContent={<BadgeContentSpan onClick={handleDropdownOpen} />}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        className='mis-2'
      >
        {loading ? (
          <Skeleton variant="circular" width={38} height={38} />
        ) : (
          getAvatarContent()
        )}
      </Badge>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[240px] !mbs-4 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top'
            }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList>
                  <div className='flex items-center plb-2 pli-4 gap-3' tabIndex={-1}>
                    {user?.avatarUrl ? (
                      <Avatar src={user.avatarUrl} sx={{ width: 44, height: 44 }} />
                    ) : (
                      <Avatar 
                        sx={{ 
                          width: 44, 
                          height: 44,
                          bgcolor: 'primary.main',
                          fontSize: '1.2rem',
                          fontWeight: 600
                        }}
                      >
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>
                    )}
                    <div className='flex items-start flex-col'>
                      <div className='flex items-center gap-2'>
                        <Typography className='font-medium' color='text.primary'>
                          {user?.name || '用户'}
                        </Typography>
                        {user?.isAdmin && (
                          <Chip 
                            label="管理员" 
                            size="small" 
                            color="primary"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </div>
                      <Typography variant='caption' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        🍿 {user?.popcorn ?? 0} 爆米花
                      </Typography>
                    </div>
                  </div>
                  <Divider className='mlb-1' />
                  <MenuItem className='gap-3' onClick={e => handleDropdownClose(e, '/account')}>
                    <i className='ri-user-3-line' />
                    <Typography color='text.primary'>个人中心</Typography>
                  </MenuItem>
                  <MenuItem className='gap-3' onClick={e => handleDropdownClose(e, '/request')}>
                    <i className='ri-film-line' />
                    <Typography color='text.primary'>我的求片</Typography>
                  </MenuItem>
                  {user?.isAdmin && (
                    <MenuItem className='gap-3' onClick={e => handleDropdownClose(e, '/settings')}>
                      <i className='ri-settings-4-line' />
                      <Typography color='text.primary'>系统设置</Typography>
                    </MenuItem>
                  )}
                  <Divider className='mlb-1' />
                  <div className='flex items-center plb-2 pli-4'>
                    <Button
                      fullWidth
                      variant='contained'
                      color='error'
                      size='small'
                      endIcon={<i className='ri-logout-box-r-line' />}
                      onClick={handleUserLogout}
                      sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
                    >
                      退出登录
                    </Button>
                  </div>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default UserDropdown
