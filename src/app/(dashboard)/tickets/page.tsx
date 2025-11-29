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
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import Grid from '@mui/material/Grid2'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface TicketReply {
  id: string
  content: string
  userId: string
  username: string
  isAdmin: boolean
  createdAt: string
}

interface Ticket {
  id: string
  title: string
  content: string
  category: string
  status: 'pending' | 'processing' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'
  userId: string
  username: string
  replies: TicketReply[]
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  resolvedBy?: string
}

const categoryNames: Record<string, string> = {
  missing_subtitle: '缺少字幕',
  video_quality: '画质问题',
  playback_issue: '播放问题',
  request_content: '内容请求',
  account_issue: '账户问题',
  other: '其他问题'
}

const statusConfig = {
  pending: { label: '待处理', color: 'warning' as const },
  processing: { label: '处理中', color: 'info' as const },
  resolved: { label: '已解决', color: 'success' as const },
  closed: { label: '已关闭', color: 'default' as const }
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  
  // 新建工单
  const [createOpen, setCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'other'
  })
  
  // 工单详情
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replyContent, setReplyContent] = useState('')
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadTickets()
    }
  }, [currentUser])

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
        setIsAdmin(data.user.role === 'admin')
      }
    } catch (e) {
      console.error('Load user failed:', e)
    }
  }

  const loadTickets = async () => {
    try {
      const res = await fetch('/api/tickets')
      const data = await res.json()
      if (data.tickets) {
        setTickets(data.tickets)
      }
    } catch (e) {
      console.error('Load tickets failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubmit = async () => {
    if (!formData.title || !formData.content) {
      setError('标题和内容不能为空')
      return
    }

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '创建失败')
        return
      }

      setSuccess('工单已提交')
      setCreateOpen(false)
      setFormData({ title: '', content: '', category: 'other' })
      loadTickets()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError('创建失败')
    }
  }

  const handleViewDetail = async (ticket: Ticket) => {
    // 重新加载最新数据
    try {
      const res = await fetch(`/api/tickets?id=${ticket.id}`)
      const data = await res.json()
      if (data.ticket) {
        setSelectedTicket(data.ticket)
        setDetailOpen(true)
      }
    } catch (e) {
      console.error('Load ticket failed:', e)
    }
  }

  const handleReply = async () => {
    if (!replyContent || !selectedTicket) return

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          ticketId: selectedTicket.id,
          content: replyContent
        })
      })

      const data = await res.json()
      if (res.ok && data.ticket) {
        setSelectedTicket(data.ticket)
        setReplyContent('')
        loadTickets()
      }
    } catch (e) {
      console.error('Reply failed:', e)
    }
  }

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return

    try {
      const res = await fetch('/api/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTicket.id, status })
      })

      const data = await res.json()
      if (res.ok && data.ticket) {
        setSelectedTicket(data.ticket)
        loadTickets()
      }
    } catch (e) {
      console.error('Update status failed:', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个工单吗？')) return

    try {
      const res = await fetch(`/api/tickets?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('工单已删除')
        loadTickets()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  // 过滤工单
  const filteredTickets = tickets.filter(t => {
    if (activeTab === 0) return true
    if (activeTab === 1) return t.status === 'pending'
    if (activeTab === 2) return t.status === 'processing'
    if (activeTab === 3) return t.status === 'resolved' || t.status === 'closed'
    return true
  })

  if (loading) {
    return (
      <Card>
        <CardHeader title='工单系统' />
        <CardContent>
          <Skeleton variant='rounded' height={300} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Box>
      {success && <Alert severity='success' sx={{ mb: 3 }}>{success}</Alert>}

      <Card>
        <CardHeader
          title='工单系统'
          subheader={isAdmin ? '处理用户提交的问题反馈' : '提交问题反馈，我们会尽快处理'}
          action={
            <Button 
              variant='contained' 
              startIcon={<i className='ri-add-line' />} 
              onClick={() => setCreateOpen(true)}
            >
              提交工单
            </Button>
          }
        />
        <CardContent>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
            <Tab label={`全部 (${tickets.length})`} />
            <Tab label={`待处理 (${tickets.filter(t => t.status === 'pending').length})`} />
            <Tab label={`处理中 (${tickets.filter(t => t.status === 'processing').length})`} />
            <Tab label={`已完成 (${tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length})`} />
          </Tabs>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>标题</TableCell>
                  <TableCell>分类</TableCell>
                  {isAdmin && <TableCell>提交者</TableCell>}
                  <TableCell>状态</TableCell>
                  <TableCell>回复</TableCell>
                  <TableCell>提交时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} align='center'>
                      <Typography color='text.secondary' sx={{ py: 4 }}>
                        暂无工单
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id} 
                      hover 
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleViewDetail(ticket)}
                    >
                      <TableCell>
                        <Typography fontWeight={500}>{ticket.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={categoryNames[ticket.category]} size='small' variant='outlined' />
                      </TableCell>
                      {isAdmin && <TableCell>{ticket.username}</TableCell>}
                      <TableCell>
                        <Chip 
                          label={statusConfig[ticket.status].label} 
                          size='small' 
                          color={statusConfig[ticket.status].color}
                        />
                      </TableCell>
                      <TableCell>{ticket.replies.length}</TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {new Date(ticket.createdAt).toLocaleString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Tooltip title='查看详情'>
                          <IconButton size='small' onClick={() => handleViewDetail(ticket)}>
                            <i className='ri-eye-line' />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          <Tooltip title='删除'>
                            <IconButton size='small' color='error' onClick={() => handleDelete(ticket.id)}>
                              <i className='ri-delete-bin-line' />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 新建工单对话框 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>提交工单</DialogTitle>
        <DialogContent>
          {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
          
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>问题分类</InputLabel>
            <Select
              value={formData.category}
              label='问题分类'
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <MenuItem value='missing_subtitle'>缺少字幕</MenuItem>
              <MenuItem value='video_quality'>画质问题</MenuItem>
              <MenuItem value='playback_issue'>播放问题</MenuItem>
              <MenuItem value='request_content'>内容请求</MenuItem>
              <MenuItem value='account_issue'>账户问题</MenuItem>
              <MenuItem value='other'>其他问题</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label='标题'
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
            placeholder='简要描述您的问题'
          />
          
          <TextField
            fullWidth
            label='详细描述'
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            multiline
            rows={6}
            placeholder='请详细描述您遇到的问题，如影片名称、具体表现等'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button variant='contained' onClick={handleCreateSubmit}>提交</Button>
        </DialogActions>
      </Dialog>

      {/* 工单详情对话框 */}
      <Dialog 
        open={detailOpen} 
        onClose={() => setDetailOpen(false)} 
        maxWidth='md' 
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        {selectedTicket && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant='h6'>{selectedTicket.title}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={categoryNames[selectedTicket.category]} size='small' variant='outlined' />
                  <Chip 
                    label={statusConfig[selectedTicket.status].label} 
                    size='small' 
                    color={statusConfig[selectedTicket.status].color}
                  />
                  <Typography variant='caption' color='text.secondary' sx={{ alignSelf: 'center' }}>
                    {selectedTicket.username} · {new Date(selectedTicket.createdAt).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
              </Box>
              {isAdmin && selectedTicket.status !== 'closed' && (
                <FormControl size='small' sx={{ minWidth: 120 }}>
                  <Select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    size='small'
                  >
                    <MenuItem value='pending'>待处理</MenuItem>
                    <MenuItem value='processing'>处理中</MenuItem>
                    <MenuItem value='resolved'>已解决</MenuItem>
                    <MenuItem value='closed'>关闭</MenuItem>
                  </Select>
                </FormControl>
              )}
            </DialogTitle>
            
            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* 原始问题 */}
              <Box sx={{ 
                bgcolor: 'action.hover', 
                p: 2, 
                borderRadius: 1, 
                mb: 2,
                '& p': { my: 0.5 }
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedTicket.content}
                </ReactMarkdown>
              </Box>
              
              <Divider sx={{ my: 2 }}>
                <Typography variant='caption' color='text.secondary'>
                  回复 ({selectedTicket.replies.length})
                </Typography>
              </Divider>
              
              {/* 回复列表 */}
              <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
                {selectedTicket.replies.map((reply) => (
                  <Box 
                    key={reply.id} 
                    sx={{ 
                      display: 'flex', 
                      gap: 2, 
                      mb: 2,
                      flexDirection: reply.isAdmin ? 'row-reverse' : 'row'
                    }}
                  >
                    <Avatar sx={{ 
                      bgcolor: reply.isAdmin ? 'primary.main' : 'grey.500',
                      width: 32,
                      height: 32
                    }}>
                      {reply.isAdmin ? <i className='ri-customer-service-line' /> : reply.username[0].toUpperCase()}
                    </Avatar>
                    <Box sx={{ maxWidth: '70%' }}>
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        mb: 0.5,
                        flexDirection: reply.isAdmin ? 'row-reverse' : 'row'
                      }}>
                        <Typography variant='subtitle2'>
                          {reply.username}
                          {reply.isAdmin && (
                            <Chip label='管理员' size='small' color='primary' sx={{ ml: 1, height: 18 }} />
                          )}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {new Date(reply.createdAt).toLocaleString('zh-CN')}
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        bgcolor: reply.isAdmin ? 'primary.main' : 'action.hover',
                        color: reply.isAdmin ? 'primary.contrastText' : 'text.primary',
                        p: 1.5,
                        borderRadius: 2,
                        '& p': { my: 0.5 }
                      }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {reply.content}
                        </ReactMarkdown>
                      </Box>
                    </Box>
                  </Box>
                ))}
                
                {selectedTicket.replies.length === 0 && (
                  <Typography color='text.secondary' align='center' sx={{ py: 4 }}>
                    暂无回复
                  </Typography>
                )}
              </Box>
              
              {/* 回复输入框 */}
              {selectedTicket.status !== 'closed' && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder='输入回复内容...'
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    size='small'
                    multiline
                    maxRows={3}
                  />
                  <Button 
                    variant='contained' 
                    onClick={handleReply}
                    disabled={!replyContent}
                  >
                    发送
                  </Button>
                </Box>
              )}
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setDetailOpen(false)}>关闭</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
