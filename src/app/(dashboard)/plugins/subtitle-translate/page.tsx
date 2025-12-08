'use client'

import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import { useDropzone } from 'react-dropzone'

// 支持的语言
const SUPPORTED_LANGUAGES = {
  'zh': '简体中文',
  'zh-tw': '繁体中文',
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
  'fr': 'Français',
  'de': 'Deutsch',
  'es': 'Español',
  'ru': 'Русский',
  'th': 'ภาษาไทย',
  'vi': 'Tiếng Việt'
}

interface TranslationProgress {
  current: number
  total: number
  message: string
}

export default function SubtitleTranslatePage() {
  const [targetLang, setTargetLang] = useState<string>('zh')
  const [bilingual, setBilingual] = useState<boolean>(false)
  const [file, setFile] = useState<File | null>(null)
  const [translating, setTranslating] = useState<boolean>(false)
  const [progress, setProgress] = useState<TranslationProgress | null>(null)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]
      const ext = selectedFile.name.toLowerCase().split('.').pop()
      
      if (!['srt', 'ass', 'ssa'].includes(ext || '')) {
        setError('不支持的文件格式，请上传 SRT 或 ASS 字幕文件')
        return
      }
      
      setFile(selectedFile)
      setError('')
      setSuccess('')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.srt', '.ass', '.ssa']
    },
    maxFiles: 1
  })

  const handleTranslate = async () => {
    if (!file) {
      setError('请先选择字幕文件')
      return
    }

    setTranslating(true)
    setError('')
    setSuccess('')
    setProgress({ current: 0, total: 0, message: '正在上传文件...' })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('targetLang', targetLang)
      formData.append('bilingual', bilingual.toString())

      const res = await fetch('/api/subtitle/translate', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '翻译失败')
      }

      // 下载翻译后的文件
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition')
      let fileName = `translated_${file.name}`
      
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition)
        if (matches?.[1]) {
          fileName = matches[1].replace(/['"]/g, '')
        }
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSuccess('翻译完成！文件已自动下载')
      setFile(null)
      setProgress(null)
    } catch (err: any) {
      setError(err.message || '翻译失败，请重试')
      setProgress(null)
    } finally {
      setTranslating(false)
    }
  }

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 4 }}>
        🌐 AI 字幕翻译
      </Typography>

      <Card>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 3 }}>
            使用 AI 翻译字幕文件
          </Typography>

          {error && (
            <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity='success' sx={{ mb: 3 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>目标语言</InputLabel>
              <Select
                value={targetLang}
                label='目标语言'
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={translating}
              >
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <MenuItem key={code} value={code}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={bilingual}
                  onChange={(e) => setBilingual(e.target.checked)}
                  disabled={translating}
                />
              }
              label='生成双语字幕（原文 + 翻译）'
            />
          </Box>

          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: translating ? 'not-allowed' : 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s',
              mb: 3,
              '&:hover': !translating ? {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              } : {}
            }}
          >
            <input {...getInputProps()} disabled={translating} />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <i className='ri-upload-cloud-2-line' style={{ fontSize: 48, opacity: 0.5 }} />
              {file ? (
                <>
                  <Typography variant='body1' color='primary'>
                    已选择：{file.name}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {(file.size / 1024).toFixed(2)} KB
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant='body1'>
                    {isDragActive ? '放开以上传文件' : '拖拽字幕文件到此处，或点击选择'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    支持 SRT、ASS、SSA 格式
                  </Typography>
                </>
              )}
            </Box>
          </Box>

          {translating && progress && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>
                  {progress.message}
                </Typography>
                {progress.total > 0 && (
                  <Typography variant='body2' color='text.secondary'>
                    {progress.current}/{progress.total}
                  </Typography>
                )}
              </Box>
              <LinearProgress 
                variant={progress.total > 0 ? 'determinate' : 'indeterminate'}
                value={progress.total > 0 ? (progress.current / progress.total * 100) : undefined}
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant='contained'
              onClick={handleTranslate}
              disabled={!file || translating}
              startIcon={<i className='ri-translate-2' />}
              fullWidth
            >
              {translating ? '翻译中...' : '开始翻译'}
            </Button>
            
            {file && !translating && (
              <Button
                variant='outlined'
                onClick={() => {
                  setFile(null)
                  setError('')
                  setSuccess('')
                }}
              >
                清除
              </Button>
            )}
          </Box>

          <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant='subtitle2' sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className='ri-information-line' />
              使用说明
            </Typography>
            <Typography variant='body2' color='text.secondary' component='div'>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>支持 SRT 和 ASS/SSA 字幕格式</li>
                <li>使用 Google Gemini 2.0 Flash 模型进行翻译</li>
                <li>双语模式会在原文下方显示翻译文本</li>
                <li>翻译时间取决于字幕条数，通常每 25 条约需 3-5 秒</li>
                <li>支持自动检测源语言</li>
              </ul>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2 }}>
            配置状态
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              icon={<i className='ri-translate-2' />} 
              label='Gemini API'
              color='success'
              size='small'
            />
            <Chip 
              icon={<i className='ri-file-text-line' />} 
              label='SRT 支持'
              color='success'
              size='small'
            />
            <Chip 
              icon={<i className='ri-file-code-line' />} 
              label='ASS 支持'
              color='success'
              size='small'
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
