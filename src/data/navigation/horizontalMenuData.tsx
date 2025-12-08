// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'

const horizontalMenuData = (): HorizontalMenuDataType[] => [
  {
    label: '首页',
    href: '/home',
    icon: 'ri-home-smile-line'
  },
  {
    label: '媒体库',
    href: '/library',
    icon: 'ri-movie-2-line'
  },
  {
    label: '插件',
    href: '/plugins',
    icon: 'ri-puzzle-line',
    adminOnly: true
  },
  {
    label: '设置',
    href: '/settings',
    icon: 'ri-settings-3-line',
    adminOnly: true
  }
]

export default horizontalMenuData
