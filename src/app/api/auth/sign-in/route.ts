import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, signIn } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

function getSignInReward(): number {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
      return config.popcorn?.signInReward || 10
    }
  } catch (e) {}
  return 10  // 默认 10 爆米花
}

export async function POST() {
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
    
    const reward = getSignInReward()
    const result = signIn(payload.userId, reward)
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        message: result.message,
        popcorn: result.popcorn,
        streak: result.streak
      })
    }
    
    return NextResponse.json({
      success: true,
      message: result.message,
      popcorn: result.popcorn,
      streak: result.streak
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
