import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ip = searchParams.get('ip')
  
  if (!ip) {
    return NextResponse.json({ error: 'IP is required' }, { status: 400 })
  }
  
  // 过滤内网 IPv4
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.2') || ip.startsWith('172.30.') || ip.startsWith('172.31.') || ip === '127.0.0.1' || ip === 'localhost') {
    return NextResponse.json({
      ip,
      regionName: '内网',
      city: '本地网络',
      country: '内网',
      isp: '-'
    })
  }

  // 过滤内网 IPv6 (fe80::, fc00::, fd00::, ::1)
  if (ip === '::1' || ip.toLowerCase().startsWith('fe80:') || ip.toLowerCase().startsWith('fc00:') || ip.toLowerCase().startsWith('fd00:')) {
    return NextResponse.json({
      ip,
      regionName: '内网',
      city: '本地网络',
      country: '内网',
      isp: '-'
    })
  }
  
  try {
    // 用 ip-api.com 支持中文，也支持 IPv6
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
