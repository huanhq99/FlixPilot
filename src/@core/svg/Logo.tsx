// React Imports
import type { SVGAttributes } from 'react'

// FlixPilot Logo - 飞机/导航图标，代表"Pilot"概念
const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg width='1em' height='1em' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
      {/* 主体 - 播放按钮形状的飞机机身 */}
      <path
        d='M20 15 L85 50 L20 85 L20 15 Z'
        fill='currentColor'
      />
      {/* 机翼上 */}
      <path
        d='M35 35 L75 50 L35 45 Z'
        fill='currentColor'
        opacity='0.7'
      />
      {/* 机翼下 */}
      <path
        d='M35 55 L75 50 L35 65 Z'
        fill='currentColor'
        opacity='0.7'
      />
      {/* 尾翼 */}
      <path
        d='M20 25 L30 50 L20 75 L15 50 Z'
        fill='currentColor'
        opacity='0.5'
      />
    </svg>
  )
}

export default Logo
        fill='currentColor'
      />
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M4.91149 0.475694L50 28.123V54.7479L0 26.0986V3.22726C0 1.44489 1.44424 0 3.22581 0C3.8208 0 4.4042 0.164633 4.91149 0.475694Z'
        fill='white'
        fillOpacity='0.15'
      />
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M95.0885 0.475694L50 28.123V54.7479L100 26.0986V3.22726C100 1.44489 98.5558 0 96.7742 0C96.1792 0 95.5958 0.164633 95.0885 0.475694Z'
        fill='currentColor'
      />
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M95.0885 0.475694L50 28.123V54.7479L100 26.0986V3.22726C100 1.44489 98.5558 0 96.7742 0C96.1792 0 95.5958 0.164633 95.0885 0.475694Z'
        fill='white'
        fillOpacity='0.3'
      />
    </svg>
  )
}

export default Logo
