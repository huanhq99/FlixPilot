import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser } from '@/lib/auth'
import { 
  loadKnowledgeArticles,
  getPublishedArticles,
  getArticlesByCategory,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  incrementViewCount,
  searchArticles,
  KNOWLEDGE_CATEGORIES
} from '@/lib/knowledge'

// GET - 获取知识库文章
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const keyword = searchParams.get('keyword')
    const all = searchParams.get('all')
    
    // 获取分类列表
    if (searchParams.get('categories') === 'true') {
      return NextResponse.json({ categories: KNOWLEDGE_CATEGORIES })
    }
    
    // 获取单个文章
    if (id) {
      const article = getArticle(id)
      if (!article) {
        return NextResponse.json({ error: '文章不存在' }, { status: 404 })
      }
      
      // 增加浏览量
      incrementViewCount(id)
      
      return NextResponse.json({ article })
    }
    
    // 搜索文章
    if (keyword) {
      const articles = searchArticles(keyword)
      return NextResponse.json({ articles })
    }
    
    // 按分类获取
    if (category) {
      const articles = getArticlesByCategory(category)
      return NextResponse.json({ articles })
    }
    
    // 获取所有文章（管理员用）
    if (all === 'true') {
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
      
      const articles = loadKnowledgeArticles()
      return NextResponse.json({ articles })
    }
    
    // 默认获取已发布的文章
    const articles = getPublishedArticles()
    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Get knowledge error:', error)
    return NextResponse.json({ error: '获取文章失败' }, { status: 500 })
  }
}

// POST - 创建文章
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
    const { title, content, category, tags, order, isPublished } = body
    
    if (!title || !content || !category) {
      return NextResponse.json({ error: '标题、内容和分类不能为空' }, { status: 400 })
    }
    
    const article = createArticle({
      title,
      content,
      category,
      tags,
      order,
      isPublished,
      createdBy: user.username
    })
    
    return NextResponse.json({ success: true, article })
  } catch (error) {
    console.error('Create article error:', error)
    return NextResponse.json({ error: '创建文章失败' }, { status: 500 })
  }
}

// PUT - 更新文章
export async function PUT(request: NextRequest) {
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
    const { id, ...data } = body
    
    if (!id) {
      return NextResponse.json({ error: '文章ID不能为空' }, { status: 400 })
    }
    
    const article = updateArticle(id, data)
    if (!article) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, article })
  } catch (error) {
    console.error('Update article error:', error)
    return NextResponse.json({ error: '更新文章失败' }, { status: 500 })
  }
}

// DELETE - 删除文章
export async function DELETE(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: '文章ID不能为空' }, { status: 400 })
    }
    
    const success = deleteArticle(id)
    if (!success) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete article error:', error)
    return NextResponse.json({ error: '删除文章失败' }, { status: 500 })
  }
}
