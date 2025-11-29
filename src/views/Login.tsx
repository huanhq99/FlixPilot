'use client'

// React Imports
import { useState, useEffect } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { Mode } from '@core/types'

// Component Imports
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import Illustrations from '@components/Illustrations'

// Context Imports
import { useSiteConfig } from '@/contexts/siteConfigContext'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'
import { useSettings } from '@core/hooks/useSettings'

interface RegisterConfig {
  enabled: boolean
  minPasswordLength: number
  requireUppercase: boolean
  requireNumber: boolean
}

const LoginV2 = ({ mode }: { mode: Mode }) => {
  // States
  const [activeTab, setActiveTab] = useState(0)
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [firstTimeCredentials, setFirstTimeCredentials] = useState<{ username: string; password: string } | null>(null)
  const [registerConfig, setRegisterConfig] = useState<RegisterConfig | null>(null)
  
  // Context
  const { config: siteConfig } = useSiteConfig()

  // Vars
  const darkImg = '/images/pages/auth-v2-mask-dark.png'
  const lightImg = '/images/pages/auth-v2-mask-light.png'
  const darkIllustration = '/images/illustrations/auth/v2-login-dark.png'
  const lightIllustration = '/images/illustrations/auth/v2-login-light.png'
  const borderedDarkIllustration = '/images/illustrations/auth/v2-login-dark-border.png'
  const borderedLightIllustration = '/images/illustrations/auth/v2-login-light-border.png'

  // Hooks
  const router = useRouter()
  const { settings } = useSettings()
  const authBackground = useImageVariant(mode, lightImg, darkImg)

  const characterIllustration = useImageVariant(
    mode,
    lightIllustration,
    darkIllustration,
    borderedLightIllustration,
    borderedDarkIllustration
  )

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  // 检查首次启动和注册配置
  useEffect(() => {
    fetch('/api/auth/login', { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        if (data.firstTime && data.credentials) {
          setFirstTimeCredentials(data.credentials)
          setUsername(data.credentials.username)
          setPassword(data.credentials.password)
        }
      })
      .catch(() => {})
    
    fetch('/api/auth/register', { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        setRegisterConfig(data)
      })
      .catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/home')
      } else {
        setError(data.error || '登录失败')
      }
    } catch (e) {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }
    
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/home')
      } else {
        setError(data.error || '注册失败')
      }
    } catch (e) {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordHint = () => {
    if (!registerConfig) return ''
    const hints = []
    hints.push(`至少${registerConfig.minPasswordLength}位`)
    if (registerConfig.requireUppercase) hints.push('包含大写字母')
    if (registerConfig.requireNumber) hints.push('包含数字')
    return hints.join('，')
  }

  return (
    <div className='flex bs-full justify-center'>
      <div
        className={classnames(
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
          {
            'border-ie': settings.skin === 'bordered'
          }
        )}
      >
        <div className='plb-12 pis-12'>
          <img
            src={characterIllustration}
            alt='character-illustration'
            className='max-bs-[500px] max-is-full bs-auto'
          />
        </div>
        <Illustrations
          image1={{ src: '/images/illustrations/objects/tree-2.png' }}
          image2={null}
          maskImg={{ src: authBackground }}
        />
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <Link className='absolute block-start-5 sm:block-start-[38px] inline-start-6 sm:inline-start-[38px]'>
          <Logo />
        </Link>
        <div className='flex flex-col gap-5 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset]'>
          <div>
            <Typography variant='h4'>欢迎使用 {siteConfig.name} 👋</Typography>
            <Typography className='mbs-1' color='text.secondary'>
              {activeTab === 0 ? '请登录您的账号' : '创建新账号'}
            </Typography>
          </div>

          {/* 登录/注册 Tab */}
          {registerConfig?.enabled && (
            <Tabs 
              value={activeTab} 
              onChange={(_, v) => { setActiveTab(v); setError(''); setSuccess('') }}
              sx={{ mb: 1 }}
            >
              <Tab label='登录' />
              <Tab label='注册' />
            </Tabs>
          )}

          {/* 首次启动提示 */}
          {firstTimeCredentials && activeTab === 0 && (
            <Alert severity='info' sx={{ mb: 2 }}>
              <Typography variant='subtitle2' fontWeight={600} gutterBottom>
                🎉 首次启动
              </Typography>
              <Typography variant='body2'>
                管理员账号: <strong>{firstTimeCredentials.username}</strong>
              </Typography>
              <Typography variant='body2'>
                管理员密码: <strong>{firstTimeCredentials.password}</strong>
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                请妥善保管此密码，忘记密码请删除 data/users.json 后重启
              </Typography>
            </Alert>
          )}

          {error && <Alert severity='error'>{error}</Alert>}
          {success && <Alert severity='success'>{success}</Alert>}

          {/* 登录表单 */}
          {activeTab === 0 && (
            <form noValidate autoComplete='off' onSubmit={handleLogin} className='flex flex-col gap-5'>
              <TextField
                autoFocus
                fullWidth
                label='用户名'
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <TextField
                fullWidth
                label='密码'
                type={isPasswordShown ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          size='small'
                          edge='end'
                          onClick={handleClickShowPassword}
                          onMouseDown={e => e.preventDefault()}
                        >
                          <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <Button 
                fullWidth 
                variant='contained' 
                type='submit' 
                disabled={loading || !username || !password}
                size='large'
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          )}

          {/* 注册表单 */}
          {activeTab === 1 && (
            <form noValidate autoComplete='off' onSubmit={handleRegister} className='flex flex-col gap-5'>
              <TextField
                autoFocus
                fullWidth
                label='用户名'
                value={username}
                onChange={e => setUsername(e.target.value)}
                helperText='3-20个字符，仅限字母、数字和下划线'
              />
              <TextField
                fullWidth
                label='密码'
                type={isPasswordShown ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                helperText={getPasswordHint()}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          size='small'
                          edge='end'
                          onClick={handleClickShowPassword}
                          onMouseDown={e => e.preventDefault()}
                        >
                          <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <TextField
                fullWidth
                label='确认密码'
                type={isPasswordShown ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <Button 
                fullWidth 
                variant='contained' 
                type='submit' 
                disabled={loading || !username || !password || !confirmPassword}
                size='large'
              >
                {loading ? '注册中...' : '注册'}
              </Button>
            </form>
          )}

          {!registerConfig?.enabled && activeTab === 0 && (
            <>
              <Divider className='gap-3'>或者</Divider>
              <Box textAlign='center'>
                <Typography variant='body2' color='text.secondary'>
                  还没有账号？请联系管理员创建
                </Typography>
              </Box>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginV2
