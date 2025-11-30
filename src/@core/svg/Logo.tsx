// React Imports
import type { SVGAttributes } from 'react'

// FlixPilot Logo - 胶片 + F + 播放按钮
const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg width='1em' height='1em' viewBox='0 0 120 100' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
      {/* 胶片齿孔 - 左侧 */}
      <rect x='8' y='18' width='8' height='12' rx='2' fill='#2563eb' />
      <rect x='8' y='38' width='8' height='12' rx='2' fill='#2563eb' />
      <rect x='8' y='58' width='8' height='12' rx='2' fill='#2563eb' />
      
      {/* 主框架 - 胶片外框 */}
      <path
        d='M20 12 C20 6, 26 2, 32 2 L78 2 C84 2, 90 6, 90 12 L90 78 C90 84, 84 88, 78 88 L32 88 C26 88, 20 84, 20 78 Z'
        stroke='#2563eb'
        strokeWidth='6'
        fill='none'
        strokeLinecap='round'
      />
      
      {/* F 字母 */}
      <text
        x='42'
        y='62'
        fontFamily='Arial, sans-serif'
        fontSize='42'
        fontWeight='bold'
        fill='#2563eb'
      >
        F
      </text>
      
      {/* 播放按钮 - 红色三角 */}
      <path
        d='M85 35 L110 52 L85 69 Z'
        fill='#ef4444'
      />
    </svg>
  )
}

export default Logo
