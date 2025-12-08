'use client'

import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Grid from '@mui/material/Grid2'
import Snackbar from '@mui/material/Snackbar'
import CustomAvatar from '@core/components/mui/Avatar'

interface CardItem {
  id: string
  code: string
  type: 'day' | 'month' | 'quarter' | 'year' | 'whitelist' | 'custom'
  status: 'unused' | 'used'
  createdAt: string
  usedAt?: string
  usedBy?: string
  usedByUsername?: string
  customStartDate?: string
  customEndDate?: string
}

interface Stats {
  total: number
  unused: number
  used: number
  byType: Record<string, number>
}

const typeNames: Record<string, string> = {
  day: '天卡',
  month: '月卡',
  quarter: '季卡',
  year: '年卡',
  whitelist: '白名单',
  custom: '自定义'
}

const typeColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  day: 'default',
  month: 'primary',
  quarter: 'success',
  year: 'warning',
  whitelist: 'error',
  custom: 'info'
}

export default function CardManagePage() {
  const [cards, setCards] = useState<CardItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState<string>('month')
  const [createCount, setCreateCount] = useState(1)
  const [createLoading, setCreateLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState(0) // 0: 未使用, 1: 已使用
  const [copySnackbar, setCopySnackbar] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  useEffect(() => {
    loadCards()
  }, [])

  const loadCards = async () => {
    try {
      const res = await fetch('/api/admin/cards')
      if (res.ok) {
        const data = await res.json()
        setCards(data.cards || [])
        setStats(data.stats)
      }
    } catch (e) {
      console.error('Load cards failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (createType === 'custom') {
      if (!customStartDate || !customEndDate) {
        setMessage({ type: 'error', text: '请选择开通日期和到期日期' })
        return
      }
      if (new Date(customEndDate) <= new Date(customStartDate)) {
        setMessage({ type: 'error', text: '到期日期必须晚于开通日期' })
        return
      }
    }
    setCreateLoading(true)
    try {
      const body: any = { type: createType, count: createCount }
      if (createType === 'custom') {
        body.customStartDate = customStartDate
        body.customEndDate = customEndDate
      }
      const res = await fetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        setCreateOpen(false)
        setCustomStartDate('')
        setCustomEndDate('')
        loadCards()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (e) {
      setMessage({ type: 'error', text: '创建失败' })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDelete = async (cardId: string) => {
    if (!confirm('确定要删除这张卡密吗？')) return
    try {
      const res = await fetch(`/api/admin/cards?id=${cardId}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ type: 'success', text: '已删除' })
        loadCards()
      }
    } catch (e) {
      setMessage({ type: 'error', text: '删除失败' })
    }
  }

  const handleDeleteUsed = async () => {
    if (!confirm('确定要删除所有已使用的卡密吗？')) return
    try {
      const res = await fetch('/api/admin/cards?deleteUsed=true', { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        loadCards()
      }
    } catch (e) {
      setMessage({ type: 'error', text: '删除失败' })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopySnackbar(true)
  }

  const filteredCards = cards.filter(c => 
    activeTab === 0 ? c.status === 'unused' : c.status === 'used'
  )

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton variant='rounded' height={400} />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' fontWeight={700}>卡密管理</Typography>
        <Typography color='text.secondary'>管理 Emby 会员激活卡密</Typography>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* 统计卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h4' fontWeight={700} color='primary.main'>
                {stats?.total || 0}
              </Typography>
              <Typography variant='body2' color='text.secondary'>总卡密</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h4' fontWeight={700} color='success.main'>
                {stats?.unused || 0}
              </Typography>
              <Typography variant='body2' color='text.secondary'>未使用</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h4' fontWeight={700} color='text.secondary'>
                {stats?.used || 0}
              </Typography>
              <Typography variant='body2' color='text.secondary'>已使用</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h4' fontWeight={700}>
                {stats?.byType?.month || 0}
              </Typography>
              <Typography variant='body2' color='text.secondary'>月卡</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h4' fontWeight={700}>
                {stats?.byType?.year || 0}
              </Typography>
              <Typography variant='body2' color='text.secondary'>年卡</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h4' fontWeight={700} color='error.main'>
                {stats?.byType?.whitelist || 0}
              </Typography>
              <Typography variant='body2' color='text.secondary'>白名单</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 操作按钮 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant='contained' 
          startIcon={<i className='ri-add-line' />}
          onClick={() => setCreateOpen(true)}
        >
          生成卡密
        </Button>
        {stats && stats.used > 0 && (
          <Button 
            variant='outlined' 
            color='error'
            startIcon={<i className='ri-delete-bin-line' />}
            onClick={handleDeleteUsed}
          >
            清理已使用
          </Button>
        )}
      </Box>

      {/* 卡密列表 */}
      <Card>
        <CardHeader 
          title={
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label={`未使用 (${stats?.unused || 0})`} />
              <Tab label={`已使用 (${stats?.used || 0})`} />
            </Tabs>
          }
        />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>卡密</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>创建时间</TableCell>
                {activeTab === 1 && <TableCell>使用者</TableCell>}
                {activeTab === 1 && <TableCell>使用时间</TableCell>}
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={activeTab === 0 ? 4 : 6} sx={{ textAlign: 'center', py: 8 }}>
                    <Typography color='text.secondary'>
                      {activeTab === 0 ? '暂无未使用的卡密' : '暂无已使用的卡密'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCards.map(card => (
                  <TableRow key={card.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          fontFamily='monospace' 
                          fontWeight={600}
                          sx={{ letterSpacing: 1 }}
                        >
                          {card.code}
                        </Typography>
                        <Tooltip title='复制'>
                          <IconButton size='small' onClick={() => copyToClipboard(card.code)}>
                            <i className='ri-file-copy-line text-base' />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={card.type === 'custom' && card.customStartDate && card.customEndDate
                          ? `${card.customStartDate} ~ ${card.customEndDate}`
                          : typeNames[card.type]} 
                        size='small' 
                        color={typeColors[card.type]}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {new Date(card.createdAt).toLocaleString('zh-CN')}
                      </Typography>
                    </TableCell>
                    {activeTab === 1 && (
                      <TableCell>
                        <Typography>{card.usedByUsername || '-'}</Typography>
                      </TableCell>
                    )}
                    {activeTab === 1 && (
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {card.usedAt ? new Date(card.usedAt).toLocaleString('zh-CN') : '-'}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Tooltip title='删除'>
                        <IconButton size='small' color='error' onClick={() => handleDelete(card.id)}>
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
      </Card>

      {/* 生成卡密弹窗 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>生成卡密</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>卡密类型</InputLabel>
              <Select
                value={createType}
                label='卡密类型'
                onChange={e => {
                  setCreateType(e.target.value)
                  if (e.target.value !== 'custom') {
                    setCustomStartDate('')
                    setCustomEndDate('')
                  }
                }}
              >
                <MenuItem value='day'>天卡 (1天)</MenuItem>
                <MenuItem value='month'>月卡 (30天)</MenuItem>
                <MenuItem value='quarter'>季卡 (90天)</MenuItem>
                <MenuItem value='year'>年卡 (365天)</MenuItem>
                <MenuItem value='whitelist'>白名单 (永久)</MenuItem>
                <MenuItem value='custom'>自定义时间</MenuItem>
              </Select>
            </FormControl>
            
            {createType === 'custom' && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  type='date'
                  label='开通日期'
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
                <TextField
                  fullWidth
                  type='date'
                  label='到期日期'
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Box>
            )}
            
            <TextField
              fullWidth
              type='number'
              label='生成数量'
              value={createCount}
              onChange={e => setCreateCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              inputProps={{ min: 1, max: 100 }}
              helperText='最多一次生成100张'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button 
            variant='contained' 
            onClick={handleCreate}
            disabled={createLoading}
          >
            {createLoading ? '生成中...' : '生成'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 复制成功提示 */}
      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={() => setCopySnackbar(false)}
        message='已复制到剪贴板'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
