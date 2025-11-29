import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = process.env.DATA_DIR || './data'
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const JWT_SECRET = process.env.JWT_SECRET || 'streamhub-secret-key-2024'

export interface User {
  id: string
  username: string
  passwordHash: string
  role: 'admin' | 'user'
  popcorn: number  // 爆米花余额
  embyUserId?: string  // 绑定的 Emby 用户 ID
  embyUsername?: string
  lastSignIn?: string  // 最后签到时间
  signInStreak: number  // 连续签到天数
  createdAt: string
  // 会员相关
  membershipExpiry?: string  // 会员到期时间 (ISO string)，null 表示未激活
  isWhitelist?: boolean      // 是否白名单（永久会员）
  // 邮箱通知
  email?: string             // 用户邮箱
  emailNotifications?: boolean  // 是否开启邮箱通知
  // Telegram 绑定
  telegramId?: string        // Telegram 用户 ID
  telegramUsername?: string  // Telegram 用户名
  telegramBindCode?: string  // 绑定验证码
  telegramBindCodeExpiry?: string  // 验证码过期时间
}

interface UsersData {
  users: User[]
  initialized: boolean
}

// 简单的密码哈希（生产环境应该用 bcrypt）
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex')
}

// 验证密码
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

// 生成随机字符串
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 加载用户数据
export function loadUsersData(): UsersData {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('加载用户数据失败:', e)
  }
  return { users: [], initialized: false }
}

// 保存用户数据
export function saveUsersData(data: UsersData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('保存用户数据失败:', e)
  }
}

// 导出简化版本供 API 使用
export function loadUsers(): User[] {
  return loadUsersData().users
}

export function saveUsers(users: User[]): void {
  const data = loadUsersData()
  data.users = users
  saveUsersData(data)
}

// 初始化系统（首次启动）
export function initializeSystem(): { username: string; password: string } | null {
  const data = loadUsersData()
  
  if (data.initialized) {
    return null
  }
  
  // 生成随机管理员账号密码
  const username = 'admin'
  const password = generateRandomString(12)
  
  const adminUser: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(password),
    role: 'admin',
    popcorn: 0,
    signInStreak: 0,
    createdAt: new Date().toISOString()
  }
  
  data.users.push(adminUser)
  data.initialized = true
  saveUsersData(data)
  
  // 打印到控制台
  console.log('\n' + '='.repeat(50))
  console.log('🎬 StreamHub 首次启动')
  console.log('='.repeat(50))
  console.log(`📧 管理员账号: ${username}`)
  console.log(`🔑 管理员密码: ${password}`)
  console.log('='.repeat(50))
  console.log('⚠️  请妥善保管此密码，忘记密码请删除 data/users.json 后重启')
  console.log('='.repeat(50) + '\n')
  
  return { username, password }
}

// 用户登录
export function login(username: string, password: string): User | null {
  const data = loadUsersData()
  const user = data.users.find(u => u.username === username)
  
  if (!user) return null
  if (!verifyPassword(password, user.passwordHash)) return null
  
  return user
}

// 获取用户
export function getUser(userId: string): User | null {
  const data = loadUsersData()
  return data.users.find(u => u.id === userId) || null
}

// 获取用户（通过用户名）
export function getUserByUsername(username: string): User | null {
  const data = loadUsersData()
  return data.users.find(u => u.username === username) || null
}

// 创建用户
export function createUser(username: string, password: string, role: 'admin' | 'user' = 'user'): User | null {
  const data = loadUsersData()
  
  // 检查用户名是否已存在
  if (data.users.some(u => u.username === username)) {
    return null
  }
  
  const newUser: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(password),
    role,
    popcorn: 0,
    signInStreak: 0,
    createdAt: new Date().toISOString()
  }
  
  data.users.push(newUser)
  saveUsersData(data)
  
  return newUser
}

// 更新用户
export function updateUser(userId: string, updates: Partial<User>): User | null {
  const data = loadUsersData()
  const index = data.users.findIndex(u => u.id === userId)
  
  if (index === -1) return null
  
  // 不允许直接修改密码哈希
  const { passwordHash, ...safeUpdates } = updates
  data.users[index] = { ...data.users[index], ...safeUpdates }
  saveUsersData(data)
  
  return data.users[index]
}

// 修改密码
export function changePassword(userId: string, newPassword: string): boolean {
  const data = loadUsersData()
  const index = data.users.findIndex(u => u.id === userId)
  
  if (index === -1) return false
  
  data.users[index].passwordHash = hashPassword(newPassword)
  saveUsersData(data)
  
  return true
}

// 获取所有用户（管理员用）
export function getAllUsers(): User[] {
  const data = loadUsersData()
  return data.users.map(u => ({ ...u, passwordHash: '***' }))
}

// 删除用户
export function deleteUser(userId: string): boolean {
  const data = loadUsersData()
  const index = data.users.findIndex(u => u.id === userId)
  
  if (index === -1) return false
  
  // 不能删除最后一个管理员
  const admins = data.users.filter(u => u.role === 'admin')
  if (admins.length === 1 && data.users[index].role === 'admin') {
    return false
  }
  
  data.users.splice(index, 1)
  saveUsersData(data)
  
  return true
}

// 绑定 Emby 账号
export function bindEmbyAccount(userId: string, embyUserId: string, embyUsername: string): boolean {
  const data = loadUsersData()
  const index = data.users.findIndex(u => u.id === userId)
  
  if (index === -1) return false
  
  data.users[index].embyUserId = embyUserId
  data.users[index].embyUsername = embyUsername
  saveUsersData(data)
  
  return true
}

// 签到
export function signIn(userId: string, popcornReward: number): { success: boolean; popcorn: number; streak: number; message: string } {
  const data = loadUsersData()
  const index = data.users.findIndex(u => u.id === userId)
  
  if (index === -1) {
    return { success: false, popcorn: 0, streak: 0, message: '用户不存在' }
  }
  
  const user = data.users[index]
  const today = new Date().toISOString().split('T')[0]
  const lastSignIn = user.lastSignIn?.split('T')[0]
  
  // 检查今天是否已签到
  if (lastSignIn === today) {
    return { success: false, popcorn: user.popcorn, streak: user.signInStreak || 0, message: '今天已签到' }
  }
  
  // 计算连续签到
  let streak = 1
  if (lastSignIn) {
    const lastDate = new Date(lastSignIn)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      streak = (user.signInStreak || 0) + 1
    }
  }
  
  // 连续签到额外奖励
  let bonus = 0
  if (streak >= 7) bonus = Math.floor(popcornReward * 0.5)  // 7天+50%
  else if (streak >= 3) bonus = Math.floor(popcornReward * 0.2)  // 3天+20%
  
  const totalReward = popcornReward + bonus
  
  user.popcorn = (user.popcorn || 0) + totalReward
  user.lastSignIn = new Date().toISOString()
  user.signInStreak = streak
  
  saveUsersData(data)
  
  return { 
    success: true, 
    popcorn: user.popcorn, 
    streak,
    message: bonus > 0 ? `签到成功！连续${streak}天，获得${popcornReward}+${bonus}爆米花` : `签到成功！获得${popcornReward}爆米花`
  }
}

// 扣除爆米花
export function deductPopcorn(userId: string, amount: number): boolean {
  const data = loadUsersData()
  const index = data.users.findIndex(u => u.id === userId)
  
  if (index === -1) return false
  if ((data.users[index].popcorn || 0) < amount) return false
  
  data.users[index].popcorn = (data.users[index].popcorn || 0) - amount
  saveUsersData(data)
  
  return true
}

// 生成 JWT Token
export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60  // 7天过期
  }
  
  // 简单的 JWT 实现（base64 编码）
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  
  return `${header}.${body}.${signature}`
}

// 验证 JWT Token
export function verifyToken(token: string): { userId: string; username: string; role: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [header, body, signature] = parts
    
    // 验证签名
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    if (signature !== expectedSig) return null
    
    // 解析 payload
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    
    // 检查过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    
    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role
    }
  } catch (e) {
    return null
  }
}

// 检查是否需要初始化
export function needsInitialization(): boolean {
  const data = loadUsersData()
  return !data.initialized
}
