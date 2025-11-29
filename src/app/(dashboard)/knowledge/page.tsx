'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Skeleton from '@mui/material/Skeleton'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface KnowledgeArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  viewCount: number
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
  icon: string
}

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    loadCategories()
    loadArticles()
  }, [])

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/knowledge?categories=true')
      const data = await res.json()
      if (data.categories) {
        setCategories(data.categories)
      }
    } catch (e) {
      console.error('Load categories failed:', e)
    }
  }

  const loadArticles = async (category?: string, keyword?: string) => {
    setLoading(true)
    try {
      let url = '/api/knowledge'
      if (keyword) {
        url += `?keyword=${encodeURIComponent(keyword)}`
      } else if (category) {
        url += `?category=${category}`
      }
      
      const res = await fetch(url)
      const data = await res.json()
      if (data.articles) {
        setArticles(data.articles)
      }
    } catch (e) {
      console.error('Load articles failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setSelectedArticle(null)
    setSearchKeyword('')
    loadArticles(categoryId)
  }

  const handleArticleClick = async (article: KnowledgeArticle) => {
    try {
      const res = await fetch(`/api/knowledge?id=${article.id}`)
      const data = await res.json()
      if (data.article) {
        setSelectedArticle(data.article)
      }
    } catch (e) {
      console.error('Load article failed:', e)
    }
  }

  const handleSearch = () => {
    if (searchKeyword) {
      setSelectedCategory(null)
      setSelectedArticle(null)
      loadArticles(undefined, searchKeyword)
    } else {
      loadArticles()
    }
  }

  const handleBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null)
    } else if (selectedCategory) {
      setSelectedCategory(null)
      loadArticles()
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || categoryId
  }

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.icon || 'ri-file-text-line'
  }

  // 显示文章详情
  if (selectedArticle) {
    return (
      <Box>
        <Card>
          <CardContent>
            <Breadcrumbs sx={{ mb: 2 }}>
              <Link 
                component='button' 
                underline='hover' 
                color='inherit'
                onClick={() => { setSelectedArticle(null); setSelectedCategory(null); loadArticles() }}
              >
                知识库
              </Link>
              <Link 
                component='button' 
                underline='hover' 
                color='inherit'
                onClick={() => { setSelectedArticle(null); loadArticles(selectedArticle.category) }}
              >
                {getCategoryName(selectedArticle.category)}
              </Link>
              <Typography color='text.primary'>{selectedArticle.title}</Typography>
            </Breadcrumbs>
            
            <Typography variant='h4' gutterBottom>{selectedArticle.title}</Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 3, color: 'text.secondary' }}>
              <Typography variant='body2'>
                <i className='ri-eye-line' style={{ marginRight: 4 }} />
                {selectedArticle.viewCount} 次浏览
              </Typography>
              <Typography variant='body2'>
                <i className='ri-time-line' style={{ marginRight: 4 }} />
                更新于 {new Date(selectedArticle.updatedAt).toLocaleDateString('zh-CN')}
              </Typography>
            </Box>
            
            {selectedArticle.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                {selectedArticle.tags.map(tag => (
                  <Chip key={tag} label={tag} size='small' variant='outlined' />
                ))}
              </Box>
            )}
            
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ 
              '& h1': { fontSize: '2rem', mt: 3, mb: 2 },
              '& h2': { fontSize: '1.5rem', mt: 3, mb: 2 },
              '& h3': { fontSize: '1.25rem', mt: 2, mb: 1 },
              '& p': { my: 1.5, lineHeight: 1.8 },
              '& ul, & ol': { pl: 3, my: 1.5 },
              '& li': { mb: 0.5 },
              '& a': { color: 'primary.main' },
              '& code': { 
                bgcolor: 'action.hover', 
                px: 0.75, 
                py: 0.25, 
                borderRadius: 0.5,
                fontSize: '0.875em',
                fontFamily: 'monospace'
              },
              '& pre': {
                bgcolor: 'grey.900',
                color: 'grey.100',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                '& code': {
                  bgcolor: 'transparent',
                  p: 0
                }
              },
              '& blockquote': {
                borderLeft: 4,
                borderColor: 'primary.main',
                pl: 2,
                ml: 0,
                my: 2,
                color: 'text.secondary',
                fontStyle: 'italic'
              },
              '& img': {
                maxWidth: '100%',
                borderRadius: 1
              },
              '& table': {
                width: '100%',
                borderCollapse: 'collapse',
                my: 2
              },
              '& th, & td': {
                border: 1,
                borderColor: 'divider',
                p: 1.5,
                textAlign: 'left'
              },
              '& th': {
                bgcolor: 'action.hover'
              }
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selectedArticle.content}
              </ReactMarkdown>
            </Box>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box>
      {/* 搜索栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder='搜索知识库文章...'
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='ri-search-line' />
                  </InputAdornment>
                )
              }}
            />
            <Button variant='contained' onClick={handleSearch}>搜索</Button>
          </Box>
        </CardContent>
      </Card>

      {/* 面包屑导航 */}
      {selectedCategory && (
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link 
            component='button' 
            underline='hover' 
            color='inherit'
            onClick={() => { setSelectedCategory(null); loadArticles() }}
          >
            知识库
          </Link>
          <Typography color='text.primary'>{getCategoryName(selectedCategory)}</Typography>
        </Breadcrumbs>
      )}

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
      ) : !selectedCategory ? (
        // 显示分类列表
        <Grid container spacing={3}>
          {categories.map(category => {
            const categoryArticles = articles.filter(a => a.category === category.id)
            return (
              <Grid key={category.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card>
                  <CardActionArea onClick={() => handleCategoryClick(category.id)}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <Box sx={{ 
                        width: 60, 
                        height: 60, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2
                      }}>
                        <i className={category.icon} style={{ fontSize: 28, color: '#fff' }} />
                      </Box>
                      <Typography variant='h6' gutterBottom>{category.name}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {categoryArticles.length} 篇文章
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      ) : (
        // 显示文章列表
        <Grid container spacing={3}>
          {articles.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color='text.secondary'>暂无文章</Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            articles.map(article => (
              <Grid key={article.id} size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardActionArea onClick={() => handleArticleClick(article)}>
                    <CardContent>
                      <Typography variant='h6' gutterBottom>{article.title}</Typography>
                      <Typography 
                        variant='body2' 
                        color='text.secondary' 
                        sx={{ 
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {article.content.replace(/[#*`\[\]]/g, '').substring(0, 150)}...
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {article.tags.slice(0, 2).map(tag => (
                            <Chip key={tag} label={tag} size='small' variant='outlined' />
                          ))}
                        </Box>
                        <Typography variant='caption' color='text.secondary'>
                          <i className='ri-eye-line' style={{ marginRight: 4 }} />
                          {article.viewCount}
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Box>
  )
}
