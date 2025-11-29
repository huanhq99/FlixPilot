import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, getUser } from '@/lib/auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    const user = getUser(payload.userId)
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        popcorn: user.popcorn,
        embyUserId: user.embyUserId,
        embyUsername: user.embyUsername,
        lastSignIn: user.lastSignIn,
        signInStreak: user.signInStreak || 0,
        membershipExpiry: user.membershipExpiry,
        isWhitelist: user.isWhitelist || false,
        email: user.email || '',
        emailNotifications: user.emailNotifications !== false
      }
    })
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
