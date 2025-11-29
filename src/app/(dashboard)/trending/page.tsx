'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'

interface MediaItem {
  id: number
  title: string
  poster: string
  rating: number
  year: string
  type: 'movie' | 'tv'
}

interface Section {
  id: string
  title: string
  icon: string
  items: MediaItem[]
  loading: boolean
}

export default function TrendingPage() {
  const [sections, setSections] = useState<Section[]>([
    { id: 'trending_movie', title: 'TMDB热门电影', icon: 'ri-fire-fill', items: [], loading: true },
    { id: 'trending_tv', title: 'TMDB热门电视剧', icon: 'ri-fire-fill', items: [], loading: true },
    { id: 'now_playing', title: '正在热映', icon: 'ri-movie-2-fill', items: [], loading: true },
    { id: 'top_rated_movie', title: '高分电影', icon: 'ri-award-fill', items: [], loading: true },
    { id: 'top_rated_tv', title: '高分剧集', icon: 'ri-award-fill', items: [], loading: true },
    { id: 'upcoming', title: '即将上映', icon: 'ri-calendar-event-fill', items: [], loading: true },
  ])

  useEffect(() => {
    loadAllSections()
  }, [])

  const loadAllSections = async () => {
    const endpoints = [
      { id: 'trending_movie', url: '/api/tmdb/trending/movie/week' },
      { id: 'trending_tv', url: '/api/tmdb/trending/tv/week' },
      { id: 'now_playing', url: '/api/tmdb/movie/now_playing' },
      { id: 'top_rated_movie', url: '/api/tmdb/movie/top_rated' },
      { id: 'top_rated_tv', url: '/api/tmdb/tv/top_rated' },
      { id: 'upcoming', url: '/api/tmdb/movie/upcoming' },
    ]

    const promises = endpoints.map(async ({ id, url }) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return { id, items: [] }
        
        const data = await res.json()
        const items = (data.results || []).slice(0, 12).map((item: any) => ({
          id: item.id,
          title: item.title || item.name,
          poster: item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : '',
          rating: Math.round((item.vote_average || 0) * 10) / 10,
          year: (item.release_date || item.first_air_date || '').substring(0, 4),
          type: item.title ? 'movie' : 'tv'
        }))
        
        return { id, items }
      } catch (error) {
        console.error(`Error loading ${id}:`, error)
        return { id, items: [] }
      }
    })

    const results = await Promise.all(promises)
    
    setSections(prev => prev.map(section => {
      const result = results.find(r => r.id === section.id)
      return {
        ...section,
        items: result?.items || [],
        loading: false
      }
    }))
  }

  // 精致的媒体卡片
  const MediaCard = ({ item }: { item: MediaItem }) => (
    <Box
      className='cursor-pointer flex-shrink-0'
      sx={{ 
        width: 150,
        transition: 'all 0.25s ease',
        '&:hover': { 
          transform: 'translateY(-6px) scale(1.02)',
        },
        '&:hover .poster-overlay': {
          opacity: 1
        }
      }}
    >
      {/* 海报容器 */}
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '2/3',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading='lazy'
          />
        ) : (
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className='ri-film-line text-3xl text-textSecondary' />
          </Box>
        )}
        
        {/* 评分 - 右上角 */}
        {item.rating > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              bgcolor: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              borderRadius: 1,
              px: 0.7,
              py: 0.25
            }}
          >
            <i className='ri-star-fill' style={{ color: '#FACC15', fontSize: 11 }} />
            <Typography sx={{ color: '#FACC15', fontWeight: 700, fontSize: '0.75rem' }}>
              {item.rating}
            </Typography>
          </Box>
        )}

        {/* 类型标签 - 左下角 */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            bgcolor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            borderRadius: 1,
            px: 0.8,
            py: 0.3
          }}
        >
          <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.65rem' }}>
            {item.type === 'movie' ? '电影' : '剧集'}
          </Typography>
        </Box>

        {/* Hover遮罩 */}
        <Box 
          className='poster-overlay'
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
            opacity: 0,
            transition: 'opacity 0.25s ease',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pb: 2
          }}
        >
          <IconButton 
            size='small'
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            <i className='ri-play-fill' />
          </IconButton>
        </Box>
      </Box>
      
      {/* 标题信息 */}
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
  )

  // 区块组件
  const SectionRow = ({ section }: { section: Section }) => (
    <Box sx={{ mb: 5 }}>
      {/* 标题栏 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            <i className={section.icon} style={{ color: 'white', fontSize: 18 }} />
          </Box>
          <Typography variant='h6' fontWeight={600}>{section.title}</Typography>
        </Box>
        <IconButton size='small' sx={{ color: 'text.secondary' }}>
          <i className='ri-arrow-right-s-line text-xl' />
        </IconButton>
      </Box>

      {/* 内容区 */}
      {section.loading ? (
        <Box sx={{ display: 'flex', gap: 2.5, overflow: 'hidden' }}>
          {[...Array(8)].map((_, i) => (
            <Box key={i} sx={{ flexShrink: 0, width: 150 }}>
              <Skeleton variant='rounded' sx={{ aspectRatio: '2/3', borderRadius: 3 }} />
              <Skeleton variant='text' sx={{ mt: 1 }} />
              <Skeleton variant='text' width='60%' />
            </Box>
          ))}
        </Box>
      ) : section.items.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color='text.secondary' textAlign='center'>暂无数据</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 2.5, 
            overflowX: 'auto',
            pb: 1.5,
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { 
              bgcolor: 'divider', 
              borderRadius: 2,
              '&:hover': { bgcolor: 'action.disabled' }
            }
          }}
        >
          {section.items.map(item => (
            <MediaCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </Box>
      )}
    </Box>
  )

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='ri-compass-discover-line text-3xl' style={{ color: 'var(--mui-palette-primary-main)' }} />
          <Typography variant='h4' fontWeight={700}>发现</Typography>
        </Box>
        <Typography color='text.secondary' sx={{ mt: 0.5, ml: 0.5 }}>
          探索热门电影和精彩剧集
        </Typography>
      </Box>

      {/* 各个分区 */}
      {sections.map(section => (
        <SectionRow key={section.id} section={section} />
      ))}
    </Box>
  )
}
