'use client'

import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Link from '@mui/material/Link'

interface LibraryData {
  items: string[]
  movieIds: number[]
  tvIds: number[]
}

interface ActorCredits {
  id: number
  title: string
  character: string
  poster: string | null
  releaseDate: string
  voteAverage: number
  mediaType: 'movie' | 'tv'
}

interface ActorDetail {
  id: number
  name: string
  biography: string
  birthday: string | null
  deathday: string | null
  placeOfBirth: string | null
  profilePath: string | null
  knownForDepartment: string
  popularity: number
  alsoKnownAs: string[]
  gender: number
  credits: ActorCredits[]
}

interface ActorDetailModalProps {
  open: boolean
  onClose: () => void
  actorId: number | null
  onMediaClick?: (mediaId: number, mediaType: 'movie' | 'tv') => void
}

export default function ActorDetailModal({
  open,
  onClose,
  actorId,
  onMediaClick
}: ActorDetailModalProps) {
  const [detail, setDetail] = useState<ActorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [libraryData, setLibraryData] = useState<LibraryData>({ items: [], movieIds: [], tvIds: [] })

  useEffect(() => {
    if (open && actorId) {
      loadActorDetail()
      loadLibrary()
    }
  }, [open, actorId])

  const loadLibrary = async () => {
    try {
      const res = await fetch('/api/library/synced')
      if (res.ok) {
        const data = await res.json()
        setLibraryData({
          items: data.items || [],
          movieIds: data.movieIds || [],
          tvIds: data.tvIds || []
        })
      }
    } catch (e) {
      console.error('Load library failed:', e)
    }
  }

  const isInLibrary = (credit: ActorCredits) => {
    if (credit.mediaType === 'movie') {
      return libraryData.movieIds.includes(credit.id)
    } else {
      return libraryData.tvIds.includes(credit.id)
    }
  }

  const loadActorDetail = async () => {
    setLoading(true)
    try {
      // 获取演员详情
      const [personRes, creditsRes] = await Promise.all([
        fetch(`/api/tmdb/person/${actorId}`),
        fetch(`/api/tmdb/person/${actorId}/combined_credits`)
      ])

      if (!personRes.ok) throw new Error('Failed to load actor')

      const personData = await personRes.json()
      const creditsData = creditsRes.ok ? await creditsRes.json() : { cast: [] }

      // 处理作品列表 - 去重
      const seenIds = new Set<string>()
      const credits: ActorCredits[] = (creditsData.cast || [])
        .filter((c: any) => c.poster_path && (c.vote_count > 10 || c.popularity > 5))
        .map((c: any) => ({
          id: c.id,
          title: c.title || c.name,
          character: c.character || '',
          poster: c.poster_path ? `https://image.tmdb.org/t/p/w185${c.poster_path}` : null,
          releaseDate: c.release_date || c.first_air_date || '',
          voteAverage: c.vote_average || 0,
          mediaType: c.media_type === 'tv' ? 'tv' : 'movie'
        }))
        .filter((c: ActorCredits) => {
          const key = `${c.mediaType}-${c.id}`
          if (seenIds.has(key)) return false
          seenIds.add(key)
          return true
        })
        .sort((a: ActorCredits, b: ActorCredits) => {
          // 按年份倒序
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0
          return dateB - dateA
        })
        .slice(0, 30) // 最多显示30部作品

      setDetail({
        id: personData.id,
        name: personData.name,
        biography: personData.biography || '',
        birthday: personData.birthday,
        deathday: personData.deathday,
        placeOfBirth: personData.place_of_birth,
        profilePath: personData.profile_path 
          ? `https://image.tmdb.org/t/p/w300${personData.profile_path}` 
          : null,
        knownForDepartment: personData.known_for_department,
        popularity: personData.popularity,
        alsoKnownAs: personData.also_known_as || [],
        gender: personData.gender,
        credits
      })
    } catch (e) {
      console.error('Load actor detail failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (birthday: string, deathday?: string | null) => {
    const birth = new Date(birthday)
    const end = deathday ? new Date(deathday) : new Date()
    let age = end.getFullYear() - birth.getFullYear()
    const monthDiff = end.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const handleMediaClick = (mediaId: number, mediaType: 'movie' | 'tv') => {
    onClose()
    if (onMediaClick) {
      onMediaClick(mediaId, mediaType)
    }
  }

  if (!open) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          height: '85vh',
          maxHeight: '85vh',
          overflow: 'hidden'
        }
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          bgcolor: 'action.hover',
          '&:hover': { bgcolor: 'action.selected' }
        }}
      >
        <i className='ri-close-line' />
      </IconButton>

      {loading ? (
        <Box sx={{ display: 'flex', height: '100%', p: 3 }}>
          <Box sx={{ width: 280, flexShrink: 0 }}>
            <Skeleton variant='rounded' width={200} height={300} />
            <Skeleton variant='text' width='80%' height={40} sx={{ mt: 2 }} />
            <Skeleton variant='text' width='60%' />
          </Box>
          <Box sx={{ flex: 1, pl: 3 }}>
            <Skeleton variant='text' width='30%' height={40} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mt: 2 }}>
              {[1,2,3,4,5,6,7,8].map(i => (
                <Skeleton key={i} variant='rounded' height={200} />
              ))}
            </Box>
          </Box>
        </Box>
      ) : detail ? (
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* 左侧固定 - 演员信息 */}
          <Box 
            sx={{ 
              width: 300, 
              flexShrink: 0, 
              p: 3,
              borderRight: '1px solid',
              borderColor: 'divider',
              overflowY: 'auto',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 }
            }}
          >
            {/* 头像 */}
            {detail.profilePath ? (
              <img
                src={detail.profilePath}
                alt={detail.name}
                style={{
                  width: '100%',
                  borderRadius: 12,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}
              />
            ) : (
              <Box
                sx={{
                  aspectRatio: '2/3',
                  borderRadius: 3,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className='ri-user-line text-6xl text-textSecondary' />
              </Box>
            )}

            {/* 姓名 */}
            <Typography variant='h5' fontWeight={700} sx={{ mt: 2 }}>
              {detail.name}
            </Typography>

            {/* 标签 */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1, mb: 2 }}>
              <Chip 
                label={detail.knownForDepartment === 'Acting' ? '演员' : detail.knownForDepartment} 
                size='small' 
                color='primary' 
              />
              {detail.gender === 1 && <Chip label='女' size='small' variant='outlined' />}
              {detail.gender === 2 && <Chip label='男' size='small' variant='outlined' />}
            </Box>

            {/* 基本信息 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {detail.birthday && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className='ri-cake-2-line text-lg' style={{ opacity: 0.6 }} />
                  <Box>
                    <Typography variant='body2'>
                      {detail.birthday}
                    </Typography>
                    {!detail.deathday && (
                      <Typography variant='caption' color='text.secondary'>
                        {calculateAge(detail.birthday)} 岁
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              {detail.deathday && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className='ri-skull-line text-lg' style={{ opacity: 0.6 }} />
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      {detail.deathday}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      享年 {calculateAge(detail.birthday!, detail.deathday)} 岁
                    </Typography>
                  </Box>
                </Box>
              )}
              {detail.placeOfBirth && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <i className='ri-map-pin-line text-lg' style={{ opacity: 0.6, marginTop: 2 }} />
                  <Typography variant='body2'>
                    {detail.placeOfBirth}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* TMDB 链接 */}
            <Link 
              href={`https://www.themoviedb.org/person/${detail.id}`}
              target='_blank' 
              rel='noopener'
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem', mt: 2 }}
            >
              <i className='ri-external-link-line' />
              在 TMDB 查看
            </Link>

            {/* 简介 */}
            {detail.biography && (
              <Box sx={{ mt: 2 }}>
                <Typography variant='subtitle2' fontWeight={600} gutterBottom>
                  简介
                </Typography>
                <Typography 
                  variant='body2' 
                  color='text.secondary' 
                  sx={{ 
                    fontSize: '0.8rem',
                    lineHeight: 1.6
                  }}
                >
                  {detail.biography}
                </Typography>
              </Box>
            )}

            {/* 别名 */}
            {detail.alsoKnownAs.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant='caption' color='text.secondary'>
                  别名: {detail.alsoKnownAs.slice(0, 3).join(' / ')}
                </Typography>
              </Box>
            )}
          </Box>

          {/* 右侧滚动 - 作品列表 */}
          <Box 
            sx={{ 
              flex: 1, 
              p: 3,
              overflowY: 'auto',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 }
            }}
          >
            <Typography variant='h6' fontWeight={600} gutterBottom>
              参演作品 ({detail.credits.length})
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 2,
                mt: 2
              }}
            >
              {detail.credits.map(credit => (
                <Box
                  key={`${credit.mediaType}-${credit.id}`}
                  onClick={() => handleMediaClick(credit.id, credit.mediaType)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  {/* 海报容器 */}
                  <Box sx={{ position: 'relative' }}>
                    {credit.poster ? (
                      <img
                        src={credit.poster}
                        alt={credit.title}
                        style={{
                          width: '100%',
                          aspectRatio: '2/3',
                          objectFit: 'cover',
                          borderRadius: 8
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          aspectRatio: '2/3',
                          bgcolor: 'action.hover',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className='ri-film-line text-3xl' />
                      </Box>
                    )}

                    {/* 右上角标签组 - 评分和已入库上下排列 */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.4,
                        alignItems: 'flex-end'
                      }}
                    >
                      {/* 评分 */}
                      {credit.voteAverage > 0 && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.4,
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            borderRadius: 1,
                            px: 1,
                            py: 0.4,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <i className='ri-star-fill' style={{ color: 'white', fontSize: 12 }} />
                          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                            {credit.voteAverage.toFixed(1)}
                          </Typography>
                        </Box>
                      )}

                      {/* 已入库 */}
                      {isInLibrary(credit) && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.4,
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            borderRadius: 1,
                            px: 1,
                            py: 0.4,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <i className='ri-checkbox-circle-fill' style={{ color: 'white', fontSize: 12 }} />
                          <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>
                            已入库
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* 类型标签 - 左下角 */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        bgcolor: credit.mediaType === 'tv' ? 'rgba(99, 102, 241, 0.95)' : 'rgba(239, 68, 68, 0.95)',
                        borderRadius: 1,
                        px: 0.8,
                        py: 0.3,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    >
                      <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.7rem' }}>
                        {credit.mediaType === 'tv' ? '剧集' : '电影'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* 标题信息 */}
                  <Box sx={{ p: 1 }}>
                    <Typography variant='body2' fontWeight={600} noWrap>
                      {credit.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {credit.character && (
                        <Typography variant='caption' color='text.secondary' noWrap sx={{ flex: 1, fontSize: '0.75rem' }}>
                          饰 {credit.character}
                        </Typography>
                      )}
                      {credit.releaseDate && (
                        <Typography variant='caption' color='text.disabled' sx={{ fontSize: '0.7rem', flexShrink: 0 }}>
                          {credit.releaseDate.slice(0, 4)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color='text.secondary'>加载失败</Typography>
        </Box>
      )}
    </Dialog>
  )
}
