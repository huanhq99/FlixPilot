import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import fs from 'fs'
import path from 'path'

const configPath = path.join(process.cwd(), 'data', 'config.json')

function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch (e) {
    console.error('读取配置失败:', e)
  }
  return null
}

export async function POST() {
  const config = getConfig()
  
  if (!config?.email?.enabled) {
    return NextResponse.json({ error: '邮件通知未启用' }, { status: 400 })
  }
  
  if (!config.email.host || !config.email.user || !config.email.pass) {
    return NextResponse.json({ error: '请先完善邮件配置' }, { status: 400 })
  }
  
  try {
    const siteName = config.site?.name || 'StreamHub'
    
    await sendEmail({
      to: config.email.user, // 发送给自己作为测试
      subject: `[${siteName}] 邮件配置测试`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">✅ 邮件配置测试成功</h2>
            <p style="color: #666; line-height: 1.6;">
              恭喜！您的邮件服务已配置成功。系统现在可以向用户发送以下类型的通知：
            </p>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>到期提醒</strong> - 在用户账号即将到期时发送提醒</li>
              <li><strong>求片通知</strong> - 当求片状态更新时通知用户</li>
              <li><strong>订阅更新</strong> - 当订阅的剧集有新内容时通知用户</li>
            </ul>
            <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #2e7d32;">
                <strong>提示：</strong>用户需要在个人中心设置邮箱地址才能收到邮件通知。
              </p>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
              此邮件由 ${siteName} 系统自动发送，请勿直接回复
            </p>
          </div>
        </div>
      `
    })
    
    return NextResponse.json({ success: true, message: '测试邮件发送成功' })
  } catch (error: any) {
    console.error('发送测试邮件失败:', error)
    return NextResponse.json({ 
      error: error.message || '发送失败，请检查邮件配置' 
    }, { status: 500 })
  }
}
