import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs/promises'
import path from 'path'
import { verifyToken, getUser } from '@/lib/auth'
import { generateGeminiContent, GeminiContentResult } from '@/services/geminiService'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('[Announcement Assistant] Failed to load config:', error)
    return null
  }
}

function sanitizeJsonOutput(text: string): any {
  try {
    let cleaned = text.trim()
    cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      cleaned = match[0]
    }
    return JSON.parse(cleaned)
  } catch (error) {
    console.error('[Announcement Assistant] JSON parse error:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const user = getUser(payload.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const {
      scenario,
      audience = '全体用户',
      channels = [],
      tone = 'friendly',
      extraContext = '',
      callToAction = '',
      length = 'medium'
    } = body

    if (!scenario) {
      return NextResponse.json({ error: '请描述公告场景或主题' }, { status: 400 })
    }

    const config = await loadConfig()
    const geminiConfig = config?.gemini

    if (!geminiConfig?.apiKey) {
      return NextResponse.json({ error: 'Gemini 服务未配置' }, { status: 400 })
    }

    const channelText = channels.length ? channels.join(', ') : '站内公告'
    const callToActionText = callToAction || '提醒用户关注最新进展，并在平台内保持活跃。'

    const prompt = `You are FlixPilot's announcement copilot. Based on the details below, draft a ready-to-publish announcement for the media community.

Context:
- Scenario: ${scenario}
- Audience: ${audience}
- Preferred tone: ${tone}
- Push channels: ${channelText}
- Additional context: ${extraContext || '无'}
- Desired length: ${length}
- Call to action hint: ${callToActionText}

Return ONLY valid JSON with the following shape:
{
  "title": "10-30 characters summary",
  "summary": "<=120 characters digest",
  "bodyMarkdown": "Detailed content in Markdown with short paragraphs and bullet lists where helpful",
  "highlights": ["3 short bullet points"],
  "suggestedType": "info | success | warning | error",
  "callToAction": "one sentence CTA",
  "recommendedChannels": ["site", "popup", "telegram", "email"]
}

Guidelines:
- Keep tone consistent with the provided preference.
- Mention affected services or schedules clearly.
- If issue is urgent, set suggestedType to warning or error.
- Use professional yet friendly Chinese copy.
- bodyMarkdown should be publish-ready, no placeholders.`

    const result: GeminiContentResult = await generateGeminiContent(prompt, geminiConfig, {
      maxOutputTokens: 2048,
      temperature: tone === 'serious' ? 0.2 : 0.35
    })

    if (!result.success || !result.content) {
      return NextResponse.json({ error: result.error || '生成失败' }, { status: 500 })
    }

    const draft = sanitizeJsonOutput(result.content)
    if (!draft) {
      return NextResponse.json({ error: 'AI 返回内容格式无法解析，请重试' }, { status: 500 })
    }

    const normalizedDraft = {
      title: draft.title || '系统公告',
      summary: draft.summary || '',
      bodyMarkdown: draft.bodyMarkdown || '',
      highlights: Array.isArray(draft.highlights) ? draft.highlights.slice(0, 4) : [],
      suggestedType: ['info', 'success', 'warning', 'error'].includes(draft.suggestedType) ? draft.suggestedType : 'info',
      callToAction: draft.callToAction || callToActionText,
      recommendedChannels: Array.isArray(draft.recommendedChannels) ? draft.recommendedChannels : channels
    }

    return NextResponse.json({ success: true, draft: normalizedDraft })
  } catch (error) {
    console.error('[Announcement Assistant] Generate error:', error)
    return NextResponse.json({ error: '生成公告失败，请稍后重试' }, { status: 500 })
  }
}
