'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'

interface DeviceInfo {
  Id: string
  Name: string
  LastUserName: string
  AppName: string
  DateLastActivity: string
  IpAddress: string
}

const regionCache: Record<string, string> = {}

export default function UserActivityPage() {
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('')
  const [page, setPage] = useState(1)
  const [ipRegions, setIpRegions] = useState<Record<string, string>>({})
  const pageSize = 50

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/emby/Devices')
      if (res.ok) {
        const data = await res.json()
        // 按时间倒序
        const sorted = (data.Items || []).sort((a: DeviceInfo, b: DeviceInfo) => 
          new Date(b.DateLastActivity).getTime() - new Date(a.DateLastActivity).getTime()
        )
        setDevices(sorted)
      }
    } catch (e) {}
    setLoading(false)
  }

  const getRegion = async (ip: string) => {
    if (!ip || regionCache[ip]) return
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.')) {
      regionCache[ip] = '本地'
      return
    }
    try {
      const res = await fetch(`/api/ip-location?ip=${ip}`)
      if (res.ok) {
        const d = await res.json()
        regionCache[ip] = d.city ? `${d.regionName} ${d.city}` : (d.regionName || d.country || '未知')
      }
    } catch {}
  }

  useEffect(() => { loadData() }, [])

  const filtered = devices.filter(d => !userFilter || d.LastUserName?.toLowerCase().includes(userFilter.toLowerCase()))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    if (loading || paged.length === 0) return
    const loadIps = async () => {
      const ipsToLoad = paged.filter(d => d.IpAddress && !regionCache[d.IpAddress]).map(d => d.IpAddress)
      if (ipsToLoad.length === 0) return
      for (const ip of ipsToLoad) {
        await getRegion(ip)
      }
      setIpRegions({ ...regionCache })
    }
    loadIps()
  }, [page, userFilter, loading, devices.length])

  return (
    <Box>
      <Box sx={{ mb: 3, p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
        <Typography variant='h5' fontWeight={700} sx={{ color: 'white' }}>历史记录</Typography>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size='small'
            placeholder='搜索用户名...'
            value={userFilter}
            onChange={e => { setUserFilter(e.target.value); setPage(1) }}
            InputProps={{ startAdornment: <InputAdornment position='start'><i className='ri-search-line' /></InputAdornment> }}
            sx={{ width: 200 }}
          />
          <Button size='small' onClick={loadData}><i className='ri-refresh-line' /></Button>
          <Typography variant='body2' color='text.secondary'>{filtered.length} 条</Typography>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>时间</TableCell>
                <TableCell>用户名</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>地区</TableCell>
                <TableCell>设备名称</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton width={120} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={100} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={100} /></TableCell>
                </TableRow>
              )) : paged.map(d => (
                <TableRow key={d.Id}>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{new Date(d.DateLastActivity).toLocaleString('zh-CN')}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{d.LastUserName || '-'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{d.IpAddress || '-'}</TableCell>
                  <TableCell>
                    {ipRegions[d.IpAddress] ? (
                      <Chip label={ipRegions[d.IpAddress]} size='small' sx={{ fontSize: '0.75rem' }} />
                    ) : d.IpAddress ? '...' : '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{d.Name || d.AppName || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {Math.ceil(filtered.length / pageSize) > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <Pagination count={Math.ceil(filtered.length / pageSize)} page={page} onChange={(_, p) => setPage(p)} size='small' />
          </Box>
        )}
      </Card>
    </Box>
  )
}
