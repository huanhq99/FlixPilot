'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'

interface KnowledgeArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  order: number
  isPublished: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

interface Category {
  id: string
  name: string
  icon: string
}

export default function KnowledgeManagePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'getting-started',
    tags: '',
    order: 0,
    isPublished: true
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const loadArticles = async () => {
    try {
      const res = await fetch('/api/knowledge?all=true')
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

  const handleOpenDialog = (article?: KnowledgeArticle) => {
    if (article) {
      setEditingArticle(article)
      setFormData({
        title: article.title,
        content: article.content,
        category: article.category,
        tags: article.tags.join(', '),
        order: article.order,
        isPublished: article.isPublished
      })
    } else {
      setEditingArticle(null)
      setFormData({
        title: '',
        content: '',
        category: 'getting-started',
        tags: '',
        order: 0,
        isPublished: true
      })
    }
    setDialogOpen(true)
    setError('')
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingArticle(null)
    setError('')
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      setError('标题和内容不能为空')
      return
    }

    try {
      const url = '/api/knowledge'
      const method = editingArticle ? 'PUT' : 'POST'
      const body = {
        ...(editingArticle ? { id: editingArticle.id } : {}),
        title: formData.title,
        content: formData.content,
        category: formData.category,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        order: formData.order,
        isPublished: formData.isPublished
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '操作失败')
        return
      }

      setSuccess(editingArticle ? '文章已更新' : '文章已创建')
      handleCloseDialog()
      loadArticles()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError('操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这篇文章吗？')) return

    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('文章已删除')
        loadArticles()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  const handleTogglePublish = async (article: KnowledgeArticle) => {
    try {
      await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id, isPublished: !article.isPublished })
      })
      loadArticles()
    } catch (e) {
      console.error('Toggle failed:', e)
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || categoryId
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title='知识库管理' />
        <CardContent>
          <Skeleton variant='rounded' height={300} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Box>
      {success && (
        <Alert severity='success' sx={{ mb: 3 }}>{success}</Alert>
      )}

      <Card>
        <CardHeader
          title='知识库管理'
          subheader='管理帮助文档和使用指南，支持 Markdown 格式'
          action={
            <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={() => handleOpenDialog()}>
              新建文章
            </Button>
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>标题</TableCell>
                  <TableCell>分类</TableCell>
                  <TableCell>排序</TableCell>
                  <TableCell>浏览量</TableCell>
                  <TableCell>发布状态</TableCell>
                  <TableCell>更新时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {articles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align='center'>
                      <Typography color='text.secondary' sx={{ py: 4 }}>
                        暂无文章
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <Typography fontWeight={500}>{article.title}</Typography>
                        {article.tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {article.tags.slice(0, 3).map(tag => (
                              <Chip key={tag} label={tag} size='small' variant='outlined' />
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={getCategoryName(article.category)} size='small' />
                      </TableCell>
                      <TableCell>{article.order}</TableCell>
                      <TableCell>{article.viewCount}</TableCell>
                      <TableCell>
                        <Switch 
                          checked={article.isPublished} 
                          onChange={() => handleTogglePublish(article)}
                          size='small'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {new Date(article.updatedAt).toLocaleString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title='编辑'>
                          <IconButton size='small' onClick={() => handleOpenDialog(article)}>
                            <i className='ri-edit-line' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='删除'>
                          <IconButton size='small' color='error' onClick={() => handleDelete(article.id)}>
                            <i className='ri-delete-bin-line' />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 编辑/新建对话框 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth='lg' fullWidth>
        <DialogTitle>{editingArticle ? '编辑文章' : '新建文章'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            fullWidth
            label='标题'
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>分类</InputLabel>
              <Select
                value={formData.category}
                label='分类'
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label='标签'
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              sx={{ flex: 1 }}
              placeholder='用逗号分隔多个标签'
            />
            
            <TextField
              type='number'
              label='排序'
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              sx={{ width: 100 }}
            />
          </Box>
          
          <TextField
            fullWidth
            label='内容 (Markdown 格式)'
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            multiline
            rows={20}
            sx={{ mb: 2 }}
            placeholder={`支持 Markdown 格式：

# 一级标题
## 二级标题

**粗体** *斜体*

- 列表项1
- 列表项2

1. 有序列表
2. 有序列表

\`代码\`

\`\`\`
代码块
\`\`\`

> 引用

[链接](url)

![图片](url)`}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              />
            }
            label='发布文章'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button variant='contained' onClick={handleSubmit}>
            {editingArticle ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
