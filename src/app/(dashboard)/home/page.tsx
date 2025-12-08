'use client'

import { useState, useEffect, useRef } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import MuiTimeline from '@mui/lab/Timeline'
import type { TimelineProps } from '@mui/lab/Timeline'
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'
import { useSiteConfig } from '@/contexts/siteConfigContext'
import MembershipGuard from '@/components/MembershipGuard'
import { 
  getServerInfo, 
  getLibraries, 
  getMediaStats, 
  getUserCount,
  getLibraryImageUrl,
  type EmbyServerInfo,
  type EmbyLibrary,
  type EmbyStats
} from '@/services/embyService'

// Styled Timeline
const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': { display: 'none' }
  }
})

// 媒体库类型配置
const libraryTypeConfig: Record<string, { icon: string; color: 'primary' | 'success' | 'warning' | 'info' | 'error' }> = {
  movies: { icon: 'ri-film-line', color: 'primary' },
  tvshows: { icon: 'ri-tv-line', color: 'success' },
  music: { icon: 'ri-music-line', color: 'warning' },
  default: { icon: 'ri-folder-video-line', color: 'info' }
}

// 播放会话接口
interface PlaySession {
  Id: string
  UserName: string
  Client: string
  DeviceName: string
  NowPlayingItem?: {
    Name: string
    SeriesName?: string
    Type: string
    ImageTags?: { Primary?: string }
    ParentThumbItemId?: string
    SeriesThumbImageTag?: string
  }
  PlayState?: {
    PositionTicks?: number
    IsPaused?: boolean
  }
}

// 最近入库项目接口
interface RecentItem {
  Id: string
  Name: string
  Type: string
  SeriesName?: string
  ProductionYear?: number
  DateCreated: string
  ImageTags?: { Primary?: string }
}

// 今日统计接口
interface TodayStats {
  playCount: number
  uniqueUsers: number
  totalDuration: number
  topContent: string
}

// 最新入库轮播组件 - 无缝滚动
function RecentItemsCarousel({ items, getItemImageUrl }: { items: RecentItem[], getItemImageUrl: (item: RecentItem) => string }) {
  const [isPaused, setIsPaused] = useState(false)

  // 复制一份数据实现无缝循环
  const displayItems = items.length > 0 ? [...items, ...items] : []

  return (
    <Card>
      <CardHeader 
        title="🆕 最新入库"
        action={
          <Button size="small" href="/streaming">全部</Button>
        }
      />
      <CardContent sx={{ pt: 0, pb: '16px !important', overflow: 'hidden' }}>
        {items.length === 0 ? (
          <Box className="flex flex-col items-center py-6 text-center">
            <CustomAvatar skin='light' color='secondary' size={48} className="mb-2">
              <i className="ri-movie-line text-xl" />
            </CustomAvatar>
            <Typography color="text.secondary" variant="body2">暂无最新入库</Typography>
          </Box>
        ) : (
          <Box 
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            sx={{ 
              display: 'flex', 
              gap: 2,
              width: 'fit-content',
              animation: `scroll ${items.length * 3}s linear infinite`,
              animationPlayState: isPaused ? 'paused' : 'running',
              '@keyframes scroll': {
                '0%': { transform: 'translateX(0)' },
                '100%': { transform: `translateX(-${(120 + 16) * items.length}px)` }
              }
            }}
          >
            {displayItems.map((item, index) => (
              <Box 
                key={`${item.Id}-${index}`}
                sx={{ 
                  flexShrink: 0,
                  width: 120,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { 
                    transform: 'translateY(-4px)',
                    '& .item-info': { opacity: 1 }
                  }
                }}
              >
                <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
                  <Box
                    component="img"
                    src={getItemImageUrl(item)}
                    alt={item.Name}
                    sx={{ 
                      width: 120, 
                      height: 180,
                      objectFit: 'cover',
                      bgcolor: 'action.hover',
                      display: 'block'
                    }}
                    onError={(e: any) => {
                      e.target.onerror = null
                      e.target.src = ''
                      e.target.style.display = 'none'
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                  <Box 
                    sx={{ 
                      display: 'none',
                      width: 120, 
                      height: 180,
                      bgcolor: 'action.hover',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'absolute',
                      top: 0,
                      left: 0
                    }}
                  >
                    <i className={item.Type === 'Movie' ? 'ri-film-line text-3xl' : 'ri-tv-line text-3xl'} style={{ opacity: 0.4 }} />
                  </Box>
                  {/* 底部渐变信息 */}
                  <Box 
                    className="item-info"
                    sx={{ 
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                      p: 1,
                      pt: 3,
                      opacity: 0,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 500, display: 'block' }} noWrap>
                      {item.SeriesName || item.Name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>
                      {item.ProductionYear || ''}
                    </Typography>
                  </Box>
                  {/* 类型角标 */}
                  <Chip 
                    label={item.Type === 'Movie' ? '电影' : '剧集'}
                    size="small"
                    color={item.Type === 'Movie' ? 'primary' : 'success'}
                    sx={{ 
                      position: 'absolute', 
                      top: 6, 
                      left: 6,
                      fontSize: '0.65rem',
                      height: 18,
                      '& .MuiChip-label': { px: 0.8 }
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// 首页模块配置接口
interface HomeModulesConfig {
  welcome: boolean
  libraryOverview: boolean
  libraryList: boolean
  systemStatus: boolean
  livePlayback: boolean
  todayStats: boolean
  recentItems: boolean
  quickActions: boolean
}

const defaultHomeModules: HomeModulesConfig = {
  welcome: true,
  libraryOverview: true,
  libraryList: true,
  systemStatus: true,
  livePlayback: true,
  todayStats: true,
  recentItems: true,
  quickActions: true
}

export default function HomePage() {
  const [serverInfo, setServerInfo] = useState<EmbyServerInfo | null>(null)
  const [libraries, setLibraries] = useState<EmbyLibrary[]>([])
  const [stats, setStats] = useState<EmbyStats | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userLoading, setUserLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // 新增状态
  const [liveSessions, setLiveSessions] = useState<PlaySession[]>([])
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  
  // 首页模块配置
  const [homeModules, setHomeModules] = useState<HomeModulesConfig>(defaultHomeModules)
  
  // 网站配置
  const { config: siteConfig } = useSiteConfig()

  useEffect(() => {
    loadData()
    loadCurrentUser()
    loadHomeModules()
  }, [])

  const loadHomeModules = async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        if (data.homeModules) {
          setHomeModules({ ...defaultHomeModules, ...data.homeModules })
        }
      }
    } catch (e) {
      console.error('Load home modules config failed:', e)
    }
  }

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
      }
    } catch (e) {
      console.error('Load user failed:', e)
    } finally {
      setUserLoading(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [serverData, librariesData, statsData, usersCount] = await Promise.all([
        getServerInfo(),
        getLibraries(),
        getMediaStats(),
        getUserCount()
      ])

      if (!serverData) {
        setError('无法连接到 Emby 服务器，请先在设置中配置')
      } else {
        setServerInfo(serverData)
        setLibraries(librariesData)
        setStats(statsData)
        setUserCount(usersCount)
        
        // 加载额外数据
        loadLiveSessions()
        loadRecentItems()
        loadTodayStats()
      }
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载正在播放的会话
  const loadLiveSessions = async () => {
    try {
      const res = await fetch('/api/emby/Sessions?ActiveWithinSeconds=960')
      if (res.ok) {
        const sessions = await res.json()
        // 过滤出正在播放的会话
        const playing = sessions.filter((s: PlaySession) => s.NowPlayingItem)
        setLiveSessions(playing.slice(0, 5))
      }
    } catch (e) {
      console.error('Load sessions failed:', e)
    }
  }

  // 加载最近入库
  const loadRecentItems = async () => {
    try {
      // 先获取一个用户ID
      const usersRes = await fetch('/api/emby/Users')
      if (!usersRes.ok) return
      const users = await usersRes.json()
      const userId = users[0]?.Id
      if (!userId) return

      const res = await fetch(`/api/emby/Users/${userId}/Items/Latest?Limit=12&Fields=DateCreated,ProductionYear,Overview&IncludeItemTypes=Movie,Series`)
      if (res.ok) {
        const items = await res.json()
        setRecentItems(items || [])
      }
    } catch (e) {
      console.error('Load recent items failed:', e)
    }
  }

  // 加载今日统计 - 使用 PlaybackReporting 插件
  const loadTodayStats = async () => {
    try {
      const res = await fetch('/api/play-ranking?period=today')
      if (res.ok) {
        const data = await res.json()
        const mediaRank = data.mediaRank || []
        const userRank = data.userRank || []
        
        // 计算总播放次数和时长
        const playCount = mediaRank.reduce((sum: number, m: any) => sum + (m.playCount || 0), 0)
        const uniqueUsers = userRank.length
        const totalDuration = userRank.reduce((sum: number, u: any) => sum + (u.totalDuration || 0), 0)
        const topContent = mediaRank[0]?.name || '暂无'
        
        setTodayStats({
          playCount,
          uniqueUsers,
          totalDuration,
          topContent
        })
      }
    } catch (e) {
      console.error('Load today stats failed:', e)
    }
  }

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}小时${mins}分钟`
    return `${mins}分钟`
  }

  // 获取图片URL
  const getItemImageUrl = (item: RecentItem | PlaySession['NowPlayingItem']) => {
    if (!item) return ''
    const itemAny = item as any
    if (itemAny.ImageTags?.Primary) {
      return `/api/emby/Items/${itemAny.Id}/Images/Primary?maxHeight=200&quality=90`
    }
    if (itemAny.ParentThumbItemId) {
      return `/api/emby/Items/${itemAny.ParentThumbItemId}/Images/Thumb?maxHeight=200&quality=90`
    }
    return ''
  }

  // 加载状态（等待数据和用户信息都加载完成）
  if (loading || userLoading) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 4 }}><Skeleton variant="rounded" height={180} /></Grid>
        <Grid size={{ xs: 12, md: 8 }}><Skeleton variant="rounded" height={180} /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><Skeleton variant="rounded" height={120} /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><Skeleton variant="rounded" height={120} /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><Skeleton variant="rounded" height={120} /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><Skeleton variant="rounded" height={120} /></Grid>
      </Grid>
    )
  }

  // 错误/未配置状态
  if (error) {
    const isAdmin = currentUser?.role === 'admin'
    return (
      <Card>
        <CardContent className='flex flex-col gap-4 items-center text-center pbs-10 pbe-10'>
          <CustomAvatar skin='light' color='warning' size={80}>
            <i className={isAdmin ? 'ri-server-line text-4xl' : 'ri-vip-crown-line text-4xl'} />
          </CustomAvatar>
          <div>
            <Typography variant='h5' className='mbe-2'>欢迎使用 {siteConfig.name}</Typography>
            <Typography color='text.secondary'>
              {isAdmin 
                ? '请先配置 Emby 服务器以查看媒体库状态' 
                : '管理员尚未配置服务器，请稍后再试'}
            </Typography>
          </div>
          {isAdmin && (
            <Button variant='contained' href='/settings'>
              前往设置
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // 用户状态判断
  const isAdmin = currentUser?.role === 'admin'
  const hasEmby = !!currentUser?.embyUserId
  const isWhitelist = currentUser?.isWhitelist
  const isMemberValid = isWhitelist || 
    (currentUser?.membershipExpiry && new Date(currentUser.membershipExpiry) > new Date())
  // 管理员永不过期
  const isExpired = !isAdmin && hasEmby && !isMemberValid
  
  // 普通用户且没有 Emby 账号 - 提示激活/绑定
  if (!isAdmin && !hasEmby) {
    return (
      <Card>
        <CardContent className='flex flex-col gap-4 items-center text-center pbs-10 pbe-10'>
          <CustomAvatar skin='light' color='primary' size={80}>
            <i className='ri-vip-crown-2-line text-4xl' />
          </CustomAvatar>
          <div>
            <Typography variant='h5' className='mbe-2'>
              欢迎使用 {siteConfig.name}
            </Typography>
            <Typography color='text.secondary' className='mbe-2'>
              您尚未激活会员，请先使用卡密激活或绑定已有 Emby 账号
            </Typography>
          </div>
          <Button variant='contained' href='/account'>
            前往激活
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 判断模块是否可见（管理员始终可见，普通用户根据配置）
  const isModuleVisible = (moduleName: keyof HomeModulesConfig) => {
    if (isAdmin) return true
    return homeModules[moduleName] ?? true
  }

  return (
    <Grid container spacing={6}>
      {/* 会员过期提醒 - 有 Emby 但会员过期 */}
      {isExpired && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.main' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CustomAvatar skin='light' color='error' size={40}>
                  <i className='ri-error-warning-line text-xl' />
                </CustomAvatar>
                <Box>
                  <Typography fontWeight={600} color='error.main'>会员已过期</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    您的 Emby 账号已被暂停，续费后即可恢复使用
                    {currentUser?.membershipExpiry && (
                      <> · 到期时间：{new Date(currentUser.membershipExpiry).toLocaleDateString('zh-CN')}</>
                    )}
                  </Typography>
                </Box>
              </Box>
              <Button 
                variant='contained' 
                color='error'
                size='small'
                href='/account'
                startIcon={<i className='ri-vip-crown-line' />}
              >
                立即续费
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* 欢迎卡片 - 仿 Award 组件风格 */}
      {isModuleVisible('welcome') && (
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent className='flex flex-col gap-2 relative items-start'>
            <div>
              <Typography variant='h5'>
                {currentUser ? `欢迎回来，${currentUser.username}！🎉` : `欢迎使用 ${siteConfig.name}`}
              </Typography>
              <Typography color='text.secondary'>今天想看点什么？</Typography>
            </div>
            <div className='mbs-4'>
              <Typography variant='h4' color='primary.main'>
                🍿 {currentUser?.popcorn || 0}
              </Typography>
              <Typography color='text.secondary'>爆米花余额</Typography>
            </div>
            <Button size='small' variant='contained' href='/streaming'>
              浏览媒体库
            </Button>
            <img
              src='/images/illustrations/characters/5.png'
              alt='character'
              height={120}
              className='absolute inline-end-5 bottom-0'
              style={{ opacity: 0.9 }}
            />
          </CardContent>
        </Card>
      </Grid>
      )}

      {/* 统计概览 - 仿 Transactions 组件风格 */}
      {isModuleVisible('libraryOverview') && (
      <Grid size={{ xs: 12, md: isModuleVisible('welcome') ? 8 : 12 }}>
        <Card>
          <CardHeader
            title='媒体库概览'
            action={<OptionMenu iconClassName='text-textPrimary' options={['刷新', '查看详情']} />}
            subheader={
              <>
                <span className='font-medium text-textPrimary'>{serverInfo?.ServerName}</span>{' '}
                <span className='text-textSecondary'>运行正常</span>
              </>
            }
          />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <div className='flex items-center gap-3'>
                  <CustomAvatar variant='rounded' color='primary' className='shadow-xs'>
                    <i className='ri-film-line' />
                  </CustomAvatar>
                  <div>
                    <Typography color='text.secondary'>电影</Typography>
                    <Typography variant='h5'>{stats?.movieCount.toLocaleString()}</Typography>
                  </div>
                </div>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <div className='flex items-center gap-3'>
                  <CustomAvatar variant='rounded' color='success' className='shadow-xs'>
                    <i className='ri-tv-line' />
                  </CustomAvatar>
                  <div>
                    <Typography color='text.secondary'>剧集</Typography>
                    <Typography variant='h5'>{stats?.seriesCount.toLocaleString()}</Typography>
                  </div>
                </div>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <div className='flex items-center gap-3'>
                  <CustomAvatar variant='rounded' color='warning' className='shadow-xs'>
                    <i className='ri-play-circle-line' />
                  </CustomAvatar>
                  <div>
                    <Typography color='text.secondary'>总集数</Typography>
                    <Typography variant='h5'>{stats?.episodeCount.toLocaleString()}</Typography>
                  </div>
                </div>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <div className='flex items-center gap-3'>
                  <CustomAvatar variant='rounded' color='info' className='shadow-xs'>
                    <i className='ri-group-line' />
                  </CustomAvatar>
                  <div>
                    <Typography color='text.secondary'>用户</Typography>
                    <Typography variant='h5'>{userCount}</Typography>
                  </div>
                </div>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      )}

      {/* 媒体库列表 - 仿 TotalEarning 组件风格 */}
      {isModuleVisible('libraryList') && (
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader
            title='媒体库'
            action={<OptionMenu iconClassName='text-textPrimary' options={['管理', '刷新']} />}
          />
          <CardContent className='flex flex-col gap-5'>
            {libraries.slice(0, 5).map((library) => {
              const config = libraryTypeConfig[library.CollectionType || ''] || libraryTypeConfig.default
              return (
                <div key={library.Id} className='flex items-center gap-3'>
                  {library.ImageTags?.Primary ? (
                    <Avatar 
                      src={getLibraryImageUrl(library.Id, library.ImageTags.Primary)} 
                      variant='rounded'
                      sx={{ width: 40, height: 40 }}
                    />
                  ) : (
                    <CustomAvatar variant='rounded' skin='light' color={config.color}>
                      <i className={config.icon} />
                    </CustomAvatar>
                  )}
                  <div className='flex justify-between items-center is-full flex-wrap gap-x-4 gap-y-2'>
                    <div className='flex flex-col'>
                      <Typography className='font-medium' color='text.primary'>
                        {library.Name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {library.CollectionType === 'movies' ? '电影' 
                          : library.CollectionType === 'tvshows' ? '电视剧'
                          : library.CollectionType === 'music' ? '音乐' : '其他'}
                      </Typography>
                    </div>
                    <Chip 
                      label={library.CollectionType === 'movies' ? '电影' 
                        : library.CollectionType === 'tvshows' ? '剧集'
                        : library.CollectionType === 'music' ? '音乐' : '媒体'} 
                      size='small' 
                      variant='tonal'
                      color={config.color}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </Grid>
      )}

      {/* 系统状态 - 仿 ActivityTimeline 组件风格 */}
      {isModuleVisible('systemStatus') && (
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='系统状态' />
          <CardContent>
            <Timeline>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot color='success' />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div className='flex flex-wrap items-center justify-between gap-x-2 mbe-2.5'>
                    <Typography className='font-medium' color='text.primary'>
                      Emby 服务器在线
                    </Typography>
                    <Typography variant='caption' color='text.disabled'>
                      运行中
                    </Typography>
                  </div>
                  <Typography variant='body2' color='text.secondary'>
                    {serverInfo?.ServerName} · 版本 {serverInfo?.Version}
                  </Typography>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot color='primary' />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div className='flex flex-wrap items-center justify-between gap-x-2 mbe-2.5'>
                    <Typography className='font-medium' color='text.primary'>
                      媒体库已同步
                    </Typography>
                    <Typography variant='caption' color='text.disabled'>
                      {libraries.length} 个
                    </Typography>
                  </div>
                  <Typography variant='body2' color='text.secondary'>
                    共 {((stats?.movieCount || 0) + (stats?.seriesCount || 0)).toLocaleString()} 个影视资源
                  </Typography>
                </TimelineContent>
              </TimelineItem>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot color='info' />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <div className='flex flex-wrap items-center justify-between gap-x-2 mbe-2.5'>
                    <Typography className='font-medium' color='text.primary'>
                      操作系统
                    </Typography>
                  </div>
                  <Typography variant='body2' color='text.secondary'>
                    {serverInfo?.OperatingSystem}
                  </Typography>
                </TimelineContent>
              </TimelineItem>
              {currentUser && (
                <TimelineItem>
                  <TimelineSeparator>
                    <TimelineDot color='warning' />
                  </TimelineSeparator>
                  <TimelineContent>
                    <div className='flex flex-wrap items-center justify-between gap-x-2 mbe-2.5'>
                      <Typography className='font-medium' color='text.primary'>
                        连续签到
                      </Typography>
                      <Typography variant='caption' color='text.disabled'>
                        {currentUser.signInStreak || 0} 天
                      </Typography>
                    </div>
                    <Typography variant='body2' color='text.secondary'>
                      每日签到获取爆米花奖励
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
              )}
            </Timeline>
          </CardContent>
        </Card>
      </Grid>
      )}

      {/* 🔥 正在热播 */}
      {isModuleVisible('livePlayback') && (
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader 
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>🔥 正在热播</span>
                {liveSessions.length > 0 && (
                  <Chip label={`${liveSessions.length} 人在看`} size="small" color="error" />
                )}
              </Box>
            }
            action={
              <Button size="small" href="/play-monitor">
                查看全部
              </Button>
            }
          />
          <CardContent>
            {liveSessions.length === 0 ? (
              <Box className="flex flex-col items-center py-6 text-center">
                <CustomAvatar skin='light' color='secondary' size={56} className="mb-3">
                  <i className="ri-film-line text-2xl" />
                </CustomAvatar>
                <Typography color="text.secondary">暂无在线播放</Typography>
                <Typography variant="caption" color="text.disabled">当有用户观看时会在这里显示</Typography>
              </Box>
            ) : (
              <Box className="flex flex-col gap-3">
                {liveSessions.map(session => (
                  <Box key={session.Id} className="flex items-center gap-3 p-2 rounded-lg" sx={{ bgcolor: 'action.hover' }}>
                    <Avatar 
                      src={getItemImageUrl(session.NowPlayingItem)} 
                      variant="rounded"
                      sx={{ width: 50, height: 70, bgcolor: 'primary.main' }}
                    >
                      <i className="ri-film-line" />
                    </Avatar>
                    <Box className="flex-1 min-w-0">
                      <Typography className="font-medium truncate" color="text.primary">
                        {session.NowPlayingItem?.SeriesName || session.NowPlayingItem?.Name}
                      </Typography>
                      {session.NowPlayingItem?.SeriesName && (
                        <Typography variant="body2" color="text.secondary" className="truncate">
                          {session.NowPlayingItem.Name}
                        </Typography>
                      )}
                      <Box className="flex items-center gap-2 mt-1">
                        <Chip 
                          label={session.UserName} 
                          size="small" 
                          variant="outlined"
                          icon={<i className="ri-user-line text-sm" />}
                        />
                        {session.PlayState?.IsPaused ? (
                          <Chip label="已暂停" size="small" color="warning" variant="tonal" />
                        ) : (
                          <Chip label="播放中" size="small" color="success" variant="tonal" />
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      )}

      {/* 📊 今日播放统计 */}
      {isModuleVisible('todayStats') && (
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader 
            title="📊 今日播放统计"
            action={
              <Button size="small" href="/play-ranking">
                详细排行
              </Button>
            }
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 6 }}>
                <Box className="text-center p-3 rounded-lg" sx={{ bgcolor: 'primary.lighter' }}>
                  <Typography variant="h4" color="primary.main">
                    {todayStats?.playCount || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">播放次数</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box className="text-center p-3 rounded-lg" sx={{ bgcolor: 'success.lighter' }}>
                  <Typography variant="h4" color="success.main">
                    {todayStats?.uniqueUsers || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">活跃用户</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box className="text-center p-3 rounded-lg" sx={{ bgcolor: 'warning.lighter' }}>
                  <Typography variant="h4" color="warning.main">
                    {todayStats ? formatDuration(todayStats.totalDuration) : '0分钟'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">累计时长</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box className="text-center p-3 rounded-lg" sx={{ bgcolor: 'info.lighter' }}>
                  <Tooltip title={todayStats?.topContent || '暂无'}>
                    <Typography variant="h6" color="info.main" className="truncate">
                      {todayStats?.topContent || '暂无'}
                    </Typography>
                  </Tooltip>
                  <Typography variant="body2" color="text.secondary">最热内容</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      )}

      {/* 🆕 最新入库 - 自动轮播 */}
      {isModuleVisible('recentItems') && (
      <Grid size={{ xs: 12 }}>
        <RecentItemsCarousel items={recentItems} getItemImageUrl={getItemImageUrl} />
      </Grid>
      )}

      {/* 快捷操作 */}
      {isModuleVisible('quickActions') && (
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='快捷操作' />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box 
                  component='a'
                  href='/streaming'
                  className='flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer transition-all'
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  <CustomAvatar variant='rounded' skin='light' color='primary' size={48}>
                    <i className='ri-search-line text-2xl' />
                  </CustomAvatar>
                  <Typography variant='body2' className='font-medium'>搜索媒体</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box 
                  component='a'
                  href='/trending'
                  className='flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer transition-all'
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  <CustomAvatar variant='rounded' skin='light' color='error' size={48}>
                    <i className='ri-fire-line text-2xl' />
                  </CustomAvatar>
                  <Typography variant='body2' className='font-medium'>热门推荐</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box 
                  component='a'
                  href='/request'
                  className='flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer transition-all'
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  <CustomAvatar variant='rounded' skin='light' color='success' size={48}>
                    <i className='ri-add-circle-line text-2xl' />
                  </CustomAvatar>
                  <Typography variant='body2' className='font-medium'>我要求片</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box 
                  component='a'
                  href='/account'
                  className='flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer transition-all'
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  <CustomAvatar variant='rounded' skin='light' color='warning' size={48}>
                    <i className='ri-user-line text-2xl' />
                  </CustomAvatar>
                  <Typography variant='body2' className='font-medium'>我的账户</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      )}
    </Grid>
  )
}
