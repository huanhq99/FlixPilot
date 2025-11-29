'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Box from '@mui/material/Box'
import MediaDetailModal from '@/components/MediaDetailModal'

// 筛选选项
const categories = [
  { label: '全部', value: 'all' },
  { label: '电影', value: 'movie' },
  { label: '剧集', value: 'tv' },
  { label: '动漫', value: 'anime' }
]

const genres = [
  { label: '全部', value: '' },
  { label: '动作', value: '28' },
  { label: '冒险', value: '12' },
  { label: '喜剧', value: '35' },
  { label: '犯罪', value: '80' },
  { label: '纪录', value: '99' },
  { label: '剧情', value: '18' },
  { label: '家庭', value: '10751' },
  { label: '奇幻', value: '14' },
  { label: '历史', value: '36' },
  { label: '恐怖', value: '27' },
  { label: '音乐', value: '10402' },
  { label: '悬疑', value: '9648' },
  { label: '爱情', value: '10749' },
  { label: '科幻', value: '878' },
  { label: '惊悚', value: '53' },
  { label: '战争', value: '10752' },
  { label: '西部', value: '37' }
]

const regions = [
  { label: '全部', value: '' },
  { label: '中国', value: 'CN' },
  { label: '中国香港', value: 'HK' },
  { label: '中国台湾', value: 'TW' },
  { label: '日本', value: 'JP' },
  { label: '韩国', value: 'KR' },
  { label: '美国', value: 'US' },
  { label: '英国', value: 'GB' },
  { label: '法国', value: 'FR' },
  { label: '德国', value: 'DE' },
  { label: '印度', value: 'IN' },
  { label: '泰国', value: 'TH' }
]

const platforms = [
  { label: '全部', value: '' },
  { label: '腾讯视频', value: '613' },
  { label: '爱奇艺', value: '617' },
  { label: '优酷', value: '614' },
  { label: '芒果TV', value: '618' },
  { label: 'bilibili', value: '1954' },
  { label: 'Netflix', value: '8' },
  { label: 'Disney+', value: '337' },
  { label: 'Amazon', value: '9' },
  { label: 'Apple TV+', value: '350' },
  { label: 'HBO Max', value: '384' },
  { label: 'Hulu', value: '15' }
]

const years = [
  { label: '全部', value: '' },
  { label: '2025', value: '2025' },
  { label: '2024', value: '2024' },
  { label: '2023', value: '2023' },
  { label: '2022', value: '2022' },
  { label: '2021', value: '2021' },
  { label: '2020', value: '2020' },
  { label: '2019', value: '2019' },
  { label: '2018', value: '2018' },
  { label: '2017', value: '2017' },
  { label: '2016', value: '2016' },
  { label: '2015', value: '2015' },
  { label: '更早', value: 'older' }
]

interface MediaItem {
  id: number
  title: string
  originalTitle: string
  poster: string
  rating: number
  year: string
  type: 'movie' | 'tv'
}

export default function StreamingPage() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [genre, setGenre] = useState('')
  const [region, setRegion] = useState('')
  const [platform, setPlatform] = useState('')
  const [year, setYear] = useState('')
  
  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<{ id: number; type: 'movie' | 'tv' } | null>(null)
  
  // 已入库的媒体 (从 Emby 同步)
  const [libraryItems, setLibraryItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    // TODO: 从本地存储或 API 加载已同步的入库数据
    loadLibraryData()
  }, [])

  const loadLibraryData = async () => {
    try {
      const res = await fetch('/api/library/synced')
      if (res.ok) {
        const data = await res.json()
        setLibraryItems(new Set(data.items || []))
      }
    } catch (e) {
      // 忽略错误
    }
  }

  const loadMedia = useCallback(async () => {
    setLoading(true)
    
    try {
      let results: MediaItem[] = []
      
      if (searchQuery.trim()) {
        const res = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          results = (data.results || [])
            .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
            .map((item: any) => ({
              id: item.id,
              title: item.title || item.name,
              originalTitle: item.original_title || item.original_name,
              poster: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : '',
              rating: Math.round((item.vote_average || 0) * 10) / 10,
              year: (item.release_date || item.first_air_date || '').substring(0, 4),
              type: item.media_type
            }))
        }
      } else {
        const mediaType = category === 'anime' ? 'tv' : (category === 'all' ? 'movie' : category)
        const params = new URLSearchParams()
        params.set('sort_by', 'popularity.desc')
        
        if (genre) params.set('with_genres', category === 'anime' ? '16' : genre)
        if (region) params.set('with_origin_country', region)
        if (platform) params.set('with_watch_providers', platform)
        if (platform) params.set('watch_region', 'CN')
        
        if (year) {
          if (year === 'older') {
            params.set(mediaType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte', '2014-12-31')
          } else {
            params.set(mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year', year)
          }
        }
        
        if (category === 'anime') {
          params.set('with_genres', '16')
          if (!region) params.set('with_origin_country', 'JP')
        }
        
        const res = await fetch(`/api/tmdb/discover/${mediaType}?${params}`)
        if (res.ok) {
          const data = await res.json()
          results = (data.results || []).map((item: any) => ({
            id: item.id,
            title: item.title || item.name,
            originalTitle: item.original_title || item.original_name,
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : '',
            rating: Math.round((item.vote_average || 0) * 10) / 10,
            year: (item.release_date || item.first_air_date || '').substring(0, 4),
            type: mediaType as 'movie' | 'tv'
          }))
        }
        
        if (category === 'all') {
          const tvRes = await fetch(`/api/tmdb/discover/tv?${params}`)
          if (tvRes.ok) {
            const tvData = await tvRes.json()
            const tvResults = (tvData.results || []).map((item: any) => ({
              id: item.id,
              title: item.name,
              originalTitle: item.original_name,
              poster: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : '',
              rating: Math.round((item.vote_average || 0) * 10) / 10,
              year: (item.first_air_date || '').substring(0, 4),
              type: 'tv' as const
            }))
            const merged: MediaItem[] = []
            const maxLen = Math.max(results.length, tvResults.length)
            for (let i = 0; i < maxLen; i++) {
              if (results[i]) merged.push(results[i])
              if (tvResults[i]) merged.push(tvResults[i])
            }
            results = merged
          }
        }
      }
      
      setMediaList(results)
    } catch (error) {
      console.error('Load media error:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, category, genre, region, platform, year])

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

  const handleMediaClick = (item: MediaItem) => {
    setSelectedMedia({ id: item.id, type: item.type })
    setDetailOpen(true)
  }

  const isInLibrary = (item: MediaItem) => {
    return libraryItems.has(`${item.type}-${item.id}`)
  }

  // 筛选器组件
  const FilterRow = ({ label, options, value, onChange }: {
    label: string
    options: { label: string; value: string }[]
    value: string
    onChange: (v: string) => void
  }) => (
    <div className='flex items-center gap-3 flex-wrap'>
      <Typography variant='body2' color='text.secondary' sx={{ minWidth: 50 }}>
        {label}
      </Typography>
      <div className='flex gap-1.5 flex-wrap'>
        {options.map(opt => (
          <Chip
            key={opt.value}
            label={opt.label}
            size='small'
            variant={value === opt.value ? 'filled' : 'outlined'}
            color={value === opt.value ? 'primary' : 'default'}
            onClick={() => onChange(opt.value)}
            sx={{ 
              cursor: 'pointer',
              height: 28,
              fontSize: '0.8rem'
            }}
          />
        ))}
      </div>
    </div>
  )

  return (
    <>
      <Grid container spacing={6}>
        {/* 搜索和筛选 */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent className='flex flex-col gap-4'>
              <TextField
                fullWidth
                placeholder='搜索电影、剧集...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size='small'
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='ri-search-line' />
                    </InputAdornment>
                  )
                }}
              />
              
              {!searchQuery && (
                <div className='flex flex-col gap-3'>
                  <FilterRow label='分类' options={categories} value={category} onChange={setCategory} />
                  <FilterRow label='类型' options={genres} value={genre} onChange={setGenre} />
                  <FilterRow label='地区' options={regions} value={region} onChange={setRegion} />
                  <FilterRow label='平台' options={platforms} value={platform} onChange={setPlatform} />
                  <FilterRow label='年份' options={years} value={year} onChange={setYear} />
                </div>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 内容列表 */}
        <Grid size={{ xs: 12 }}>
          {loading ? (
            <Grid container spacing={2.5}>
              {[...Array(21)].map((_, i) => (
                <Grid size={{ xs: 4, sm: 3, md: 2, lg: 12/7 }} key={i}>
                  <Skeleton variant='rounded' sx={{ aspectRatio: '2/3', borderRadius: 3 }} />
                </Grid>
              ))}
            </Grid>
          ) : mediaList.length === 0 ? (
            <Card>
              <CardContent className='text-center pbs-10 pbe-10'>
                <i className='ri-film-line text-5xl text-textSecondary mbe-4' />
                <Typography variant='h6' color='text.secondary'>
                  {searchQuery ? '未找到相关内容' : '暂无数据'}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2.5}>
              {mediaList.map((item) => (
                <Grid size={{ xs: 4, sm: 3, md: 2, lg: 12/7 }} key={`${item.type}-${item.id}`}>
                  <Box
                    onClick={() => handleMediaClick(item)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        '& .poster-card': {
                          boxShadow: '0 12px 24px rgba(0,0,0,0.25)'
                        }
                      }
                    }}
                  >
                    {/* 海报卡片 */}
                    <Box
                      className='poster-card'
                      sx={{
                        position: 'relative',
                        aspectRatio: '2/3',
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        transition: 'box-shadow 0.2s ease'
                      }}
                    >
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={item.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          loading='lazy'
                        />
                      ) : (
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            bgcolor: 'action.hover',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <i className='ri-film-line text-4xl text-textSecondary' />
                        </Box>
                      )}

                      {/* 右上角标签组 - 评分和已入库上下排列 */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          alignItems: 'flex-end'
                        }}
                      >
                        {/* 评分 */}
                        {item.rating > 0 && (
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
                              {item.rating.toFixed(1)}
                            </Typography>
                          </Box>
                        )}

                        {/* 已入库 */}
                        {isInLibrary(item) && (
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
                          bottom: 10,
                          left: 10,
                          bgcolor: item.type === 'tv' ? 'rgba(99, 102, 241, 0.95)' : 'rgba(239, 68, 68, 0.95)',
                          borderRadius: 1,
                          px: 1,
                          py: 0.4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.7rem' }}>
                          {item.type === 'movie' ? '电影' : '剧集'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* 标题和年份 */}
                    <Box sx={{ mt: 1.5, px: 0.5 }}>
                      <Typography 
                        variant='body2' 
                        fontWeight='600' 
                        noWrap
                        sx={{ lineHeight: 1.3 }}
                      >
                        {item.title}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {item.year}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
      </Grid>

      {/* 详情弹窗 */}
      <MediaDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        mediaId={selectedMedia?.id || null}
        mediaType={selectedMedia?.type || null}
        isInLibrary={selectedMedia ? libraryItems.has(`${selectedMedia.type}-${selectedMedia.id}`) : false}
      />
    </>
  )
}
