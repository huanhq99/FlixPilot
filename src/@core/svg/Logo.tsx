// React Imports
import type { SVGAttributes } from 'react'

// FlixPilot Logo - 播放按钮形状
const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg width='1em' height='1em' viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
      <path
        d='M20 10 L85 50 L20 90 Z'
        fill='currentColor'
      />
      <path
        d='M20 10 L85 50 L20 90 Z'
        fill='currentColor'
        opacity='0.3'
        transform='translate(5, 0)'
      />
    </svg>
  )
}

export default Logo
