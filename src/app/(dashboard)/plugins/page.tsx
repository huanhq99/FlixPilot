'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Stack,
  Button,
  Tabs,
  Tab,
  Avatar,
  Divider
} from '@mui/material'

interface PluginDefinition {
  key: string
  title: string
  description: string
  href: string
  icon: string
  accent: string
  tags: string[]
  badge?: string
}

const pluginList: PluginDefinition[] = [
  {
    key: 'subtitle-translate',
    title: 'AI 字幕翻译',
    description: '上传字幕文件即可自动翻译生成多语言版本，支持批量上传与质量校验。',
    href: '/plugins/subtitle-translate',
    icon: 'ri-translate-2',
    accent: '#8B5CF6',
    tags: ['字幕', 'AI'],
    badge: 'Beta'
  },
  {
    key: 'announcement-assistant',
    title: '自动公告助手',
    description: '调用 Gemini 智能生成站内公告，支持模板保存、预览与一键推送。',
    href: '/plugins/announcement-assistant',
    icon: 'ri-notification-badge-line',
    accent: '#F97316',
    tags: ['自动化']
  },
  {
    key: 'emby-maintenance',
    title: 'Emby 媒体维护',
    description: '整合 Emby 质检、重复扫描与清理工具，保持媒体库干净可靠。',
    href: '/plugins/emby-maintenance',
    icon: 'ri-database-gear-line',
    accent: '#0EA5E9',
    tags: ['运维', 'Emby']
  }
]

const SettingsPlaceholder = () => (
  <Card variant='outlined' sx={{ p: 6, textAlign: 'center' }}>
    <Typography variant='h6' fontWeight={600} gutterBottom>
      插件设置功能即将上线
    </Typography>
    <Typography color='text.secondary' sx={{ maxWidth: 420, mx: 'auto' }}>
      未来可以在这里统一管理插件的开关、密钥和运行策略，敬请期待。
    </Typography>
  </Card>
)

const PluginsPage = () => {
  const [activeTab, setActiveTab] = useState('mine')

  return (
    <Box>
      <Box display='flex' flexDirection={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems='flex-start' gap={3} mb={4}>
        <Box>
          <Typography variant='h4' fontWeight={700} mb={1}>
            插件中心
          </Typography>
          <Typography color='text.secondary'>扩展 FlixPilot 的能力，快速完成批量操作与自动化任务。</Typography>
        </Box>
        <Stack direction='row' spacing={1}>
          <Button variant='outlined' color='secondary' startIcon={<i className='ri-refresh-line' />}
            onClick={() => window.location.reload()}>
            刷新列表
          </Button>
          <Button variant='contained' startIcon={<i className='ri-add-line' />}
            component={Link}
            href='/plugins/announcement-assistant'>
            新建任务
          </Button>
        </Stack>
      </Box>

      <Card variant='outlined' sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          sx={{ px: { xs: 2, sm: 4 }, pt: 2 }}
        >
          <Tab label='我的插件' value='mine' />
          <Tab label='插件设置' value='settings' disabled />
        </Tabs>
        <Divider sx={{ mt: 1 }} />
        <CardContent>
          {activeTab === 'mine' ? (
            <Grid container spacing={3}>
              {pluginList.map(plugin => (
                <Grid item xs={12} sm={6} lg={4} key={plugin.key}>
                  <Card
                    variant='outlined'
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      borderColor: 'divider',
                      '&:hover': { borderColor: plugin.accent, boxShadow: theme => `0 12px 30px ${theme.palette.grey[900]}22`, transform: 'translateY(-4px)' },
                      transition: theme => theme.transitions.create(['box-shadow', 'transform', 'border-color'], { duration: 200 })
                    }}
                  >
                    <CardContent>
                      <Stack direction='row' spacing={2} alignItems='center' mb={2}>
                        <Avatar sx={{ width: 48, height: 48, bgcolor: `${plugin.accent}1A`, color: plugin.accent }}>
                          <i className={plugin.icon} />
                        </Avatar>
                        <Box>
                          <Stack direction='row' spacing={1} alignItems='center'>
                            <Typography variant='h6'>{plugin.title}</Typography>
                            {plugin.badge && <Chip size='small' color='primary' label={plugin.badge} />}
                          </Stack>
                          <Stack direction='row' spacing={1} mt={0.5}>
                            {plugin.tags.map(tag => (
                              <Chip key={tag} size='small' variant='outlined' label={tag} />
                            ))}
                          </Stack>
                        </Box>
                      </Stack>
                      <Typography color='text.secondary' mb={3}>
                        {plugin.description}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ px: 3, pb: 3 }}>
                      <Button
                        fullWidth
                        variant='contained'
                        endIcon={<i className='ri-arrow-right-up-line' />}
                        component={Link}
                        href={plugin.href}
                      >
                        打开插件
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <SettingsPlaceholder />
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default PluginsPage
