import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

const configPath = path.join(process.cwd(), 'data', 'config.json')

function getEmailConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return config.email
    }
  } catch (e) {
    console.error('读取邮件配置失败:', e)
  }
  return null
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const emailConfig = getEmailConfig()
  
  if (!emailConfig?.enabled) {
    throw new Error('邮件通知未启用')
  }
  
  if (!emailConfig.host || !emailConfig.user || !emailConfig.pass) {
    throw new Error('邮件配置不完整')
  }
  
  const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port || 465,
    secure: emailConfig.secure !== false, // 默认使用 SSL
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass
    }
  })
  
  const fromName = emailConfig.from || 'FlixPilot'
  
  await transporter.sendMail({
    from: `"${fromName}" <${emailConfig.user}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  })
}

// 发送到期提醒邮件
export async function sendExpiryReminder(userEmail: string, userName: string, expiryDate: Date, daysLeft: number): Promise<void> {
  const emailConfig = getEmailConfig()
  if (!emailConfig?.enabled || !emailConfig?.notifications?.expiry) return
  
  const siteName = getSiteName()
  const formattedDate = expiryDate.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  await sendEmail({
    to: userEmail,
    subject: `[${siteName}] 您的账号即将到期`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⏰ 到期提醒</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #333; font-size: 16px;">亲爱的 <strong>${userName}</strong>：</p>
          <p style="color: #666; line-height: 1.6;">
            您在 ${siteName} 的账号将于 <strong style="color: #f5576c;">${formattedDate}</strong> 到期，
            还剩 <strong style="color: #f5576c;">${daysLeft} 天</strong>。
          </p>
          <p style="color: #666; line-height: 1.6;">
            为了不影响您的正常使用，请尽快联系管理员续期。
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
            此邮件由 ${siteName} 系统自动发送，请勿直接回复
          </p>
        </div>
      </div>
    `
  })
}

// 发送求片状态更新通知
export async function sendRequestNotification(
  userEmail: string, 
  userName: string, 
  mediaTitle: string, 
  status: string,
  message?: string
): Promise<void> {
  const emailConfig = getEmailConfig()
  if (!emailConfig?.enabled || !emailConfig?.notifications?.request) return
  
  const siteName = getSiteName()
  
  const statusMap: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: '待处理', color: '#ff9800', icon: '⏳' },
    approved: { label: '已批准', color: '#4caf50', icon: '✅' },
    downloading: { label: '下载中', color: '#2196f3', icon: '⬇️' },
    completed: { label: '已完成', color: '#4caf50', icon: '🎉' },
    rejected: { label: '已拒绝', color: '#f44336', icon: '❌' }
  }
  
  const statusInfo = statusMap[status] || { label: status, color: '#999', icon: '📋' }
  
  await sendEmail({
    to: userEmail,
    subject: `[${siteName}] 求片状态更新: ${mediaTitle}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${statusInfo.icon} 求片状态更新</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #333; font-size: 16px;">亲爱的 <strong>${userName}</strong>：</p>
          <p style="color: #666; line-height: 1.6;">
            您求片的 <strong>${mediaTitle}</strong> 状态已更新为：
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #eee;">
            <span style="display: inline-block; padding: 8px 20px; border-radius: 20px; background: ${statusInfo.color}; color: white; font-weight: bold;">
              ${statusInfo.label}
            </span>
          </div>
          ${message ? `
            <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #e65100;">${message}</p>
            </div>
          ` : ''}
          <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
            此邮件由 ${siteName} 系统自动发送，请勿直接回复
          </p>
        </div>
      </div>
    `
  })
}

// 发送订阅更新通知
export async function sendSubscriptionNotification(
  userEmail: string,
  userName: string,
  seriesTitle: string,
  episodeInfo: string
): Promise<void> {
  const emailConfig = getEmailConfig()
  if (!emailConfig?.enabled || !emailConfig?.notifications?.subscription) return
  
  const siteName = getSiteName()
  
  await sendEmail({
    to: userEmail,
    subject: `[${siteName}] 您订阅的剧集更新了: ${seriesTitle}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎬 剧集更新通知</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #333; font-size: 16px;">亲爱的 <strong>${userName}</strong>：</p>
          <p style="color: #666; line-height: 1.6;">
            您订阅的剧集有更新啦！
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #eee;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${seriesTitle}</h3>
            <p style="margin: 0; color: #666;">${episodeInfo}</p>
          </div>
          <p style="color: #666; line-height: 1.6;">
            快去观看吧！🍿
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
            此邮件由 ${siteName} 系统自动发送，请勿直接回复
          </p>
        </div>
      </div>
    `
  })
}

function getSiteName(): string {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return config.site?.name || 'FlixPilot'
    }
  } catch (e) {}
  return 'FlixPilot'
}
