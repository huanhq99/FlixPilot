'use client'

import { useState, useEffect } from 'react'
import {
  Card, CardContent, CardHeader, Typography, Box, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, Grid, Tabs, Tab, Checkbox, Tooltip, CircularProgress, Snackbar, InputAdornment,
  FormControlLabel, Switch, Avatar, Divider, Stack
} from '@mui/material'

// 本站用户接口
interface TrafficStats {
  downloadBytes?: number
  uploadBytes?: number
}

interface User {
  id: string
  username: string
  email?: string
  role: 'admin' | 'user'
  popcorn: number
  signInStreak: number
  embyUserId?: string
  embyUsername?: string
  membershipExpiry?: string
  membershipStartedAt?: string
  isWhitelist: boolean
  createdAt: string
  lastSignIn?: string
  monthlyTraffic?: number
  usedTraffic?: number
  trafficStats?: TrafficStats
}

// Emby用户接口
interface EmbyUser {
  Id: string
  Name: string
  Policy?: {
    IsDisabled?: boolean
    IsAdministrator?: boolean
  }
  LastLoginDate?: string
  LastActivityDate?: string
  DateCreated?: string
  PrimaryImageTag?: string
}

// Emby会话接口
interface EmbySession {
  Id: string
  UserId: string
  UserName: string
  Client: string
  DeviceName: string
  NowPlayingItem?: {
    Id: string
    Name: string
    SeriesName?: string
    Type: string
    MediaStreams?: Array<{
      Type: string
      BitRate?: number
    }>
  }
  PlayState?: {
    IsPaused?: boolean
    PlayMethod?: string
  }
  TranscodingInfo?: {
    Bitrate?: number
    CompletionPercentage?: number
    Width?: number
    Height?: number
    AudioCodec?: string
    VideoCodec?: string
    TranscodeReasons?: string[]
  }
}

export default function UserManagePage() {
  // 主Tab：本站用户 / Emby用户
  const [mainTab, setMainTab] = useState(0)

  // 本站用户相关状态
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Emby用户相关状态
  const [embyUsers, setEmbyUsers] = useState<EmbyUser[]>([])
  const [embyLoading, setEmbyLoading] = useState(false)
  const [embySessions, setEmbySessions] = useState<EmbySession[]>([])
  
  // Emby用户独立流量统计
  const [embyTrafficData, setEmbyTrafficData] = useState<{
    users: { [embyUserId: string]: { downloadBytes: number; uploadBytes: number } }
  }>({ users: {} })
  // 筛选
  const [filterTab, setFilterTab] = useState(0)
  const [searchKeyword, setSearchKeyword] = useState('')

  // 选中用户
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // 编辑弹窗
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // 从Emby导入弹窗
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importEmbyUsers, setImportEmbyUsers] = useState<EmbyUser[]>([])
  const [selectedEmbyUsers, setSelectedEmbyUsers] = useState<string[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importPassword, setImportPassword] = useState('')
  const [importAsWhitelist, setImportAsWhitelist] = useState(false)

  // 批量操作弹窗
  const [batchActionDialogOpen, setBatchActionDialogOpen] = useState(false)
  const [batchAction, setBatchAction] = useState<'delete' | 'setWhitelist' | 'removeWhitelist' | 'setExpiry' | null>(null)
  const [batchExpiryDate, setBatchExpiryDate] = useState('')

  // 加载本站用户列表
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('获取用户列表失败')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载Emby用户列表
  const fetchEmbyUsers = async () => {
    try {
      setEmbyLoading(true)
      const res = await fetch('/api/emby/Users')
      if (!res.ok) throw new Error('获取Emby用户列表失败')
      const data = await res.json()
      setEmbyUsers(data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载Emby用户失败')
    } finally {
      setEmbyLoading(false)
    }
  }

  // 加载Emby活跃会话
  const fetchEmbySessions = async () => {
    try {
      const res = await fetch('/api/emby/Sessions')
      if (res.ok) {
        const data = await res.json()
        setEmbySessions(data || [])
      }
    } catch {
      // 忽略会话加载错误
    }
  }

  // 加载Emby用户独立流量统计（会自动触发同步）
  const fetchEmbyTraffic = async () => {
    try {
      // 先触发同步检查（如果超过间隔会自动同步）
      await fetch('/api/traffic/sync')
      
      // 然后获取流量数据
      const res = await fetch('/api/traffic/report')
      if (res.ok) {
        const data = await res.json()
        setEmbyTrafficData(data || { users: {} })
      }
    } catch {
      // 忽略错误
    }
  }

  // 获取Emby用户流量（优先从独立存储，其次从绑定用户）
  const getEmbyUserTraffic = (embyUserId: string) => {
    // 1. 优先从独立流量存储获取
    const independentTraffic = embyTrafficData.users[embyUserId]
    if (independentTraffic) {
      return {
        downloadBytes: independentTraffic.downloadBytes || 0,
        uploadBytes: independentTraffic.uploadBytes || 0,
        totalBytes: (independentTraffic.downloadBytes || 0) + (independentTraffic.uploadBytes || 0)
      }
    }
    
    // 2. 如果没有，尝试从绑定的本站用户获取
    const boundUser = users.find(u => u.embyUserId === embyUserId)
    if (boundUser) {
      return getTrafficUsage(boundUser)
    }
    
    // 3. 都没有，返回null
    return null
  }

  // 获取用户的活跃会话
  const getUserSession = (userId: string): EmbySession | undefined => {
    return embySessions.find(s => s.UserId === userId && s.NowPlayingItem)
  }

  // 获取会话的实时码率（转码用TranscodingInfo，直接播放用媒体文件码率）
  const getSessionBitrate = (session?: EmbySession): number | undefined => {
    if (!session) return undefined
    // 优先使用转码信息的码率（这是实时的）
    if (session.TranscodingInfo?.Bitrate) {
      return session.TranscodingInfo.Bitrate
    }
    // 直接播放时，使用媒体文件的视频码率作为估算
    if (session.NowPlayingItem?.MediaStreams) {
      const videoStream = session.NowPlayingItem.MediaStreams.find(s => s.Type === 'Video')
      if (videoStream?.BitRate) {
        return videoStream.BitRate
      }
    }
    return undefined
  }

  // 格式化网速
  const formatBitrate = (bitrate?: number): string => {
    if (!bitrate) return '-'
    if (bitrate >= 1000000) {
      return `${(bitrate / 1000000).toFixed(1)} Mbps`
    }
    if (bitrate >= 1000) {
      return `${(bitrate / 1000).toFixed(0)} Kbps`
    }
    return `${bitrate} bps`
  }

  useEffect(() => {
    fetchUsers()
    fetchEmbyUsers()
    fetchEmbySessions()
    fetchEmbyTraffic()
    
    // 每2秒刷新会话数据（实时网速）
    const interval = setInterval(fetchEmbySessions, 2000)
    return () => clearInterval(interval)
  }, [])

  // 筛选本站用户
  const getFilteredUsers = () => {
    let filtered = users

    // 按Tab筛选
    switch (filterTab) {
      case 1: // 已绑定Emby
        filtered = filtered.filter(u => u.embyUserId)
        break
      case 2: // 未绑定Emby
        filtered = filtered.filter(u => !u.embyUserId)
        break
      case 3: // 会员有效
        filtered = filtered.filter(u => {
          if (u.isWhitelist) return true
          if (!u.membershipExpiry) return false
          return new Date(u.membershipExpiry) > new Date()
        })
        break
      case 4: // 已过期
        filtered = filtered.filter(u => {
          if (u.isWhitelist) return false
          if (!u.membershipExpiry) return true
          return new Date(u.membershipExpiry) <= new Date()
        })
        break
      case 5: // 白名单
        filtered = filtered.filter(u => u.isWhitelist)
        break
    }

    // 按关键词搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      filtered = filtered.filter(u =>
        u.username.toLowerCase().includes(keyword) ||
        u.embyUsername?.toLowerCase().includes(keyword) ||
        u.email?.toLowerCase().includes(keyword)
      )
    }

    return filtered
  }

  // 筛选Emby用户
  const getFilteredEmbyUsers = () => {
    if (!searchKeyword) return embyUsers
    const keyword = searchKeyword.toLowerCase()
    return embyUsers.filter(u => u.Name.toLowerCase().includes(keyword))
  }

  // 统计数据
  const getStats = () => {
    const total = users.length
    const bound = users.filter(u => u.embyUserId).length
    const unbound = users.filter(u => !u.embyUserId).length
    const active = users.filter(u => {
      if (u.isWhitelist) return true
      if (!u.membershipExpiry) return false
      return new Date(u.membershipExpiry) > new Date()
    }).length
    const expired = users.filter(u => {
      if (u.isWhitelist) return false
      if (!u.membershipExpiry) return true
      return new Date(u.membershipExpiry) <= new Date()
    }).length
    const whitelist = users.filter(u => u.isWhitelist).length

    return { total, bound, unbound, active, expired, whitelist }
  }

  // Emby统计
  const getEmbyStats = () => {
    const total = embyUsers.length
    const admin = embyUsers.filter(u => u.Policy?.IsAdministrator).length
    const disabled = embyUsers.filter(u => u.Policy?.IsDisabled).length
    const activeWeek = embyUsers.filter(u => {
      if (!u.LastActivityDate) return false
      const diff = Date.now() - new Date(u.LastActivityDate).getTime()
      return diff < 86400000 * 7
    }).length
    // 检查是否已绑定本站
    const boundIds = new Set(users.filter(u => u.embyUserId).map(u => u.embyUserId))
    const bound = embyUsers.filter(u => boundIds.has(u.Id)).length
    const unbound = total - bound

    return { total, admin, disabled, activeWeek, bound, unbound }
  }

  // 编辑用户
  const handleEditUser = (user: User) => {
    setEditingUser({ ...user })
    setEditDialogOpen(true)
  }

  // 保存用户
  const handleSaveUser = async () => {
    if (!editingUser) return

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      })

      if (!res.ok) throw new Error('保存失败')

      setSuccess('用户信息已更新')
      setEditDialogOpen(false)
      fetchUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？此操作不可恢复。')) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('删除失败')

      setSuccess('用户已删除')
      fetchUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  // 重置密码
  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('请输入新密码（至少6位）:')
    if (!newPassword || newPassword.length < 6) {
      setError('密码至少需要6位')
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })

      if (!res.ok) throw new Error('重置密码失败')

      setSuccess('密码已重置')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '重置密码失败')
    }
  }

  // 打开导入弹窗
  const handleOpenImportDialog = async () => {
    setImportDialogOpen(true)
    setImportLoading(true)
    setSelectedEmbyUsers([])
    setImportPassword('')
    setImportAsWhitelist(false)

    try {
      const res = await fetch('/api/admin/emby/users')
      if (!res.ok) throw new Error('获取Emby用户列表失败')
      const data = await res.json()

      // 过滤已绑定的用户
      const boundEmbyIds = new Set(users.filter(u => u.embyUserId).map(u => u.embyUserId))
      const unboundEmbyUsers = (data.users || []).filter((u: EmbyUser) => !boundEmbyIds.has(u.Id))

      setImportEmbyUsers(unboundEmbyUsers)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '获取Emby用户失败')
    } finally {
      setImportLoading(false)
    }
  }

  // 导入Emby用户
  const handleImportEmbyUsers = async () => {
    if (selectedEmbyUsers.length === 0) {
      setError('请选择要导入的用户')
      return
    }

    if (!importPassword || importPassword.length < 6) {
      setError('请设置导入密码（至少6位）')
      return
    }

    try {
      setImportLoading(true)
      const res = await fetch('/api/admin/emby/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embyUserIds: selectedEmbyUsers,
          password: importPassword,
          isWhitelist: importAsWhitelist
        })
      })

      if (!res.ok) throw new Error('导入失败')

      const data = await res.json()
      setSuccess(`成功导入 ${data.imported} 个用户`)
      setImportDialogOpen(false)
      fetchUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImportLoading(false)
    }
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    const filtered = getFilteredUsers()
    if (selectedUsers.length === filtered.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filtered.map(u => u.id))
    }
  }

  // 批量操作
  const handleBatchAction = async () => {
    if (!batchAction || selectedUsers.length === 0) return

    try {
      let endpoint = ''
      let body: Record<string, unknown> = { userIds: selectedUsers }

      switch (batchAction) {
        case 'delete':
          if (!confirm(`确定要删除选中的 ${selectedUsers.length} 个用户吗？`)) return
          endpoint = '/api/admin/users/batch-delete'
          break
        case 'setWhitelist':
          endpoint = '/api/admin/users/batch-update'
          body = { ...body, isWhitelist: true }
          break
        case 'removeWhitelist':
          endpoint = '/api/admin/users/batch-update'
          body = { ...body, isWhitelist: false }
          break
        case 'setExpiry':
          if (!batchExpiryDate) {
            setError('请选择到期日期')
            return
          }
          endpoint = '/api/admin/users/batch-update'
          body = { ...body, membershipExpiry: new Date(batchExpiryDate).toISOString() }
          break
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('操作失败')

      setSuccess('批量操作完成')
      setBatchActionDialogOpen(false)
      setSelectedUsers([])
      fetchUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
  }

  // 获取会员状态
  const getMembershipStatus = (user: User) => {
    if (user.isWhitelist) {
      return <Chip label="永久会员" color="success" size="small" />
    }
    if (!user.membershipExpiry) {
      return <Chip label="无会员" color="default" size="small" />
    }
    const expiry = new Date(user.membershipExpiry)
    const now = new Date()
    if (expiry <= now) {
      return <Chip label="已过期" color="error" size="small" />
    }
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 7) {
      return <Chip label={`剩余${daysLeft}天`} color="warning" size="small" />
    }
    return <Chip label={`剩余${daysLeft}天`} color="primary" size="small" />
  }

  // 格式化日期
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 格式化相对时间
  const formatRelativeDate = (dateStr?: string) => {
    if (!dateStr) return '从未'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

    return date.toLocaleDateString('zh-CN')
  }

  // 获取Emby用户头像
  const getEmbyAvatarUrl = (user: EmbyUser) => {
    if (user.PrimaryImageTag) {
      return `/api/emby/Users/${user.Id}/Images/Primary?tag=${user.PrimaryImageTag}&quality=90&maxWidth=100`
    }
    return null
  }

  // 检查Emby用户是否已绑定
  const isEmbyUserBound = (embyUserId: string) => {
    return users.some(u => u.embyUserId === embyUserId)
  }

  // 获取绑定的本站用户
  const getBoundUser = (embyUserId: string) => {
    return users.find(u => u.embyUserId === embyUserId)
  }

  const BYTES_PER_GB = 1024 * 1024 * 1024

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    let value = bytes
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex += 1
    }

    const formatted = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)
    return `${formatted} ${units[unitIndex]}`
  }

  const getTrafficUsage = (user: User) => {
    const downloadBytes = user.trafficStats?.downloadBytes ?? ((user.usedTraffic || 0) * BYTES_PER_GB)
    const uploadBytes = user.trafficStats?.uploadBytes ?? 0

    return {
      downloadBytes,
      uploadBytes,
      totalBytes: downloadBytes + uploadBytes
    }
  }

  const stats = getStats()
  const embyStats = getEmbyStats()
  const filteredUsers = getFilteredUsers()
  const filteredEmbyUsers = getFilteredEmbyUsers()

  if (loading && embyLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          <i className="ri-user-settings-line" style={{ marginRight: 8 }} />
          用户管理
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          管理本站用户和Emby用户
        </Typography>
      </Box>

      {/* 主Tab切换 */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={mainTab} onChange={(_, v) => { setMainTab(v); setSearchKeyword(''); setSelectedUsers([]) }}>
          <Tab label={`本站用户 (${stats.total})`} icon={<i className="ri-user-line" />} iconPosition="start" />
          <Tab label={`Emby用户 (${embyStats.total})`} icon={<i className="ri-movie-2-line" />} iconPosition="start" />
        </Tabs>
      </Card>

      {/* 本站用户Tab */}
      {mainTab === 0 && (
        <>
          {/* 统计卡片 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700}>{stats.total}</Typography>
                  <Typography variant="body2" color="text.secondary">总用户</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700} color="success.main">{stats.bound}</Typography>
                  <Typography variant="body2" color="text.secondary">已绑定</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700} color="warning.main">{stats.unbound}</Typography>
                  <Typography variant="body2" color="text.secondary">未绑定</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700} color="primary.main">{stats.active}</Typography>
                  <Typography variant="body2" color="text.secondary">有效会员</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700} color="error.main">{stats.expired}</Typography>
                  <Typography variant="body2" color="text.secondary">已过期</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700} color="info.main">{stats.whitelist}</Typography>
                  <Typography variant="body2" color="text.secondary">白名单</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 用户列表卡片 */}
          <Card>
            <CardHeader
              title="本站用户"
              action={
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    onClick={handleOpenImportDialog}
                    startIcon={<i className="ri-download-line" />}
                  >
                    从Emby导入
                  </Button>
                  {selectedUsers.length > 0 && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => setBatchActionDialogOpen(true)}
                    >
                      批量操作 ({selectedUsers.length})
                    </Button>
                  )}
                </Box>
              }
            />
            <CardContent>
              {/* 搜索和筛选 */}
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="搜索用户名/Emby用户名/邮箱"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <i className="ri-search-line" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Tabs value={filterTab} onChange={(_, v) => setFilterTab(v)} variant="scrollable" scrollButtons="auto">
                      <Tab label={`全部 (${users.length})`} />
                      <Tab label={`已绑定 (${stats.bound})`} />
                      <Tab label={`未绑定 (${stats.unbound})`} />
                      <Tab label={`会员有效 (${stats.active})`} />
                      <Tab label={`已过期 (${stats.expired})`} />
                      <Tab label={`白名单 (${stats.whitelist})`} />
                    </Tabs>
                  </Grid>
                </Grid>
              </Box>

              {/* 用户表格 */}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                          indeterminate={selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>用户名</TableCell>
                      <TableCell>角色</TableCell>
                      <TableCell>Emby账号</TableCell>
                      <TableCell>会员状态</TableCell>
                      <TableCell>开通时间</TableCell>
                      <TableCell>到期时间</TableCell>
                      <TableCell>注册时间</TableCell>
                      <TableCell>流量使用</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const traffic = getTrafficUsage(user)
                      const session = user.embyUserId ? getUserSession(user.embyUserId) : undefined
                      const realtimeBitrate = getSessionBitrate(session)
                      return (
                        <TableRow key={user.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id])
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{user.username}</Typography>
                          {user.email && <Typography variant="caption" color="text.secondary">{user.email}</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip label={user.role === 'admin' ? '管理员' : '用户'} color={user.role === 'admin' ? 'error' : 'default'} size="small" />
                        </TableCell>
                        <TableCell>
                          {user.embyUsername ? (
                            <Box>
                              <Typography variant="body2">{user.embyUsername}</Typography>
                              <Typography variant="caption" color="text.secondary">ID: {user.embyUserId?.substring(0, 8)}...</Typography>
                            </Box>
                          ) : (
                            <Chip label="未绑定" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>{getMembershipStatus(user)}</TableCell>
                        <TableCell><Typography variant="body2">{formatDate(user.membershipStartedAt)}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{user.isWhitelist ? '永久' : formatDate(user.membershipExpiry)}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{formatDate(user.createdAt)}</Typography></TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Chip
                                size="small"
                                variant="outlined"
                                icon={<i className="ri-download-cloud-2-line" />}
                                label={`下 ${formatBytes(traffic.downloadBytes)}`}
                              />
                              <Chip
                                size="small"
                                variant="outlined"
                                icon={<i className="ri-upload-cloud-2-line" />}
                                label={`上 ${formatBytes(traffic.uploadBytes)}`}
                              />
                              <Chip
                                size="small"
                                color="primary"
                                variant="outlined"
                                icon={<i className="ri-donut-chart-line" />}
                                label={`总 ${formatBytes(traffic.totalBytes)}`}
                              />
                            </Stack>
                            {realtimeBitrate ? (
                              <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <i className="ri-speed-line" />
                                实时: {formatBitrate(realtimeBitrate)}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            <Tooltip title="编辑">
                              <IconButton size="small" onClick={() => handleEditUser(user)}>
                                <i className="ri-edit-line" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="重置密码">
                              <IconButton size="small" onClick={() => handleResetPassword(user.id)}>
                                <i className="ri-key-line" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={user.role === 'admin' ? '不能删除管理员' : '删除'}>
                              <span>
                                <IconButton size="small" color="error" onClick={() => handleDeleteUser(user.id)} disabled={user.role === 'admin'}>
                                  <i className="ri-delete-bin-line" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>暂无用户数据</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Emby用户Tab */}
      {mainTab === 1 && (
        <>
          {/* Emby统计卡片 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700}>{embyStats.total}</Typography>
                  <Typography variant="body2" color="text.secondary">总用户</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700} color="primary.main">{embyStats.admin}</Typography>
                  <Typography variant="body2" color="text.secondary">管理员</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700} color="success.main">{embyStats.activeWeek}</Typography>
                  <Typography variant="body2" color="text.secondary">7日活跃</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700} color="error.main">{embyStats.disabled}</Typography>
                  <Typography variant="body2" color="text.secondary">已禁用</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700} color="info.main">{embyStats.bound}</Typography>
                  <Typography variant="body2" color="text.secondary">已绑定本站</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h5" fontWeight={700} color="warning.main">{embyStats.unbound}</Typography>
                  <Typography variant="body2" color="text.secondary">未绑定本站</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Emby用户列表 */}
          <Card>
            <CardHeader
              title="Emby用户"
              subheader="显示Emby服务器上的所有用户"
              action={
                <Button variant="outlined" onClick={() => fetchEmbyUsers()} startIcon={<i className="ri-refresh-line" />}>
                  刷新
                </Button>
              }
            />
            <CardContent>
              {/* 搜索 */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  size="small"
                  placeholder="搜索Emby用户名"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  sx={{ width: 300 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <i className="ri-search-line" />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              {embyLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>用户</TableCell>
                        <TableCell>角色</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell>流量使用</TableCell>
                        <TableCell>最后活动</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredEmbyUsers.map((user) => {
                        // 使用新的获取流量函数（优先独立存储，其次绑定用户）
                        const traffic = getEmbyUserTraffic(user.Id)
                        return (
                          <TableRow key={user.Id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={getEmbyAvatarUrl(user) || undefined} sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                                  {user.Name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>{user.Name}</Typography>
                                  <Typography variant="caption" color="text.secondary">ID: {user.Id.substring(0, 8)}...</Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {user.Policy?.IsAdministrator ? (
                                <Chip label="管理员" size="small" color="primary" />
                              ) : (
                                <Chip label="普通用户" size="small" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell>
                              {user.Policy?.IsDisabled ? (
                                <Chip label="已禁用" size="small" color="error" />
                              ) : (
                                <Chip label="正常" size="small" color="success" />
                              )}
                            </TableCell>
                            <TableCell>
                              {traffic ? (
                                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    icon={<i className="ri-download-cloud-2-line" />}
                                    label={`下 ${formatBytes(traffic.downloadBytes)}`}
                                  />
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    icon={<i className="ri-upload-cloud-2-line" />}
                                    label={`上 ${formatBytes(traffic.uploadBytes)}`}
                                  />
                                  <Chip
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    icon={<i className="ri-donut-chart-line" />}
                                    label={`总 ${formatBytes(traffic.totalBytes)}`}
                                  />
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">{formatRelativeDate(user.LastActivityDate)}</Typography>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {filteredEmbyUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            <Typography color="text.secondary" sx={{ py: 4 }}>暂无Emby用户数据</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 编辑用户弹窗 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑用户</DialogTitle>
        <DialogContent>
          {editingUser && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="用户名" value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="邮箱" value={editingUser.email || ''} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>角色</InputLabel>
                  <Select value={editingUser.role} label="角色" onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'user' })}>
                    <MenuItem value="user">用户</MenuItem>
                    <MenuItem value="admin">管理员</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="number" label="爆米花数量" value={editingUser.popcorn} onChange={(e) => setEditingUser({ ...editingUser, popcorn: parseInt(e.target.value) || 0 })} />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={editingUser.isWhitelist} onChange={(e) => setEditingUser({ ...editingUser, isWhitelist: e.target.checked })} />}
                  label="白名单（永久会员）"
                />
              </Grid>
              {!editingUser.isWhitelist && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label="会员到期时间"
                    value={editingUser.membershipExpiry ? editingUser.membershipExpiry.substring(0, 16) : ''}
                    onChange={(e) => setEditingUser({ ...editingUser, membershipExpiry: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Chip label="Emby 账号" size="small" />
                </Divider>
              </Grid>
              
              {editingUser.embyUserId ? (
                <>
                  <Grid item xs={12}>
                    <Alert severity="success" sx={{ mb: 1 }}>
                      已绑定 Emby 账号: {editingUser.embyUsername || editingUser.embyUserId}
                    </Alert>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Emby用户ID" value={editingUser.embyUserId || ''} onChange={(e) => setEditingUser({ ...editingUser, embyUserId: e.target.value || undefined, embyUsername: e.target.value ? editingUser.embyUsername : undefined })} helperText="修改可更换绑定，清空可解除绑定" />
                  </Grid>
                  <Grid item xs={12}>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      size="small"
                      onClick={() => setEditingUser({ ...editingUser, embyUserId: null, embyUsername: null } as any)}
                    >
                      解除 Emby 绑定
                    </Button>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      方式一：直接输入 Emby 用户ID 绑定已有账号<br />
                      方式二：填写用户名和密码创建新 Emby 账号
                    </Alert>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                      fullWidth 
                      label="绑定已有 Emby 用户ID（可选）" 
                      value={editingUser.embyUserId || ''} 
                      onChange={(e) => setEditingUser({ ...editingUser, embyUserId: e.target.value || undefined })} 
                      placeholder="输入 Emby 用户ID 直接绑定"
                      helperText="如果已有 Emby 账号，直接输入用户ID即可绑定"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }}>
                      <Chip label="或创建新账号" size="small" variant="outlined" />
                    </Divider>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Emby用户名" value={editingUser.embyUsername || ''} onChange={(e) => setEditingUser({ ...editingUser, embyUsername: e.target.value || undefined })} placeholder="将在 Emby 创建此用户" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="password" label="Emby密码" value={(editingUser as any).embyPassword || ''} onChange={(e) => setEditingUser({ ...editingUser, embyPassword: e.target.value } as any)} placeholder="Emby 账号密码" />
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveUser}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 从Emby导入弹窗 */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>从Emby导入用户</DialogTitle>
        <DialogContent>
          {importLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                以下是Emby中尚未绑定到本站的用户，选择后将创建对应的本站账号
              </Alert>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="设置初始密码" type="password" value={importPassword} onChange={(e) => setImportPassword(e.target.value)} helperText="导入用户的登录密码（至少6位）" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel control={<Switch checked={importAsWhitelist} onChange={(e) => setImportAsWhitelist(e.target.checked)} />} label="设为白名单（永久会员）" />
                </Grid>
              </Grid>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedEmbyUsers.length === importEmbyUsers.length && importEmbyUsers.length > 0}
                          indeterminate={selectedEmbyUsers.length > 0 && selectedEmbyUsers.length < importEmbyUsers.length}
                          onChange={() => {
                            if (selectedEmbyUsers.length === importEmbyUsers.length) {
                              setSelectedEmbyUsers([])
                            } else {
                              setSelectedEmbyUsers(importEmbyUsers.map(u => u.Id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>Emby用户名</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>创建时间</TableCell>
                      <TableCell>最后活动</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importEmbyUsers.map((user) => (
                      <TableRow key={user.Id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedEmbyUsers.includes(user.Id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmbyUsers([...selectedEmbyUsers, user.Id])
                              } else {
                                setSelectedEmbyUsers(selectedEmbyUsers.filter(id => id !== user.Id))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{user.Name}</TableCell>
                        <TableCell>
                          {user.Policy?.IsDisabled ? (
                            <Chip label="已禁用" color="error" size="small" />
                          ) : user.Policy?.IsAdministrator ? (
                            <Chip label="管理员" color="primary" size="small" />
                          ) : (
                            <Chip label="正常" color="success" size="small" />
                          )}
                        </TableCell>
                        <TableCell>{formatDate(user.DateCreated)}</TableCell>
                        <TableCell>{formatDate(user.LastActivityDate)}</TableCell>
                      </TableRow>
                    ))}
                    {importEmbyUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>所有Emby用户都已绑定到本站</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleImportEmbyUsers} disabled={selectedEmbyUsers.length === 0 || importLoading}>
            导入选中用户 ({selectedEmbyUsers.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* 批量操作弹窗 */}
      <Dialog open={batchActionDialogOpen} onClose={() => setBatchActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>批量操作</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>已选择 <strong>{selectedUsers.length}</strong> 个用户</Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>操作类型</InputLabel>
            <Select value={batchAction || ''} label="操作类型" onChange={(e) => setBatchAction(e.target.value as typeof batchAction)}>
              <MenuItem value="setWhitelist">设为白名单</MenuItem>
              <MenuItem value="removeWhitelist">移除白名单</MenuItem>
              <MenuItem value="setExpiry">设置到期时间</MenuItem>
              <MenuItem value="delete">删除用户</MenuItem>
            </Select>
          </FormControl>

          {batchAction === 'setExpiry' && (
            <TextField fullWidth type="date" label="到期日期" value={batchExpiryDate} onChange={(e) => setBatchExpiryDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          )}

          {batchAction === 'delete' && (
            <Alert severity="warning">删除操作不可恢复，请谨慎操作！</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchActionDialogOpen(false)}>取消</Button>
          <Button variant="contained" color={batchAction === 'delete' ? 'error' : 'primary'} onClick={handleBatchAction} disabled={!batchAction}>
            确认执行
          </Button>
        </DialogActions>
      </Dialog>

      {/* 消息提示 */}
      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
      </Snackbar>
    </Box>
  )
}
