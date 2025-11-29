'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Alert from '@mui/material/Alert'

interface PlayRecord {
  id: string
  time: string
  userName: string
  ip: string
  client: string
  device: string
  content: string
  contentType: 'Episode' | 'Movie' | string
  seriesName?: string
  seasonEpisode?: string
  itemId?: string
  seriesId?: string
  posterUrl?: string
  backdropUrl?: string
  isAbnormal?: boolean
}

interface AbnormalAlert {
  userName: string
  devices: { device: string; client: string; ip: string; content: string }[]
  time: string
}

interface PlaySession {
  Id: string
  UserName: string
  UserId: string
  Client: string
  DeviceName: string
  NowPlayingItem?: {
    Id: string
    Name: string
    SeriesName?: string
    SeriesId?: string
    Type: string
    IndexNumber?: number
    ParentIndexNumber?: number
  }
  RemoteEndPoint?: string
}

export default function PlayMonitorPage() {
  const [records, setRecords] = useState<PlayRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('')
  const [contentFilter, setContentFilter] = useState('')
  const [abnormalAlerts, setAbnormalAlerts] = useState<AbnormalAlert[]>([])
  const [notifiedUsers, setNotifiedUsers] = useState<Set<string>>(new Set())
  const [ipRegions, setIpRegions] = useState<Record<string, string>>({})

  // IP 地区缓存
  const regionCache: Record<string, string> = {}

  const getRegion = async (ip: string) => {
    if (!ip || ip === '未知' || regionCache[ip]) return
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('172.')) {
      regionCache[ip] = '本地网络'
      setIpRegions(prev => ({ ...prev, [ip]: '本地网络' }))
      return
    }
    try {
      const res = await fetch(`/api/ip-location?ip=${ip}`)
      if (res.ok) {
        const d = await res.json()
        const region = d.city ? `${d.regionName} ${d.city}` : (d.regionName || d.country || '未知')
        regionCache[ip] = region
        setIpRegions(prev => ({ ...prev, [ip]: region }))
      }
    } catch {}
  }

  // 加载 IP 地区
  useEffect(() => {
    const ips = records.map(r => r.ip).filter(ip => ip && ip !== '未知' && !ipRegions[ip])
    ips.forEach(ip => getRegion(ip))
  }, [records])

  const sendTelegramAlert = async (
    userName: string, 
    devices: { device: string; client: string; ip: string; content: string }[], 
    time: string
  ) => {
    try {
      const deviceList = devices.map((d, i) => 
        `  设备${i + 1}: ${d.device} (${d.client})\n  IP: ${d.ip}\n  内容: ${d.content}`
      ).join('\n\n')
      
      const message = `⚠️ 账号共享异常警告\n\n` +
        `👤 用户: ${userName}\n` +
        `⏰ 时间: ${time}\n` +
        `📱 同时在线设备数: ${devices.length}\n\n` +
        `设备详情:\n${deviceList}`
      
      await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'warning' })
      })
    } catch (e) {
      console.error('Send telegram alert failed:', e)
    }
  }

  const loadRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/emby/Sessions')
      if (res.ok) {
        const sessions: PlaySession[] = await res.json()
        
        const configRes = await fetch('/api/config')
        const config = await configRes.json()
        const embyUrl = config.emby?.[0]?.serverUrl || ''
        const apiKey = config.emby?.[0]?.apiKey || ''
        
        const playingSessions = sessions.filter(s => s.NowPlayingItem)
        
        // 检测同账号多设备
        const userDevices: Map<string, { device: string; client: string; ip: string; content: string }[]> = new Map()
        playingSessions.forEach(session => {
          const userName = session.UserName
          const deviceInfo = {
            device: session.DeviceName,
            client: session.Client,
            ip: session.RemoteEndPoint || '未知',
            content: session.NowPlayingItem?.SeriesName 
              ? `${session.NowPlayingItem.SeriesName} - ${session.NowPlayingItem.Name}`
              : session.NowPlayingItem?.Name || ''
          }
          if (!userDevices.has(userName)) userDevices.set(userName, [])
          userDevices.get(userName)!.push(deviceInfo)
        })
        
        const abnormalUsers = new Set<string>()
        const newAlerts: AbnormalAlert[] = []
        
        userDevices.forEach((devices, userName) => {
          if (devices.length >= 2) {
            abnormalUsers.add(userName)
            const now = new Date()
            const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
            
            const alertKey = `${userName}-${devices.map(d => d.device).sort().join(',')}`
            if (!notifiedUsers.has(alertKey)) {
              newAlerts.push({ userName, devices, time: timeStr })
              sendTelegramAlert(userName, devices, timeStr)
              setNotifiedUsers(prev => new Set([...prev, alertKey]))
            }
          }
        })
        
        if (newAlerts.length > 0) {
          setAbnormalAlerts(prev => [...newAlerts, ...prev].slice(0, 20))
        }
        
        const newRecords: PlayRecord[] = playingSessions.map(session => {
          const item = session.NowPlayingItem!
          const now = new Date()
          
          let seasonEpisode = ''
          if (item.Type === 'Episode' && item.ParentIndexNumber && item.IndexNumber) {
            seasonEpisode = `S${item.ParentIndexNumber}E${item.IndexNumber}`
          }

          const itemId = item.Id
          const seriesId = item.SeriesId
          // 海报：剧集用剧的海报，电影用电影海报
          const posterId = item.Type === 'Episode' && seriesId ? seriesId : itemId
          const posterUrl = embyUrl ? `${embyUrl}/emby/Items/${posterId}/Images/Primary?maxHeight=100&api_key=${apiKey}` : ''
          // 背景图：剧集用剧的背景，电影用电影背景
          const backdropId = item.Type === 'Episode' && seriesId ? seriesId : itemId
          const backdropUrl = embyUrl ? `${embyUrl}/emby/Items/${backdropId}/Images/Backdrop?maxWidth=600&api_key=${apiKey}` : ''
          
          return {
            id: `${session.Id}-${Date.now()}`,
            time: `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
            userName: session.UserName,
            ip: session.RemoteEndPoint || '未知',
            client: session.Client,
            device: session.DeviceName,
            content: item.Name,
            contentType: item.Type,
            seriesName: item.SeriesName,
            seasonEpisode,
            itemId,
            seriesId,
            posterUrl,
            backdropUrl,
            isAbnormal: abnormalUsers.has(session.UserName)
          }
        })

        setRecords(prev => {
          const existingIds = new Set(prev.map(r => `${r.userName}-${r.content}`))
          const uniqueNew = newRecords.filter(r => !existingIds.has(`${r.userName}-${r.content}`))
          return [...uniqueNew, ...prev].slice(0, 100)
        })
      }
    } catch (e) {
      console.error('Load records failed:', e)
    } finally {
      setLoading(false)
    }
  }, [notifiedUsers])

  useEffect(() => {
    loadRecords()
    const interval = setInterval(loadRecords, 5000)
    return () => clearInterval(interval)
  }, [loadRecords])

  const clearRecords = () => setRecords([])

  const exportCSV = () => {
    const headers = ['时间', '用户', 'IP地址', '客户端', '设备', '播放内容', '类型']
    const rows = records.map(r => [
      r.time, r.userName, r.ip, r.client, r.device,
      r.seriesName ? `${r.seriesName} ${r.seasonEpisode} - ${r.content}` : r.content,
      r.contentType === 'Episode' ? '剧集' : r.contentType === 'Movie' ? '电影' : r.contentType
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `播放记录_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredRecords = records.filter(r => {
    if (userFilter && !r.userName.toLowerCase().includes(userFilter.toLowerCase())) return false
    if (contentFilter) {
      const contentStr = r.seriesName ? `${r.seriesName} ${r.content}` : r.content
      if (!contentStr.toLowerCase().includes(contentFilter.toLowerCase())) return false
    }
    return true
  })

  // 统计
  const uniqueUsers = new Set(records.map(r => r.userName)).size
  const uniqueContents = new Set(records.map(r => r.seriesName || r.content)).size

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' fontWeight={700}>播放监控</Typography>
        <Typography color='text.secondary'>实时监控 Emby 播放活动，自动检测账号共享</Typography>
      </Box>

      {/* 异常警告 */}
      {abnormalAlerts.length > 0 && (
        <Alert 
          severity='error' 
          sx={{ mb: 3 }}
          action={
            <Button color='inherit' size='small' onClick={() => setAbnormalAlerts([])}>
              清除
            </Button>
          }
        >
          <Typography fontWeight={600} sx={{ mb: 1 }}>检测到 {abnormalAlerts.length} 个账号共享异常</Typography>
          {abnormalAlerts.slice(0, 3).map((alert, idx) => (
            <Box key={idx} sx={{ fontSize: '0.875rem' }}>
              <strong>{alert.userName}</strong> 在 {alert.devices.length} 个设备同时播放 ({alert.time})
            </Box>
          ))}
        </Alert>
      )}

      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <i className='ri-play-circle-line text-2xl' />
            </Avatar>
            <Box>
              <Typography color='text.secondary' variant='body2'>正在播放</Typography>
              <Typography variant='h4' fontWeight={700}>{records.length}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
              <i className='ri-user-line text-2xl' />
            </Avatar>
            <Box>
              <Typography color='text.secondary' variant='body2'>在线用户</Typography>
              <Typography variant='h4' fontWeight={700}>{uniqueUsers}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
              <i className='ri-movie-line text-2xl' />
            </Avatar>
            <Box>
              <Typography color='text.secondary' variant='body2'>播放内容</Typography>
              <Typography variant='h4' fontWeight={700}>{uniqueContents}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: abnormalAlerts.length > 0 ? 'error.main' : 'info.main', width: 48, height: 48 }}>
              <i className={abnormalAlerts.length > 0 ? 'ri-alarm-warning-line text-2xl' : 'ri-shield-check-line text-2xl'} />
            </Avatar>
            <Box>
              <Typography color='text.secondary' variant='body2'>共享异常</Typography>
              <Typography variant='h4' fontWeight={700} color={abnormalAlerts.length > 0 ? 'error.main' : 'inherit'}>
                {abnormalAlerts.length}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 播放记录表格 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant='h6' fontWeight={600}>播放记录</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant='outlined' size='small' startIcon={<i className='ri-refresh-line' />} onClick={loadRecords}>
                刷新
              </Button>
              <Button variant='outlined' size='small' startIcon={<i className='ri-delete-bin-line' />} onClick={clearRecords}>
                清空
              </Button>
              <Button variant='contained' size='small' startIcon={<i className='ri-download-line' />} onClick={exportCSV} color='primary'>
                导出
              </Button>
            </Box>
          </Box>

          {/* 筛选器 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              size='small' placeholder='搜索用户名...' value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position='start'><i className='ri-search-line' /></InputAdornment> }}
              sx={{ width: 200 }}
            />
            <TextField
              size='small' placeholder='搜索影片/剧集...' value={contentFilter}
              onChange={e => setContentFilter(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position='start'><i className='ri-search-line' /></InputAdornment> }}
              sx={{ width: 200 }}
            />
          </Box>

          {/* 表格 */}
          {loading ? (
            <Box>{[1,2,3,4,5].map(i => <Skeleton key={i} variant='rounded' height={60} sx={{ mb: 1 }} />)}</Box>
          ) : filteredRecords.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <i className='ri-inbox-line text-6xl' style={{ opacity: 0.3 }} />
              <Typography color='text.secondary' sx={{ mt: 2 }}>暂无播放记录</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width={70}></TableCell>
                    <TableCell>时间</TableCell>
                    <TableCell>用户</TableCell>
                    <TableCell>IP 地址</TableCell>
                    <TableCell>客户端</TableCell>
                    <TableCell>播放内容</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords.map(record => (
                    <TableRow 
                      key={record.id} 
                      sx={{ 
                        position: 'relative',
                        bgcolor: record.isAbnormal ? 'error.lighter' : 'inherit',
                        '&:hover': { bgcolor: record.isAbnormal ? 'error.light' : 'action.hover' },
                        '&::before': record.backdropUrl ? {
                          content: '""',
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: '50%',
                          backgroundImage: `url(${record.backdropUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          opacity: 0.35,
                          maskImage: 'linear-gradient(to right, transparent, black)',
                          WebkitMaskImage: 'linear-gradient(to right, transparent, black)',
                          pointerEvents: 'none'
                        } : {}
                      }}
                    >
                      <TableCell sx={{ position: 'relative' }}>
                        <Box
                          sx={{
                            width: 45,
                            height: 65,
                            borderRadius: 1,
                            overflow: 'hidden',
                            bgcolor: 'action.hover'
                          }}
                        >
                          {record.posterUrl && (
                            <img
                              src={record.posterUrl}
                              alt=''
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ position: 'relative' }}>
                        <Typography variant='body2' color='text.secondary'>{record.time}</Typography>
                      </TableCell>
                      <TableCell sx={{ position: 'relative' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: record.isAbnormal ? 'error.main' : 'primary.main' }}>
                            {record.userName.slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant='body2' fontWeight={500}>{record.userName}</Typography>
                            {record.isAbnormal && (
                              <Chip label='多设备' size='small' color='error' sx={{ height: 18, fontSize: '0.7rem' }} />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ position: 'relative' }}>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{record.ip}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {ipRegions[record.ip] || ''}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ position: 'relative' }}>
                        <Typography variant='body2'>{record.client}</Typography>
                        <Typography variant='caption' color='text.secondary'>{record.device}</Typography>
                      </TableCell>
                      <TableCell sx={{ position: 'relative' }}>
                        <Typography variant='body2' color='primary.main' fontWeight={500}>
                          {record.seriesName ? `${record.seriesName} ${record.seasonEpisode} - ${record.content}` : record.content}
                        </Typography>
                        <Chip 
                          label={record.contentType === 'Episode' ? '剧集' : record.contentType === 'Movie' ? '电影' : record.contentType}
                          size='small' variant='outlined'
                          sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block' }}>
            显示 {filteredRecords.length} 条记录 · 每 5 秒自动刷新
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
