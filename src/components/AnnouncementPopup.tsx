'use client'

import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'error'
  priority: number
  createdAt: string
}

const typeConfig = {
  info: { label: '通知', color: 'info' as const, icon: 'ri-information-line' },
  warning: { label: '警告', color: 'warning' as const, icon: 'ri-alert-line' },
  success: { label: '成功', color: 'success' as const, icon: 'ri-checkbox-circle-line' },
  error: { label: '紧急', color: 'error' as const, icon: 'ri-error-warning-line' }
}

export default function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements?type=pinned')
      const data = await res.json()
      
      if (data.announcements && data.announcements.length > 0) {
        // 检查本地存储，看看用户是否已经看过这些公告
        const seenIds = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]')
        const unseenAnnouncements = data.announcements.filter(
          (a: Announcement) => !seenIds.includes(a.id)
        )
        
        if (unseenAnnouncements.length > 0) {
          setAnnouncements(unseenAnnouncements)
          setOpen(true)
        }
      }
    } catch (e) {
      console.error('Load announcements failed:', e)
    }
  }

  const handleClose = () => {
    // 标记当前公告为已读
    const seenIds = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]')
    const currentAnnouncement = announcements[currentIndex]
    
    if (currentAnnouncement && !seenIds.includes(currentAnnouncement.id)) {
      seenIds.push(currentAnnouncement.id)
      localStorage.setItem('seenAnnouncements', JSON.stringify(seenIds))
    }
    
    // 如果还有下一条公告，显示下一条
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setOpen(false)
    }
  }

  const handleSkipAll = () => {
    // 标记所有公告为已读
    const seenIds = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]')
    announcements.forEach(a => {
      if (!seenIds.includes(a.id)) {
        seenIds.push(a.id)
      }
    })
    localStorage.setItem('seenAnnouncements', JSON.stringify(seenIds))
    setOpen(false)
  }

  if (!open || announcements.length === 0) return null

  const currentAnnouncement = announcements[currentIndex]
  const config = typeConfig[currentAnnouncement.type]

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderTop: 4,
          borderColor: `${config.color}.main`
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <i className={config.icon} style={{ fontSize: 24 }} />
          <Typography variant='h6' component='span'>
            {currentAnnouncement.title}
          </Typography>
        </Box>
        <Chip label={config.label} size='small' color={config.color} />
        {announcements.length > 1 && (
          <Typography variant='caption' color='text.secondary'>
            {currentIndex + 1}/{announcements.length}
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ 
          '& p': { my: 1 },
          '& h1, & h2, & h3': { mt: 2, mb: 1 },
          '& ul, & ol': { pl: 3 },
          '& a': { color: 'primary.main' },
          '& code': { 
            bgcolor: 'action.hover', 
            px: 0.5, 
            py: 0.25, 
            borderRadius: 0.5,
            fontSize: '0.875em'
          },
          '& pre': {
            bgcolor: 'action.hover',
            p: 2,
            borderRadius: 1,
            overflow: 'auto'
          },
          '& blockquote': {
            borderLeft: 4,
            borderColor: 'divider',
            pl: 2,
            ml: 0,
            color: 'text.secondary'
          }
        }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {currentAnnouncement.content}
          </ReactMarkdown>
        </Box>
        
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
          发布于 {new Date(currentAnnouncement.createdAt).toLocaleString('zh-CN')}
        </Typography>
      </DialogContent>
      
      <DialogActions>
        {announcements.length > 1 && currentIndex < announcements.length - 1 && (
          <Button onClick={handleSkipAll} color='inherit'>
            全部跳过
          </Button>
        )}
        <Button onClick={handleClose} variant='contained'>
          {currentIndex < announcements.length - 1 ? '下一条' : '我知道了'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
