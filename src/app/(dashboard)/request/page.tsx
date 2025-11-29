'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Avatar from '@mui/material/Avatar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'

interface MediaRequest {
  id: string
  tmdbId: number
  type: 'movie' | 'tv'
  title: string
  originalTitle?: string
  poster?: string
  year: string
  status: 'pending' | 'approved' | 'available' | 'deleted'
  requestedBy: string
  requestedAt: string
  autoApproved?: boolean
  isMyRequest?: boolean
}

interface QuotaInfo {
  monthly: number
  used: number
  remaining: number
  exchanged: number
}

export default function RequestPage() {
  const [requests, setRequests] = useState<MediaRequest[]>([])
  const [myRequests, setMyRequests] = useState<MediaRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0)
  const [quota, setQuota] = useState<QuotaInfo>({ monthly: 3, used: 0, remaining: 3, exchanged: 0 })
  const [popcorn, setPopcorn] = useState(0)
  const [exchangeRate, setExchangeRate] = useState(50)
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false)
  const [exchangeAmount, setExchangeAmount] = useState(1)
  const [exchanging, setExchanging] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadRequests()
    // 每30秒自动刷新
    const interval = setInterval(loadRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/user/requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
        setMyRequests(data.myRequests || [])
        setQuota(data.quota)
        setPopcorn(data.popcorn)
        setExchangeRate(data.exchangeRate)
      }
    } catch (e) {
      console.error('Load requests failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleExchange = async () => {
    if (exchangeAmount < 1) return
    
    const cost = exchangeAmount * exchangeRate
    if (popcorn < cost) {
      setMessage({ type: 'error', text: `爆米花不足！需要 ${cost} 🍿` })
      return
    }
    
    setExchanging(true)
    try {
      const res = await fetch('/api/user/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange', amount: exchangeAmount })
      })
      
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        setExchangeDialogOpen(false)
        loadRequests()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (e) {
      setMessage({ type: 'error', text: '兑换失败' })
    } finally {
      setExchanging(false)
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
            label={autoApproved ? '已入库' : '已入库'} 
            size='small' 
            color='success' 
          />
        )
      default:
        return <Chip label={status} size='small' />
    }
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

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    available: requests.filter(r => r.status === 'available').length,
    total: requests.length
  }

  const totalQuota = quota.monthly + quota.exchanged
  const usedPercent = totalQuota > 0 ? (quota.used / totalQuota) * 100 : 0

  return (
    <Box>
      {/* 消息提示 */}
      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* 顶部统计卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 额度信息 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">本月求片额度</Typography>
                <Chip 
                  label={`${quota.remaining + quota.exchanged - (quota.used - quota.monthly > 0 ? quota.used - quota.monthly : 0)} / ${totalQuota}`} 
                  color="primary" 
                  size="small" 
                />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(usedPercent, 100)} 
                sx={{ mb: 2, height: 8, borderRadius: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  免费额度: {quota.monthly} 次
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  已用: {quota.used} 次
                </Typography>
              </Box>
              {quota.exchanged > 0 && (
                <Typography variant="body2" color="info.main" sx={{ mb: 2 }}>
                  已兑换额外额度: +{quota.exchanged} 次
                </Typography>
              )}
              <Button 
                variant="outlined" 
                fullWidth
                onClick={() => {
                  setExchangeAmount(1)
                  setExchangeDialogOpen(true)
                }}
              >
                用爆米花兑换额度 🍿
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 爆米花余额 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>爆米花余额</Typography>
              <Typography variant="h3" color="primary" sx={{ mb: 2 }}>
                {popcorn} 🍿
              </Typography>
              <Typography variant="body2" color="text.secondary">
                兑换比例: {exchangeRate} 🍿 = 1 次额度
              </Typography>
              <Typography variant="body2" color="text.secondary">
                可兑换: {Math.floor(popcorn / exchangeRate)} 次额度
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 求片统计 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>求片统计</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
                  <Typography variant="body2" color="text.secondary">待审核</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h4" color="info.main">{stats.approved}</Typography>
                  <Typography variant="body2" color="text.secondary">订阅中</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h4" color="success.main">{stats.available}</Typography>
                  <Typography variant="body2" color="text.secondary">已入库</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 标签页 */}
      <Card>
        <CardContent>
          <Tabs 
            value={tabValue} 
            onChange={(_, v) => setTabValue(v)}
            sx={{ mb: 3 }}
          >
            <Tab label={`全部求片 (${requests.length})`} />
            <Tab label={`我的求片 (${myRequests.length})`} />
          </Tabs>

          {loading ? (
            <Box>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 1 }} />
              ))}
            </Box>
          ) : (
            <Box>
              {(tabValue === 0 ? requests : myRequests).length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary">
                    {tabValue === 0 ? '暂无求片记录' : '您还没有求片记录'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    在搜索页面找到想看的影片，点击求片按钮即可
                  </Typography>
                </Box>
              ) : (
                (tabValue === 0 ? requests : myRequests).map((req) => (
                  <Box 
                    key={req.id}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      p: 2, 
                      mb: 2,
                      borderRadius: 2,
                      bgcolor: req.isMyRequest ? 'action.selected' : 'action.hover',
                      border: req.isMyRequest ? '1px solid' : 'none',
                      borderColor: 'primary.main'
                    }}
                  >
                    {/* 海报 */}
                    <Avatar
                      variant="rounded"
                      src={req.poster ? `https://image.tmdb.org/t/p/w92${req.poster}` : undefined}
                      sx={{ width: 60, height: 90, mr: 2 }}
                    >
                      {req.title.charAt(0)}
                    </Avatar>

                    {/* 信息 */}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {req.title}
                        </Typography>
                        <Chip 
                          label={req.type === 'movie' ? '电影' : '剧集'} 
                          size="small" 
                          variant="outlined"
                        />
                        {getStatusChip(req.status, req.autoApproved)}
                        {req.isMyRequest && (
                          <Chip label="我的" size="small" color="primary" variant="outlined" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {req.year} · {req.originalTitle || ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {req.requestedBy} · {formatDate(req.requestedAt)}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 兑换额度对话框 */}
      <Dialog 
        open={exchangeDialogOpen} 
        onClose={() => setExchangeDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>兑换求片额度</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              使用爆米花兑换额外的求片额度
            </Typography>
            
            <TextField
              fullWidth
              type="number"
              label="兑换数量"
              value={exchangeAmount}
              onChange={(e) => setExchangeAmount(Math.max(1, parseInt(e.target.value) || 1))}
              InputProps={{
                endAdornment: <InputAdornment position="end">次</InputAdornment>,
                inputProps: { min: 1 }
              }}
              sx={{ mb: 2 }}
            />

            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">兑换比例:</Typography>
                <Typography variant="body2">{exchangeRate} 🍿 / 次</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">需要消耗:</Typography>
                <Typography variant="body2" color="warning.main">
                  {exchangeAmount * exchangeRate} 🍿
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">当前余额:</Typography>
                <Typography 
                  variant="body2" 
                  color={popcorn >= exchangeAmount * exchangeRate ? 'success.main' : 'error.main'}
                >
                  {popcorn} 🍿
                </Typography>
              </Box>
            </Box>

            {popcorn < exchangeAmount * exchangeRate && (
              <Alert severity="error" sx={{ mt: 2 }}>
                爆米花不足！
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExchangeDialogOpen(false)}>取消</Button>
          <Button 
            variant="contained" 
            onClick={handleExchange}
            disabled={exchanging || popcorn < exchangeAmount * exchangeRate}
          >
            {exchanging ? '兑换中...' : '确认兑换'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
