'use client'

import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
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
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'

interface SystemUser {
  id: string
  username: string
  role: 'admin' | 'user'
  popcorn: number
  signInStreak: number
  embyUsername?: string
  createdAt: string
  lastSignIn?: string
}

export default function UserManagePage() {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<SystemUser | null>(null)
  const [editPopcorn, setEditPopcorn] = useState(0)
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 重置密码
  const [resetOpen, setResetOpen] = useState(false)
  const [resetUser, setResetUser] = useState<SystemUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (e) {
      console.error('Load users failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: SystemUser) => {
    setEditUser(user)
    setEditPopcorn(user.popcorn)
    setEditRole(user.role)
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editUser) return
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popcorn: editPopcorn, role: editRole })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: '用户信息已更新' })
        loadUsers()
        setEditOpen(false)
      } else {
        setMessage({ type: 'error', text: '更新失败' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: '网络错误' })
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？')) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ type: 'success', text: '用户已删除' })
        loadUsers()
      } else {
        setMessage({ type: 'error', text: '删除失败' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: '网络错误' })
    }
  }

  const handleResetPassword = (user: SystemUser) => {
    setResetUser(user)
    setNewPassword('')
    setShowPassword(false)
    setResetOpen(true)
  }

  const handleResetSubmit = async () => {
    if (!resetUser || !newPassword) return
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '密码至少6位' })
      return
    }
    
    setResetLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: `已重置 ${resetUser.username} 的密码` })
        setResetOpen(false)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || '重置失败' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: '网络错误' })
    } finally {
      setResetLoading(false)
    }
  }

  // 生成随机密码
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(password)
    setShowPassword(true)
  }

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
        <Typography variant='h4' fontWeight={700}>系统用户管理</Typography>
        <Typography color='text.secondary'>管理系统用户账号和权限</Typography>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* 统计卡片 */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(4, 1fr)', mb: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant='h3' fontWeight={700} color='primary.main'>
              {users.length}
            </Typography>
            <Typography color='text.secondary'>总用户数</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant='h3' fontWeight={700} color='success.main'>
              {users.filter(u => u.role === 'admin').length}
            </Typography>
            <Typography color='text.secondary'>管理员</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant='h3' fontWeight={700} color='info.main'>
              {users.filter(u => u.embyUsername).length}
            </Typography>
            <Typography color='text.secondary'>已绑定 Emby</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant='h3' fontWeight={700} color='warning.main'>
              {users.reduce((sum, u) => sum + u.popcorn, 0)}
            </Typography>
            <Typography color='text.secondary'>总爆米花</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 用户列表 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>用户</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>爆米花</TableCell>
                <TableCell>连续签到</TableCell>
                <TableCell>Emby 账号</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {user.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography fontWeight={500}>{user.username}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role === 'admin' ? '管理员' : '普通用户'} 
                      size='small'
                      color={user.role === 'admin' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600} color='warning.main'>
                      🍿 {user.popcorn}
                    </Typography>
                  </TableCell>
                  <TableCell>{user.signInStreak} 天</TableCell>
                  <TableCell>
                    {user.embyUsername ? (
                      <Chip label={user.embyUsername} size='small' variant='outlined' />
                    ) : (
                      <Typography color='text.secondary' fontSize={12}>未绑定</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13} color='text.secondary'>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title='编辑'>
                      <IconButton size='small' onClick={() => handleEdit(user)}>
                        <i className='ri-edit-line' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='重置密码'>
                      <IconButton size='small' color='warning' onClick={() => handleResetPassword(user)}>
                        <i className='ri-lock-password-line' />
                      </IconButton>
                    </Tooltip>
                    {user.role !== 'admin' && (
                      <Tooltip title='删除'>
                        <IconButton size='small' color='error' onClick={() => handleDelete(user.id)}>
                          <i className='ri-delete-bin-line' />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 编辑弹窗 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>编辑用户: {editUser?.username}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>角色</InputLabel>
              <Select
                value={editRole}
                label='角色'
                onChange={e => setEditRole(e.target.value as 'admin' | 'user')}
              >
                <MenuItem value='user'>普通用户</MenuItem>
                <MenuItem value='admin'>管理员</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type='number'
              label='爆米花余额'
              value={editPopcorn}
              onChange={e => setEditPopcorn(parseInt(e.target.value) || 0)}
              InputProps={{
                startAdornment: <span style={{ marginRight: 8 }}>🍿</span>
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant='contained' onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 重置密码弹窗 */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>重置密码: {resetUser?.username}</DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2, mt: 1 }}>
            为用户设置新密码
          </Typography>
          <TextField
            fullWidth
            label='新密码'
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder='至少6位'
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge='end'>
                    <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button
            size='small'
            sx={{ mt: 1 }}
            onClick={generatePassword}
          >
            <i className='ri-refresh-line' style={{ marginRight: 4 }} />
            生成随机密码
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>取消</Button>
          <Button 
            variant='contained' 
            onClick={handleResetSubmit}
            disabled={resetLoading || !newPassword || newPassword.length < 6}
          >
            {resetLoading ? '提交中...' : '确认重置'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
