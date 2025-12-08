'use client'

import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import LinearProgress from '@mui/material/LinearProgress'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'

const MODE_OPTIONS = [
  {
    value: 'strict',
    label: '严格体积模式',
    description: '同集同体积才视为重复，最安全'
  },
  {
    value: 'loose',
    label: '同集优先模式',
    description: '同一集出现多个版本时强力去重'
  }
] as const

type ScanMode = 'strict' | 'loose'

type LibraryCollection = 'movies' | 'tvshows'

interface LibraryOption {
  id: string
  name: string
  collectionType: LibraryCollection
}

interface DuplicateFileEntry {
  entryId: string
  itemId: string
  fileName: string
  displayName: string
  path: string
  size: number
  sizeLabel: string
  info: string
  year?: number
  season?: number | null
  episode?: number | null
  isRecommendedKeep: boolean
  isRecommendedDelete: boolean
  canDelete: boolean
}

interface DuplicateGroup {
  groupId: string
  libraryId: string
  libraryName: string
  collectionType: LibraryCollection
  reason: string
  keepStrategy: string
  isMergedGroup: boolean
  title: string
  files: DuplicateFileEntry[]
}

interface LibrarySummary {
  id: string
  name: string
  collectionType: LibraryCollection
  fileCount: number
  totalBytes: number
  duplicateBytes: number
  duplicateGroups: number
  duplicateFiles: number
}

interface ScannerTotals {
  totalBytes: number
  duplicateBytes: number
  totalFiles: number
  duplicateGroups: number
  duplicateFiles: number
}

interface ScanResponse {
  success: boolean
  mode: ScanMode
  generatedAt: string
  libraries: LibrarySummary[]
  duplicates: DuplicateGroup[]
  totals: ScannerTotals
}

const numberFormatter = new Intl.NumberFormat('zh-CN')

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let value = bytes
  let idx = 0
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024
    idx += 1
  }
  const fixed = value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1)
  return `${fixed} ${units[idx]}`
}

export default function EmbyMaintenancePage() {
  const [mode, setMode] = useState<ScanMode>('strict')
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([])
  const [loadingLibraries, setLoadingLibraries] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  // Emby 连接配置
  const [serverUrl, setServerUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showConfig, setShowConfig] = useState(true)
  const [configLoaded, setConfigLoaded] = useState(false)

  const handleLibraryChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    setSelectedLibraries(typeof value === 'string' ? value.split(',') : value)
  }

  // 尝试从系统配置加载 Emby 连接信息
  useEffect(() => {
    const loadDefaultConfig = async () => {
      try {
        const res = await fetch('/api/plugins/emby-scanner/libraries')
        if (res.ok) {
          const data = await res.json()
          if (data.libraries?.length) {
            setLibraries(data.libraries)
            setSelectedLibraries(data.libraries.map((lib: LibraryOption) => lib.id))
            setShowConfig(false)
            setConfigLoaded(true)
          }
        }
      } catch {
        // 忽略错误，用户可以手动配置
      }
    }
    loadDefaultConfig()
  }, [])

  // 使用手动配置连接 Emby
  const connectEmby = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) {
      setError('请填写 Emby 服务器地址和 API Key')
      return
    }

    setLoadingLibraries(true)
    setError('')

    try {
      const res = await fetch('/api/plugins/emby-scanner/libraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl: serverUrl.trim(), apiKey: apiKey.trim() })
      })

      if (!res.ok) {
        const text = await res.text()
        let errorMsg = '连接失败'
        try {
          const data = JSON.parse(text)
          errorMsg = data.error || errorMsg
        } catch {
          errorMsg = `服务器错误 (${res.status})`
        }
        throw new Error(errorMsg)
      }

      const data = await res.json()
      if (!data.libraries?.length) {
        throw new Error('未找到可用的媒体库，请检查配置')
      }

      setLibraries(data.libraries)
      setSelectedLibraries(data.libraries.map((lib: LibraryOption) => lib.id))
      setShowConfig(false)
      setConfigLoaded(true)
      setSuccess('连接成功')
    } catch (err: any) {
      setError(err.message || '连接 Emby 服务器失败')
    } finally {
      setLoadingLibraries(false)
    }
  }

  const fileLookup = useMemo(() => {
    const map = new Map<string, DuplicateFileEntry>()
    if (!scanResult) return map
    scanResult.duplicates.forEach(group => {
      group.files.forEach(file => {
        map.set(file.entryId, file)
      })
    })
    return map
  }, [scanResult])

  const selectedStats = useMemo(() => {
    let bytes = 0
    let count = 0
    selectedFileIds.forEach(entryId => {
      const file = fileLookup.get(entryId)
      if (file) {
        bytes += file.size
        count += 1
      }
    })
    return { bytes, count }
  }, [selectedFileIds, fileLookup])

  const applyRecommendedSelection = (result: ScanResponse) => {
    const next = new Set<string>()
    result.duplicates.forEach(group => {
      group.files.forEach(file => {
        if (file.isRecommendedDelete && file.canDelete) {
          next.add(file.entryId)
        }
      })
    })
    setSelectedFileIds(next)
  }

  const runScan = async () => {
    if (!configLoaded) {
      setError('请先连接 Emby 服务器')
      return
    }

    if (!selectedLibraries.length) {
      setError('请至少选择一个媒体库')
      return
    }

    setScanning(true)
    setError('')
    setSuccess('')
    setScanResult(null)
    setSelectedFileIds(new Set())

    try {
      const payload: Record<string, unknown> = {
        mode,
        libraryIds: selectedLibraries
      }

      // 如果是手动配置的连接，需要传递连接信息
      if (serverUrl && apiKey) {
        payload.serverUrl = serverUrl.trim()
        payload.apiKey = apiKey.trim()
      }

      const res = await fetch('/api/plugins/emby-scanner/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '扫描失败')
      }

      setScanResult(data)
      applyRecommendedSelection(data)
      setSuccess(`扫描完成，共发现 ${data.totals.duplicateGroups} 组可能重复`)
    } catch (err: any) {
      setError(err.message || '扫描失败，请稍后再试')
    } finally {
      setScanning(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedFileIds.size) {
      setError('请先勾选需要删除的文件')
      return
    }

    const itemIds = Array.from(selectedFileIds)
      .map(id => fileLookup.get(id)?.itemId)
      .filter((id): id is string => Boolean(id))

    if (!itemIds.length) {
      setError('选中的文件无效，可能已刷新，请重新扫描')
      return
    }

    setDeleting(true)
    setError('')
    setSuccess('')

    try {
      const payload: Record<string, unknown> = { items: itemIds }

      // 如果是手动配置的连接，需要传递连接信息
      if (serverUrl && apiKey) {
        payload.serverUrl = serverUrl.trim()
        payload.apiKey = apiKey.trim()
      }

      const res = await fetch('/api/plugins/emby-scanner/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '删除失败')
      }

      setSuccess(`删除完成：${data.summary.successCount} 成功 / ${data.summary.failureCount} 失败`)
      setSelectedFileIds(new Set())
      if (scanResult) {
        await runScan()
      }
    } catch (err: any) {
      setError(err.message || '删除失败，请稍后再试')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleFile = (entryId: string, disabled: boolean) => {
    if (disabled) return
    setSelectedFileIds(prev => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }

  const renderSummaryStat = (label: string, value: string, icon: string) => (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: theme => `1px solid ${theme.palette.divider}` }}>
      <Stack direction='row' spacing={2} alignItems='center'>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22
          }}
        >
          <i className={icon} />
        </Box>
        <Box>
          <Typography variant='body2' color='text.secondary'>{label}</Typography>
          <Typography variant='h6'>{value}</Typography>
        </Box>
      </Stack>
    </Paper>
  )

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 2 }}>
        🧹 Emby 媒体库维护
      </Typography>
      <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
        双策略查重 + 一键清理，复刻 Emby Scanner v3.7 能力，安全处理重复资源。
      </Typography>

      {(error || success) && (
        <Alert severity={error ? 'error' : 'success'} sx={{ mb: 3 }} onClose={() => { setError(''); setSuccess('') }}>
          {error || success}
        </Alert>
      )}

      {/* Emby 连接配置 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: showConfig ? 2 : 0 }}>
            <Stack direction='row' alignItems='center' spacing={1}>
              <Typography variant='h6'>
                <i className='ri-server-line' style={{ marginRight: 8 }} />
                Emby 服务器
              </Typography>
              {configLoaded && (
                <Chip size='small' color='success' label='已连接' icon={<i className='ri-check-line' />} />
              )}
            </Stack>
            <IconButton size='small' onClick={() => setShowConfig(!showConfig)}>
              <i className={showConfig ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
            </IconButton>
          </Stack>
          <Collapse in={showConfig}>
            <Stack spacing={2}>
              <Typography variant='body2' color='text.secondary'>
                {configLoaded 
                  ? '已从系统配置自动连接，如需切换服务器可在下方修改。'
                  : '请填写 Emby 服务器地址和 API Key 以连接媒体库。'}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label='服务器地址'
                  placeholder='http://192.168.1.100:8096'
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  size='small'
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: <i className='ri-global-line' style={{ marginRight: 8, opacity: 0.5 }} />
                    }
                  }}
                />
                <TextField
                  label='API Key'
                  placeholder='在 Emby 后台 → 高级 → API 密钥 生成'
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  size='small'
                  fullWidth
                  type='password'
                  slotProps={{
                    input: {
                      startAdornment: <i className='ri-key-line' style={{ marginRight: 8, opacity: 0.5 }} />
                    }
                  }}
                />
                <Button
                  variant='contained'
                  onClick={connectEmby}
                  disabled={loadingLibraries}
                  sx={{ minWidth: 120 }}
                >
                  {loadingLibraries ? '连接中...' : '连接'}
                </Button>
              </Stack>
            </Stack>
          </Collapse>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant='h6' sx={{ mb: 1 }}>查重策略</Typography>
              <ToggleButtonGroup
                exclusive
                value={mode}
                onChange={(_e, value) => value && setMode(value)}
                color='primary'
              >
                {MODE_OPTIONS.map(option => (
                  <ToggleButton key={option.value} value={option.value} sx={{ textAlign: 'left' }}>
                    <Stack alignItems='flex-start'>
                      <Typography variant='subtitle2'>{option.label}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {option.description}
                      </Typography>
                    </Stack>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant='h6' sx={{ mb: 1 }}>目标媒体库</Typography>
              <FormControl fullWidth>
                <InputLabel>选择媒体库</InputLabel>
                <Select
                  multiple
                  value={selectedLibraries}
                  label='选择媒体库'
                  onChange={handleLibraryChange}
                  renderValue={selected => {
                    const value = Array.isArray(selected) ? selected : []
                    if (!value.length) return '请选择媒体库'
                    if (value.length === libraries.length) return '全部媒体库'
                    const names = libraries.filter(lib => value.includes(lib.id)).map(lib => lib.name)
                    return names.join('、')
                  }}
                  disabled={loadingLibraries || scanning}
                >
                  {libraries.map(lib => (
                    <MenuItem key={lib.id} value={lib.id}>
                      <Checkbox checked={selectedLibraries.includes(lib.id)} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant='body2'>{lib.name}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {lib.collectionType === 'movies' ? '电影库' : '剧集库'}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant='contained'
                size='large'
                onClick={runScan}
                disabled={scanning || loadingLibraries}
                startIcon={<i className='ri-scan-2-line' />}
              >
                {scanning ? '扫描中...' : '开始扫描'}
              </Button>

              <Button
                variant='outlined'
                color='secondary'
                onClick={() => scanResult && applyRecommendedSelection(scanResult)}
                disabled={!scanResult}
                startIcon={<i className='ri-magic-line' />}
              >
                重新应用推荐选择
              </Button>
            </Stack>

            {scanning && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress />
                <Typography variant='caption' color='text.secondary'>
                  正在遍历 Emby 库，这可能需要数十秒...
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {scanResult && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              {renderSummaryStat('扫描媒体库', `${scanResult.libraries.length} 个`, 'ri-folder-2-line')}
            </Grid>
            <Grid item xs={12} md={3}>
              {renderSummaryStat('总文件数', numberFormatter.format(scanResult.totals.totalFiles), 'ri-slideshow-2-line')}
            </Grid>
            <Grid item xs={12} md={3}>
              {renderSummaryStat('重复文件', `${scanResult.totals.duplicateFiles} 个`, 'ri-stack-line')}
            </Grid>
            <Grid item xs={12} md={3}>
              {renderSummaryStat('可释放空间', formatBytes(scanResult.totals.duplicateBytes), 'ri-database-2-line')}
            </Grid>
          </Grid>

          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>媒体库概览</Typography>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>媒体库</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell>文件数</TableCell>
                    <TableCell>容量</TableCell>
                    <TableCell>重复组</TableCell>
                    <TableCell>可释放</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scanResult.libraries.map(lib => (
                    <TableRow key={lib.id}>
                      <TableCell>{lib.name}</TableCell>
                      <TableCell>{lib.collectionType === 'movies' ? '电影' : '剧集'}</TableCell>
                      <TableCell>{numberFormatter.format(lib.fileCount)}</TableCell>
                      <TableCell>{formatBytes(lib.totalBytes)}</TableCell>
                      <TableCell>
                        {lib.duplicateGroups > 0 ? (
                          <Chip label={`${lib.duplicateGroups} 组`} color='warning' size='small' />
                        ) : (
                          <Chip label='完美' color='success' size='small' />
                        )}
                      </TableCell>
                      <TableCell>
                        {lib.duplicateBytes ? formatBytes(lib.duplicateBytes) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant='subtitle2' color='text.secondary'>已勾选文件</Typography>
                <Typography variant='h5'>{selectedStats.count} 个</Typography>
                <Typography variant='body2' color='text.secondary'>释放空间 {formatBytes(selectedStats.bytes)}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant='subtitle2' color='text.secondary'>提醒</Typography>
                <Typography variant='body2'>
                  系统只会推荐删除非保留文件，若勾选项涉及同一 Emby 条目的多版本，请谨慎确认。
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Button
                variant='contained'
                color='error'
                fullWidth
                onClick={handleDelete}
                disabled={!selectedStats.count || deleting}
                startIcon={<i className='ri-delete-bin-6-line' />}
              >
                {deleting ? '删除中...' : '删除选中文件'}
              </Button>
            </Card>
          </Stack>

          <Stack spacing={3}>
            {scanResult.duplicates.length === 0 && (
              <Alert severity='success'>未发现重复文件，媒体库状态良好。</Alert>
            )}

            {scanResult.duplicates.map(group => (
              <Card key={group.groupId}>
                <CardContent>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between'>
                    <Box>
                      <Typography variant='h6'>{group.title}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {group.reason} · {group.keepStrategy}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {group.libraryName}
                      </Typography>
                    </Box>
                    <Stack direction='row' spacing={1} flexWrap='wrap'>
                      <Chip label={group.collectionType === 'movies' ? '电影' : '剧集'} size='small' />
                      <Chip label={`${group.files.length} 个版本`} size='small' color='info' />
                      {group.isMergedGroup && (
                        <Chip label='合并条目' color='warning' size='small' />
                      )}
                    </Stack>
                  </Stack>

                  {group.isMergedGroup && (
                    <Alert severity='warning' sx={{ mt: 2 }}>
                      该组所有文件共享同一 Emby 条目 ID，暂不支持直接删除，请到 Emby 中手动处理。
                    </Alert>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell width={40} />
                        <TableCell>文件</TableCell>
                        <TableCell>体积</TableCell>
                        <TableCell>信息</TableCell>
                        <TableCell>路径</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.files.map(file => {
                        const disabled = !file.canDelete
                        const checked = selectedFileIds.has(file.entryId)
                        return (
                          <TableRow key={file.entryId} selected={file.isRecommendedKeep}>
                            <TableCell>
                              <Tooltip title={disabled ? '该文件不可在此删除' : file.isRecommendedKeep ? '保留文件，不可删除' : '删除此文件'}>
                                <span>
                                  <Checkbox
                                    color='warning'
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => handleToggleFile(file.entryId, disabled)}
                                  />
                                </span>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                <Typography variant='body2'>
                                  {file.displayName}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {file.isRecommendedKeep ? '保留' : '可删除'} · ID {file.itemId}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{file.sizeLabel}</TableCell>
                            <TableCell>{file.info || '-'}</TableCell>
                            <TableCell>
                              <Tooltip title={file.path}>
                                <Typography variant='caption' sx={{ maxWidth: 320 }} noWrap>
                                  {file.path || 'N/A'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Box>
  )
}
