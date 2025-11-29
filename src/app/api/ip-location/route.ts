import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ip = searchParams.get('ip')
  
  if (!ip) {
    return NextResponse.json({ error: 'IP is required' }, { status: 400 })
  }
  
  // 过滤内网 IP 和 IPv6
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.') || ip === '127.0.0.1' || ip === 'localhost' || ip.includes(':')) {
    return NextResponse.json({
      ip,
      regionName: '内网',
      city: '本地网络',
      country: '内网',
      isp: '-'
    })
  }
  
  try {
    // 用 ip-api.com 支持中文
    const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,country,regionName,city,isp`)
    
    if (res.ok) {
      const data = await res.json()
      if (data.status === 'success') {
        return NextResponse.json({
          ip,
          regionName: data.regionName || data.country,
          city: data.city,
          country: data.country,
          isp: data.isp || ''
        })
      }
    }
  } catch (e) {
    // 失败
  }
    
  return NextResponse.json({
    ip,
    regionName: '未知',
    city: null,
    country: null,
    isp: null
  })
}
