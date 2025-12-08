/**
 * Gemini API 服务 - 用于字幕翻译
 */

export interface GeminiConfig {
  apiKey: string
  model?: string
  baseUrl?: string
  maxRetries?: number
}

export interface TranslationResult {
  success: boolean
  translatedText?: string
  translatedLines?: string[]
  error?: string
}

export interface GeminiContentResult {
  success: boolean
  content?: string
  error?: string
}

// 默认配置
const DEFAULT_MODEL = 'gemini-2.0-flash'
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MAX_RETRIES = 3

interface GeminiRequestOptions {
  maxOutputTokens?: number
  temperature?: number
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function requestGeminiContent(
  prompt: string,
  config: GeminiConfig,
  options: GeminiRequestOptions = {}
): Promise<GeminiContentResult> {
  const { apiKey, model = DEFAULT_MODEL, baseUrl = DEFAULT_BASE_URL, maxRetries = DEFAULT_MAX_RETRIES } = config

  if (!apiKey) {
    return { success: false, error: 'Gemini API Key 未配置' }
  }

  const temperature = options.temperature ?? 0.2
  const maxOutputTokens = options.maxOutputTokens ?? 2048

  let lastError = ''
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature,
              topK: 40,
              topP: 0.95,
              maxOutputTokens
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        console.error(`[Gemini] API error (attempt ${attempt}):`, errorData)
        lastError = `Gemini API 错误 (${response.status})`
        
        if (response.status === 429 && attempt < maxRetries) {
          await delay(2000 * attempt)
          continue
        }
        
        if (attempt < maxRetries) {
          await delay(1000 * attempt)
          continue
        }
        
        return { success: false, error: lastError }
      }

      const data = await response.json()
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return {
          success: true,
          content: data.candidates[0].content.parts[0].text.trim()
        }
      }
      
      if (data.candidates && data.candidates[0]?.finishReason === 'SAFETY') {
        return { success: false, error: '内容被安全过滤器阻止' }
      }

      lastError = '生成结果为空'
      if (attempt < maxRetries) {
        await delay(1000)
        continue
      }
      
      return { success: false, error: lastError }
      
    } catch (error: any) {
      console.error(`[Gemini] Request error (attempt ${attempt}):`, error)
      lastError = error.message || '生成请求失败'
      
      if (attempt < maxRetries) {
        await delay(1000 * attempt)
        continue
      }
      
      return { success: false, error: lastError }
    }
  }
  
  return { success: false, error: lastError || '生成失败' }
}

/**
 * 调用 Gemini API 进行翻译（单段文本，带重试）
 */
export async function translateWithGemini(
  text: string,
  targetLanguage: string,
  config: GeminiConfig
): Promise<TranslationResult> {
  const prompt = `You are a professional subtitle translator. Translate the following subtitle text to ${targetLanguage}.

CRITICAL RULES:
1. Keep the original meaning and emotional tone
2. Preserve special markers: [Music], (laughs), ♪, etc.
3. IMPORTANT: Keep the separator "|||SUBTITLE|||" exactly as is between each subtitle line
4. Maintain natural conversational flow for the target language
5. Return ONLY the translated text, no explanations or notes
6. If text is already in ${targetLanguage}, return it unchanged

Text to translate:
${text}`
  const response = await requestGeminiContent(prompt, config, { maxOutputTokens: 8192, temperature: 0.2 })

  if (!response.success) {
    return { success: false, error: response.error }
  }

  if (!response.content) {
    return { success: false, error: '翻译结果为空' }
  }

  return { success: true, translatedText: response.content }
}

/**
 * 批量翻译字幕行
 * 使用特殊分隔符确保翻译后能正确分割
 */
export async function translateSubtitleLines(
  lines: string[],
  targetLanguage: string,
  config: GeminiConfig,
  batchSize: number = 25, // 减小批次大小以提高准确性
  onProgress?: (current: number, total: number, message: string) => void
): Promise<TranslationResult> {
  const results: string[] = []
  const totalBatches = Math.ceil(lines.length / batchSize)
  
  // 使用更独特的分隔符
  const SEPARATOR = '|||SUBTITLE|||'

  for (let i = 0; i < lines.length; i += batchSize) {
    const batch = lines.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    
    // 用分隔符连接
    const batchText = batch.join(`\n${SEPARATOR}\n`)
    
    if (onProgress) {
      onProgress(batchNum, totalBatches, `正在翻译第 ${batchNum}/${totalBatches} 批...`)
    }
    
    const result = await translateWithGemini(batchText, targetLanguage, config)
    
    if (!result.success) {
      return { 
        success: false, 
        error: `翻译第 ${batchNum}/${totalBatches} 批时失败: ${result.error}` 
      }
    }

    // 分割翻译结果
    const translatedText = result.translatedText!
    let translatedBatch = translatedText.split(new RegExp(`\\n?\\|\\|\\|SUBTITLE\\|\\|\\|\\n?`, 'g'))
    
    // 清理每行首尾空白
    translatedBatch = translatedBatch.map(t => t.trim())
    
    // 如果数量匹配，直接使用
    if (translatedBatch.length === batch.length) {
      results.push(...translatedBatch)
    } else {
      // 数量不匹配，尝试智能分配
      console.warn(`[Gemini] Batch ${batchNum}: expected ${batch.length} lines, got ${translatedBatch.length}`)
      
      if (translatedBatch.length > batch.length) {
        // 翻译结果更多，取前面匹配的数量
        results.push(...translatedBatch.slice(0, batch.length))
      } else {
        // 翻译结果更少，用原文补充
        results.push(...translatedBatch)
        for (let j = translatedBatch.length; j < batch.length; j++) {
          results.push(batch[j]) // 保留原文
        }
      }
    }

    // 批次间延迟，避免限流
    if (i + batchSize < lines.length) {
      await delay(800)
    }
  }

  return { success: true, translatedLines: results }
}

/**
 * 通用内容生成
 */
export async function generateGeminiContent(
  prompt: string,
  config: GeminiConfig,
  options?: GeminiRequestOptions
): Promise<GeminiContentResult> {
  return requestGeminiContent(prompt, config, options)
}

/**
 * 检测文本语言（简单启发式）
 */
export function detectLanguage(text: string): string {
  // 中文字符
  if (/[\u4e00-\u9fff]/.test(text)) {
    return '中文'
  }
  // 日文
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
    return '日语'
  }
  // 韩文
  if (/[\uac00-\ud7af]/.test(text)) {
    return '韩语'
  }
  // 泰文
  if (/[\u0e00-\u0e7f]/.test(text)) {
    return '泰语'
  }
  // 俄文
  if (/[\u0400-\u04ff]/.test(text)) {
    return '俄语'
  }
  // 默认英文
  return '英语'
}
