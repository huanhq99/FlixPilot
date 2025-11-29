'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

interface EmbyUser {
  Id: string
  Name: string
  LastLoginDate?: string
  LastActivityDate?: string
  Policy?: {
    IsAdministrator?: boolean
    IsDisabled?: boolean
  }
  PrimaryImageTag?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<EmbyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [serverUrl, setServerUrl] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      // 先获取配置
      const configRes = await fetch('/api/config')
      const config = await configRes.json()
      const embyConfig = Array.isArray(config.emby) ? config.emby[0] : config.emby
      
      if (embyConfig?.serverUrl) {
        setServerUrl(embyConfig.serverUrl)
      }
      
      // 获取用户列表
      const res = await fetch('/api/emby/Users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (e) {
      console.error('Load users failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const getUserAvatar = (user: EmbyUser) => {
    if (user.PrimaryImageTag && serverUrl) {
      return `${serverUrl}/emby/Users/${user.Id}/Images/Primary?tag=${user.PrimaryImageTag}&quality=90&maxWidth=100`
    }
    return null
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '从未'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
    
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='ri-user-line text-3xl' style={{ color: 'var(--mui-palette-primary-main)' }} />
          <Typography variant='h4' fontWeight={700}>用户列表</Typography>
        </Box>
        <Typography color='text.secondary' sx={{ mt: 0.5, ml: 0.5 }}>
          查看 Emby 服务器上的所有用户
        </Typography>
      </Box>

      {/* 用户统计 */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className='ri-user-line text-xl' style={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant='h4' fontWeight={700}>
                {loading ? '-' : users.length}
              </Typography>
              <Typography variant='body2' color='text.secondary'>总用户数</Typography>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className='ri-shield-user-line text-xl' style={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant='h4' fontWeight={700}>
                {loading ? '-' : users.filter(u => u.Policy?.IsAdministrator).length}
              </Typography>
              <Typography variant='body2' color='text.secondary'>管理员</Typography>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'warning.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className='ri-time-line text-xl' style={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant='h4' fontWeight={700}>
                {loading ? '-' : users.filter(u => {
                  if (!u.LastActivityDate) return false
                  const diff = Date.now() - new Date(u.LastActivityDate).getTime()
                  return diff < 86400000 * 7 // 7天内活跃
                }).length}
              </Typography>
              <Typography variant='body2' color='text.secondary'>近7日活跃</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 用户表格 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>用户</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>最后登录</TableCell>
                <TableCell>最后活动</TableCell>
                <TableCell align='right'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant='circular' width={40} height={40} />
                        <Skeleton variant='text' width={100} />
                      </Box>
                    </TableCell>
                    <TableCell><Skeleton variant='text' width={60} /></TableCell>
                    <TableCell><Skeleton variant='text' width={60} /></TableCell>
                    <TableCell><Skeleton variant='text' width={80} /></TableCell>
                    <TableCell><Skeleton variant='text' width={80} /></TableCell>
                    <TableCell><Skeleton variant='text' width={40} /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align='center'>
                    <Typography color='text.secondary' sx={{ py: 4 }}>
                      暂无用户数据
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.Id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          src={getUserAvatar(user) || undefined}
                          sx={{ bgcolor: 'primary.main' }}
                        >
                          {user.Name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant='body2' fontWeight={600}>
                            {user.Name}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            ID: {user.Id.substring(0, 8)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {user.Policy?.IsAdministrator ? (
                        <Chip label='管理员' size='small' color='primary' />
                      ) : (
                        <Chip label='普通用户' size='small' variant='outlined' />
                      )}
                    </TableCell>
                    <TableCell>
                      {user.Policy?.IsDisabled ? (
                        <Chip label='已禁用' size='small' color='error' />
                      ) : (
                        <Chip label='正常' size='small' color='success' />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {formatDate(user.LastLoginDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {formatDate(user.LastActivityDate)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Tooltip title='查看详情'>
                        <IconButton size='small'>
                          <i className='ri-eye-line' />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}
