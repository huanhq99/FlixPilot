import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = process.env.DATA_DIR || './data'
const CARDS_FILE = path.join(DATA_DIR, 'cards.json')

// 卡密类型：天卡(1天)、月卡(30天)、季卡(90天)、年卡(365天)、白名单(永久)、自定义
export type CardType = 'day' | 'month' | 'quarter' | 'year' | 'whitelist' | 'custom'

// 卡密类型对应的天数
export const CARD_DAYS: Record<CardType, number> = {
  day: 1,
  month: 30,
  quarter: 90,
  year: 365,
  whitelist: -1,  // -1 表示永久
  custom: 0       // 自定义时间
}

// 卡密类型名称
export const CARD_TYPE_NAMES: Record<CardType, string> = {
  day: '天卡',
  month: '月卡',
  quarter: '季卡',
  year: '年卡',
  whitelist: '白名单',
  custom: '自定义'
}

export interface Card {
  id: string
  code: string           // 卡密代码
  type: CardType         // 卡密类型
  status: 'unused' | 'used'  // 状态
  createdAt: string      // 创建时间
  usedAt?: string        // 使用时间
  usedBy?: string        // 使用者用户ID
  usedByUsername?: string // 使用者用户名
  // 自定义时间字段
  customStartDate?: string  // 自定义开通日期
  customEndDate?: string    // 自定义到期日期
}

interface CardsData {
  cards: Card[]
}

// 生成随机卡密代码
function generateCardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  // 格式: XXXX-XXXX-XXXX-XXXX
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-'
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 加载卡密数据
export function loadCardsData(): CardsData {
  try {
    if (fs.existsSync(CARDS_FILE)) {
      const data = fs.readFileSync(CARDS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('加载卡密数据失败:', e)
  }
  return { cards: [] }
}

// 保存卡密数据
export function saveCardsData(data: CardsData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(CARDS_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('保存卡密数据失败:', e)
  }
}

// 创建卡密
export function createCard(
  type: CardType, 
  count: number = 1,
  customStartDate?: string,
  customEndDate?: string
): Card[] {
  const data = loadCardsData()
  const newCards: Card[] = []
  
  for (let i = 0; i < count; i++) {
    const card: Card = {
      id: crypto.randomUUID(),
      code: generateCardCode(),
      type,
      status: 'unused',
      createdAt: new Date().toISOString()
    }
    
    // 如果是自定义类型，添加自定义时间
    if (type === 'custom' && customStartDate && customEndDate) {
      card.customStartDate = customStartDate
      card.customEndDate = customEndDate
    }
    
    newCards.push(card)
    data.cards.push(card)
  }
  
  saveCardsData(data)
  return newCards
}

// 获取所有卡密
export function getAllCards(): Card[] {
  return loadCardsData().cards
}

// 获取未使用的卡密
export function getUnusedCards(): Card[] {
  return loadCardsData().cards.filter(c => c.status === 'unused')
}

// 根据代码查找卡密
export function findCardByCode(code: string): Card | null {
  const data = loadCardsData()
  return data.cards.find(c => c.code === code) || null
}

// 使用卡密
export function useCard(code: string, userId: string, username: string): { success: boolean; card?: Card; error?: string } {
  const data = loadCardsData()
  const cardIndex = data.cards.findIndex(c => c.code === code)
  
  if (cardIndex === -1) {
    return { success: false, error: '卡密不存在' }
  }
  
  const card = data.cards[cardIndex]
  
  if (card.status === 'used') {
    return { success: false, error: '卡密已被使用' }
  }
  
  // 更新卡密状态
  data.cards[cardIndex] = {
    ...card,
    status: 'used',
    usedAt: new Date().toISOString(),
    usedBy: userId,
    usedByUsername: username
  }
  
  saveCardsData(data)
  return { success: true, card: data.cards[cardIndex] }
}

// 删除卡密
export function deleteCard(cardId: string): boolean {
  const data = loadCardsData()
  const index = data.cards.findIndex(c => c.id === cardId)
  
  if (index === -1) return false
  
  data.cards.splice(index, 1)
  saveCardsData(data)
  return true
}

// 批量删除已使用的卡密
export function deleteUsedCards(): number {
  const data = loadCardsData()
  const originalLength = data.cards.length
  data.cards = data.cards.filter(c => c.status === 'unused')
  saveCardsData(data)
  return originalLength - data.cards.length
}
