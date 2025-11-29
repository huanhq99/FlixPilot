'use client'

import { useState, useEffect, useCallback } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import LinearProgress from '@mui/material/LinearProgress'

interface PlaySession {
  Id: string
  UserName: string
  UserId: string
  Client: string
  DeviceName: string
  DeviceId: string
  ApplicationVersion?: string
  NowPlayingItem?: {
    Id: string
    Name: string
    SeriesName?: string
    Type: string
    IndexNumber?: number
    ParentIndexNumber?: number
    RunTimeTicks?: number
    ImageTags?: { Primary?: string; Backdrop?: string }
    ParentBackdropItemId?: string
    ParentBackdropImageTags?: string[]
    SeriesId?: string
  }
  PlayState?: {
    PositionTicks?: number
    IsPaused?: boolean
    PlayMethod?: string
  }
  RemoteEndPoint?: string
  LastActivityDate?: string
}

interface SessionWithRegion extends PlaySession {
  region?: string
}

// 客户端图标映射
const clientIcons: Record<string, { icon: string; color: string }> = {
  'emby web': { icon: 'ri-global-line', color: '#8b5cf6' },
  'emby android': { icon: 'ri-android-fill', color: '#10b981' },
  'emby android tv': { icon: 'ri-tv-2-fill', color: '#06b6d4' },
  'emby ios': { icon: 'ri-apple-fill', color: '#6b7280' },
  'emby theater': { icon: 'ri-computer-fill', color: '#f59e0b' },
  'infuse': { icon: 'ri-apple-fill', color: '#f97316' },
  'jellyfin': { icon: 'ri-play-circle-fill', color: '#a855f7' },
  'vlc': { icon: 'ri-play-large-fill', color: '#f97316' },
  'kodi': { icon: 'ri-movie-2-fill', color: '#06b6d4' },
  'default': { icon: 'ri-device-fill', color: '#6b7280' }
}

function getClientInfo(client: string): { icon: string; color: string } {
  const lowerClient = client.toLowerCase()
  for (const [key, info] of Object.entries(clientIcons)) {
    if (lowerClient.includes(key)) {
      return info
    }
  }
  return clientIcons.default
}

export default function LiveMonitorPage() {
  const [sessions, setSessions] = useState<SessionWithRegion[]>([])
  const [loading, setLoading] = useState(true)
  const [embyUrl, setEmbyUrl] = useState('')

  // 加载 IP 地区
  const loadRegion = async (ip: string): Promise<string> => {
    try {
      const res = await fetch(`/api/ip-location?ip=${ip}`)
      if (res.ok) {
        const data = await res.json()
        return data.region || '未知'
      }
    } catch (e) {}
    return '未知'
  }

  // 加载配置获取 Emby URL
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setEmbyUrl(data.embyUrl || ''))
      .catch(() => {})
  }, [])

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/emby/Sessions')
      if (res.ok) {
        const data: PlaySession[] = await res.json()
        const playingSessions = data.filter(s => s.NowPlayingItem)
        
        // 并行加载所有地区信息
        const sessionsWithRegion = await Promise.all(
          playingSessions.map(async (session) => {
            const ip = session.RemoteEndPoint || ''
            const region = ip ? await loadRegion(ip) : '未知'
            return { ...session, region }
          })
        )
        
        setSessions(sessionsWithRegion)
        
        // 保存到历史记录
        for (const session of sessionsWithRegion) {
          if (session.NowPlayingItem) {
            const item = session.NowPlayingItem
            const now = new Date()
            
            let seasonEpisode = ''
            if (item.Type === 'Episode' && item.ParentIndexNumber && item.IndexNumber) {
              seasonEpisode = `S${item.ParentIndexNumber}E${item.IndexNumber}`
            }
            
            const record = {
              id: `${session.Id}-${Date.now()}`,
              time: `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
              timestamp: Date.now(),
              userName: session.UserName,
              userId: session.UserId,
              ip: session.RemoteEndPoint || '未知',
              region: session.region,
              client: session.Client,
              device: session.DeviceName,
              deviceId: session.DeviceId,
              content: item.Name,
              contentId: item.Id,
              contentType: item.Type,
              seriesName: item.SeriesName,
              seasonEpisode
            }
            
            fetch('/api/play-history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(record)
            }).catch(() => {})
          }
        }
      }
    } catch (e) {
      console.error('Load sessions failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
    const interval = setInterval(loadSessions, 10000)
    return () => clearInterval(interval)
  }, [loadSessions])

  // 获取图片 URL
  const getImageUrl = (session: PlaySession, type: 'poster' | 'backdrop'): string => {
    const item = session.NowPlayingItem
    if (!item || !embyUrl) return ''
    
    if (type === 'backdrop') {
      if (item.ParentBackdropItemId && item.ParentBackdropImageTags?.length) {
        return `${embyUrl}/Items/${item.ParentBackdropItemId}/Images/Backdrop/0?maxWidth=600`
      }
      if (item.ImageTags?.Backdrop) {
        return `${embyUrl}/Items/${item.Id}/Images/Backdrop/0?maxWidth=600`
      }
      // 剧集用剧的backdrop
      if (item.SeriesId) {
        return `${embyUrl}/Items/${item.SeriesId}/Images/Backdrop/0?maxWidth=600`
      }
    }
    
    if (item.ImageTags?.Primary) {
      return `${embyUrl}/Items/${item.Id}/Images/Primary?maxWidth=100`
    }
    if (item.SeriesId) {
      return `${embyUrl}/Items/${item.SeriesId}/Images/Primary?maxWidth=100`
    }
    
    return ''
  }

  // 计算进度
  const getProgress = (session: PlaySession): number => {
    const position = session.PlayState?.PositionTicks || 0
    const runtime = session.NowPlayingItem?.RunTimeTicks || 1
    return Math.min((position / runtime) * 100, 100)
  }

  // 格式化时间
  const formatTime = (ticks: number): string => {
    const seconds = Math.floor(ticks / 10000000)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  const getRandomColor = (name: string) => {
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
    return colors[name.charCodeAt(0) % colors.length]
  }

  return (
    <Box>
      {/* 页面标题区 */}
      <Box sx={{ 
        mb: 4, 
        p: 3, 
        borderRadius: 3,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              width: 40, height: 40, borderRadius: 2,
              bgcolor: 'rgba(16, 185, 129, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <i className='ri-live-line text-2xl' style={{ color: '#10b981' }} />
            </Box>
            <Box>
              <Typography variant='h5' fontWeight={700} sx={{ color: 'white' }}>
                实时播放监控
              </Typography>
              <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.6)' }}>
                当前有 <strong style={{ color: '#10b981' }}>{sessions.length}</strong> 个活跃会话 · 每10秒自动刷新
              </Typography>
            </Box>
          </Box>
          <Button
            variant='outlined' size='small'
            startIcon={<i className='ri-refresh-line' />}
            onClick={loadSessions}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            刷新
          </Button>
        </Box>
      </Box>

      {/* 播放卡片网格 */}
      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 3 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant='rounded' height={200} />
          ))}
        </Box>
      ) : sessions.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', py: 10,
          bgcolor: 'rgba(30, 27, 75, 0.5)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <i className='ri-movie-line text-6xl' style={{ color: 'var(--mui-palette-text-disabled)' }} />
          <Typography color='text.secondary' sx={{ mt: 2 }}>当前没有正在播放的内容</Typography>
          <Typography variant='caption' color='text.disabled'>
            用户开始播放时会自动显示在这里
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 3 }}>
          {sessions.map(session => {
            const item = session.NowPlayingItem!
            const clientInfo = getClientInfo(session.Client)
            const backdropUrl = getImageUrl(session, 'backdrop')
            const posterUrl = getImageUrl(session, 'poster')
            const progress = getProgress(session)
            const isPaused = session.PlayState?.IsPaused
            
            let seasonEpisode = ''
            if (item.Type === 'Episode' && item.ParentIndexNumber && item.IndexNumber) {
              seasonEpisode = `S${item.ParentIndexNumber}E${item.IndexNumber}`
            }
            
            return (
              <Box
                key={session.Id}
                sx={{
                  position: 'relative',
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  bgcolor: 'rgba(30, 27, 75, 0.8)'
                }}
              >
                {/* 背景图 */}
                {backdropUrl && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '100%',
                      backgroundImage: `url(${backdropUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.3,
                      filter: 'blur(2px)',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(to bottom, transparent, rgba(30, 27, 75, 0.95))'
                      }
                    }}
                  />
                )}

                {/* 内容 */}
                <Box sx={{ position: 'relative', p: 2.5 }}>
                  {/* 顶部：用户信息 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: getRandomColor(session.UserName) }}>
                        {session.UserName.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant='body1' fontWeight={600}>{session.UserName}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                            {session.RemoteEndPoint}
                          </Typography>
                          {session.region && (
                            <Chip 
                              label={session.region} 
                              size='small'
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                    
                    {/* 状态指示 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isPaused ? (
                        <Chip icon={<i className='ri-pause-fill' />} label='暂停' size='small' color='warning' />
                      ) : (
                        <Chip icon={<i className='ri-play-fill' />} label='播放中' size='small' color='success' />
                      )}
                    </Box>
                  </Box>

                  {/* 中部：播放内容 */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    {posterUrl && (
                      <img 
                        src={posterUrl} 
                        alt='' 
                        style={{ width: 60, height: 90, borderRadius: 6, objectFit: 'cover' }}
                      />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant='body2' color='text.secondary' noWrap>
                        {item.SeriesName || (item.Type === 'Movie' ? '电影' : '')}
                      </Typography>
                      <Typography variant='h6' fontWeight={600} noWrap>
                        {item.SeriesName ? `${seasonEpisode} ${item.Name}` : item.Name}
                      </Typography>
                      <Chip 
                        label={item.Type === 'Episode' ? '剧集' : item.Type === 'Movie' ? '电影' : item.Type}
                        size='small'
                        color={item.Type === 'Episode' ? 'info' : 'warning'}
                        sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }}
                      />
                    </Box>
                  </Box>

                  {/* 进度条 */}
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress 
                      variant='determinate' 
                      value={progress}
                      sx={{ 
                        height: 6, 
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: isPaused ? 'warning.main' : 'success.main'
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant='caption' color='text.secondary'>
                        {formatTime(session.PlayState?.PositionTicks || 0)}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {formatTime(item.RunTimeTicks || 0)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* 底部：客户端信息 */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    pt: 2,
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Tooltip title={session.Client}>
                        <Box sx={{ 
                          width: 32, height: 32, borderRadius: 2,
                          bgcolor: `${clientInfo.color}20`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <i className={`${clientInfo.icon} text-lg`} style={{ color: clientInfo.color }} />
                        </Box>
                      </Tooltip>
                      <Box>
                        <Typography variant='body2' fontWeight={500}>{session.Client}</Typography>
                        <Typography variant='caption' color='text.secondary'>{session.DeviceName}</Typography>
                      </Box>
                    </Box>
                    <Typography variant='caption' color='text.disabled'>
                      {session.PlayState?.PlayMethod || 'DirectPlay'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
