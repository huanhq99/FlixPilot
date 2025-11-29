'use client'

import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Rating from '@mui/material/Rating'
import ActorDetailModal from './ActorDetailModal'
import {
  getMediaDetail,
  getCredits,
  getSeasonEpisodes,
  getRecommendations,
  getSimilar,
  getMovieCollection,
  type MediaDetail,
  type CastMember,
  type Episode,
  type RecommendedMedia,
  type CollectionInfo
} from '@/services/tmdbDetailService'

interface MediaDetailModalProps {
  open: boolean
  onClose: () => void
  mediaId: number | null
  mediaType: 'movie' | 'tv' | null
  isInLibrary?: boolean
  libraryEpisodes?: Set<string>
}

export default function MediaDetailModal({
  open,
  onClose,
  mediaId,
  mediaType,
  isInLibrary = false,
  libraryEpisodes: propLibraryEpisodes = new Set()
}: MediaDetailModalProps) {
  const [detail, setDetail] = useState<MediaDetail | null>(null)
  const [cast, setCast] = useState<CastMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [libraryEpisodes, setLibraryEpisodes] = useState<Set<string>>(new Set())
  const [librarySeasons, setLibrarySeasons] = useState<Map<number, { total: number; inLibrary: number }>>(new Map())
  const [checkingLibrary, setCheckingLibrary] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' })
  
  // 推荐和系列
  const [recommendations, setRecommendations] = useState<RecommendedMedia[]>([])
  const [similar, setSimilar] = useState<RecommendedMedia[]>([])
  const [collection, setCollection] = useState<CollectionInfo | null>(null)
  
  // 库中的媒体列表（用于判断推荐/类似是否已入库）
  const [libraryTmdbIds, setLibraryTmdbIds] = useState<Set<string>>(new Set())
  
  // 演员详情弹窗
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null)
  const [actorModalOpen, setActorModalOpen] = useState(false)

  // 加载库中的媒体列表
  useEffect(() => {
    if (open) {
      loadLibraryItems()
    }
  }, [open])
  
  const loadLibraryItems = async () => {
    try {
      const res = await fetch('/api/library/synced')
      if (res.ok) {
        const data = await res.json()
        const ids = new Set<string>()
        // items 是字符串数组，格式如 "movie-12345" 或 "tv-12345"
        data.items?.forEach((item: string) => {
          if (typeof item === 'string') {
            ids.add(item)
          }
        })
        setLibraryTmdbIds(ids)
        console.log('Library items loaded:', ids.size, 'items')
      }
    } catch (e) {
      console.error('Load library items failed:', e)
    }
  }

  // 从 Emby 加载真实的剧集入库状态
  useEffect(() => {
    if (open && mediaId && mediaType === 'tv') {
      loadLibraryEpisodesFromEmby()
    }
  }, [open, mediaId, mediaType])

  const loadLibraryEpisodesFromEmby = async () => {
    setCheckingLibrary(true)
    try {
      const res = await fetch(`/api/library/episodes?tmdbId=${mediaId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.found && data.episodes) {
          const inLibraryEps = Object.entries(data.episodes)
            .filter(([_, inLibrary]) => inLibrary)
            .map(([key]) => key)
          setLibraryEpisodes(new Set(inLibraryEps))
          
          // 计算每季的入库情况
          const seasonMap = new Map<number, { total: number; inLibrary: number }>()
          Object.entries(data.episodes).forEach(([key, inLibrary]) => {
            const match = key.match(/S(\d+)E/)
            if (match) {
              const seasonNum = parseInt(match[1])
              const current = seasonMap.get(seasonNum) || { total: 0, inLibrary: 0 }
              current.total++
              if (inLibrary) current.inLibrary++
              seasonMap.set(seasonNum, current)
            }
          })
          setLibrarySeasons(seasonMap)
        } else {
          setLibraryEpisodes(new Set())
          setLibrarySeasons(new Map())
        }
      }
    } catch (e) {
      console.error('Load library episodes from Emby failed:', e)
      setLibraryEpisodes(new Set())
      setLibrarySeasons(new Map())
    } finally {
      setCheckingLibrary(false)
    }
  }

  useEffect(() => {
    if (open && mediaId && mediaType) {
      loadDetail()
    }
  }, [open, mediaId, mediaType])

  useEffect(() => {
    if (detail?.type === 'tv' && detail.seasons && detail.seasons.length > 0) {
      const firstRegularSeason = detail.seasons.find(s => s.seasonNumber > 0)
      if (firstRegularSeason) {
        setSelectedSeason(firstRegularSeason.seasonNumber)
      }
    }
  }, [detail])

  useEffect(() => {
    if (detail?.type === 'tv' && selectedSeason > 0) {
      loadEpisodes()
    }
  }, [detail, selectedSeason])

  const loadDetail = async () => {
    if (!mediaId || !mediaType) return
    setLoading(true)
    setRecommendations([])
    setSimilar([])
    setCollection(null)
    
    const [detailData, castData] = await Promise.all([
      getMediaDetail(mediaId, mediaType),
      getCredits(mediaId, mediaType)
    ])
    
    setDetail(detailData)
    setCast(castData)
    setLoading(false)
    
    // 加载推荐、相似和系列（异步）
    if (detailData) {
      getRecommendations(mediaId, mediaType).then(setRecommendations)
      getSimilar(mediaId, mediaType).then(setSimilar)
      if (mediaType === 'movie') {
        getMovieCollection(mediaId).then(setCollection)
      }
    }
  }

  const loadEpisodes = async () => {
    if (!mediaId) return
    setLoadingEpisodes(true)
    const eps = await getSeasonEpisodes(mediaId, selectedSeason)
    setEpisodes(eps)
    setLoadingEpisodes(false)
  }

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      'Released': '已上映',
      'In Production': '制作中',
      'Post Production': '后期制作',
      'Planned': '计划中',
      'Canceled': '已取消',
      'Rumored': '传闻',
      'Returning Series': '续订中',
      'Ended': '已完结',
      'Pilot': '试播'
    }
    return map[status] || status
  }

  const isEpisodeInLibrary = (seasonNumber: number, episodeNumber: number) => {
    const key = `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`
    return libraryEpisodes.has(key)
  }
  
  const isSeasonFullyInLibrary = (seasonNumber: number) => {
    const seasonInfo = librarySeasons.get(seasonNumber)
    return seasonInfo && seasonInfo.total > 0 && seasonInfo.inLibrary === seasonInfo.total
  }

  const handleSubscribe = async () => {
    if (!detail) return
    setSubscribing(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: detail.id,
          type: detail.type,
          title: detail.title,
          originalTitle: detail.originalTitle,
          poster: detail.poster,
          backdrop: detail.backdrop,
          year: detail.releaseDate?.substring(0, 4),
          overview: detail.overview,
          searchKeyword: detail.title
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setSnackbar({ open: true, message: '求片请求已提交，等待管理员审核', severity: 'success' })
      } else {
        if (data.existingStatus === 'available' || data.status === 'available') {
          setSnackbar({ open: true, message: '该影片已在媒体库中', severity: 'info' })
        } else if (data.existingStatus) {
          const statusMap: Record<string, string> = {
            pending: '待审核',
            approved: '订阅中',
            available: '已入库'
          }
          setSnackbar({ open: true, message: `该影片已在求片列表中（${statusMap[data.existingStatus] || data.existingStatus}）`, severity: 'info' })
        } else {
          setSnackbar({ open: true, message: data.error || '提交失败', severity: 'error' })
        }
      }
    } catch (e) {
      console.error('Subscribe failed:', e)
      setSnackbar({ open: true, message: '网络错误，请重试', severity: 'error' })
    } finally {
      setSubscribing(false)
    }
  }
  
  // 检查媒体是否已入库
  const isMediaInLibrary = (id: number, type: 'movie' | 'tv') => {
    return libraryTmdbIds.has(`${type}-${id}`)
  }
  
  // 统一的媒体卡片渲染
  const renderMediaCard = (item: { id: number; title: string; poster: string; rating?: number; releaseDate?: string; type?: 'movie' | 'tv' }, type: 'movie' | 'tv', isCurrent?: boolean) => {
    const itemType = item.type || type
    const inLibrary = isMediaInLibrary(item.id, itemType)
    
    return (
      <Box
        key={item.id}
        onClick={() => !isCurrent && handleMediaClick(item.id, itemType)}
        sx={{
          flexShrink: 0,
          width: 140,
          cursor: isCurrent ? 'default' : 'pointer',
          transition: 'transform 0.2s',
          opacity: isCurrent ? 1 : 0.95,
          '&:hover': isCurrent ? {} : { transform: 'scale(1.03)' }
        }}
      >
        <Box sx={{ 
          position: 'relative',
          borderRadius: 2, 
          overflow: 'hidden',
          aspectRatio: '2/3',
          bgcolor: 'action.hover',
          border: isCurrent ? '3px solid' : 'none',
          borderColor: 'primary.main',
          boxShadow: isCurrent ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
        }}>
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Box sx={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <i className='ri-film-line' style={{ fontSize: 32, opacity: 0.3 }} />
            </Box>
          )}
          
          {/* 标签容器 - 左上角 */}
          <Box sx={{ position: 'absolute', top: 6, left: 6, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* 已入库标签 */}
            {inLibrary && (
              <Chip
                icon={<i className='ri-checkbox-circle-fill' style={{ fontSize: 12, marginLeft: 4 }} />}
                label='已入库'
                size='small'
                color='success'
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: 'inherit' }
                }}
              />
            )}
            {/* 类型标签 */}
            <Chip
              label={itemType === 'movie' ? '电影' : '剧集'}
              size='small'
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: itemType === 'movie' ? 'primary.main' : 'secondary.main',
                color: 'white'
              }}
            />
          </Box>
          
          {/* 评分 - 右上角 */}
          {item.rating && item.rating > 0 && (
            <Box sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              bgcolor: 'rgba(0,0,0,0.75)',
              borderRadius: 1,
              px: 0.75,
              py: 0.25,
              display: 'flex',
              alignItems: 'center',
              gap: 0.3
            }}>
              <i className='ri-star-fill' style={{ color: '#ffc107', fontSize: 11 }} />
              <Typography variant='caption' sx={{ color: 'white', fontSize: '0.7rem', fontWeight: 600 }}>
                {item.rating}
              </Typography>
            </Box>
          )}
          
          {/* 当前标记 */}
          {isCurrent && (
            <Box sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'primary.main',
              color: 'white',
              py: 0.5,
              textAlign: 'center'
            }}>
              <Typography variant='caption' fontWeight={600}>当前</Typography>
            </Box>
          )}
        </Box>
        
        {/* 标题 */}
        <Box sx={{ mt: 1, px: 0.5 }}>
          <Typography variant='body2' fontWeight={600} noWrap sx={{ lineHeight: 1.3 }}>
            {item.title}
          </Typography>
          {item.releaseDate && (
            <Typography variant='caption' color='text.secondary'>
              {item.releaseDate.substring(0, 4)}
            </Typography>
          )}
        </Box>
      </Box>
    )
  }
  
  // 点击推荐/系列中的媒体
  const handleMediaClick = (id: number, type: 'movie' | 'tv') => {
    onClose()
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openMediaDetail', { 
        detail: { mediaId: id, mediaType: type } 
      }))
    }, 300)
  }

  if (!open) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='xl'
      fullWidth
      scroll='paper'
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '95vh',
          minHeight: '80vh',
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }
      }}
    >
      <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Skeleton variant='rounded' width={200} height={300} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant='text' width='60%' height={40} />
                <Skeleton variant='text' width='40%' />
                <Skeleton variant='text' width='100%' />
                <Skeleton variant='text' width='100%' />
              </Box>
            </Box>
          </Box>
        ) : detail ? (
          <Box>
            {/* 顶部区域 - 背景图 + 海报 + 基本信息 */}
            <Box
              sx={{
                position: 'relative',
                backgroundImage: detail.backdrop ? `url(${detail.backdrop})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              }}
            >
              {/* 渐变遮罩 */}
              <Box sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 100%)'
              }} />
              
              {/* 关闭按钮 */}
              <IconButton
                onClick={onClose}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  backdropFilter: 'blur(8px)',
                  zIndex: 10,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                }}
              >
                <i className='ri-close-line' />
              </IconButton>
              
              {/* 内容区 */}
              <Box sx={{ position: 'relative', display: 'flex', gap: 3, p: 3, color: 'white' }}>
                {/* 左侧海报 */}
                <Box sx={{ flexShrink: 0 }}>
                  <Box
                    component='img'
                    src={detail.poster || '/placeholder.png'}
                    alt={detail.title}
                    sx={{
                      width: 180,
                      height: 270,
                      borderRadius: 2,
                      objectFit: 'cover',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}
                  />
                  
                  {/* 操作按钮 */}
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    {!isInLibrary ? (
                      <Button 
                        variant='contained' 
                        fullWidth
                        startIcon={<i className='ri-movie-2-line' />}
                        onClick={handleSubscribe}
                        disabled={subscribing}
                        sx={{ borderRadius: 2, py: 1.2 }}
                      >
                        {subscribing ? '提交中...' : '求片'}
                      </Button>
                    ) : (
                      <Button 
                        variant='contained' 
                        color='success'
                        fullWidth
                        startIcon={<i className='ri-checkbox-circle-line' />}
                        sx={{ borderRadius: 2, py: 1.2 }}
                      >
                        已入库
                      </Button>
                    )}
                    <IconButton sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }}>
                      <i className='ri-heart-line' />
                    </IconButton>
                    <IconButton sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }}>
                      <i className='ri-notification-line' />
                    </IconButton>
                  </Box>
                </Box>
                
                {/* 右侧信息 */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* 类型标签 */}
                  <Chip 
                    label={detail.type === 'movie' ? '电影' : '剧集'} 
                    size='small' 
                    color='primary'
                    sx={{ mb: 1 }}
                  />
                  
                  {/* 标题 */}
                  <Typography variant='h4' fontWeight={700} sx={{ mb: 0.5 }}>
                    {detail.title}
                    {detail.releaseDate && (
                      <Typography component='span' sx={{ ml: 1, fontWeight: 400, opacity: 0.7 }}>
                        ({detail.releaseDate.substring(0, 4)})
                      </Typography>
                    )}
                  </Typography>
                  
                  {/* 原始标题 */}
                  {detail.originalTitle && detail.originalTitle !== detail.title && (
                    <Typography variant='body2' sx={{ opacity: 0.7, mb: 1 }}>
                      {detail.originalTitle}
                    </Typography>
                  )}
                  
                  {/* 类型标签 */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {detail.genres.map(g => (
                      <Chip 
                        key={g.id} 
                        label={g.name} 
                        size='small' 
                        variant='outlined'
                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
                      />
                    ))}
                  </Box>
                  
                  {/* 简介 */}
                  <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 0.5 }}>
                    简介
                  </Typography>
                  <Typography variant='body2' sx={{ opacity: 0.9, lineHeight: 1.7, mb: 2, maxHeight: 100, overflow: 'auto' }}>
                    {detail.overview || '暂无简介'}
                  </Typography>
                  
                  {/* 详细信息表格 */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: 1.5,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    borderRadius: 2,
                    p: 2
                  }}>
                    <Box>
                      <Typography variant='caption' sx={{ opacity: 0.6 }}>评分</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Rating value={detail.rating / 2} precision={0.1} size='small' readOnly />
                        <Typography variant='body2' fontWeight={600}>{detail.rating}</Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant='caption' sx={{ opacity: 0.6 }}>状态</Typography>
                      <Typography variant='body2'>{getStatusText(detail.status)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant='caption' sx={{ opacity: 0.6 }}>上映日期</Typography>
                      <Typography variant='body2'>{detail.releaseDate || '-'}</Typography>
                    </Box>
                    {detail.type === 'movie' && detail.runtime > 0 && (
                      <Box>
                        <Typography variant='caption' sx={{ opacity: 0.6 }}>时长</Typography>
                        <Typography variant='body2'>{detail.runtime} 分钟</Typography>
                      </Box>
                    )}
                    {detail.type === 'tv' && (
                      <>
                        <Box>
                          <Typography variant='caption' sx={{ opacity: 0.6 }}>季数</Typography>
                          <Typography variant='body2'>{detail.numberOfSeasons} 季</Typography>
                        </Box>
                        <Box>
                          <Typography variant='caption' sx={{ opacity: 0.6 }}>集数</Typography>
                          <Typography variant='body2'>{detail.numberOfEpisodes} 集</Typography>
                        </Box>
                      </>
                    )}
                    {detail.productionCountries.length > 0 && (
                      <Box>
                        <Typography variant='caption' sx={{ opacity: 0.6 }}>出品国家</Typography>
                        <Typography variant='body2'>{detail.productionCountries.map(c => c.name).join(', ')}</Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant='caption' sx={{ opacity: 0.6 }}>TMDB</Typography>
                      <Link href={detail.tmdbUrl} target='_blank' sx={{ color: 'primary.light', fontSize: '0.875rem' }}>
                        查看详情 <i className='ri-external-link-line' style={{ fontSize: 12 }} />
                      </Link>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
            
            {/* 季列表 (仅电视剧) */}
            {detail.type === 'tv' && detail.seasons && detail.seasons.filter(s => s.seasonNumber > 0).length > 0 && (
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant='h6' fontWeight={600} sx={{ mb: 2 }}>
                  季
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {detail.seasons.filter(s => s.seasonNumber > 0).map(season => {
                    const seasonInfo = librarySeasons.get(season.seasonNumber)
                    const isFullyInLibrary = isSeasonFullyInLibrary(season.seasonNumber)
                    const isSelected = selectedSeason === season.seasonNumber
                    
                    return (
                      <Box key={season.id}>
                        {/* 季标题行 */}
                        <Box
                          onClick={() => setSelectedSeason(isSelected ? 0 : season.seasonNumber)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1.5,
                            borderRadius: isSelected ? '8px 8px 0 0' : 2,
                            cursor: 'pointer',
                            bgcolor: isSelected ? 'primary.main' : 'action.hover',
                            color: isSelected ? 'white' : 'text.primary',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: isSelected ? 'primary.main' : 'action.selected'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <i className={isSelected ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} style={{ fontSize: 20 }} />
                            <Typography fontWeight={600}>
                              第 {season.seasonNumber} 季
                            </Typography>
                            <Typography variant='body2' sx={{ opacity: 0.7 }}>
                              {season.episodeCount} 集
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isFullyInLibrary ? (
                              <Chip 
                                label='已入库' 
                                size='small' 
                                color='success'
                                sx={{ height: 24 }}
                              />
                            ) : seasonInfo && seasonInfo.inLibrary > 0 ? (
                              <Chip 
                                label={`${seasonInfo.inLibrary}/${seasonInfo.total}`} 
                                size='small' 
                                color='warning'
                                variant='outlined'
                                sx={{ height: 24 }}
                              />
                            ) : null}
                            <IconButton 
                              size='small' 
                              sx={{ color: 'inherit', opacity: 0.5 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <i className='ri-heart-line' />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        {/* 剧集列表 - 展开时显示 */}
                        {isSelected && (
                          <Box sx={{ 
                            bgcolor: 'action.hover', 
                            borderRadius: '0 0 8px 8px',
                            p: 2,
                            mt: '-1px'
                          }}>
                            {loadingEpisodes ? (
                              <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                                {[1,2,3,4,5].map(i => (
                                  <Skeleton key={i} variant='rounded' width={160} height={120} sx={{ flexShrink: 0 }} />
                                ))}
                              </Box>
                            ) : episodes.length > 0 ? (
                              <Box sx={{ 
                                display: 'flex', 
                                gap: 2, 
                                overflowX: 'auto',
                                pb: 1,
                                '&::-webkit-scrollbar': { height: 4 },
                                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 }
                              }}>
                                {episodes.map(ep => {
                                  const epInLibrary = isEpisodeInLibrary(ep.seasonNumber, ep.episodeNumber)
                                  return (
                                    <Box
                                      key={ep.id}
                                      sx={{
                                        flexShrink: 0,
                                        width: 160,
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s',
                                        '&:hover': { transform: 'scale(1.02)' }
                                      }}
                                    >
                                      <Box sx={{ 
                                        position: 'relative', 
                                        borderRadius: 2, 
                                        overflow: 'hidden',
                                        bgcolor: 'background.paper',
                                        aspectRatio: '16/9'
                                      }}>
                                        {ep.stillPath ? (
                                          <img
                                            src={ep.stillPath}
                                            alt={ep.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                          />
                                        ) : (
                                          <Box sx={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            bgcolor: 'action.selected'
                                          }}>
                                            <i className='ri-film-line' style={{ fontSize: 24, opacity: 0.5 }} />
                                          </Box>
                                        )}
                                        {/* 集数标签 */}
                                        <Box sx={{
                                          position: 'absolute',
                                          bottom: 6,
                                          left: 6,
                                          bgcolor: 'rgba(0,0,0,0.75)',
                                          borderRadius: 1,
                                          px: 1,
                                          py: 0.25
                                        }}>
                                          <Typography variant='caption' sx={{ color: 'white', fontWeight: 600 }}>
                                            第 {ep.episodeNumber} 集
                                          </Typography>
                                        </Box>
                                        {/* 入库标记 */}
                                        {epInLibrary && (
                                          <Box sx={{
                                            position: 'absolute',
                                            top: 6,
                                            right: 6,
                                            bgcolor: 'success.main',
                                            borderRadius: '50%',
                                            width: 22,
                                            height: 22,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}>
                                            <i className='ri-check-line' style={{ color: 'white', fontSize: 14 }} />
                                          </Box>
                                        )}
                                      </Box>
                                      <Typography variant='body2' fontWeight={500} sx={{ 
                                        mt: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {ep.name}
                                      </Typography>
                                      {ep.airDate && (
                                        <Typography variant='caption' color='text.secondary'>
                                          {ep.airDate}
                                        </Typography>
                                      )}
                                    </Box>
                                  )
                                })}
                              </Box>
                            ) : (
                              <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', py: 2 }}>
                                暂无剧集信息
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            )}

            {/* 演员阵容 */}
            {cast.length > 0 && (
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant='h6' fontWeight={600}>
                    演员阵容
                  </Typography>
                  <Link 
                    sx={{ fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    更多 <i className='ri-arrow-right-s-line' />
                  </Link>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2.5, 
                  overflowX: 'auto',
                  pb: 1,
                  '&::-webkit-scrollbar': { height: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 }
                }}>
                  {cast.slice(0, 12).map(actor => (
                    <Box
                      key={actor.id}
                      onClick={() => {
                        setSelectedActorId(actor.id)
                        setActorModalOpen(true)
                      }}
                      sx={{
                        flexShrink: 0,
                        textAlign: 'center',
                        width: 80,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-4px)' }
                      }}
                    >
                      <Avatar
                        src={actor.profilePath || undefined}
                        sx={{ 
                          width: 64, 
                          height: 64, 
                          mx: 'auto', 
                          mb: 1,
                          border: '2px solid',
                          borderColor: 'divider'
                        }}
                      >
                        {actor.name.charAt(0)}
                      </Avatar>
                      <Typography variant='caption' fontWeight={600} sx={{ 
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {actor.name}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ 
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.7rem'
                      }}>
                        {actor.character}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* 推荐 */}
            {recommendations.length > 0 && (
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant='h6' fontWeight={600}>
                    推荐
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  overflowX: 'auto',
                  pb: 1,
                  '&::-webkit-scrollbar': { height: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 }
                }}>
                  {recommendations.map(item => renderMediaCard(item, item.type))}
                </Box>
              </Box>
            )}

            {/* 类似 */}
            {similar.length > 0 && (
              <Box sx={{ p: 3, borderBottom: collection ? 1 : 0, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant='h6' fontWeight={600}>
                    类似
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  overflowX: 'auto',
                  pb: 1,
                  '&::-webkit-scrollbar': { height: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 }
                }}>
                  {similar.map(item => renderMediaCard(item, item.type))}
                </Box>
              </Box>
            )}

            {/* 系列（仅电影） */}
            {collection && collection.parts.length > 1 && (
              <Box sx={{ p: 3 }}>
                <Typography variant='h6' fontWeight={600} sx={{ mb: 2 }}>
                  {collection.name}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  overflowX: 'auto',
                  pb: 1,
                  '&::-webkit-scrollbar': { height: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 }
                }}>
                  {collection.parts
                    .sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''))
                    .map(part => renderMediaCard(part, 'movie', part.id === detail.id))}
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color='text.secondary'>加载失败</Typography>
          </Box>
        )}
      </DialogContent>

      {/* 演员详情弹窗 */}
      <ActorDetailModal
        open={actorModalOpen}
        onClose={() => setActorModalOpen(false)}
        actorId={selectedActorId}
        onMediaClick={(id, type) => {
          setActorModalOpen(false)
          handleMediaClick(id, type)
        }}
      />

      {/* 提示消息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant='filled'
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  )
}
