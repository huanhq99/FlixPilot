'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'

interface UserInfo {
  id: string
  username: string
  role: 'admin' | 'user'
  popcorn: number
  embyUserId?: string
  embyUsername?: string
  lastSignIn?: string
  signInStreak: number
  membershipExpiry?: string  // 会员到期时间
  isWhitelist?: boolean       // 是否永久会员
  email?: string              // 通知邮箱
  emailNotifications?: boolean // 是否开启邮件通知
}

interface EmbyInfo {
  bound: boolean
  embyUsername?: string
  serverUrl?: string
  serverConfigured: boolean
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [embyInfo, setEmbyInfo] = useState<EmbyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [signInLoading, setSignInLoading] = useState(false)
  const [signInResult, setSignInResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // 绑定 Emby 弹窗
  const [bindOpen, setBindOpen] = useState(false)
  const [embyUsername, setEmbyUsername] = useState('')
  const [embyPassword, setEmbyPassword] = useState('')
  const [bindLoading, setBindLoading] = useState(false)
  const [bindError, setBindError] = useState('')

  // 修改密码弹窗
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)

  // 使用卡密弹窗
  const [cardOpen, setCardOpen] = useState(false)
  const [cardCode, setCardCode] = useState('')
  const [cardPassword, setCardPassword] = useState('')  // Emby 密码
  const [cardLoading, setCardLoading] = useState(false)
  const [cardError, setCardError] = useState('')
  const [cardSuccess, setCardSuccess] = useState('')

  // 创建 Emby 账号
  const [createEmbyOpen, setCreateEmbyOpen] = useState(false)
  const [createEmbyPassword, setCreateEmbyPassword] = useState('')
  const [createEmbyLoading, setCreateEmbyLoading] = useState(false)
  const [createEmbyResult, setCreateEmbyResult] = useState<{ success: boolean; message: string } | null>(null)

  // 邮箱通知设置
  const [userEmail, setUserEmail] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadUserInfo()
    loadEmbyInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        // 初始化邮箱设置
        setUserEmail(data.user.email || '')
        setEmailNotifications(data.user.emailNotifications !== false)
      }
    } catch (e) {
      console.error('Load user info failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadEmbyInfo = async () => {
    try {
      const res = await fetch('/api/auth/bind-emby')
      if (res.ok) {
        const data = await res.json()
        setEmbyInfo(data)
      }
    } catch (e) {
      console.error('Load emby info failed:', e)
    }
  }

  const handleSaveEmail = async () => {
    setEmailSaving(true)
    setEmailMessage(null)
    try {
      const res = await fetch('/api/auth/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, emailNotifications })
      })
      const data = await res.json()
      if (res.ok) {
        setEmailMessage({ type: 'success', text: '邮箱设置已保存' })
      } else {
        setEmailMessage({ type: 'error', text: data.error || '保存失败' })
      }
    } catch (e) {
      setEmailMessage({ type: 'error', text: '网络错误' })
    } finally {
      setEmailSaving(false)
    }
  }

  const handleSignIn = async () => {
    setSignInLoading(true)
    setSignInResult(null)
    try {
      const res = await fetch('/api/auth/sign-in', { method: 'POST' })
      const data = await res.json()
      setSignInResult({ success: data.success, message: data.message })
      if (data.success) {
        loadUserInfo()  // 刷新用户信息
      }
    } catch (e) {
      setSignInResult({ success: false, message: '签到失败' })
    } finally {
      setSignInLoading(false)
    }
  }

  const handleBindEmby = async () => {
    setBindLoading(true)
    setBindError('')
    try {
      const res = await fetch('/api/auth/bind-emby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: embyUsername, password: embyPassword })
      })
      const data = await res.json()
      if (res.ok) {
        setBindOpen(false)
        setEmbyUsername('')
        setEmbyPassword('')
        loadUserInfo()
        loadEmbyInfo()
      } else {
        setBindError(data.error || '绑定失败')
      }
    } catch (e) {
      setBindError('网络错误')
    } finally {
      setBindLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致')
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError('新密码至少6位')
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await res.json()
      if (res.ok) {
        setPasswordSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => {
          setPasswordOpen(false)
          setPasswordSuccess(false)
        }, 1500)
      } else {
        setPasswordError(data.error || '修改失败')
      }
    } catch (e) {
      setPasswordError('网络错误')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleUseCard = async () => {
    setCardError('')
    setCardSuccess('')
    
    if (!cardCode.trim()) {
      setCardError('请输入卡密')
      return
    }

    if (!cardPassword.trim()) {
      setCardError('请输入 Emby 账号密码')
      return
    }

    if (cardPassword.length < 4) {
      setCardError('密码至少4位')
      return
    }

    setCardLoading(true)
    try {
      const res = await fetch('/api/cards/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cardCode.trim(), password: cardPassword })
      })
      const data = await res.json()
      if (res.ok) {
        setCardSuccess(data.message || '激活成功')
        setCardCode('')
        setCardPassword('')
        loadUserInfo()  // 刷新用户信息
        loadEmbyInfo()  // 刷新 Emby 信息
        setTimeout(() => {
          setCardOpen(false)
          setCardSuccess('')
        }, 3000)
      } else {
        setCardError(data.error || '激活失败')
      }
    } catch (e) {
      setCardError('网络错误')
    } finally {
      setCardLoading(false)
    }
  }

  const handleCreateEmby = async () => {
    if (!createEmbyPassword.trim()) {
      setCreateEmbyResult({ success: false, message: '请输入 Emby 账号密码' })
      return
    }
    if (createEmbyPassword.length < 4) {
      setCreateEmbyResult({ success: false, message: '密码至少4位' })
      return
    }

    setCreateEmbyLoading(true)
    setCreateEmbyResult(null)
    try {
      const res = await fetch('/api/auth/create-emby', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: createEmbyPassword })
      })
      const data = await res.json()
      if (res.ok) {
        setCreateEmbyResult({ success: true, message: data.message })
        setCreateEmbyPassword('')
        setCreateEmbyOpen(false)
        loadUserInfo()
        loadEmbyInfo()
      } else {
        setCreateEmbyResult({ success: false, message: data.error || '创建失败' })
      }
    } catch (e) {
      setCreateEmbyResult({ success: false, message: '网络错误' })
    } finally {
      setCreateEmbyLoading(false)
    }
  }

  // 检查用户是否有会员资格
  const hasMembership = () => {
    if (user?.isWhitelist) return true
    if (user?.membershipExpiry) {
      return new Date(user.membershipExpiry) > new Date()
    }
    return false
  }

  const getMemberTypeLabel = () => {
    if (user?.isWhitelist) return '永久会员'
    if (user?.membershipExpiry) {
      const expiry = new Date(user.membershipExpiry)
      const now = new Date()
      if (expiry > now) return '有效会员'
    }
    return '未激活'
  }

  const getMemberStatus = () => {
    if (user?.isWhitelist) {
      return { active: true, text: '永久有效' }
    }
    
    if (!user?.membershipExpiry) return { active: false, text: '未激活' }
    
    const expiry = new Date(user.membershipExpiry)
    const now = new Date()
    
    if (expiry > now) {
      const diffMs = expiry.getTime() - now.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      
      if (diffDays > 0) {
        return { active: true, text: `剩余 ${diffDays} 天 ${diffHours} 小时` }
      } else {
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        return { active: true, text: `剩余 ${diffHours} 小时 ${diffMinutes} 分钟` }
      }
    }
    
    return { active: false, text: '已过期' }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const canSignIn = () => {
    if (!user?.lastSignIn) return true
    const today = new Date().toISOString().split('T')[0]
    const lastSignIn = user.lastSignIn.split('T')[0]
    return today !== lastSignIn
  }

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton variant='rounded' height={200} sx={{ mb: 3 }} />
        <Skeleton variant='rounded' height={150} />
      </Box>
    )
  }

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' fontWeight={700}>我的账户</Typography>
        <Typography color='text.secondary'>管理您的账户信息和设置</Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {/* 用户信息卡片 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.main',
                  fontSize: 24
                }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant='h5' fontWeight={600}>
                  {user?.username}
                </Typography>
                <Chip
                  label={user?.role === 'admin' ? '管理员' : '普通用户'}
                  size='small'
                  color={user?.role === 'admin' ? 'primary' : 'default'}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* 爆米花余额 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'warning.lighter',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className='ri-gift-line text-2xl' style={{ color: 'var(--mui-palette-warning-main)' }} />
              </Box>
              <Box>
                <Typography variant='h4' fontWeight={700} color='warning.main'>
                  {user?.popcorn || 0}
                </Typography>
                <Typography variant='body2' color='text.secondary'>爆米花余额</Typography>
              </Box>
            </Box>

            <Button
              variant='outlined'
              startIcon={<i className='ri-lock-password-line' />}
              onClick={() => setPasswordOpen(true)}
              sx={{ mt: 2, mr: 2 }}
            >
              修改密码
            </Button>
            <Button
              variant='outlined'
              color='error'
              startIcon={<i className='ri-logout-box-line' />}
              onClick={handleLogout}
              sx={{ mt: 2 }}
            >
              退出登录
            </Button>
          </CardContent>
        </Card>

        {/* 签到卡片 */}
        <Card>
          <CardContent>
            <Typography variant='h6' fontWeight={600} gutterBottom>
              <i className='ri-calendar-check-line' style={{ marginRight: 8 }} />
              每日签到
            </Typography>
            
            <Box sx={{ my: 3, textAlign: 'center' }}>
              <Typography variant='h2' fontWeight={700} color='primary.main'>
                {user?.signInStreak || 0}
              </Typography>
              <Typography color='text.secondary'>连续签到天数</Typography>
            </Box>

            {signInResult && (
              <Alert 
                severity={signInResult.success ? 'success' : 'info'} 
                sx={{ mb: 2 }}
                onClose={() => setSignInResult(null)}
              >
                {signInResult.message}
              </Alert>
            )}

            <Button
              fullWidth
              variant='contained'
              size='large'
              disabled={!canSignIn() || signInLoading}
              onClick={handleSignIn}
              sx={{
                py: 1.5,
                background: canSignIn() 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : undefined
              }}
            >
              {signInLoading ? '签到中...' : canSignIn() ? '立即签到' : '今日已签到'}
            </Button>
            
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
              连续签到可获得额外爆米花奖励
            </Typography>
          </CardContent>
        </Card>

        {/* 会员状态卡片 */}
        <Card sx={{ gridColumn: { md: '1 / -1' } }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant='h6' fontWeight={600}>
                  <i className='ri-vip-crown-line' style={{ marginRight: 8, color: 'var(--mui-palette-warning-main)' }} />
                  会员状态
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  使用卡密激活或续费您的会员
                </Typography>
              </Box>
              <Button
                variant='contained'
                startIcon={<i className='ri-coupon-line' />}
                onClick={() => setCardOpen(true)}
                sx={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                }}
              >
                使用卡密
              </Button>
            </Box>

            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
              {/* 会员类型 */}
              <Box sx={{ 
                p: 3, 
                borderRadius: 2, 
                bgcolor: getMemberStatus().active ? 'warning.lighter' : 'action.hover',
                textAlign: 'center'
              }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: getMemberStatus().active ? 'warning.main' : 'action.disabled',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}
                >
                  <i 
                    className='ri-vip-crown-2-fill text-2xl' 
                    style={{ color: getMemberStatus().active ? '#fff' : 'var(--mui-palette-text-disabled)' }} 
                  />
                </Box>
                <Typography variant='h6' fontWeight={600}>
                  {getMemberTypeLabel()}
                </Typography>
                <Typography variant='body2' color='text.secondary'>会员类型</Typography>
              </Box>

              {/* 会员状态 */}
              <Box sx={{ 
                p: 3, 
                borderRadius: 2, 
                bgcolor: getMemberStatus().active ? 'success.lighter' : 'error.lighter',
                textAlign: 'center'
              }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: getMemberStatus().active ? 'success.main' : 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}
                >
                  <i 
                    className={getMemberStatus().active ? 'ri-checkbox-circle-fill text-2xl' : 'ri-close-circle-fill text-2xl'}
                    style={{ color: '#fff' }} 
                  />
                </Box>
                <Typography variant='h6' fontWeight={600}>
                  {getMemberStatus().text}
                </Typography>
                <Typography variant='body2' color='text.secondary'>状态</Typography>
              </Box>

              {/* 到期时间 */}
              <Box sx={{ 
                p: 3, 
                borderRadius: 2, 
                bgcolor: 'primary.lighter',
                textAlign: 'center'
              }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}
                >
                  <i className='ri-calendar-event-fill text-2xl' style={{ color: '#fff' }} />
                </Box>
                <Typography variant='h6' fontWeight={600}>
                  {user?.isWhitelist 
                    ? '永久'
                    : user?.membershipExpiry 
                      ? new Date(user.membershipExpiry).toLocaleString('zh-CN', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                      : '-'
                  }
                </Typography>
                <Typography variant='body2' color='text.secondary'>到期时间</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Emby 绑定卡片 */}
        <Card sx={{ gridColumn: { md: '1 / -1' } }}>
          <CardContent>
            <Typography variant='h6' fontWeight={600} gutterBottom>
              <i className='ri-link' style={{ marginRight: 8 }} />
              Emby 账号
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              {embyInfo?.bound ? '您的 Emby 账号信息' : '激活会员后自动创建 Emby 账号'}
            </Typography>

            {createEmbyResult && (
              <Alert 
                severity={createEmbyResult.success ? 'success' : 'error'} 
                sx={{ mb: 2, whiteSpace: 'pre-line' }}
                onClose={() => setCreateEmbyResult(null)}
              >
                {createEmbyResult.message}
              </Alert>
            )}

            {!embyInfo?.serverConfigured ? (
              <Alert severity='warning'>
                管理员尚未配置 Emby 服务器
              </Alert>
            ) : embyInfo?.bound ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'success.lighter', borderRadius: 2 }}>
                  <i className='ri-checkbox-circle-line text-2xl' style={{ color: 'var(--mui-palette-success-main)' }} />
                  <Box>
                    <Typography fontWeight={600}>已绑定: {embyInfo.embyUsername}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      服务器: {embyInfo.serverUrl}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : hasMembership() ? (
              // 有会员但没绑定 Emby，显示创建按钮
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant='contained'
                  startIcon={<i className='ri-add-circle-line' />}
                  onClick={() => setCreateEmbyOpen(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                >
                  创建 Emby 账号
                </Button>
                <Button
                  variant='outlined'
                  startIcon={<i className='ri-link' />}
                  onClick={() => setBindOpen(true)}
                >
                  绑定已有账号
                </Button>
              </Box>
            ) : (
              // 没有会员，提示激活
              <Alert severity='info' icon={<i className='ri-information-line' />}>
                请先使用卡密激活会员，激活后将自动创建 Emby 账号
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 邮箱通知设置卡片 */}
        <Card sx={{ gridColumn: { md: '1 / -1' } }}>
          <CardContent>
            <Typography variant='h6' fontWeight={600} gutterBottom>
              <i className='ri-mail-line' style={{ marginRight: 8 }} />
              邮件通知
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              设置接收邮件通知的邮箱地址，获取到期提醒、求片状态更新等消息
            </Typography>

            {emailMessage && (
              <Alert 
                severity={emailMessage.type} 
                sx={{ mb: 2 }}
                onClose={() => setEmailMessage(null)}
              >
                {emailMessage.text}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'flex-start' } }}>
              <TextField
                label='接收通知的邮箱'
                placeholder='your-email@example.com'
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
                sx={{ flex: 1 }}
                helperText='留空则不接收邮件通知'
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailNotifications}
                    onChange={e => setEmailNotifications(e.target.checked)}
                  />
                }
                label='开启邮件通知'
                sx={{ mt: { sm: 1 } }}
              />
              <Button
                variant='contained'
                disabled={emailSaving}
                onClick={handleSaveEmail}
                sx={{ mt: { sm: 1 }, minWidth: 100 }}
              >
                {emailSaving ? '保存中...' : '保存'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 绑定 Emby 弹窗 */}
      <Dialog open={bindOpen} onClose={() => setBindOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>绑定 Emby 账号</DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            请输入您在 Emby 服务器上的账号密码
          </Typography>
          
          {bindError && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {bindError}
            </Alert>
          )}

          <TextField
            fullWidth
            label='Emby 用户名'
            value={embyUsername}
            onChange={e => setEmbyUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label='Emby 密码'
            type='password'
            value={embyPassword}
            onChange={e => setEmbyPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBindOpen(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleBindEmby}
            disabled={bindLoading || !embyUsername || !embyPassword}
          >
            {bindLoading ? '绑定中...' : '确认绑定'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 修改密码弹窗 */}
      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>修改密码</DialogTitle>
        <DialogContent>
          {passwordSuccess ? (
            <Alert severity='success' sx={{ mt: 1 }}>
              密码修改成功！
            </Alert>
          ) : (
            <>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                请输入当前密码和新密码
              </Typography>
              
              {passwordError && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {passwordError}
                </Alert>
              )}

              <TextField
                fullWidth
                label='当前密码'
                type={showCurrentPwd ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton onClick={() => setShowCurrentPwd(!showCurrentPwd)} edge='end'>
                        <i className={showCurrentPwd ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                fullWidth
                label='新密码'
                type={showNewPwd ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton onClick={() => setShowNewPwd(!showNewPwd)} edge='end'>
                        <i className={showNewPwd ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                fullWidth
                label='确认新密码'
                type='password'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordOpen(false)}>取消</Button>
          {!passwordSuccess && (
            <Button
              variant='contained'
              onClick={handleChangePassword}
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            >
              {passwordLoading ? '提交中...' : '确认修改'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 使用卡密弹窗 */}
      <Dialog open={cardOpen} onClose={() => setCardOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>
          <i className='ri-coupon-line' style={{ marginRight: 8 }} />
          使用卡密
        </DialogTitle>
        <DialogContent>
          {cardSuccess ? (
            <Alert severity='success' sx={{ mt: 1, whiteSpace: 'pre-line' }}>
              {cardSuccess}
            </Alert>
          ) : (
            <>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                输入卡密激活会员，同时会自动创建 Emby 账号
              </Typography>
              
              {cardError && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {cardError}
                </Alert>
              )}

              <TextField
                fullWidth
                label='卡密'
                placeholder='XXXX-XXXX-XXXX-XXXX'
                value={cardCode}
                onChange={e => setCardCode(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  style: { fontFamily: 'monospace', letterSpacing: 1 }
                }}
              />

              {!user?.embyUserId && (
                <TextField
                  fullWidth
                  label='设置 Emby 密码'
                  type='password'
                  placeholder='激活后 Emby 账号的密码'
                  value={cardPassword}
                  onChange={e => setCardPassword(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText={`Emby 用户名将与您的账号相同: ${user?.username}`}
                />
              )}
              
              <Alert severity='info' icon={<i className='ri-information-line' />} sx={{ mt: 1 }}>
                <Typography variant='body2'>
                  卡密类型说明：
                </Typography>
                <Typography variant='caption' component='div' sx={{ mt: 0.5 }}>
                  • 日卡：+1天 &nbsp;&nbsp; • 月卡：+30天<br/>
                  • 季卡：+90天 &nbsp;&nbsp; • 年卡：+365天<br/>
                  • 白名单：永久会员
                </Typography>
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCardOpen(false)}>取消</Button>
          {!cardSuccess && (
            <Button
              variant='contained'
              onClick={handleUseCard}
              disabled={cardLoading || !cardCode.trim() || (!user?.embyUserId && !cardPassword.trim())}
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              }}
            >
              {cardLoading ? '激活中...' : '确认激活'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 创建 Emby 账号弹窗 */}
      <Dialog open={createEmbyOpen} onClose={() => setCreateEmbyOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>
          <i className='ri-add-circle-line' style={{ marginRight: 8 }} />
          创建 Emby 账号
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            设置您的 Emby 账号密码，用户名将与您的网站账号相同
          </Typography>
          
          {createEmbyResult && !createEmbyResult.success && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {createEmbyResult.message}
            </Alert>
          )}

          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
            <Typography variant='body2' color='text.secondary'>Emby 用户名</Typography>
            <Typography variant='h6' fontWeight={600}>{user?.username}</Typography>
          </Box>

          <TextField
            fullWidth
            label='设置 Emby 密码'
            type='password'
            placeholder='请输入 Emby 账号密码'
            value={createEmbyPassword}
            onChange={e => setCreateEmbyPassword(e.target.value)}
            helperText='密码至少4位'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateEmbyOpen(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCreateEmby}
            disabled={createEmbyLoading || !createEmbyPassword.trim()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            {createEmbyLoading ? '创建中...' : '确认创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
