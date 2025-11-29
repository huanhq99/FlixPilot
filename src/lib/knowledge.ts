import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge.json')

export interface KnowledgeArticle {
  id: string
  title: string
  content: string  // Markdown 格式
  category: string
  tags: string[]
  order: number  // 排序
  isPublished: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

// 预设分类
export const KNOWLEDGE_CATEGORIES = [
  { id: 'getting-started', name: '快速入门', icon: 'ri-rocket-line' },
  { id: 'emby-guide', name: 'Emby 使用指南', icon: 'ri-play-circle-line' },
  { id: 'faq', name: '常见问题', icon: 'ri-question-line' },
  { id: 'troubleshooting', name: '故障排除', icon: 'ri-tools-line' },
  { id: 'tips', name: '使用技巧', icon: 'ri-lightbulb-line' }
]

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// 加载知识库文章
export function loadKnowledgeArticles(): KnowledgeArticle[] {
  ensureDataDir()
  if (!fs.existsSync(KNOWLEDGE_FILE)) {
    return []
  }
  try {
    const data = fs.readFileSync(KNOWLEDGE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// 保存知识库文章
export function saveKnowledgeArticles(articles: KnowledgeArticle[]) {
  ensureDataDir()
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(articles, null, 2))
}

// 获取已发布的文章
export function getPublishedArticles(): KnowledgeArticle[] {
  const articles = loadKnowledgeArticles()
  return articles
    .filter(a => a.isPublished)
    .sort((a, b) => a.order - b.order)
}

// 按分类获取文章
export function getArticlesByCategory(category: string): KnowledgeArticle[] {
  const articles = loadKnowledgeArticles()
  return articles
    .filter(a => a.isPublished && a.category === category)
    .sort((a, b) => a.order - b.order)
}

// 获取单个文章
export function getArticle(id: string): KnowledgeArticle | null {
  const articles = loadKnowledgeArticles()
  return articles.find(a => a.id === id) || null
}

// 创建文章
export function createArticle(data: {
  title: string
  content: string
  category: string
  tags?: string[]
  order?: number
  isPublished?: boolean
  createdBy: string
}): KnowledgeArticle {
  const articles = loadKnowledgeArticles()
  
  const article: KnowledgeArticle = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    title: data.title,
    content: data.content,
    category: data.category,
    tags: data.tags || [],
    order: data.order ?? articles.length,
    isPublished: data.isPublished !== false,
    viewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: data.createdBy
  }
  
  articles.push(article)
  saveKnowledgeArticles(articles)
  
  return article
}

// 更新文章
export function updateArticle(id: string, data: Partial<Omit<KnowledgeArticle, 'id' | 'createdAt' | 'createdBy'>>): KnowledgeArticle | null {
  const articles = loadKnowledgeArticles()
  const index = articles.findIndex(a => a.id === id)
  
  if (index === -1) return null
  
  articles[index] = {
    ...articles[index],
    ...data,
    updatedAt: new Date().toISOString()
  }
  
  saveKnowledgeArticles(articles)
  return articles[index]
}

// 删除文章
export function deleteArticle(id: string): boolean {
  const articles = loadKnowledgeArticles()
  const index = articles.findIndex(a => a.id === id)
  
  if (index === -1) return false
  
  articles.splice(index, 1)
  saveKnowledgeArticles(articles)
  return true
}

// 增加浏览量
export function incrementViewCount(id: string): void {
  const articles = loadKnowledgeArticles()
  const index = articles.findIndex(a => a.id === id)
  
  if (index !== -1) {
    articles[index].viewCount++
    saveKnowledgeArticles(articles)
  }
}

// 搜索文章
export function searchArticles(keyword: string): KnowledgeArticle[] {
  const articles = loadKnowledgeArticles()
  const lowerKeyword = keyword.toLowerCase()
  
  return articles
    .filter(a => a.isPublished && (
      a.title.toLowerCase().includes(lowerKeyword) ||
      a.content.toLowerCase().includes(lowerKeyword) ||
      a.tags.some(t => t.toLowerCase().includes(lowerKeyword))
    ))
    .sort((a, b) => a.order - b.order)
}
