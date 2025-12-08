'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import MembershipGuard from '@/components/MembershipGuard'

interface Device {
  id: string
  deviceId: string
  deviceName: string
  client: string
  clientVersion?: string
  lastActiveAt: string
  lastIp?: string
  isActive: boolean
  createdAt: string
}

interface ClientRule {
  id: string
  name: string
  pattern: string
  isRegex: boolean
  description?: string
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [maxDevices, setMaxDevices] = useState(10)
  const [limitEnabled, setLimitEnabled] = useState(true)
  const [whitelist, setWhitelist] = useState<ClientRule[]>([])
  const [blacklist, setBlacklist] = useState<ClientRule[]>([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadDevices()
    loadConfig()
  }, [])

  const loadDevices = async () => {
    try {
      const res = await fetch('/api/devices')
      const data = await res.json()
      if (data.devices) {
        setDevices(data.devices)
        setActiveCount(data.activeCount || 0)
        setMaxDevices(data.maxDevices || 10)
        setLimitEnabled(data.limitEnabled !== false)
      }
    } catch (e) {
      console.error('Load devices failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/devices?type=config')
      const data = await res.json()
      if (data.config) {
        setWhitelist(data.config.clientConfig?.whitelist || [])
        setBlacklist(data.config.clientConfig?.blacklist || [])
      }
    } catch (e) {
      console.error('Load config failed:', e)
    }
  }

  const handleSetInactive = async (deviceId: string) => {
    try {
      const res = await fetch('/api/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-inactive', deviceId })
      })
      
      if (res.ok) {
        setSuccess('设备已标记为不活跃')
        loadDevices()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || '操作失败')
        setTimeout(() => setError(''), 3000)
      }
    } catch (e) {
      setError('操作失败')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleDelete = async (deviceId: string) => {
    if (!confirm('确定要删除这个设备记录吗？')) return

    try {
      const res = await fetch(`/api/devices?id=${deviceId}`, { method: 'DELETE' })
      
      if (res.ok) {
        setSuccess('设备已删除')
        loadDevices()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || '删除失败')
        setTimeout(() => setError(''), 3000)
      }
    } catch (e) {
      setError('删除失败')
      setTimeout(() => setError(''), 3000)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton variant='rounded' height={400} />
      </Box>
    )
  }

  return (
    <MembershipGuard>
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' fontWeight={700}>设备管理</Typography>
        <Typography color='text.secondary'>管理您的设备连接和客户端设置</Typography>
      </Box>

      {success && <Alert severity='success' sx={{ mb: 3 }}>{success}</Alert>}
      {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}

      {/* 系统公告 */}
      <Alert severity='info' sx={{ mb: 3 }}>
        <Typography variant='subtitle2' gutterBottom>系统公告</Typography>
        <Typography variant='body2'>
          设备管理显示了您当前登录的设备列表，您可以查看设备的活动状态，标记设备为不活跃/活跃等操作
        </Typography>
      </Alert>

      {/* 设备限制提示 */}
      {limitEnabled && (
        <Alert 
          severity={activeCount >= maxDevices ? 'error' : 'warning'} 
          sx={{ mb: 3 }}
        >
          当前管理员限制7日内活跃设备为最多{maxDevices}台，超过{maxDevices}台设备将封禁账号，您可以标记不需要的设备为不活跃来释放额度
        </Alert>
      )}

      {/* 活跃设备列表 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title='活跃设备列表'
          action={
            <Button 
              variant='outlined' 
              size='small'
              startIcon={<i className='ri-refresh-line' />}
              onClick={loadDevices}
            >
              刷新列表
            </Button>
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>设备信息</TableCell>
                  <TableCell>服务器</TableCell>
                  <TableCell>客户端</TableCell>
                  <TableCell>最后活动时间</TableCell>
                  <TableCell>最后活动IP</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align='center'>
                      <Typography color='text.secondary' sx={{ py: 4 }}>
                        暂无设备记录
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className='ri-device-line' style={{ fontSize: 20 }} />
                          <Box>
                            <Typography fontWeight={500}>{device.deviceName}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {device.deviceId.substring(0, 16)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>Emby Server</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{device.client}</Typography>
                        {device.clientVersion && (
                          <Typography variant='caption' color='text.secondary'>
                            v{device.clientVersion}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {new Date(device.lastActiveAt).toLocaleString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {device.lastIp || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={device.isActive ? '活跃' : '不活跃'} 
                          size='small' 
                          color={device.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {device.isActive && (
                          <Tooltip title='标记为不活跃'>
                            <IconButton size='small' onClick={() => handleSetInactive(device.id)}>
                              <i className='ri-timer-line' />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title='删除'>
                          <IconButton size='small' color='error' onClick={() => handleDelete(device.id)}>
                            <i className='ri-delete-bin-line' />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 客户端白名单 */}
      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='ri-checkbox-circle-line' style={{ color: 'green' }} />
            <Typography fontWeight={500}>客户端白名单</Typography>
            <Chip label={`${whitelist.length} 个`} size='small' color='success' />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            以下客户端允许连接，使用其他客户端可能会被系统自动清理
          </Typography>
          {whitelist.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {whitelist.map(rule => (
                <Chip key={rule.id} label={rule.name} size='small' variant='outlined' color='success' />
              ))}
            </Box>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              未设置白名单（允许所有客户端）
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      {/* 客户端黑名单 */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='ri-close-circle-line' style={{ color: 'red' }} />
            <Typography fontWeight={500}>客户端黑名单</Typography>
            <Chip label={`${blacklist.length} 个`} size='small' color='error' />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            以下客户端已被禁止，使用这些客户端登录会被系统自动清理
          </Typography>
          {blacklist.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {blacklist.map(rule => (
                <Chip key={rule.id} label={rule.name} size='small' variant='outlined' color='error' />
              ))}
            </Box>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              未设置黑名单
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
    </MembershipGuard>
  )
}
