'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

interface UserDetail {
  userName: string
  playCount: number
  duration: number
  lastPlay: string
}

interface RankItem {
  rank: number
  title: string
  poster?: string
  type: 'movie' | 'tv' | string
  playCount: number
  users: number
  totalDuration: number
  userList: UserDetail[]
}

interface UserRankItem {
  rank: number
  userName: string
  avatar?: string
  playCount: number
  watchTime: number
}

export default function PlayRankingPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [mediaRank, setMediaRank] = useState<RankItem[]>([])
  const [userRank, setUserRank] = useState<UserRankItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<RankItem | null>(null)

  useEffect(() => {
    loadRanking()
  }, [period])

  const loadRanking = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/play-ranking?period=${period}`)
      if (res.ok) {
        const data = await res.json()
        console.log('Play ranking data:', data)
        setMediaRank(data.mediaRank || [])
        setUserRank(data.userRank || [])
      } else {
        const errData = await res.json().catch(() => ({}))
        setError(errData.error || '加载失败')
      }
    } catch (e) {
      console.error('Load ranking failed:', e)
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const periodLabels: Record<string, string> = {
    today: '今日',
    week: '周',
    month: '月',
    all: '总'
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'
    if (rank === 2) return '#C0C0C0'
    if (rank === 3) return '#CD7F32'
    return 'text.secondary'
  }

  const getRankIcon = (rank: number) => {
    if (rank <= 3) return <i className='ri-medal-fill' style={{ color: getRankColor(rank), fontSize: 20 }} />
    return <Typography sx={{ width: 20, textAlign: 'center', fontWeight: 600, color: 'text.secondary' }}>{rank}</Typography>
  }

  const formatTime = (minutes: number) => {
    if (!minutes || minutes < 1) return '0分钟'
    if (minutes < 60) return `${minutes}分钟`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
  }

  const maxPlayCount = mediaRank[0]?.playCount || 1

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='ri-bar-chart-box-line text-3xl' style={{ color: 'var(--mui-palette-primary-main)' }} />
          <Typography variant='h4' fontWeight={700}>播放排行</Typography>
        </Box>
        <Typography color='text.secondary' sx={{ mt: 0.5, ml: 0.5 }}>
          查看媒体播放热度和用户观看统计（真实数据来自 Emby）
        </Typography>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 时间选择 */}
      <Tabs 
        value={period} 
        onChange={(_, v) => setPeriod(v)} 
        sx={{ mb: 4 }}
      >
        <Tab value='today' label='今日榜' />
        <Tab value='week' label='周榜' />
        <Tab value='month' label='月榜' />
        <Tab value='all' label='总榜' />
      </Tabs>

      <Box sx={{ display: 'flex', gap: 4 }}>
        {/* 媒体排行 */}
        <Card sx={{ flex: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className='ri-movie-2-line' style={{ color: 'white', fontSize: 18 }} />
              </Box>
              <Typography variant='h6' fontWeight={600}>
                {periodLabels[period]}热播榜
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} variant='rounded' height={60} />
                ))}
              </Box>
            ) : mediaRank.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <i className='ri-bar-chart-2-line text-5xl' style={{ opacity: 0.3 }} />
                <Typography color='text.secondary' sx={{ mt: 2 }}>
                  {periodLabels[period]}暂无播放数据
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  用户播放媒体后会自动统计
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {mediaRank.map(item => (
                  <Box
                    key={item.rank}
                    onClick={() => setSelectedMedia(item)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: item.rank <= 3 ? 'action.hover' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    {/* 排名 */}
                    <Box sx={{ width: 32, display: 'flex', justifyContent: 'center' }}>
                      {getRankIcon(item.rank)}
                    </Box>
                    
                    {/* 海报 */}
                    <Box
                      sx={{
                        width: 45,
                        height: 65,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}
                    >
                      {item.poster ? (
                        <img 
                          src={item.poster} 
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <i className='ri-film-line text-textSecondary' />
                      )}
                    </Box>
                    
                    {/* 信息 */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant='body2' fontWeight={600} noWrap>
                          {item.title}
                        </Typography>
                        <Chip 
                          label={item.type === 'movie' ? '电影' : '剧集'} 
                          size='small'
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Box>
                      <LinearProgress 
                        variant='determinate' 
                        value={(item.playCount / maxPlayCount) * 100}
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : item.rank === 3 ? '#CD7F32' : 'primary.main'
                          }
                        }}
                      />
                      <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
                        {item.playCount} 次播放 · {item.users} 位用户 · {formatTime(item.totalDuration)}
                      </Typography>
                    </Box>

                    {/* 查看详情箭头 */}
                    <i className='ri-arrow-right-s-line text-xl' style={{ opacity: 0.5 }} />
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* 用户排行 */}
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className='ri-user-star-line' style={{ color: 'white', fontSize: 18 }} />
              </Box>
              <Typography variant='h6' fontWeight={600}>
                活跃用户
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} variant='rounded' height={50} />
                ))}
              </Box>
            ) : userRank.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <i className='ri-user-line text-4xl' style={{ opacity: 0.3 }} />
                <Typography color='text.secondary' sx={{ mt: 1 }}>
                  暂无用户数据
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {userRank.map(user => (
                  <Box
                    key={user.rank}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    {/* 排名 */}
                    <Box sx={{ width: 24 }}>
                      {getRankIcon(user.rank)}
                    </Box>
                    
                    {/* 头像 */}
                    <Avatar 
                      src={user.avatar || undefined}
                      sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}
                    >
                      {user.userName?.charAt(0) || '?'}
                    </Avatar>
                    
                    {/* 信息 */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant='body2' fontWeight={600} noWrap>
                        {user.userName}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {user.playCount}次 · {formatTime(user.watchTime)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* 用户详情弹窗 */}
      <Dialog 
        open={!!selectedMedia} 
        onClose={() => setSelectedMedia(null)}
        maxWidth='sm'
        fullWidth
      >
        {selectedMedia && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
              <Box
                sx={{
                  width: 50,
                  height: 70,
                  borderRadius: 1,
                  overflow: 'hidden',
                  flexShrink: 0,
                  bgcolor: 'action.hover'
                }}
              >
                {selectedMedia.poster && (
                  <img 
                    src={selectedMedia.poster} 
                    alt={selectedMedia.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant='h6' fontWeight={600}>
                  {selectedMedia.title}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {selectedMedia.playCount} 次播放 · {selectedMedia.users} 位用户
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedMedia(null)} size='small'>
                <i className='ri-close-line' />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography variant='subtitle2' sx={{ mb: 2 }}>
                观看用户列表
              </Typography>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>用户</TableCell>
                    <TableCell align='center'>播放次数</TableCell>
                    <TableCell align='center'>观看时长</TableCell>
                    <TableCell align='right'>最后观看</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedMedia.userList?.map((user, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                            {user.userName.charAt(0)}
                          </Avatar>
                          {user.userName}
                        </Box>
                      </TableCell>
                      <TableCell align='center'>{user.playCount}</TableCell>
                      <TableCell align='center'>{formatTime(user.duration)}</TableCell>
                      <TableCell align='right'>{user.lastPlay}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  )
}
