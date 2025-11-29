'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Avatar from '@mui/material/Avatar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tooltip from '@mui/material/Tooltip'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import LinearProgress from '@mui/material/LinearProgress'

interface MediaRequest {
  id: string
  tmdbId: number
  type: 'movie' | 'tv'
  title: string
  originalTitle?: string
  poster?: string
  backdrop?: string
  year: string
  overview?: string
  searchKeyword?: string
  status: 'pending' | 'approved' | 'available' | 'deleted'
  requestedBy: string
  userId?: string
  requestedAt: string
  reviewedBy?: string
  reviewedAt?: string
  availableAt?: string
  note?: string
  autoApproved?: boolean
}

export default function RequestManagePage() {
  const [requests, setRequests] = useState<MediaRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'available'>('all')
  const [selectedRequest, setSelectedRequest] = useState<MediaRequest | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
    // 每 30 秒自动刷新（检测入库状态）
    const interval = setInterval(loadRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (e) {
      console.error('Load requests failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (request: MediaRequest) => {
    setProcessing(request.id)
    try {
      const res = await fetch(`/api/requests/${request.id}/approve`, {
        method: 'POST'
      })
      if (res.ok) {
        loadRequests()
      }
    } catch (e) {
      console.error('Approve failed:', e)
    } finally {
      setProcessing(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个求片请求吗？')) return
    setProcessing(id)
    try {
      await fetch(`/api/requests/${id}`, { method: 'DELETE' })
      loadRequests()
    } catch (e) {
      console.error('Delete failed:', e)
    } finally {
      setProcessing(null)
    }
  }

  const getStatusChip = (status: string, autoApproved?: boolean) => {
    switch (status) {
      case 'pending':
        return <Chip label='待审核' size='small' color='warning' />
      case 'approved':
        return <Chip label='订阅中' size='small' color='info' />
      case 'available':
        return (
          <Chip 
            label={autoApproved ? '已入库(自动)' : '已入库'} 
            size='small' 
            color='success' 
          />
        )
      default:
        return <Chip label={status} size='small' />
    }
  }

  const filteredRequests = requests.filter(r => 
    statusFilter === 'all' || r.status === statusFilter
  )

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    available: requests.filter(r => r.status === 'available').length,
    total: requests.length
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='ri-file-list-3-line text-3xl' style={{ color: 'var(--mui-palette-primary-main)' }} />
          <Typography variant='h4' fontWeight={700}>求片管理</Typography>
          {stats.pending > 0 && (
            <Chip label={`${stats.pending} 待处理`} size='small' color='warning' />
          )}
        </Box>
        <Typography color='text.secondary' sx={{ mt: 0.5, ml: 0.5 }}>
          管理用户的求片请求，审核通过后自动推送到 MoviePilot 订阅
        </Typography>
      </Box>

      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        {[
          { label: '待审核', count: stats.pending, color: 'warning.main', icon: 'ri-time-line' },
          { label: '订阅中', count: stats.approved, color: 'info.main', icon: 'ri-download-cloud-line' },
          { label: '已入库', count: stats.available, color: 'success.main', icon: 'ri-checkbox-circle-line' },
          { label: '总请求', count: stats.total, color: 'primary.main', icon: 'ri-file-list-3-line' },
        ].map(stat => (
          <Card key={stat.label} sx={{ flex: '1 1 200px', minWidth: 180 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: stat.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className={`${stat.icon} text-xl`} style={{ color: 'white' }} />
              </Box>
              <Box>
                <Typography variant='h4' fontWeight={700}>{stat.count}</Typography>
                <Typography variant='body2' color='text.secondary'>{stat.label}</Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* 筛选标签 */}
      <Tabs value={statusFilter} onChange={(_, v) => setStatusFilter(v)} sx={{ mb: 3 }}>
        <Tab value='all' label={`全部 (${stats.total})`} />
        <Tab value='pending' label={`待审核 (${stats.pending})`} />
        <Tab value='approved' label={`订阅中 (${stats.approved})`} />
        <Tab value='available' label={`已入库 (${stats.available})`} />
      </Tabs>

      {/* 请求列表 */}
      <Card>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={80}>海报</TableCell>
                <TableCell>媒体信息</TableCell>
                <TableCell width={120}>请求用户</TableCell>
                <TableCell width={140}>搜索关键词</TableCell>
                <TableCell width={100}>状态</TableCell>
                <TableCell width={120}>请求时间</TableCell>
                <TableCell width={140} align='right'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton variant='rounded' width={50} height={75} /></TableCell>
                    <TableCell><Skeleton width='80%' /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell><Skeleton width={60} /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                  </TableRow>
                ))
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <i className='ri-inbox-line text-5xl' style={{ color: 'var(--mui-palette-text-secondary)', opacity: 0.5 }} />
                      <Typography color='text.secondary' sx={{ mt: 2 }}>
                        暂无求片请求
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map(request => (
                  <TableRow 
                    key={request.id}
                    sx={{ 
                      '&:hover': { bgcolor: 'action.hover' },
                      opacity: processing === request.id ? 0.5 : 1
                    }}
                  >
                    {/* 海报 */}
                    <TableCell>
                      <Box
                        sx={{
                          width: 50,
                          height: 75,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setSelectedRequest(request)
                          setDetailOpen(true)
                        }}
                      >
                        {request.poster ? (
                          <img src={request.poster} alt={request.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <i className='ri-film-line text-xl text-textSecondary' />
                        )}
                      </Box>
                    </TableCell>
                    
                    {/* 媒体信息 */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={600} noWrap sx={{ maxWidth: 200 }}>
                          {request.title}
                        </Typography>
                        <Chip 
                          label={request.type === 'movie' ? '电影' : '剧集'} 
                          size='small' 
                          variant='outlined'
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      </Box>
                      <Typography variant='caption' color='text.secondary'>
                        {request.year} · TMDB: {request.tmdbId}
                      </Typography>
                    </TableCell>
                    
                    {/* 请求用户 */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                          {request.requestedBy.charAt(0)}
                        </Avatar>
                        <Typography variant='body2' noWrap sx={{ maxWidth: 80 }}>
                          {request.requestedBy}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    {/* 搜索关键词 */}
                    <TableCell>
                      {request.searchKeyword ? (
                        <Chip 
                          label={request.searchKeyword} 
                          size='small' 
                          variant='outlined'
                          icon={<i className='ri-search-line' style={{ fontSize: 12 }} />}
                          sx={{ maxWidth: 130 }}
                        />
                      ) : (
                        <Typography variant='caption' color='text.secondary'>-</Typography>
                      )}
                    </TableCell>
                    
                    {/* 状态 */}
                    <TableCell>
                      {getStatusChip(request.status, request.autoApproved)}
                    </TableCell>
                    
                    {/* 请求时间 */}
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {formatDate(request.requestedAt)}
                      </Typography>
                    </TableCell>
                    
                    {/* 操作 */}
                    <TableCell align='right'>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {request.status === 'pending' && (
                          <Tooltip title='通过审核（推送到 MoviePilot）'>
                            <IconButton 
                              size='small' 
                              color='success'
                              onClick={() => handleApprove(request)}
                              disabled={processing === request.id}
                            >
                              <i className='ri-check-line' />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title='查看详情'>
                          <IconButton 
                            size='small' 
                            color='primary'
                            onClick={() => {
                              setSelectedRequest(request)
                              setDetailOpen(true)
                            }}
                          >
                            <i className='ri-eye-line' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='删除'>
                          <IconButton 
                            size='small' 
                            color='error'
                            onClick={() => handleDelete(request.id)}
                            disabled={processing === request.id}
                          >
                            <i className='ri-delete-bin-line' />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 详情弹窗 */}
      <Dialog 
        open={detailOpen} 
        onClose={() => setDetailOpen(false)} 
        maxWidth='sm' 
        fullWidth
        PaperProps={{
          sx: {
            backgroundImage: selectedRequest?.backdrop 
              ? `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(${selectedRequest.backdrop})`
              : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }
        }}
      >
        {selectedRequest && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 60,
                  height: 90,
                  borderRadius: 1,
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: 3
                }}
              >
                {selectedRequest.poster ? (
                  <img src={selectedRequest.poster} alt={selectedRequest.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className='ri-film-line text-2xl text-textSecondary' />
                  </Box>
                )}
              </Box>
              <Box>
                <Typography variant='h6' fontWeight={600}>
                  {selectedRequest.title}
                </Typography>
                {selectedRequest.originalTitle && selectedRequest.originalTitle !== selectedRequest.title && (
                  <Typography variant='body2' color='text.secondary'>
                    {selectedRequest.originalTitle}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={selectedRequest.type === 'movie' ? '电影' : '剧集'} size='small' variant='outlined' />
                  <Chip label={selectedRequest.year} size='small' variant='outlined' />
                  {getStatusChip(selectedRequest.status, selectedRequest.autoApproved)}
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* 概述 */}
                {selectedRequest.overview && (
                  <Box>
                    <Typography variant='subtitle2' color='text.secondary' gutterBottom>
                      简介
                    </Typography>
                    <Typography variant='body2'>
                      {selectedRequest.overview}
                    </Typography>
                  </Box>
                )}
                
                {/* 请求信息 */}
                <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2 }}>
                  <Typography variant='subtitle2' color='text.secondary' gutterBottom>
                    请求详情
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>请求用户</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                          {selectedRequest.requestedBy.charAt(0)}
                        </Avatar>
                        <Typography variant='body2'>{selectedRequest.requestedBy}</Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>搜索关键词</Typography>
                      <Typography variant='body2'>{selectedRequest.searchKeyword || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>请求时间</Typography>
                      <Typography variant='body2'>{new Date(selectedRequest.requestedAt).toLocaleString('zh-CN')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>TMDB ID</Typography>
                      <Typography variant='body2'>
                        <a 
                          href={`https://www.themoviedb.org/${selectedRequest.type}/${selectedRequest.tmdbId}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          style={{ color: 'inherit' }}
                        >
                          {selectedRequest.tmdbId} ↗
                        </a>
                      </Typography>
                    </Box>
                    {selectedRequest.reviewedAt && (
                      <>
                        <Box>
                          <Typography variant='caption' color='text.secondary'>审核人</Typography>
                          <Typography variant='body2'>{selectedRequest.reviewedBy}</Typography>
                        </Box>
                        <Box>
                          <Typography variant='caption' color='text.secondary'>审核时间</Typography>
                          <Typography variant='body2'>{new Date(selectedRequest.reviewedAt).toLocaleString('zh-CN')}</Typography>
                        </Box>
                      </>
                    )}
                    {selectedRequest.availableAt && (
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant='caption' color='text.secondary'>入库时间</Typography>
                        <Typography variant='body2'>
                          {new Date(selectedRequest.availableAt).toLocaleString('zh-CN')}
                          {selectedRequest.autoApproved && (
                            <Chip label='自动入库' size='small' color='success' sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailOpen(false)}>关闭</Button>
              {selectedRequest.status === 'pending' && (
                <Button 
                  variant='contained' 
                  color='success'
                  onClick={() => {
                    handleApprove(selectedRequest)
                    setDetailOpen(false)
                  }}
                  startIcon={<i className='ri-check-line' />}
                >
                  通过审核
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
