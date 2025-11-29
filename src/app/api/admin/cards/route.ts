import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser } from '@/lib/auth'
import { 
  getAllCards, 
  createCard, 
  deleteCard, 
  deleteUsedCards,
  CARD_TYPE_NAMES,
  type CardType 
} from '@/lib/cards'

// GET - 获取所有卡密（仅管理员）
export async function GET(request: NextRequest) {
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
    
    const cards = getAllCards()
    
    // 统计信息
    const stats = {
      total: cards.length,
      unused: cards.filter(c => c.status === 'unused').length,
      used: cards.filter(c => c.status === 'used').length,
      byType: {
        day: cards.filter(c => c.type === 'day').length,
        month: cards.filter(c => c.type === 'month').length,
        quarter: cards.filter(c => c.type === 'quarter').length,
        year: cards.filter(c => c.type === 'year').length,
        whitelist: cards.filter(c => c.type === 'whitelist').length
      }
    }
    
    return NextResponse.json({ cards, stats, typeNames: CARD_TYPE_NAMES })
  } catch (error) {
    console.error('Get cards error:', error)
    return NextResponse.json({ error: '获取卡密失败' }, { status: 500 })
  }
}

// POST - 创建卡密（仅管理员）
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
    
    const { type, count = 1 } = await request.json()
    
    if (!['day', 'month', 'quarter', 'year', 'whitelist'].includes(type)) {
      return NextResponse.json({ error: '无效的卡密类型' }, { status: 400 })
    }
    
    if (count < 1 || count > 100) {
      return NextResponse.json({ error: '生成数量应在1-100之间' }, { status: 400 })
    }
    
    const cards = createCard(type as CardType, count)
    
    return NextResponse.json({ 
      success: true, 
      message: `成功创建 ${count} 张${CARD_TYPE_NAMES[type as CardType]}`,
      cards 
    })
  } catch (error) {
    console.error('Create cards error:', error)
    return NextResponse.json({ error: '创建卡密失败' }, { status: 500 })
  }
}

// DELETE - 删除卡密（仅管理员）
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
    const cardId = searchParams.get('id')
    const deleteAll = searchParams.get('deleteUsed')
    
    if (deleteAll === 'true') {
      const count = deleteUsedCards()
      return NextResponse.json({ success: true, message: `已删除 ${count} 张已使用的卡密` })
    }
    
    if (!cardId) {
      return NextResponse.json({ error: '缺少卡密ID' }, { status: 400 })
    }
    
    const deleted = deleteCard(cardId)
    if (!deleted) {
      return NextResponse.json({ error: '卡密不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, message: '卡密已删除' })
  } catch (error) {
    console.error('Delete card error:', error)
    return NextResponse.json({ error: '删除卡密失败' }, { status: 500 })
  }
}
