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
import Pagination from '@mui/material/Pagination'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'

interface PlayHistoryRecord {
  id: string
  time: string
  timestamp: number
  userName: string
  userId: string
  ip: string
  region?: string
  client: string
  device: string
  deviceId: string
  content: string
  contentId: string
  contentType: string
  seriesName?: string
  seasonEpisode?: string
  poster?: string
  backdrop?: string
}

interface Stats {
  totalRecords: number
  uniqueUsers: number
  todayRecords: number
  sharedAccounts: Record<string, string[]>
}

// 客户端图标映射
const clientIcons: Record<string, string> = {
  'Emby Web': 'ri-global-line',
  'Emby for Android': 'ri-android-fill',
  'Emby for Android TV': 'ri-tv-2-fill',
  'Emby for iOS': 'ri-apple-fill',
  'Emby Theater': 'ri-computer-fill',
  'Infuse': 'ri-apple-fill',
  'Jellyfin Web': 'ri-global-line',
  'Jellyfin Android': 'ri-android-fill',
  'VLC': 'ri-play-circle-fill',
  'Kodi': 'ri-movie-2-fill',
  'default': 'ri-device-fill'
}

function getClientIcon(client: string): string {
  for (const [key, icon] of Object.entries(clientIcons)) {
    if (client.toLowerCase().includes(key.toLowerCase())) {
      return icon
    }
  }
  return clientIcons.default
}

export default function PlayHistoryPage() {
  const [records, setRecords] = useState<PlayHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({ totalRecords: 0, uniqueUsers: 0, todayRecords: 0, sharedAccounts: {} })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [userFilter, setUserFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const limit = 30

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      if (userFilter) params.set('user', userFilter)
      if (dateFilter) params.set('date', dateFilter)
      
      const res = await fetch(`/api/play-history?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRecords(data.records)
        setTotal(data.total)
        setStats(data.stats)
      }
    } catch (e) {
      console.error('Load history failed:', e)
    } finally {
      setLoading(false)
    }
  }, [page, userFilter, dateFilter])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const exportCSV = () => {
    const headers = ['时间', '用户', 'IP地址', '地区', '客户端', '设备', '播放内容', '类型']
    const rows = records.map(r => [
      r.time, r.userName, r.ip, r.region || '-', r.client, r.device,
      r.seriesName ? `${r.seriesName} ${r.seasonEpisode} - ${r.content}` : r.content,
      r.contentType === 'Episode' ? '剧集' : r.contentType === 'Movie' ? '电影' : r.contentType
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `播放历史_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getRandomColor = (name: string) => {
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
    return colors[name.charCodeAt(0) % colors.length]
  }

  const sharedAccountsCount = Object.keys(stats.sharedAccounts).length

  return (
    <Box>
      {/* 页面标题区 */}
      <Box sx={{ 
        mb: 4, 
        p: 3, 
        borderRadius: 3,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              width: 40, height: 40, borderRadius: 2,
              bgcolor: 'rgba(139, 92, 246, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <i className='ri-history-line text-2xl' style={{ color: '#a78bfa' }} />
            </Box>
            <Box>
              <Typography variant='h5' fontWeight={700} sx={{ color: 'white' }}>
                播放历史记录
              </Typography>
              <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.6)' }}>
                查看所有用户的历史播放记录和行为分析
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined' size='small'
              startIcon={<i className='ri-refresh-line' />}
              onClick={loadRecords}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              刷新
            </Button>
            <Button
              variant='contained' size='small'
              startIcon={<i className='ri-download-line' />}
              onClick={exportCSV}
              color='success'
            >
              导出
            </Button>
          </Box>
        </Box>

        {/* 统计卡片 */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          {[
            { icon: 'ri-database-2-line', color: '#a78bfa', label: '总记录数', value: stats.totalRecords },
            { icon: 'ri-group-line', color: '#06b6d4', label: '独立用户', value: stats.uniqueUsers },
            { icon: 'ri-calendar-line', color: '#10b981', label: '今日记录', value: stats.todayRecords },
            { icon: 'ri-user-shared-line', color: sharedAccountsCount > 0 ? '#ef4444' : '#f59e0b', label: '疑似共享账号', value: sharedAccountsCount, isWarning: sharedAccountsCount > 0 },
          ].map((stat, i) => (
            <Box key={i} sx={{ 
              flex: 1, p: 2, borderRadius: 2, 
              bgcolor: stat.isWarning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${stat.isWarning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)'}`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <i className={`${stat.icon} text-xl`} style={{ color: stat.color }} />
                <Box>
                  <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)' }}>{stat.label}</Typography>
                  <Typography variant='h5' fontWeight={700} sx={{ color: 'white' }}>
                    {loading ? '-' : stat.value}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* 共享账号警告 */}
      {sharedAccountsCount > 0 && (
        <Alert 
          severity='warning' 
          sx={{ mb: 3 }}
          icon={<i className='ri-user-shared-fill' />}
        >
          <Typography variant='subtitle2' fontWeight={600}>检测到可能的账号共享行为</Typography>
          <Box sx={{ mt: 1 }}>
            {Object.entries(stats.sharedAccounts).map(([user, regions]) => (
              <Typography key={user} variant='body2'>
                <strong>{user}</strong>: 在 {regions.join(', ')} 等地区同时使用
              </Typography>
            ))}
          </Box>
        </Alert>
      )}

      {/* 记录表格 */}
      <Card sx={{ bgcolor: 'rgba(30, 27, 75, 0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant='h6' fontWeight={600}>历史记录明细</Typography>
          </Box>

          {/* 筛选器 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              size='small' placeholder='搜索用户名...' value={userFilter}
              onChange={e => { setUserFilter(e.target.value); setPage(1) }}
              InputProps={{ startAdornment: <InputAdornment position='start'><i className='ri-search-line' /></InputAdornment> }}
              sx={{ width: 200 }}
            />
            <TextField
              size='small' type='date' value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(1) }}
              sx={{ width: 180 }}
            />
          </Box>

          {/* 表格 */}
          {loading ? (
            <Box>{[1,2,3,4,5].map(i => <Skeleton key={i} variant='rounded' height={60} sx={{ mb: 1 }} />)}</Box>
          ) : records.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <i className='ri-inbox-line text-5xl' style={{ color: 'var(--mui-palette-text-disabled)' }} />
              <Typography color='text.secondary' sx={{ mt: 2 }}>暂无播放记录</Typography>
              <Typography variant='caption' color='text.disabled'>
                记录会在用户播放时自动添加
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, width: 150 }}>时间</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, width: 140 }}>用户</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, width: 200 }}>IP / 地区</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, width: 180 }}>客户端 / 设备</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>播放内容</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map(record => {
                    const isShared = stats.sharedAccounts[record.userName]
                    
                    return (
                      <TableRow 
                        key={record.id} 
                        sx={{ 
                          '&:hover': { bgcolor: 'action.hover' }, 
                          borderBottom: '1px solid', 
                          borderColor: 'divider',
                          bgcolor: isShared ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                        }}
                      >
                        <TableCell>
                          <Typography variant='body2' color='text.secondary'>{record.time}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: getRandomColor(record.userName) }}>
                              {record.userName.slice(0, 2).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant='body2' fontWeight={500}>{record.userName}</Typography>
                              {isShared && (
                                <Chip 
                                  label='共享' size='small' color='error' 
                                  sx={{ height: 16, fontSize: '0.6rem' }}
                                />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {record.ip}
                          </Typography>
                          {record.region && (
                            <Typography variant='caption' color='text.secondary'>
                              <i className='ri-map-pin-line' style={{ marginRight: 4, fontSize: 10 }} />
                              {record.region}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title={record.client}>
                              <i className={`${getClientIcon(record.client)} text-lg`} />
                            </Tooltip>
                            <Box>
                              <Typography variant='body2' fontWeight={500}>{record.client}</Typography>
                              <Typography variant='caption' color='text.secondary'>{record.device}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {record.poster && (
                              <img 
                                src={record.poster} 
                                alt='' 
                                style={{ width: 32, height: 48, borderRadius: 4, objectFit: 'cover' }}
                              />
                            )}
                            <Box>
                              <Typography variant='body2' sx={{ color: 'primary.main', fontWeight: 500 }}>
                                {record.seriesName ? `${record.seriesName} ${record.seasonEpisode}` : record.content}
                              </Typography>
                              {record.seriesName && (
                                <Typography variant='caption' color='text.secondary'>{record.content}</Typography>
                              )}
                              <Chip 
                                label={record.contentType === 'Episode' ? '剧集' : record.contentType === 'Movie' ? '电影' : record.contentType}
                                size='small' variant='outlined'
                                sx={{ ml: 1, height: 18, fontSize: '0.65rem', borderColor: 'divider' }}
                              />
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* 分页 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
            <Typography variant='caption' color='text.secondary'>
              共 {total} 条记录
            </Typography>
            <Pagination 
              count={Math.ceil(total / limit)} 
              page={page} 
              onChange={(_, p) => setPage(p)}
              color='primary'
              size='small'
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
