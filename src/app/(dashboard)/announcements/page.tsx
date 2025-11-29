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

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'error'
  priority: number
  isActive: boolean
  isPinned: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

const typeConfig = {
  info: { label: '通知', color: 'info' as const },
  warning: { label: '警告', color: 'warning' as const },
  success: { label: '成功', color: 'success' as const },
  error: { label: '紧急', color: 'error' as const }
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    priority: 0,
    isActive: true,
    isPinned: false
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements')
      const data = await res.json()
      if (data.announcements) {
        setAnnouncements(data.announcements)
      }
    } catch (e) {
      console.error('Load announcements failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement)
      setFormData({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        priority: announcement.priority,
        isActive: announcement.isActive,
        isPinned: announcement.isPinned
      })
    } else {
      setEditingAnnouncement(null)
      setFormData({
        title: '',
        content: '',
        type: 'info',
        priority: 0,
        isActive: true,
        isPinned: false
      })
    }
    setDialogOpen(true)
    setError('')
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingAnnouncement(null)
    setError('')
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      setError('标题和内容不能为空')
      return
    }

    try {
      const url = '/api/announcements'
      const method = editingAnnouncement ? 'PUT' : 'POST'
      const body = editingAnnouncement 
        ? { id: editingAnnouncement.id, ...formData }
        : formData

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

      setSuccess(editingAnnouncement ? '公告已更新' : '公告已创建')
      handleCloseDialog()
      loadAnnouncements()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError('操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条公告吗？')) return

    try {
      const res = await fetch(`/api/announcements?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('公告已删除')
        loadAnnouncements()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: announcement.id, isActive: !announcement.isActive })
      })
      loadAnnouncements()
    } catch (e) {
      console.error('Toggle failed:', e)
    }
  }

  const handleTogglePinned = async (announcement: Announcement) => {
    try {
      await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: announcement.id, isPinned: !announcement.isPinned })
      })
      loadAnnouncements()
    } catch (e) {
      console.error('Toggle failed:', e)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title='公告管理' />
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
          title='公告管理'
          subheader='管理系统公告，支持 Markdown 格式'
          action={
            <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={() => handleOpenDialog()}>
              发布公告
            </Button>
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>标题</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>优先级</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>弹窗</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {announcements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align='center'>
                      <Typography color='text.secondary' sx={{ py: 4 }}>
                        暂无公告
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  announcements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <Typography fontWeight={500}>{announcement.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={typeConfig[announcement.type].label} 
                          size='small' 
                          color={typeConfig[announcement.type].color}
                        />
                      </TableCell>
                      <TableCell>{announcement.priority}</TableCell>
                      <TableCell>
                        <Switch 
                          checked={announcement.isActive} 
                          onChange={() => handleToggleActive(announcement)}
                          size='small'
                        />
                      </TableCell>
                      <TableCell>
                        <Switch 
                          checked={announcement.isPinned} 
                          onChange={() => handleTogglePinned(announcement)}
                          size='small'
                          color='warning'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {new Date(announcement.createdAt).toLocaleString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title='编辑'>
                          <IconButton size='small' onClick={() => handleOpenDialog(announcement)}>
                            <i className='ri-edit-line' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='删除'>
                          <IconButton size='small' color='error' onClick={() => handleDelete(announcement.id)}>
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth='md' fullWidth>
        <DialogTitle>{editingAnnouncement ? '编辑公告' : '发布公告'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            fullWidth
            label='标题'
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          
          <TextField
            fullWidth
            label='内容 (支持 Markdown)'
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            multiline
            rows={10}
            sx={{ mb: 2 }}
            placeholder='支持 Markdown 格式，可以使用 **粗体**、*斜体*、[链接](url) 等'
          />
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>类型</InputLabel>
              <Select
                value={formData.type}
                label='类型'
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <MenuItem value='info'>通知</MenuItem>
                <MenuItem value='success'>成功</MenuItem>
                <MenuItem value='warning'>警告</MenuItem>
                <MenuItem value='error'>紧急</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              type='number'
              label='优先级'
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              sx={{ width: 120 }}
              helperText='数字越大越靠前'
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label='启用公告'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  color='warning'
                />
              }
              label='弹窗显示'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button variant='contained' onClick={handleSubmit}>
            {editingAnnouncement ? '保存' : '发布'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
