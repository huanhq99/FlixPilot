import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType | null = null
let isConnected = false

// 获取 Redis 客户端
export async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL

  // 如果没有配置 Redis，返回 null（降级到 JSON 文件）
  if (!redisUrl) {
    return null
  }

  if (redisClient && isConnected) {
    return redisClient
  }

  try {
    redisClient = createClient({ url: redisUrl })

    redisClient.on('error', (err: Error) => {
      console.error('Redis Client Error:', err)
      isConnected = false
    })

    redisClient.on('connect', () => {
      console.log('Redis connected')
      isConnected = true
    })

    redisClient.on('disconnect', () => {
      console.log('Redis disconnected')
      isConnected = false
    })

    await redisClient.connect()
    return redisClient
  } catch (error) {
    console.error('Failed to connect to Redis:', error)
    return null
  }
}

// 缓存封装
export const cache = {
  // 获取缓存
  async get<T>(key: string): Promise<T | null> {
    const client = await getRedisClient()
    if (!client) return null

    try {
      const value = await client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  },

  // 设置缓存
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    const client = await getRedisClient()
    if (!client) return false

    try {
      const stringValue = JSON.stringify(value)
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, stringValue)
      } else {
        await client.set(key, stringValue)
      }
      return true
    } catch (error) {
      console.error('Redis set error:', error)
      return false
    }
  },

  // 删除缓存
  async del(key: string): Promise<boolean> {
    const client = await getRedisClient()
    if (!client) return false

    try {
      await client.del(key)
      return true
    } catch (error) {
      console.error('Redis del error:', error)
      return false
    }
  },

  // 按模式删除缓存
  async delPattern(pattern: string): Promise<boolean> {
    const client = await getRedisClient()
    if (!client) return false

    try {
      const keys = await client.keys(pattern)
      if (keys.length > 0) {
        await client.del(keys)
      }
      return true
    } catch (error) {
      console.error('Redis delPattern error:', error)
      return false
    }
  },

  // 检查是否存在
  async exists(key: string): Promise<boolean> {
    const client = await getRedisClient()
    if (!client) return false

    try {
      const result = await client.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis exists error:', error)
      return false
    }
  },

  // 设置过期时间
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const client = await getRedisClient()
    if (!client) return false

    try {
      await client.expire(key, ttlSeconds)
      return true
    } catch (error) {
      console.error('Redis expire error:', error)
      return false
    }
  },

  // 增加计数器
  async incr(key: string): Promise<number | null> {
    const client = await getRedisClient()
    if (!client) return null

    try {
      return await client.incr(key)
    } catch (error) {
      console.error('Redis incr error:', error)
      return null
    }
  },

  // Hash 操作
  async hGet<T>(key: string, field: string): Promise<T | null> {
    const client = await getRedisClient()
    if (!client) return null

    try {
      const value = await client.hGet(key, field)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis hGet error:', error)
      return null
    }
  },

  async hSet(key: string, field: string, value: any): Promise<boolean> {
    const client = await getRedisClient()
    if (!client) return false

    try {
      await client.hSet(key, field, JSON.stringify(value))
      return true
    } catch (error) {
      console.error('Redis hSet error:', error)
      return false
    }
  },

  async hGetAll<T>(key: string): Promise<Record<string, T> | null> {
    const client = await getRedisClient()
    if (!client) return null

    try {
      const result = await client.hGetAll(key)
      const parsed: Record<string, T> = {}
      for (const [k, v] of Object.entries(result)) {
        parsed[k] = JSON.parse(v as string)
      }
      return parsed
    } catch (error) {
      console.error('Redis hGetAll error:', error)
      return null
    }
  }
}

// 缓存键定义
export const CACHE_KEYS = {
  // 媒体库缓存
  LIBRARY: 'flixpilot:library',
  LIBRARY_ITEM: (id: string) => `flixpilot:library:${id}`,
  
  // TMDB 缓存
  TMDB_MOVIE: (id: number) => `flixpilot:tmdb:movie:${id}`,
  TMDB_TV: (id: number) => `flixpilot:tmdb:tv:${id}`,
  TMDB_TRENDING: (type: string, page: number) => `flixpilot:tmdb:trending:${type}:${page}`,
  TMDB_SEARCH: (query: string, page: number) => `flixpilot:tmdb:search:${query}:${page}`,
  
  // Emby 缓存
  EMBY_SESSIONS: 'flixpilot:emby:sessions',
  EMBY_LIBRARIES: 'flixpilot:emby:libraries',
  EMBY_STATS: 'flixpilot:emby:stats',
  
  // 用户会话
  USER_SESSION: (userId: string) => `flixpilot:session:${userId}`,
  
  // API 限流
  RATE_LIMIT: (ip: string, endpoint: string) => `flixpilot:ratelimit:${ip}:${endpoint}`,
}

// 缓存 TTL（秒）
export const CACHE_TTL = {
  TMDB_DETAIL: 60 * 60 * 24,      // 24 小时
  TMDB_TRENDING: 60 * 30,         // 30 分钟
  TMDB_SEARCH: 60 * 10,           // 10 分钟
  EMBY_SESSIONS: 10,              // 10 秒
  EMBY_LIBRARIES: 60 * 5,         // 5 分钟
  EMBY_STATS: 60,                 // 1 分钟
  LIBRARY: 60 * 60,               // 1 小时
  USER_SESSION: 60 * 60 * 24 * 7, // 7 天
}
