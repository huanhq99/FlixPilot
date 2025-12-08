'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Divider from '@mui/material/Divider'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import { useSiteConfig } from '@/contexts/siteConfigContext'

interface Config {
  site?: {
    name: string           // 网站名称
    description: string    // 网站描述
    logo?: string          // Logo URL
  }
  register?: {
    enabled: boolean       // 是否开放注册
    minPasswordLength: number  // 密码最小长度
    requireUppercase: boolean  // 需要大写字母
    requireNumber: boolean     // 需要数字
    defaultPopcorn: number     // 新用户默认爆米花
  }
  homeModules?: {
    // 对已有 Emby 账号用户的模块可见性
    welcome: boolean           // 欢迎卡片
    libraryOverview: boolean   // 媒体库概览
    libraryList: boolean       // 媒体库列表
    systemStatus: boolean      // 系统状态
    livePlayback: boolean      // 正在热播
    todayStats: boolean        // 今日播放统计
    recentItems: boolean       // 最新入库
    quickActions: boolean      // 快捷操作
  }
  tmdb: { apiKey: string; baseUrl: string }
  moviepilot: { serverUrl: string; username: string; password: string; enabled: boolean }
  emby: Array<{ name: string; serverUrl: string; apiKey: string }>
  telegram: { botToken: string; chatId: string; channelId: string; enabled: boolean; webhookUrl: string }
  email?: {
    enabled: boolean
    host: string           // SMTP 服务器地址
    port: number           // SMTP 端口
    secure: boolean        // 是否使用 SSL/TLS
    user: string           // 发件邮箱账号
    pass: string           // 发件邮箱密码/授权码
    from: string           // 发件人名称
    notifications: {       // 通知类型开关
      expiry: boolean      // 到期提醒
      request: boolean     // 求片通知
      subscription: boolean // 订阅更新
    }
  }
  proxy: { http: string; https: string }
  sync?: { 
    libraries: string[]
    interval: number
    lastSync?: string
  }
  request?: {
    monthlyQuota: number   // 每月免费求片额度
    quotaExchangeRate: number  // 爆米花兑换额度比例（多少爆米花兑换1次额度）
    trafficExchangeRate: number // 爆米花兑换流量比例（多少爆米花兑换1GB流量）
    downloadCostPerGB: number  // 下载消耗流量（每GB消耗多少流量）
  }
  goedge?: {
    enabled: boolean
    mysql: {
      host: string
      port: number
      user: string
      password: string
      database: string
    }
    embyDomain: string
    syncInterval: number
  }
}

interface EmbyLibrary {
  Id: string
  Name: string
  CollectionType: string
}

const defaultConfig: Config = {
  site: { name: 'FlixPilot', description: '您的私人流媒体管理中心', logo: '' },
  register: { enabled: false, minPasswordLength: 6, requireUppercase: false, requireNumber: false, defaultPopcorn: 50 },
  homeModules: {
    welcome: true,
    libraryOverview: true,
    libraryList: true,
    systemStatus: true,
    livePlayback: true,
    todayStats: true,
    recentItems: true,
    quickActions: true
  },
  tmdb: { apiKey: '', baseUrl: 'https://api.themoviedb.org/3' },
  moviepilot: { serverUrl: '', username: '', password: '', enabled: false },
  emby: [{ name: '服务器1', serverUrl: '', apiKey: '' }],
  telegram: { botToken: '', chatId: '', channelId: '', enabled: true, webhookUrl: '' },
  email: { 
    enabled: false, 
    host: '', 
    port: 465, 
    secure: true, 
    user: '', 
    pass: '', 
    from: '',
    notifications: { expiry: true, request: true, subscription: true }
  },
  proxy: { http: '', https: '' },
  sync: { libraries: [], interval: 24 },
  request: { monthlyQuota: 3, quotaExchangeRate: 50, trafficExchangeRate: 10, downloadCostPerGB: 1 },
  goedge: {
    enabled: false,
    mysql: { host: '', port: 3306, user: '', password: '', database: 'mysql' },
    embyDomain: '',
    syncInterval: 5
  }
}

export default function SettingsPage() {
  const { refresh: refreshSiteConfig } = useSiteConfig()
  const [config, setConfig] = useState<Config>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  
  // Sync related states
  const [libraries, setLibraries] = useState<EmbyLibrary[]>([])
  const [loadingLibraries, setLoadingLibraries] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; library: string } | null>(null)
  const [syncedCount, setSyncedCount] = useState(0)

  // GoEdge sync states
  const [goedgeSyncing, setGoedgeSyncing] = useState(false)
  const [goedgeSyncStatus, setGoedgeSyncStatus] = useState<{
    lastSyncTime: string | null
    lastId: number
    date: string
  } | null>(null)

  // License related states
  const [licenseStatus, setLicenseStatus] = useState<{
    configured: boolean
    valid: boolean
    info: { valid: boolean; message: string; type?: string; expiresAt?: string | null; customerName?: string } | null
    config: { domain: string } | null
  } | null>(null)
  const [licenseLoading, setLicenseLoading] = useState(false)
  const [licenseForm, setLicenseForm] = useState({ domain: '', licenseKey: '' })
  const [activating, setActivating] = useState(false)

  // 加载授权状态
  const loadLicenseStatus = async () => {
    setLicenseLoading(true)
    try {
      const res = await fetch('/api/license')
      if (res.ok) {
        const data = await res.json()
        setLicenseStatus(data)
        if (data.config?.domain) {
          setLicenseForm(prev => ({ ...prev, domain: data.config.domain }))
        }
      }
    } catch (e) {
      console.error('Failed to load license status:', e)
    } finally {
      setLicenseLoading(false)
    }
  }

  // 激活授权
  const handleActivateLicense = async () => {
    if (!licenseForm.domain || !licenseForm.licenseKey) {
      setMessage({ type: 'error', text: '请填写授权域名和授权码' })
      return
    }
    setActivating(true)
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(licenseForm)
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: '授权激活成功！' })
        loadLicenseStatus()
      } else {
        setMessage({ type: 'error', text: data.message || '激活失败' })
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActivating(false)
    }
  }

  useEffect(() => {
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => {
        setConfig({ ...defaultConfig, ...data })
        setLoading(false)
      })
      .catch(() => setLoading(false))
    
    // Load synced count
    fetch('/api/library/synced')
      .then(res => res.json())
      .then(data => {
        setSyncedCount(data.movieIds?.length + data.tvIds?.length || 0)
      })
      .catch(() => {})

    // Load license status
    loadLicenseStatus()

    // Load GoEdge sync status
    fetch('/api/traffic/sync')
      .then(res => res.json())
      .then(data => {
        if (data.state) {
          setGoedgeSyncStatus(data.state)
        }
      })
      .catch(() => {})
  }, [])

  // Load libraries when switching to media server tab
  useEffect(() => {
    if (activeTab === 5 && config.emby[0]?.serverUrl && config.emby[0]?.apiKey) {
      loadLibraries()
    }
  }, [activeTab, config.emby])

  const loadLibraries = async () => {
    setLoadingLibraries(true)
    try {
      const server = config.emby[0]
      const res = await fetch(`/api/emby/Library/MediaFolders?serverUrl=${encodeURIComponent(server.serverUrl)}&apiKey=${encodeURIComponent(server.apiKey)}`)
      if (res.ok) {
        const data = await res.json()
        setLibraries(data.Items || [])
      }
    } catch (e) {
      console.error('Failed to load libraries:', e)
    } finally {
      setLoadingLibraries(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncProgress(null)
    try {
      const selectedLibs = config.sync?.libraries || []
      const libsToSync = selectedLibs.length > 0 
        ? libraries.filter(l => selectedLibs.includes(l.Id))
        : libraries.filter(l => l.CollectionType === 'movies' || l.CollectionType === 'tvshows')
      
      let totalSynced = 0
      
      for (let i = 0; i < libsToSync.length; i++) {
        const lib = libsToSync[i]
        setSyncProgress({ current: i + 1, total: libsToSync.length, library: lib.Name })
        
        const res = await fetch('/api/library/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ libraryId: lib.Id })
        })
        
        if (res.ok) {
          const result = await res.json()
          totalSynced += result.synced || 0
        }
      }
      
      // Update last sync time
      const newConfig = {
        ...config,
        sync: {
          ...config.sync,
          lastSync: new Date().toISOString()
        }
      }
      setConfig(newConfig as Config)
      
      // Save config with last sync time
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      })
      
      // Reload synced count
      const syncedRes = await fetch('/api/library/synced')
      if (syncedRes.ok) {
        const data = await syncedRes.json()
        setSyncedCount((data.movieIds?.length || 0) + (data.tvIds?.length || 0))
      }
      
      setMessage({ type: 'success', text: `同步完成！共同步 ${totalSynced} 个项目` })
    } catch (e: any) {
      setMessage({ type: 'error', text: '同步失败: ' + e.message })
    } finally {
      setSyncing(false)
      setSyncProgress(null)
    }
  }

  const toggleLibrary = (libraryId: string) => {
    setConfig(prev => {
      const currentLibs = prev.sync?.libraries || []
      const newLibs = currentLibs.includes(libraryId)
        ? currentLibs.filter(id => id !== libraryId)
        : [...currentLibs, libraryId]
      return {
        ...prev,
        sync: { ...prev.sync, libraries: newLibs, interval: prev.sync?.interval || 24 }
      }
    })
  }

  const selectAllLibraries = () => {
    const mediaLibs = libraries.filter(l => l.CollectionType === 'movies' || l.CollectionType === 'tvshows')
    setConfig(prev => ({
      ...prev,
      sync: { ...prev.sync, libraries: mediaLibs.map(l => l.Id), interval: prev.sync?.interval || 24 }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      console.log('[Settings] 正在保存配置...', config)
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      console.log('[Settings] 响应状态:', res.status)
      const data = await res.json().catch(() => ({}))
      console.log('[Settings] 响应数据:', data)
      
      if (res.ok) {
        // 如果配置了 Telegram Bot Token 和 Webhook URL，自动重新设置 Webhook
        if (config.telegram?.botToken && config.telegram?.webhookUrl) {
          try {
            const webhookRes = await fetch(`/api/telegram/webhook?action=setWebhook&url=${encodeURIComponent(config.telegram.webhookUrl)}`)
            const webhookData = await webhookRes.json()
            if (webhookData.ok) {
              console.log('[Settings] Telegram Webhook 已自动更新')
            } else {
              console.warn('[Settings] Telegram Webhook 设置失败:', webhookData.description)
            }
          } catch (e) {
            console.warn('[Settings] 自动设置 Webhook 失败:', e)
          }
        }
        
        setMessage({ type: 'success', text: '配置保存成功！' })
        // 刷新全局站点配置，使更改立即生效
        await refreshSiteConfig()
        // 如果在媒体服务器 Tab 且配置了 Emby，刷新媒体库列表
        if (activeTab === 5 && config.emby[0]?.serverUrl && config.emby[0]?.apiKey) {
          loadLibraries()
        }
      } else {
        throw new Error(data.error || '保存失败')
      }
    } catch (e: any) {
      console.error('[Settings] 保存失败:', e)
      setMessage({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (section: keyof Config, field: string, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...(prev[section] as any), [field]: value }
    }))
  }

  const updateEmbyServer = (index: number, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      emby: prev.emby.map((server, i) => 
        i === index ? { ...server, [field]: value } : server
      )
    }))
  }

  const addEmbyServer = () => {
    setConfig(prev => ({
      ...prev,
      emby: [...prev.emby, { name: `服务器${prev.emby.length + 1}`, serverUrl: '', apiKey: '' }]
    }))
  }

  const removeEmbyServer = (index: number) => {
    if (config.emby.length <= 1) return
    setConfig(prev => ({
      ...prev,
      emby: prev.emby.filter((_, i) => i !== index)
    }))
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  const tabLabels = ['授权', '网站', '首页', '用户', '系统', '媒体服务器', '通知', '网络', '流量统计']

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">设定</Typography>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)} 
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
      >
        {tabLabels.map((label, i) => (
          <Tab key={i} label={label} />
        ))}
      </Tabs>

      {/* Tab: 授权 */}
      {activeTab === 0 && (
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <i className="ri-shield-keyhole-line" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  授权状态
                </Typography>
                
                {licenseLoading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : licenseStatus?.valid ? (
                  <Box>
                    <Alert severity="success" sx={{ mb: 3 }}>
                      <Typography variant="subtitle2">授权有效</Typography>
                      <Typography variant="body2">{licenseStatus.info?.message}</Typography>
                    </Alert>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={licenseStatus.info?.type === 'lifetime' ? '终身授权' : 
                                 licenseStatus.info?.type === 'enterprise' ? '企业版' :
                                 licenseStatus.info?.type === 'pro' ? 'Pro 版' : '标准版'} 
                          color={licenseStatus.info?.type === 'lifetime' ? 'success' : 'primary'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        授权域名: {licenseStatus.config?.domain}
                      </Typography>
                      {licenseStatus.info?.customerName && (
                        <Typography variant="body2" color="text.secondary">
                          客户名称: {licenseStatus.info.customerName}
                        </Typography>
                      )}
                      {licenseStatus.info?.expiresAt && (
                        <Typography variant="body2" color="text.secondary">
                          到期时间: {new Date(licenseStatus.info.expiresAt).toLocaleDateString('zh-CN')}
                        </Typography>
                      )}
                      {!licenseStatus.info?.expiresAt && licenseStatus.info?.type === 'lifetime' && (
                        <Typography variant="body2" color="success.main">
                          永不过期
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      <Typography variant="subtitle2">未授权</Typography>
                      <Typography variant="body2">
                        {licenseStatus?.info?.message || '请在右侧填写授权信息以激活所有功能'}
                      </Typography>
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                      未授权状态下部分功能将无法使用
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <i className="ri-key-2-line" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  激活授权
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  输入您购买的授权码和绑定的域名来激活 FlixPilot
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="授权域名"
                      placeholder="your-site.example.com"
                      value={licenseForm.domain}
                      onChange={e => setLicenseForm(prev => ({ ...prev, domain: e.target.value }))}
                      helperText="填写您用于访问 FlixPilot 的域名（不含 http://）"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="授权码"
                      placeholder="SH-XXXX-XXXX-XXXX-XXXX"
                      value={licenseForm.licenseKey}
                      onChange={e => setLicenseForm(prev => ({ ...prev, licenseKey: e.target.value.toUpperCase() }))}
                      helperText="格式：SH-XXXX-XXXX-XXXX-XXXX"
                    />
                  </Grid>
                </Grid>
                <Box mt={3} display="flex" gap={2}>
                  <Button 
                    variant="contained" 
                    onClick={handleActivateLicense}
                    disabled={activating || !licenseForm.domain || !licenseForm.licenseKey}
                    startIcon={activating ? <CircularProgress size={16} /> : null}
                  >
                    {activating ? '激活中...' : '激活授权'}
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={loadLicenseStatus}
                    disabled={licenseLoading}
                  >
                    刷新状态
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  购买授权
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  如需购买授权，请联系管理员或访问官方网站获取授权码。
                  授权绑定域名后不可更改，请确保填写正确。
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: 网站 */}
      {activeTab === 1 && (
        <Grid container spacing={4}>
          {/* 网站基本信息 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>网站信息</Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  配置网站的名称、描述和 Logo
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="网站名称"
                      placeholder="FlixPilot"
                      value={config.site?.name || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        site: { ...prev.site!, name: e.target.value }
                      }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Logo URL"
                      placeholder="https://example.com/logo.png"
                      value={config.site?.logo || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        site: { ...prev.site!, logo: e.target.value }
                      }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="网站描述"
                      placeholder="您的私人流媒体管理中心"
                      value={config.site?.description || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        site: { ...prev.site!, description: e.target.value }
                      }))}
                    />
                  </Grid>
                </Grid>
                <Box mt={3}>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    保存
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: 首页模块 */}
      {activeTab === 2 && (
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <i className="ri-layout-grid-line" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  首页模块可见性
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  配置已有 Emby 账号的普通用户可以看到哪些首页模块（管理员始终可见所有模块）
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.homeModules?.welcome ?? true}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            homeModules: { ...prev.homeModules!, welcome: e.target.checked }
                          }))}
                        />
                      }
                      label="欢迎卡片"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.homeModules?.libraryOverview ?? true}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            homeModules: { ...prev.homeModules!, libraryOverview: e.target.checked }
                          }))}
                        />
                      }
                      label="媒体库概览"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.homeModules?.libraryList ?? true}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            homeModules: { ...prev.homeModules!, libraryList: e.target.checked }
                          }))}
                        />
                      }
                      label="媒体库列表"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.homeModules?.systemStatus ?? true}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            homeModules: { ...prev.homeModules!, systemStatus: e.target.checked }
                          }))}
                        />
                      }
                      label="系统状态"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.homeModules?.livePlayback ?? true}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            homeModules: { ...prev.homeModules!, livePlayback: e.target.checked }
                          }))}
                        />
                      }
                      label="正在热播"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.homeModules?.todayStats ?? true}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            homeModules: { ...prev.homeModules!, todayStats: e.target.checked }
                          }))}
                        />
                      }
                      label="今日播放统计"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.homeModules?.recentItems ?? true}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            homeModules: { ...prev.homeModules!, recentItems: e.target.checked }
                          }))}
                        />
                      }
                      label="最新入库"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.homeModules?.quickActions ?? true}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            homeModules: { ...prev.homeModules!, quickActions: e.target.checked }
                          }))}
                        />
                      }
                      label="快捷操作"
                    />
                  </Grid>
                </Grid>
                <Box mt={3}>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    保存
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: 用户 */}
      {activeTab === 3 && (
        <Grid container spacing={4}>
          {/* 注册设置 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">用户注册</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={config.register?.enabled ?? false}
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          register: { ...prev.register!, enabled: e.target.checked }
                        }))}
                      />
                    }
                    label="开放注册"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  允许新用户自行注册账号
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="密码最小长度"
                      value={config.register?.minPasswordLength ?? 6}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        register: { ...prev.register!, minPasswordLength: parseInt(e.target.value) || 6 }
                      }))}
                      disabled={!config.register?.enabled}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="新用户赠送爆米花"
                      value={config.register?.defaultPopcorn ?? 50}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        register: { ...prev.register!, defaultPopcorn: parseInt(e.target.value) || 0 }
                      }))}
                      disabled={!config.register?.enabled}
                      InputProps={{
                        endAdornment: <Typography color="text.secondary">🍿</Typography>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.register?.requireUppercase ?? false}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            register: { ...prev.register!, requireUppercase: e.target.checked }
                          }))}
                          disabled={!config.register?.enabled}
                        />
                      }
                      label="需要大写字母"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={config.register?.requireNumber ?? false}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            register: { ...prev.register!, requireNumber: e.target.checked }
                          }))}
                          disabled={!config.register?.enabled}
                        />
                      }
                      label="需要包含数字"
                    />
                  </Grid>
                </Grid>
                <Box mt={3}>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    保存
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 求片额度设置 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>求片额度</Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  用户每月有免费求片额度，用完后可用爆米花兑换额外额度
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="每月免费额度"
                      placeholder="3"
                      value={config.request?.monthlyQuota ?? 3}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        request: { ...prev.request!, monthlyQuota: parseInt(e.target.value) || 0 }
                      }))}
                      helperText="每月可免费求片次数"
                      InputProps={{
                        endAdornment: <Typography color="text.secondary">次</Typography>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="额度兑换比例"
                      placeholder="50"
                      value={config.request?.quotaExchangeRate ?? 50}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        request: { ...prev.request!, quotaExchangeRate: parseInt(e.target.value) || 0 }
                      }))}
                      helperText="多少爆米花兑换1次额度"
                      InputProps={{
                        endAdornment: <Typography color="text.secondary">🍿</Typography>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="流量兑换比例"
                      placeholder="10"
                      value={config.request?.trafficExchangeRate ?? 10}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        request: { ...prev.request!, trafficExchangeRate: parseInt(e.target.value) || 0 }
                      }))}
                      helperText="多少爆米花兑换1GB流量"
                      InputProps={{
                        endAdornment: <Typography color="text.secondary">🍿</Typography>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="下载消耗比例"
                      placeholder="1"
                      value={config.request?.downloadCostPerGB ?? 1}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        request: { ...prev.request!, downloadCostPerGB: parseFloat(e.target.value) || 0 }
                      }))}
                      helperText="下载1GB消耗多少流量"
                      InputProps={{
                        endAdornment: <Typography color="text.secondary">GB</Typography>
                      }}
                    />
                  </Grid>
                </Grid>
                
                <Box mt={3}>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    保存
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: 系统 */}
      {activeTab === 4 && (
        <Grid container spacing={4}>
          {/* MoviePilot */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">MoviePilot</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={config.moviepilot.enabled}
                        onChange={e => updateConfig('moviepilot', 'enabled', e.target.checked)}
                      />
                    }
                    label="启用"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  连接到 MoviePilot，审核通过求片后自动添加订阅
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="服务器地址"
                      placeholder="https://mp.example.com:3000"
                      value={config.moviepilot.serverUrl}
                      onChange={e => updateConfig('moviepilot', 'serverUrl', e.target.value)}
                      disabled={!config.moviepilot.enabled}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="用户名"
                      placeholder="MoviePilot 登录用户名"
                      value={config.moviepilot.username}
                      onChange={e => updateConfig('moviepilot', 'username', e.target.value)}
                      disabled={!config.moviepilot.enabled}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="密码"
                      type="password"
                      placeholder="MoviePilot 登录密码"
                      value={config.moviepilot.password}
                      onChange={e => updateConfig('moviepilot', 'password', e.target.value)}
                      disabled={!config.moviepilot.enabled}
                    />
                  </Grid>
                </Grid>
                <Box mt={3}>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    保存
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* TMDB */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>TMDB</Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  用于获取影视元数据和海报
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="API Key"
                      value={config.tmdb.apiKey}
                      onChange={e => updateConfig('tmdb', 'apiKey', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="API Base URL"
                      value={config.tmdb.baseUrl}
                      onChange={e => updateConfig('tmdb', 'baseUrl', e.target.value)}
                    />
                  </Grid>
                </Grid>
                <Box mt={3}>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    保存
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: 媒体服务器 */}
      {activeTab === 5 && (
        <>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>媒体服务器</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              所有启用的媒体服务器都会被使用。
            </Typography>
            
            <Grid container spacing={3}>
              {config.emby.map((server, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card variant="outlined" sx={{ p: 2, position: 'relative' }}>
                    {config.emby.length > 1 && (
                      <IconButton 
                        size="small" 
                        onClick={() => removeEmbyServer(index)}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                      >
                        ✕
                      </IconButton>
                    )}
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Box 
                        sx={{ 
                          width: 48, 
                          height: 48, 
                          bgcolor: 'success.main', 
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      >
                        E
                      </Box>
                      <TextField
                        size="small"
                        value={server.name}
                        onChange={e => updateEmbyServer(index, 'name', e.target.value)}
                        variant="standard"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      label="服务器地址"
                      placeholder="https://emby.example.com:8096"
                      value={server.serverUrl}
                      onChange={e => updateEmbyServer(index, 'serverUrl', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="API Key"
                      value={server.apiKey}
                      onChange={e => updateEmbyServer(index, 'apiKey', e.target.value)}
                    />
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box mt={3} display="flex" gap={2}>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                保存
              </Button>
              <Button variant="outlined" onClick={addEmbyServer}>
                +
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* 媒体库同步设置 */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="h6" gutterBottom>媒体库同步</Typography>
                <Typography variant="body2" color="text.secondary">
                  同步 Emby 媒体库到本地，用于标记已入库内容
                </Typography>
              </Box>
              <Chip 
                label={`已同步 ${syncedCount} 项`} 
                color="primary" 
                variant="outlined" 
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />

            {loadingLibraries ? (
              <Box display="flex" alignItems="center" gap={2} py={2}>
                <CircularProgress size={20} />
                <Typography variant="body2">加载媒体库...</Typography>
              </Box>
            ) : libraries.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                请先配置并保存 Emby 服务器信息，然后刷新页面以加载媒体库列表
              </Alert>
            ) : (
              <>
                <Typography variant="subtitle2" gutterBottom>选择要同步的媒体库</Typography>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Button size="small" variant="outlined" onClick={selectAllLibraries}>
                    全选影视库
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={() => setConfig(prev => ({ ...prev, sync: { ...prev.sync, libraries: [], interval: prev.sync?.interval || 24 } }))}
                  >
                    清空选择
                  </Button>
                </Box>
                <FormGroup row sx={{ mb: 3 }}>
                  {libraries.map(lib => (
                    <FormControlLabel
                      key={lib.Id}
                      control={
                        <Checkbox
                          checked={config.sync?.libraries?.includes(lib.Id) || false}
                          onChange={() => toggleLibrary(lib.Id)}
                        />
                      }
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <span>{lib.Name}</span>
                          <Chip 
                            size="small" 
                            label={lib.CollectionType === 'movies' ? '电影' : lib.CollectionType === 'tvshows' ? '剧集' : lib.CollectionType}
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        </Box>
                      }
                    />
                  ))}
                </FormGroup>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>自动同步间隔</InputLabel>
                      <Select
                        value={config.sync?.interval || 24}
                        label="自动同步间隔"
                        onChange={e => setConfig(prev => ({ 
                          ...prev, 
                          sync: { ...prev.sync, libraries: prev.sync?.libraries || [], interval: e.target.value as number } 
                        }))}
                      >
                        <MenuItem value={0}>禁用自动同步</MenuItem>
                        <MenuItem value={1}>每小时</MenuItem>
                        <MenuItem value={6}>每6小时</MenuItem>
                        <MenuItem value={12}>每12小时</MenuItem>
                        <MenuItem value={24}>每天</MenuItem>
                        <MenuItem value={168}>每周</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        上次同步: {config.sync?.lastSync 
                          ? new Date(config.sync.lastSync).toLocaleString('zh-CN')
                          : '从未同步'}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        用户访问时自动检查并同步
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button 
                      variant="contained" 
                      onClick={handleSync}
                      disabled={syncing || libraries.length === 0}
                      fullWidth
                    >
                      {syncing ? '同步中...' : '立即同步'}
                    </Button>
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>自动同步机制：</strong>当用户访问系统时会自动检测是否需要同步。如需更可靠的定时同步，可配置外部 cron 任务：
                  </Typography>
                  <Box component="code" sx={{ 
                    display: 'block', 
                    mt: 1, 
                    p: 1, 
                    bgcolor: 'action.hover', 
                    borderRadius: 1,
                    fontSize: '0.8rem',
                    wordBreak: 'break-all'
                  }}>
                    curl -s {typeof window !== 'undefined' ? window.location.origin : ''}/api/cron/sync-library
                  </Box>
                </Alert>

                {syncProgress && (
                  <Box mt={3}>
                    <Typography variant="body2" gutterBottom>
                      正在同步: {syncProgress.library} ({syncProgress.current}/{syncProgress.total})
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(syncProgress.current / syncProgress.total) * 100} 
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </>
      )}

      {/* Tab: 通知 */}
      {activeTab === 6 && (
        <Grid container spacing={4}>
          {/* Telegram 通知 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">Telegram 机器人</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={config.telegram.enabled !== false}
                        onChange={e => updateConfig('telegram', 'enabled', e.target.checked)}
                      />
                    }
                    label="启用"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  配置 Telegram Bot，支持用户绑定账号、签到、求片、接收通知等功能
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Bot Token"
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      value={config.telegram.botToken}
                      onChange={e => updateConfig('telegram', 'botToken', e.target.value)}
                      disabled={config.telegram.enabled === false}
                      helperText="从 @BotFather 获取"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="管理员 Chat ID"
                      placeholder="-1001234567890"
                      value={config.telegram.chatId}
                      onChange={e => updateConfig('telegram', 'chatId', e.target.value)}
                      disabled={config.telegram.enabled === false}
                      helperText="接收管理通知（求片审核等）"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="入库通知频道 ID"
                      placeholder="@your_channel 或 -1001234567890"
                      value={config.telegram.channelId || ''}
                      onChange={e => updateConfig('telegram', 'channelId', e.target.value)}
                      disabled={config.telegram.enabled === false}
                      helperText="新媒体入库时发送通知到此频道"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Webhook URL"
                      placeholder="https://your-domain.com/api/telegram/webhook"
                      value={config.telegram.webhookUrl || ''}
                      onChange={e => updateConfig('telegram', 'webhookUrl', e.target.value)}
                      disabled={config.telegram.enabled === false}
                      helperText="机器人 Webhook 地址（需 HTTPS）"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!config.telegram.botToken || !config.telegram.webhookUrl}
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/telegram/webhook?action=setWebhook&url=${encodeURIComponent(config.telegram.webhookUrl)}`)
                            const data = await res.json()
                            if (data.ok) {
                              alert('Webhook 设置成功！')
                            } else {
                              alert('设置失败：' + (data.description || data.error))
                            }
                          } catch (e) {
                            alert('设置失败')
                          }
                        }}
                      >
                        设置 Webhook
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!config.telegram.botToken}
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/telegram/webhook?action=getWebhookInfo')
                            const data = await res.json()
                            alert(JSON.stringify(data.result || data, null, 2))
                          } catch (e) {
                            alert('获取失败')
                          }
                        }}
                      >
                        查看 Webhook 状态
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 邮件通知 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">邮件通知</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={config.email?.enabled === true}
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          email: { ...prev.email!, enabled: e.target.checked }
                        }))}
                      />
                    }
                    label="启用"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  配置 SMTP 邮箱服务，向用户发送到期提醒、求片通知、订阅更新等邮件
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="SMTP 服务器"
                      placeholder="smtp.qq.com"
                      value={config.email?.host || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        email: { ...prev.email!, host: e.target.value }
                      }))}
                      disabled={!config.email?.enabled}
                      helperText="QQ: smtp.qq.com, 163: smtp.163.com, Gmail: smtp.gmail.com"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="端口"
                      type="number"
                      placeholder="465"
                      value={config.email?.port || 465}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        email: { ...prev.email!, port: parseInt(e.target.value) || 465 }
                      }))}
                      disabled={!config.email?.enabled}
                      helperText="SSL: 465, TLS: 587"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth disabled={!config.email?.enabled}>
                      <InputLabel>加密方式</InputLabel>
                      <Select
                        value={config.email?.secure ? 'ssl' : 'tls'}
                        label="加密方式"
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          email: { ...prev.email!, secure: e.target.value === 'ssl' }
                        }))}
                      >
                        <MenuItem value="ssl">SSL (端口465)</MenuItem>
                        <MenuItem value="tls">TLS (端口587)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="发件邮箱"
                      placeholder="your-email@qq.com"
                      value={config.email?.user || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        email: { ...prev.email!, user: e.target.value }
                      }))}
                      disabled={!config.email?.enabled}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="授权码/密码"
                      type="password"
                      placeholder="SMTP授权码"
                      value={config.email?.pass || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        email: { ...prev.email!, pass: e.target.value }
                      }))}
                      disabled={!config.email?.enabled}
                      helperText="QQ/163邮箱需要使用授权码，非登录密码"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="发件人名称"
                      placeholder="FlixPilot"
                      value={config.email?.from || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        email: { ...prev.email!, from: e.target.value }
                      }))}
                      disabled={!config.email?.enabled}
                      helperText="邮件中显示的发件人名称"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />
                
                <Typography variant="subtitle2" gutterBottom>通知类型</Typography>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={config.email?.notifications?.expiry !== false}
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          email: { 
                            ...prev.email!, 
                            notifications: { ...prev.email?.notifications!, expiry: e.target.checked }
                          }
                        }))}
                        disabled={!config.email?.enabled}
                      />
                    }
                    label="到期提醒"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={config.email?.notifications?.request !== false}
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          email: { 
                            ...prev.email!, 
                            notifications: { ...prev.email?.notifications!, request: e.target.checked }
                          }
                        }))}
                        disabled={!config.email?.enabled}
                      />
                    }
                    label="求片通知"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={config.email?.notifications?.subscription !== false}
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          email: { 
                            ...prev.email!, 
                            notifications: { ...prev.email?.notifications!, subscription: e.target.checked }
                          }
                        }))}
                        disabled={!config.email?.enabled}
                      />
                    }
                    label="订阅更新"
                  />
                </FormGroup>

                <Box mt={3} display="flex" gap={2}>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    保存配置
                  </Button>
                  <Button 
                    variant="outlined" 
                    disabled={!config.email?.enabled || !config.email?.host || !config.email?.user}
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/email/test', { method: 'POST' })
                        const data = await res.json()
                        if (res.ok) {
                          setMessage({ type: 'success', text: '测试邮件发送成功！请检查收件箱' })
                        } else {
                          setMessage({ type: 'error', text: data.error || '发送失败' })
                        }
                      } catch (e: any) {
                        setMessage({ type: 'error', text: '发送测试邮件失败: ' + e.message })
                      }
                    }}
                  >
                    发送测试邮件
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: 网络 */}
      {activeTab === 7 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>网络代理</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              用于访问需要代理的外部服务（如 TMDB）
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="HTTP 代理"
                  placeholder="http://127.0.0.1:7890"
                  value={config.proxy.http}
                  onChange={e => updateConfig('proxy', 'http', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="HTTPS 代理"
                  placeholder="http://127.0.0.1:7890"
                  value={config.proxy.https}
                  onChange={e => updateConfig('proxy', 'https', e.target.value)}
                />
              </Grid>
            </Grid>
            <Box mt={3}>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                保存
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tab: 流量统计 */}
      {activeTab === 8 && (
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">GoEdge 流量统计</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={config.goedge?.enabled || false}
                        onChange={e => {
                          setConfig(prev => ({
                            ...prev,
                            goedge: { ...prev.goedge!, enabled: e.target.checked }
                          }))
                        }}
                      />
                    }
                    label="启用"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  从 GoEdge CDN 日志中统计 Emby 用户流量，自动同步到用户管理页面
                </Typography>
                
                {config.goedge?.enabled && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>MySQL 连接配置</Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      GoEdge 日志存储的 MySQL 数据库连接信息
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="MySQL 地址"
                          placeholder="172.22.0.3"
                          value={config.goedge?.mysql?.host || ''}
                          onChange={e => {
                            setConfig(prev => ({
                              ...prev,
                              goedge: { 
                                ...prev.goedge!, 
                                mysql: { ...prev.goedge!.mysql, host: e.target.value }
                              }
                            }))
                          }}
                          helperText="GoEdge MySQL 容器的 IP 地址"
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="端口"
                          type="number"
                          value={config.goedge?.mysql?.port || 3306}
                          onChange={e => {
                            setConfig(prev => ({
                              ...prev,
                              goedge: { 
                                ...prev.goedge!, 
                                mysql: { ...prev.goedge!.mysql, port: parseInt(e.target.value) || 3306 }
                              }
                            }))
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="用户名"
                          value={config.goedge?.mysql?.user || ''}
                          onChange={e => {
                            setConfig(prev => ({
                              ...prev,
                              goedge: { 
                                ...prev.goedge!, 
                                mysql: { ...prev.goedge!.mysql, user: e.target.value }
                              }
                            }))
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="密码"
                          type="password"
                          value={config.goedge?.mysql?.password || ''}
                          onChange={e => {
                            setConfig(prev => ({
                              ...prev,
                              goedge: { 
                                ...prev.goedge!, 
                                mysql: { ...prev.goedge!.mysql, password: e.target.value }
                              }
                            }))
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="数据库名"
                          value={config.goedge?.mysql?.database || 'mysql'}
                          onChange={e => {
                            setConfig(prev => ({
                              ...prev,
                              goedge: { 
                                ...prev.goedge!, 
                                mysql: { ...prev.goedge!.mysql, database: e.target.value }
                              }
                            }))
                          }}
                        />
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>同步配置</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Emby 域名"
                          placeholder="emby.example.com"
                          value={config.goedge?.embyDomain || ''}
                          onChange={e => {
                            setConfig(prev => ({
                              ...prev,
                              goedge: { ...prev.goedge!, embyDomain: e.target.value }
                            }))
                          }}
                          helperText="GoEdge 日志中的 Emby 域名（不含 https://）"
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="同步间隔（分钟）"
                          type="number"
                          value={config.goedge?.syncInterval || 5}
                          onChange={e => {
                            setConfig(prev => ({
                              ...prev,
                              goedge: { ...prev.goedge!, syncInterval: parseInt(e.target.value) || 5 }
                            }))
                          }}
                        />
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Button 
                        variant="outlined" 
                        onClick={async () => {
                          setGoedgeSyncing(true)
                          try {
                            const res = await fetch('/api/traffic/sync', { method: 'POST' })
                            const data = await res.json()
                            if (res.ok) {
                              setMessage({ type: 'success', text: `同步成功！处理 ${data.logsProcessed} 条日志，更新 ${data.usersUpdated} 个用户` })
                              // 刷新状态
                              const statusRes = await fetch('/api/traffic/sync')
                              if (statusRes.ok) {
                                const status = await statusRes.json()
                                setGoedgeSyncStatus(status.state)
                              }
                            } else {
                              setMessage({ type: 'error', text: data.error || '同步失败' })
                            }
                          } catch {
                            setMessage({ type: 'error', text: '同步请求失败' })
                          }
                          setGoedgeSyncing(false)
                        }}
                        disabled={goedgeSyncing}
                      >
                        {goedgeSyncing ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                        立即同步
                      </Button>
                      {goedgeSyncStatus?.lastSyncTime && (
                        <Typography variant="body2" color="text.secondary">
                          上次同步: {new Date(goedgeSyncStatus.lastSyncTime).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  </>
                )}

                <Box mt={3}>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    保存配置
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
