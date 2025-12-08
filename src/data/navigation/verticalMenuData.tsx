// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
  {
    label: '首页',
    href: '/home',
    icon: 'ri-home-smile-line'
  },
  {
    label: '发现',
    icon: 'ri-compass-3-line',
    children: [
      {
        label: '流媒体',
        href: '/streaming',
        icon: 'ri-play-circle-line'
      },
      {
        label: '推荐',
        href: '/trending',
        icon: 'ri-fire-line'
      }
    ]
  },
  {
    label: '求片',
    href: '/request-manage',
    icon: 'ri-add-circle-line'
  },
  {
    label: '账户',
    href: '/account',
    icon: 'ri-user-line'
  },
  {
    label: '插件',
    href: '/plugins',
    icon: 'ri-puzzle-line',
    adminOnly: true
  },
  {
    label: '用户管理',
    href: '/user-manage',
    icon: 'ri-user-settings-line',
    adminOnly: true
  },
  {
    label: '卡密管理',
    href: '/card-manage',
    icon: 'ri-coupon-3-line',
    adminOnly: true
  },
  {
    label: '设置',
    href: '/settings',
    icon: 'ri-settings-3-line',
    adminOnly: true
  }
]

export default verticalMenuData
