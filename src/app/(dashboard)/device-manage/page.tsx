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
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'

interface Device {
  id: string
  userId: string
  username: string
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
  createdAt: string
}

interface DeviceLimitConfig {
  enabled: boolean
  maxDevices: number
  inactiveDays: number
  blockAction: 'warn' | 'block'
}

export default function DeviceManagePage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [whitelist, setWhitelist] = useState<ClientRule[]>([])
  const [blacklist, setBlacklist] = useState<ClientRule[]>([])
  const [limitConfig, setLimitConfig] = useState<DeviceLimitConfig>({
    enabled: true,
    maxDevices: 10,
    inactiveDays: 7,
    blockAction: 'warn'
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  
  // 添加规则弹窗
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [ruleType, setRuleType] = useState<'whitelist' | 'blacklist'>('whitelist')
  const [ruleForm, setRuleForm] = useState({ name: '', pattern: '', isRegex: false, description: '' })
  
  // 扫描相关状态
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  
  // 实时监控状态
  const [monitoring, setMonitoring] = useState(false)
  const [monitorResult, setMonitorResult] = useState<any>(null)
  const [autoMonitor, setAutoMonitor] = useState(false)
  
  // 自动扫描配置
  const [autoScanConfig, setAutoScanConfig] = useState({
    enabled: false,
    intervalMinutes: 5,
    lastScanAt: '',
    lastScanResult: { scanned: 0, deleted: 0 }
  })
  
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])
  
  // 自动监控定时器
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    
    if (autoMonitor) {
      // 立即执行一次
      handleMonitor()
      // 每10秒执行一次
      timer = setInterval(() => {
        handleMonitor()
      }, 10000)
    }
    
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [autoMonitor])

  const loadData = async () => {
    try {
      const [devicesRes, configRes] = await Promise.all([
        fetch('/api/devices?type=all'),
        fetch('/api/devices?type=config')
      ])
      
      const devicesData = await devicesRes.json()
      const configData = await configRes.json()
      
      if (devicesData.devices) {
        setDevices(devicesData.devices)
      }
      
      if (configData.config) {
        setWhitelist(configData.config.clientConfig?.whitelist || [])
        setBlacklist(configData.config.clientConfig?.blacklist || [])
        setLimitConfig(configData.config.limitConfig || limitConfig)
        if (configData.config.autoScanConfig) {
          setAutoScanConfig(configData.config.autoScanConfig)
        }
      }
    } catch (e) {
      console.error('Load data failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateLimitConfig = async () => {
    try {
      const res = await fetch('/api/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-limit',
          ...limitConfig
        })
      })
      
      if (res.ok) {
        setSuccess('配置已保存')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('保存失败')
        setTimeout(() => setError(''), 3000)
      }
    } catch (e) {
      setError('保存失败')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleUpdateAutoScanConfig = async () => {
    try {
      const res = await fetch('/api/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-auto-scan',
          ...autoScanConfig
        })
      })
      
      if (res.ok) {
        setSuccess('自动扫描配置已保存')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('保存失败')
        setTimeout(() => setError(''), 3000)
      }
    } catch (e) {
      setError('保存失败')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleAddRule = async () => {
    if (!ruleForm.name || !ruleForm.pattern) {
      setError('名称和匹配规则不能为空')
      return
    }

    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-rule',
          type: ruleType,
          ...ruleForm
        })
      })
      
      if (res.ok) {
        setSuccess('规则已添加')
        setRuleDialogOpen(false)
        setRuleForm({ name: '', pattern: '', isRegex: false, description: '' })
        loadData()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || '添加失败')
      }
    } catch (e) {
      setError('添加失败')
    }
  }

  const handleDeleteRule = async (type: 'whitelist' | 'blacklist', id: string) => {
    if (!confirm('确定要删除这条规则吗？')) return

    try {
      const res = await fetch(`/api/devices?type=${type}&id=${id}`, { method: 'DELETE' })
      
      if (res.ok) {
        setSuccess('规则已删除')
        loadData()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (e) {
      setError('删除失败')
      setTimeout(() => setError(''), 3000)
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
        loadData()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (e) {
      setError('操作失败')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('确定要删除这个设备记录吗？')) return

    try {
      const res = await fetch(`/api/devices?id=${deviceId}`, { method: 'DELETE' })
      
      if (res.ok) {
        setSuccess('设备已删除')
        loadData()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (e) {
      setError('删除失败')
      setTimeout(() => setError(''), 3000)
    }
  }

  const openAddRuleDialog = (type: 'whitelist' | 'blacklist') => {
    setRuleType(type)
    setRuleForm({ name: '', pattern: '', isRegex: false, description: '' })
    setRuleDialogOpen(true)
    setError('')
  }

  // 实时监控会话
  const handleMonitor = async () => {
    setMonitoring(true)
    try {
      const res = await fetch('/api/devices/monitor?secret=streamhub-auto-scan')
      const data = await res.json()
      if (res.ok) {
        setMonitorResult(data)
        if (data.kicked > 0) {
          setSuccess(`已踢掉 ${data.kicked} 个违规客户端`)
          setTimeout(() => setSuccess(''), 5000)
        }
      } else {
        if (!autoMonitor) {
          setError(data.error || '监控失败')
          setTimeout(() => setError(''), 3000)
        }
      }
    } catch (e) {
      if (!autoMonitor) {
        setError('监控失败')
        setTimeout(() => setError(''), 3000)
      }
    } finally {
      setMonitoring(false)
    }
  }

  // 预览违规设备
  const handlePreviewScan = async () => {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch('/api/devices/scan')
      const data = await res.json()
      if (res.ok) {
        setScanResult({ preview: true, ...data })
      } else {
        setError(data.error || '预览失败')
        setTimeout(() => setError(''), 3000)
      }
    } catch (e) {
      setError('预览失败')
      setTimeout(() => setError(''), 3000)
    } finally {
      setScanning(false)
    }
  }

  // 执行扫描并删除违规设备
  const handleExecuteScan = async () => {
    if (!confirm('确定要删除所有违规设备吗？此操作不可撤销！')) return
    
    setScanning(true)
    try {
      const res = await fetch('/api/devices/scan', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setScanResult({ preview: false, ...data.results })
        setSuccess(`扫描完成！删除了 ${data.results.deleted} 个违规设备`)
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(data.error || '执行失败')
        setTimeout(() => setError(''), 3000)
      }
    } catch (e) {
      setError('执行失败')
      setTimeout(() => setError(''), 3000)
    } finally {
      setScanning(false)
    }
  }

  // 按用户分组统计设备
  const devicesByUser = devices.reduce((acc, device) => {
    if (!acc[device.username]) {
      acc[device.username] = { total: 0, active: 0 }
    }
    acc[device.username].total++
    if (device.isActive) acc[device.username].active++
    return acc
  }, {} as Record<string, { total: number; active: number }>)

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton variant='rounded' height={400} />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' fontWeight={700}>设备管理</Typography>
        <Typography color='text.secondary'>管理用户设备和客户端限制</Typography>
      </Box>

      {success && <Alert severity='success' sx={{ mb: 3 }}>{success}</Alert>}
      {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}

      {/* 统计卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h4' color='primary'>{devices.length}</Typography>
              <Typography color='text.secondary'>总设备数</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h4' color='success.main'>
                {devices.filter(d => d.isActive).length}
              </Typography>
              <Typography color='text.secondary'>活跃设备</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h4' color='info.main'>{whitelist.length}</Typography>
              <Typography color='text.secondary'>白名单客户端</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h4' color='error.main'>{blacklist.length}</Typography>
              <Typography color='text.secondary'>黑名单客户端</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label='设备列表' />
        <Tab label='限制配置' />
        <Tab label='客户端白名单' />
        <Tab label='客户端黑名单' />
        <Tab label='设备扫描' icon={<i className='ri-radar-line' style={{ marginRight: 4 }} />} iconPosition='start' />
      </Tabs>

      {/* 设备列表 */}
      {activeTab === 0 && (
        <Card>
          <CardHeader
            title='所有设备'
            action={
              <Button 
                variant='outlined' 
                size='small'
                startIcon={<i className='ri-refresh-line' />}
                onClick={loadData}
              >
                刷新
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>用户</TableCell>
                    <TableCell>设备名称</TableCell>
                    <TableCell>客户端</TableCell>
                    <TableCell>最后活动</TableCell>
                    <TableCell>IP</TableCell>
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
                          <Typography fontWeight={500}>{device.username}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{device.deviceName}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {device.deviceId.substring(0, 12)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{device.client}</Typography>
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
                            <IconButton size='small' color='error' onClick={() => handleDeleteDevice(device.id)}>
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
      )}

      {/* 限制配置 */}
      {activeTab === 1 && (
        <Card>
          <CardHeader title='设备限制配置' />
          <CardContent>
            <Box sx={{ maxWidth: 500 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={limitConfig.enabled}
                    onChange={(e) => setLimitConfig({ ...limitConfig, enabled: e.target.checked })}
                  />
                }
                label='启用设备数量限制'
                sx={{ mb: 3 }}
              />
              
              <TextField
                fullWidth
                type='number'
                label='最大设备数'
                value={limitConfig.maxDevices}
                onChange={(e) => setLimitConfig({ ...limitConfig, maxDevices: parseInt(e.target.value) || 10 })}
                sx={{ mb: 3 }}
                helperText='每个用户允许的最大活跃设备数量'
              />
              
              <TextField
                fullWidth
                type='number'
                label='活跃判定天数'
                value={limitConfig.inactiveDays}
                onChange={(e) => setLimitConfig({ ...limitConfig, inactiveDays: parseInt(e.target.value) || 7 })}
                sx={{ mb: 3 }}
                helperText='多少天内有活动的设备算作活跃设备'
              />
              
              <Button variant='contained' onClick={handleUpdateLimitConfig}>
                保存配置
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 客户端白名单 */}
      {activeTab === 2 && (
        <Card>
          <CardHeader
            title='客户端白名单'
            subheader='只有在白名单中的客户端才能连接'
            action={
              <Button 
                variant='contained' 
                size='small'
                startIcon={<i className='ri-add-line' />}
                onClick={() => openAddRuleDialog('whitelist')}
              >
                添加
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>名称</TableCell>
                    <TableCell>匹配规则</TableCell>
                    <TableCell>正则</TableCell>
                    <TableCell>说明</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {whitelist.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Typography fontWeight={500}>{rule.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <code>{rule.pattern}</code>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={rule.isRegex ? '是' : '否'} 
                          size='small' 
                          color={rule.isRegex ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {rule.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title='删除'>
                          <IconButton 
                            size='small' 
                            color='error' 
                            onClick={() => handleDeleteRule('whitelist', rule.id)}
                          >
                            <i className='ri-delete-bin-line' />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 客户端黑名单 */}
      {activeTab === 3 && (
        <Card>
          <CardHeader
            title='客户端黑名单'
            subheader='黑名单中的客户端将被禁止连接'
            action={
              <Button 
                variant='contained' 
                size='small'
                color='error'
                startIcon={<i className='ri-add-line' />}
                onClick={() => openAddRuleDialog('blacklist')}
              >
                添加
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>名称</TableCell>
                    <TableCell>匹配规则</TableCell>
                    <TableCell>正则</TableCell>
                    <TableCell>说明</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blacklist.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Typography fontWeight={500}>{rule.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <code>{rule.pattern}</code>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={rule.isRegex ? '是' : '否'} 
                          size='small' 
                          color={rule.isRegex ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {rule.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title='删除'>
                          <IconButton 
                            size='small' 
                            color='error' 
                            onClick={() => handleDeleteRule('blacklist', rule.id)}
                          >
                            <i className='ri-delete-bin-line' />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 设备扫描 */}
      {activeTab === 4 && (
        <Box>
          {/* 实时监控 */}
          <Card sx={{ mb: 3, border: autoMonitor ? '2px solid' : 'none', borderColor: 'success.main' }}>
            <CardHeader 
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className='ri-radar-line' style={{ color: autoMonitor ? '#4caf50' : undefined }} />
                  实时会话监控
                  {autoMonitor && (
                    <Chip label='运行中' size='small' color='success' />
                  )}
                </Box>
              }
              subheader='实时监控 Emby 服务器会话，发现黑名单客户端立即踢出并删除设备'
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={monitoring ? <i className='ri-loader-4-line' /> : <i className='ri-pulse-line' />}
                    onClick={handleMonitor}
                    disabled={monitoring || autoMonitor}
                  >
                    {monitoring ? '检测中...' : '立即检测'}
                  </Button>
                  <Button
                    variant={autoMonitor ? 'contained' : 'outlined'}
                    size='small'
                    color={autoMonitor ? 'error' : 'success'}
                    startIcon={<i className={autoMonitor ? 'ri-stop-circle-line' : 'ri-play-circle-line'} />}
                    onClick={() => setAutoMonitor(!autoMonitor)}
                  >
                    {autoMonitor ? '停止监控' : '开启监控'}
                  </Button>
                </Box>
              }
            />
            <CardContent>
              <Alert severity='success' sx={{ mb: 2 }}>
                <Typography variant='body2'>
                  <strong>实时监控功能：</strong>
                </Typography>
                <Typography variant='body2' component='ul' sx={{ pl: 2, mt: 1, mb: 0 }}>
                  <li>开启后每 <strong>10秒</strong> 自动检测一次所有在线会话</li>
                  <li>发现黑名单客户端会<strong>立即停止播放</strong>并<strong>发送通知</strong></li>
                  <li>同时会<strong>删除该设备</strong>，用户需要更换客户端重新登录</li>
                  <li>这是最有效的客户端限制方式！</li>
                </Typography>
              </Alert>
              
              {monitorResult && (
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 1, 
                  bgcolor: 'action.hover',
                  display: 'flex',
                  gap: 4,
                  flexWrap: 'wrap'
                }}>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>在线会话</Typography>
                    <Typography variant='h6'>{monitorResult.totalSessions}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>正在播放</Typography>
                    <Typography variant='h6' color='info.main'>{monitorResult.activePlaying}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>本次踢出</Typography>
                    <Typography variant='h6' color={monitorResult.kicked > 0 ? 'error.main' : 'success.main'}>
                      {monitorResult.kicked}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>检测时间</Typography>
                    <Typography variant='body2'>
                      {new Date(monitorResult.timestamp).toLocaleString('zh-CN')}
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {monitorResult?.kickedSessions?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='subtitle2' gutterBottom>被踢出的会话：</Typography>
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>用户</TableCell>
                          <TableCell>客户端</TableCell>
                          <TableCell>原因</TableCell>
                          <TableCell>正在播放</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {monitorResult.kickedSessions.map((s: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{s.userName}</TableCell>
                            <TableCell>
                              <Chip label={s.client} size='small' color='error' variant='outlined' />
                            </TableCell>
                            <TableCell>{s.reason}</TableCell>
                            <TableCell>
                              {s.wasPlaying ? (
                                <Chip label='是' size='small' color='warning' />
                              ) : (
                                <Chip label='否' size='small' variant='outlined' />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </CardContent>
          </Card>

          <Divider sx={{ my: 3 }} />

          {/* 自动扫描配置 */}
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title='定时扫描设备（需外部定时任务）' 
              subheader='通过外部 cron 定时任务定期扫描并删除黑名单中的设备'
              action={
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoScanConfig.enabled}
                      onChange={(e) => setAutoScanConfig({ ...autoScanConfig, enabled: e.target.checked })}
                      color='primary'
                    />
                  }
                  label={autoScanConfig.enabled ? '已开启' : '已关闭'}
                />
              }
            />
            <CardContent>
              {autoScanConfig.enabled && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography>扫描间隔：</Typography>
                  <TextField
                    type='number'
                    size='small'
                    value={autoScanConfig.intervalMinutes}
                    onChange={(e) => setAutoScanConfig({ 
                      ...autoScanConfig, 
                      intervalMinutes: Math.max(1, parseInt(e.target.value) || 5) 
                    })}
                    sx={{ width: 100 }}
                    inputProps={{ min: 1 }}
                  />
                  <Typography>分钟</Typography>
                  <Button 
                    variant='contained' 
                    size='small'
                    onClick={handleUpdateAutoScanConfig}
                  >
                    保存配置
                  </Button>
                </Box>
              )}
              
              {autoScanConfig.lastScanAt && (
                <Alert severity='info' sx={{ mt: 2 }}>
                  <Typography variant='body2'>
                    上次扫描时间：{new Date(autoScanConfig.lastScanAt).toLocaleString('zh-CN')}
                    {autoScanConfig.lastScanResult && (
                      <>
                        <br />
                        扫描结果：共 {autoScanConfig.lastScanResult.scanned} 个设备，
                        删除 {autoScanConfig.lastScanResult.deleted} 个违规设备
                      </>
                    )}
                  </Typography>
                </Alert>
              )}
              
              {autoScanConfig.enabled && (
                <Alert severity='warning' sx={{ mt: 2 }}>
                  <Typography variant='body2'>
                    <strong>注意：</strong>自动扫描需要外部定时任务调用接口：
                    <br />
                    <code style={{ 
                      background: 'rgba(0,0,0,0.1)', 
                      padding: '2px 6px', 
                      borderRadius: 4,
                      fontSize: '0.85em'
                    }}>
                      GET /api/devices/auto-scan?secret=streamhub-auto-scan
                    </code>
                    <br />
                    可使用 cron 定时任务或其他调度工具定期调用此接口。
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 手动扫描 */}
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title='手动扫描' 
              subheader='立即扫描 Emby 服务器中的设备'
            />
            <CardContent>
              <Alert severity='info' sx={{ mb: 3 }}>
                <Typography variant='body2'>
                  <strong>扫描说明：</strong>
                </Typography>
                <Typography variant='body2' component='ul' sx={{ pl: 2, mt: 1 }}>
                  <li>扫描会检查 Emby 服务器中的所有设备</li>
                  <li>匹配<strong>黑名单</strong>中的客户端会被标记为违规</li>
                  <li>如果白名单不为空，<strong>不在白名单中</strong>的客户端也会被标记为违规</li>
                  <li>执行扫描会从 Emby 服务器<strong>删除</strong>违规设备，用户需要重新登录</li>
                </Typography>
              </Alert>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant='outlined'
                  startIcon={scanning ? <i className='ri-loader-4-line' /> : <i className='ri-search-eye-line' />}
                  onClick={handlePreviewScan}
                  disabled={scanning}
                >
                  {scanning ? '扫描中...' : '预览违规设备'}
                </Button>
                <Button
                  variant='contained'
                  color='error'
                  startIcon={scanning ? <i className='ri-loader-4-line' /> : <i className='ri-delete-bin-line' />}
                  onClick={handleExecuteScan}
                  disabled={scanning}
                >
                  {scanning ? '执行中...' : '扫描并删除违规设备'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* 扫描结果 */}
          {scanResult && (
            <Card>
              <CardHeader 
                title={scanResult.preview ? '预览结果' : '执行结果'}
                subheader={scanResult.preview 
                  ? `发现 ${scanResult.violating || 0} 个违规设备（共 ${scanResult.total || 0} 个设备）`
                  : `扫描 ${scanResult.scanned || 0} 个设备，删除 ${scanResult.deleted || 0} 个`
                }
              />
              <CardContent>
                {(scanResult.devices?.length > 0 || scanResult.blockedDevices?.length > 0) ? (
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>设备名称</TableCell>
                          <TableCell>客户端</TableCell>
                          <TableCell>用户</TableCell>
                          <TableCell>原因</TableCell>
                          <TableCell>最后活动</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(scanResult.devices || scanResult.blockedDevices || []).map((device: any, index: number) => (
                          <TableRow key={device.id || index}>
                            <TableCell>{device.name}</TableCell>
                            <TableCell>
                              <Chip 
                                label={device.client} 
                                size='small' 
                                color='error' 
                                variant='outlined'
                              />
                            </TableCell>
                            <TableCell>{device.user || '-'}</TableCell>
                            <TableCell>
                              <Typography variant='body2' color='error.main'>
                                {device.reason}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {device.lastActivity 
                                ? new Date(device.lastActivity).toLocaleString('zh-CN')
                                : '-'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity='success'>
                    没有发现违规设备！所有设备都符合规则。
                  </Alert>
                )}
                
                {scanResult.errors?.length > 0 && (
                  <Alert severity='warning' sx={{ mt: 2 }}>
                    <Typography variant='body2'><strong>部分操作失败：</strong></Typography>
                    {scanResult.errors.map((err: string, i: number) => (
                      <Typography key={i} variant='body2'>• {err}</Typography>
                    ))}
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* 添加规则对话框 */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>
          添加{ruleType === 'whitelist' ? '白名单' : '黑名单'}规则
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            fullWidth
            label='名称'
            value={ruleForm.name}
            onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
            placeholder='例如: Emby for Android'
          />
          
          <TextField
            fullWidth
            label='匹配规则'
            value={ruleForm.pattern}
            onChange={(e) => setRuleForm({ ...ruleForm, pattern: e.target.value })}
            sx={{ mb: 2 }}
            placeholder='客户端名称或正则表达式'
            helperText='客户端名称中包含此字符串即匹配'
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={ruleForm.isRegex}
                onChange={(e) => setRuleForm({ ...ruleForm, isRegex: e.target.checked })}
              />
            }
            label='使用正则表达式'
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label='说明（可选）'
            value={ruleForm.description}
            onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
            placeholder='规则说明'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>取消</Button>
          <Button variant='contained' onClick={handleAddRule}>添加</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
