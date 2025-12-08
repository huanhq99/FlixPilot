'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import ReactMarkdown from 'react-markdown'

const toneOptions = [
  { value: 'friendly', label: '亲切友好' },
  { value: 'serious', label: '严肃正式' },
  { value: 'celebratory', label: '喜悦庆祝' },
  { value: 'urgent', label: '紧急提醒' }
]

const channelOptions = [
  { value: 'site', label: '站内公告', icon: 'ri-news-line' },
  { value: 'popup', label: '弹窗提醒', icon: 'ri-notification-2-line' },
  { value: 'telegram', label: 'Telegram', icon: 'ri-telegram-line' },
  { value: 'email', label: '邮件', icon: 'ri-mail-send-line' }
]

const lengthOptions = [
  { value: 'short', label: '简短 (<=80字)' },
  { value: 'medium', label: '适中 (100-200字)' },
  { value: 'long', label: '详细 (200字以上)' }
]

type AnnouncementType = 'info' | 'success' | 'warning' | 'error'

interface DraftResult {
  title: string
  summary: string
  bodyMarkdown: string
  highlights: string[]
  suggestedType: AnnouncementType
  callToAction: string
  recommendedChannels: string[]
}

const defaultFormState = {
  scenario: '',
  audience: '全体用户',
  tone: 'friendly',
  channels: ['site'],
  extraContext: '',
  callToAction: '',
  length: 'medium'
}

export default function AnnouncementAssistantPage() {
  const [formState, setFormState] = useState(defaultFormState)
  const [draft, setDraft] = useState<DraftResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>('info')
  const [isPinned, setIsPinned] = useState(false)
  const [priority, setPriority] = useState(0)

  const handleChannelToggle = (value: string) => {
    setFormState(prev => {
      const exists = prev.channels.includes(value)
      return {
        ...prev,
        channels: exists ? prev.channels.filter(ch => ch !== value) : [...prev.channels, value]
      }
    })
  }

  const handleGenerate = async () => {
    if (!formState.scenario.trim()) {
      setError('请先描述公告主题或场景')
      return
    }

    setLoading(true)
    setDraft(null)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/plugins/announcement/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '生成失败，请稍后重试')
      }

      setDraft(data.draft)
      setAnnouncementType(data.draft.suggestedType || 'info')
      setIsPinned(data.draft.recommendedChannels?.includes('popup') || false)
      setSuccess('AI 草稿已生成')
    } catch (err: any) {
      setError(err.message || '生成失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(`${draft.title}\n\n${draft.summary}\n\n${draft.bodyMarkdown}\n\n${draft.callToAction}`)
      setSuccess('内容已复制到剪贴板')
    } catch (err) {
      setError('复制失败，请手动复制')
    }
  }

  const handlePublish = async () => {
    if (!draft) return

    setPublishing(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          content: `${draft.bodyMarkdown}\n\n${draft.callToAction}`.trim(),
          type: announcementType,
          priority,
          isActive: true,
          isPinned
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '发布失败')
      }

      setSuccess('公告已发布')
    } catch (err: any) {
      setError(err.message || '发布失败，请稍后重试')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 4 }}>
        🤖 自动公告助手
      </Typography>

      {(error || success) && (
        <Alert severity={error ? 'error' : 'success'} sx={{ mb: 3 }} onClose={() => { setError(''); setSuccess('') }}>
          {error || success}
        </Alert>
      )}

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 3 }}>输入场景</Typography>
          <Stack spacing={3}>
            <TextField
              label='公告主题 / 事件'
              value={formState.scenario}
              onChange={e => setFormState({ ...formState, scenario: e.target.value })}
              placeholder='如：计划内维护、资源上新、抽奖活动、系统异常、积分规则调整等'
              multiline
              minRows={3}
            />

            <TextField
              label='目标受众'
              value={formState.audience}
              onChange={e => setFormState({ ...formState, audience: e.target.value })}
              placeholder='如：全体订阅用户 / 新注册用户 / 下载受影响用户'
            />

            <TextField
              label='补充背景'
              value={formState.extraContext}
              onChange={e => setFormState({ ...formState, extraContext: e.target.value })}
              placeholder='可描述具体时间、影响范围、解决进度等'
              multiline
              minRows={2}
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <FormControl fullWidth>
                <InputLabel>语气</InputLabel>
                <Select
                  label='语气'
                  value={formState.tone}
                  onChange={e => setFormState({ ...formState, tone: e.target.value as string })}
                >
                  {toneOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>篇幅</InputLabel>
                <Select
                  label='篇幅'
                  value={formState.length}
                  onChange={e => setFormState({ ...formState, length: e.target.value as string })}
                >
                  {lengthOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Box>
              <Typography variant='subtitle2' sx={{ mb: 1 }}>推送渠道偏好</Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap'>
                {channelOptions.map(option => (
                  <Chip
                    key={option.value}
                    icon={<i className={option.icon} />}
                    label={option.label}
                    color={formState.channels.includes(option.value) ? 'primary' : 'default'}
                    onClick={() => handleChannelToggle(option.value)}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              label='希望用户采取的行动 (可选)'
              value={formState.callToAction}
              onChange={e => setFormState({ ...formState, callToAction: e.target.value })}
              placeholder='如：请提前安排观看计划 / 请前往设置页确认 / 点击下方按钮参与活动'
            />

            <Button
              variant='contained'
              size='large'
              onClick={handleGenerate}
              disabled={loading}
              startIcon={<i className='ri-robot-line' />}
            >
              {loading ? '生成中...' : '生成智能草稿'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems='flex-start'>
              <Box flex={1}>
                <Typography variant='h6' sx={{ mb: 1 }}>{draft.title}</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                  {draft.summary}
                </Typography>

                {draft.highlights.length > 0 && (
                  <Stack direction='row' spacing={1} flexWrap='wrap' sx={{ mb: 2 }}>
                    {draft.highlights.map((item: string, idx: number) => (
                      <Chip key={idx} label={item} size='small' icon={<i className='ri-sparkling-2-line' />} />
                    ))}
                  </Stack>
                )}

                <Divider sx={{ my: 2 }} />

                <Box className='markdown-body' sx={{ '& p': { mb: 2 } }}>
                  <ReactMarkdown>{draft.bodyMarkdown}</ReactMarkdown>
                </Box>

                <Alert severity='info' sx={{ mt: 2 }}>
                  {draft.callToAction}
                </Alert>
              </Box>

              <Box width={{ md: 280 }}>
                <Typography variant='subtitle2' sx={{ mb: 2 }}>发布设置</Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>公告类型</InputLabel>
                    <Select
                      label='公告类型'
                      value={announcementType}
                      onChange={e => setAnnouncementType(e.target.value as AnnouncementType)}
                    >
                      <MenuItem value='info'>通知</MenuItem>
                      <MenuItem value='success'>成功</MenuItem>
                      <MenuItem value='warning'>警告</MenuItem>
                      <MenuItem value='error'>紧急</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    type='number'
                    label='优先级'
                    value={priority}
                    onChange={e => setPriority(Number(e.target.value) || 0)}
                    helperText='数字越大越靠前'
                  />

                  <FormControlLabel
                    control={<Switch checked={isPinned} onChange={e => setIsPinned(e.target.checked)} color='warning' />}
                    label='弹窗提醒'
                  />

                  <Button variant='outlined' onClick={handleCopy} startIcon={<i className='ri-file-copy-line' />}>
                    复制内容
                  </Button>
                  <Button
                    variant='contained'
                    onClick={handlePublish}
                    disabled={publishing}
                    startIcon={<i className='ri-send-plane-line' />}
                  >
                    {publishing ? '发布中...' : '一键发布公告'}
                  </Button>
                </Stack>

                {draft.recommendedChannels?.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant='caption' color='text.secondary'>推荐渠道</Typography>
                    <Stack direction='row' spacing={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {draft.recommendedChannels.map((channel: string) => (
                        <Chip key={channel} label={channel} size='small' />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
