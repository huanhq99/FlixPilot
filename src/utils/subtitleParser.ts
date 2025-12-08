/**
 * 字幕解析和生成工具
 * 支持 SRT 和 ASS/SSA 格式
 */

// SRT 字幕条目
export interface SrtEntry {
  index: number
  startTime: string
  endTime: string
  text: string
}

// ASS 字幕条目
export interface AssEntry {
  layer: number
  start: string
  end: string
  style: string
  name: string
  marginL: string
  marginR: string
  marginV: string
  effect: string
  text: string
}

// ASS 文件结构
export interface AssFile {
  scriptInfo: Record<string, string>
  styles: {
    format: string[]
    styles: Record<string, string>[]
  }
  events: {
    format: string[]
    dialogues: AssEntry[]
    comments: string[]
  }
  rawSections: Record<string, string[]>
}

/**
 * 检测字幕格式
 */
export function detectSubtitleFormat(content: string): 'srt' | 'ass' | 'unknown' {
  const trimmed = content.trim()
  
  // ASS/SSA 文件以 [Script Info] 开头
  if (trimmed.startsWith('[Script Info]') || trimmed.includes('[V4+ Styles]') || trimmed.includes('[V4 Styles]')) {
    return 'ass'
  }
  
  // SRT 文件以数字序号开头，后面跟时间码
  if (/^\d+\s*\n\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.:]\d{3}/.test(trimmed)) {
    return 'srt'
  }
  
  // 进一步检测：如果包含 --> 时间分隔符，可能是 SRT
  if (trimmed.includes('-->')) {
    return 'srt'
  }
  
  return 'unknown'
}

/**
 * 解析 SRT 字幕
 */
export function parseSrt(content: string): SrtEntry[] {
  const entries: SrtEntry[] = []
  
  // 标准化换行符
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
  // 按空行分割字幕块
  const blocks = normalized.split(/\n\n+/)
  
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue
    
    // 第一行是序号
    const indexLine = lines[0].trim()
    const index = parseInt(indexLine)
    if (isNaN(index)) continue
    
    // 第二行是时间码
    const timeLine = lines[1].trim()
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.:]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.:]\d{3})/)
    if (!timeMatch) continue
    
    const startTime = timeMatch[1]
    const endTime = timeMatch[2]
    
    // 剩余行是字幕文本
    const text = lines.slice(2).join('\n')
    
    entries.push({ index, startTime, endTime, text })
  }
  
  return entries
}

/**
 * 生成 SRT 字幕
 */
export function generateSrt(entries: SrtEntry[]): string {
  return entries.map(entry => {
    return `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`
  }).join('\n\n')
}

/**
 * 解析 ASS 字幕
 */
export function parseAss(content: string): AssFile {
  const result: AssFile = {
    scriptInfo: {},
    styles: { format: [], styles: [] },
    events: { format: [], dialogues: [], comments: [] },
    rawSections: {}
  }
  
  // 标准化换行符
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  
  let currentSection = ''
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // 跳过空行
    if (!trimmed) continue
    
    // 检测章节标题
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1)
      if (!result.rawSections[currentSection]) {
        result.rawSections[currentSection] = []
      }
      continue
    }
    
    // 保存原始行到 rawSections
    if (currentSection && result.rawSections[currentSection]) {
      result.rawSections[currentSection].push(line)
    }
    
    // 解析 Script Info
    if (currentSection === 'Script Info') {
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim()
        const value = trimmed.substring(colonIndex + 1).trim()
        result.scriptInfo[key] = value
      }
    }
    
    // 解析样式
    if (currentSection === 'V4+ Styles' || currentSection === 'V4 Styles') {
      if (trimmed.startsWith('Format:')) {
        result.styles.format = trimmed.substring(7).split(',').map(s => s.trim())
      } else if (trimmed.startsWith('Style:')) {
        const values = trimmed.substring(6).split(',').map(s => s.trim())
        const style: Record<string, string> = {}
        result.styles.format.forEach((key, i) => {
          style[key] = values[i] || ''
        })
        result.styles.styles.push(style)
      }
    }
    
    // 解析事件
    if (currentSection === 'Events') {
      if (trimmed.startsWith('Format:')) {
        result.events.format = trimmed.substring(7).split(',').map(s => s.trim())
      } else if (trimmed.startsWith('Dialogue:')) {
        const dialogueContent = trimmed.substring(9)
        const entry = parseAssDialogue(dialogueContent, result.events.format)
        if (entry) {
          result.events.dialogues.push(entry)
        }
      } else if (trimmed.startsWith('Comment:')) {
        result.events.comments.push(trimmed)
      }
    }
  }
  
  return result
}

/**
 * 解析 ASS 对话行
 */
function parseAssDialogue(content: string, format: string[]): AssEntry | null {
  // ASS 的 Text 字段可能包含逗号，所以需要特殊处理
  // 格式通常是: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
  const parts: string[] = []
  let current = ''
  let commaCount = 0
  const maxCommas = format.length - 1 // Text 之前的逗号数量
  
  for (const char of content) {
    if (char === ',' && commaCount < maxCommas) {
      parts.push(current.trim())
      current = ''
      commaCount++
    } else {
      current += char
    }
  }
  parts.push(current) // 最后一个是 Text
  
  if (parts.length < format.length) {
    return null
  }
  
  return {
    layer: parseInt(parts[0]) || 0,
    start: parts[1] || '',
    end: parts[2] || '',
    style: parts[3] || '',
    name: parts[4] || '',
    marginL: parts[5] || '0',
    marginR: parts[6] || '0',
    marginV: parts[7] || '0',
    effect: parts[8] || '',
    text: parts[9] || ''
  }
}

/**
 * 生成 ASS 字幕
 */
export function generateAss(assFile: AssFile): string {
  const lines: string[] = []
  
  // Script Info
  lines.push('[Script Info]')
  for (const [key, value] of Object.entries(assFile.scriptInfo)) {
    lines.push(`${key}: ${value}`)
  }
  lines.push('')
  
  // Styles
  const stylesSection = assFile.rawSections['V4+ Styles'] ? 'V4+ Styles' : 'V4 Styles'
  lines.push(`[${stylesSection}]`)
  lines.push(`Format: ${assFile.styles.format.join(', ')}`)
  for (const style of assFile.styles.styles) {
    const values = assFile.styles.format.map(key => style[key] || '')
    lines.push(`Style: ${values.join(',')}`)
  }
  lines.push('')
  
  // Events
  lines.push('[Events]')
  lines.push(`Format: ${assFile.events.format.join(', ')}`)
  
  for (const comment of assFile.events.comments) {
    lines.push(comment)
  }
  
  for (const dialogue of assFile.events.dialogues) {
    const values = [
      dialogue.layer,
      dialogue.start,
      dialogue.end,
      dialogue.style,
      dialogue.name,
      dialogue.marginL,
      dialogue.marginR,
      dialogue.marginV,
      dialogue.effect,
      dialogue.text
    ]
    lines.push(`Dialogue: ${values.join(',')}`)
  }
  
  return lines.join('\n')
}

/**
 * 提取 ASS 字幕中的纯文本（用于翻译）
 * 保留 ASS 特效标签，只翻译实际文本
 */
export function extractAssText(text: string): { text: string; tags: { start: number; end: number; tag: string }[] } {
  const tags: { start: number; end: number; tag: string }[] = []
  let result = ''
  let i = 0
  
  while (i < text.length) {
    // 检测 {\xxx} 格式的标签
    if (text[i] === '{' && text[i + 1] === '\\') {
      const start = result.length
      let j = i + 2
      while (j < text.length && text[j] !== '}') {
        j++
      }
      if (j < text.length) {
        const tag = text.substring(i, j + 1)
        tags.push({ start, end: start, tag })
        i = j + 1
        continue
      }
    }
    
    result += text[i]
    i++
  }
  
  return { text: result, tags }
}

/**
 * 重新组装 ASS 文本（将标签插回翻译后的文本）
 */
export function reassembleAssText(translatedText: string, tags: { start: number; end: number; tag: string }[]): string {
  if (tags.length === 0) return translatedText
  
  // 按位置排序标签
  const sortedTags = [...tags].sort((a, b) => a.start - b.start)
  
  let result = ''
  let lastIndex = 0
  let offset = 0
  
  for (const tag of sortedTags) {
    // 计算调整后的位置（考虑文本长度可能变化）
    const adjustedStart = Math.min(tag.start, translatedText.length)
    
    // 添加到标签位置的文本
    result += translatedText.substring(lastIndex, adjustedStart)
    // 添加标签
    result += tag.tag
    
    lastIndex = adjustedStart
  }
  
  // 添加剩余文本
  result += translatedText.substring(lastIndex)
  
  return result
}

/**
 * 清理 ASS 文本中的格式标签，获取纯文本
 */
export function cleanAssText(text: string): string {
  // 移除 {\xxx} 格式的标签
  let cleaned = text.replace(/\{[^}]*\}/g, '')
  // 移除 \N \n \h 等换行和空格标记
  cleaned = cleaned.replace(/\\[Nnh]/g, ' ')
  return cleaned.trim()
}

/**
 * 创建双语字幕（原文 + 翻译）
 */
export function createBilingualSrt(originalEntries: SrtEntry[], translatedTexts: string[]): SrtEntry[] {
  return originalEntries.map((entry, index) => ({
    ...entry,
    text: `${entry.text}\n${translatedTexts[index] || ''}`
  }))
}

/**
 * 创建双语 ASS 字幕
 */
export function createBilingualAss(assFile: AssFile, translatedTexts: string[]): AssFile {
  const newDialogues = assFile.events.dialogues.map((dialogue, index) => {
    const translated = translatedTexts[index] || ''
    // 在原文后添加换行和翻译
    const bilingualText = `${dialogue.text}\\N${translated}`
    return { ...dialogue, text: bilingualText }
  })
  
  return {
    ...assFile,
    events: {
      ...assFile.events,
      dialogues: newDialogues
    }
  }
}
