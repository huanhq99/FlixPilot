// React Imports
import type { SVGAttributes } from 'react'

// FlixPilot Logo - 简洁播放按钮
const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg width='1em' height='1em' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
      <path
        d='M8 5.14v14.72a1 1 0 001.55.83l11.25-7.36a1 1 0 000-1.66L9.55 4.31A1 1 0 008 5.14z'
        fill='currentColor'
      />
    </svg>
  )
}

export default Logo
