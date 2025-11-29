'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, MenuItem, SubMenu } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  // 获取用户角色
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user?.role) {
          setUserRole(data.user.role)
        }
      })
      .catch(() => {})
  }, [])

  const isAdmin = userRole === 'admin'

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Incase you also want to scroll NavHeader to scroll with Vertical Menu, remove NavHeader from above and paste it below this comment */}
      {/* Vertical Menu */}
      <Menu
        popoutMenuOffset={{ mainAxis: 10 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        <MenuItem href='/home' icon={<i className='ri-home-smile-line' />}>
          首页
        </MenuItem>
        <SubMenu label='发现' icon={<i className='ri-compass-3-line' />}>
          <MenuItem href='/streaming' icon={<i className='ri-play-circle-line' />}>
            流媒体
          </MenuItem>
          <MenuItem href='/trending' icon={<i className='ri-fire-line' />}>
            推荐
          </MenuItem>
        </SubMenu>
        {isAdmin && (
          <SubMenu label='用户管理' icon={<i className='ri-user-settings-line' />}>
            <MenuItem href='/users' icon={<i className='ri-user-line' />}>
              用户列表
            </MenuItem>
            <MenuItem href='/user-activity' icon={<i className='ri-history-line' />}>
              历史记录
            </MenuItem>
            <MenuItem href='/play-ranking' icon={<i className='ri-bar-chart-box-line' />}>
              播放排行
            </MenuItem>
            <MenuItem href='/play-monitor' icon={<i className='ri-live-line' />}>
              播放监控
            </MenuItem>
            <MenuItem href='/device-manage' icon={<i className='ri-smartphone-line' />}>
              设备管理
            </MenuItem>
          </SubMenu>
        )}
        {isAdmin && (
          <MenuItem href='/request-manage' icon={<i className='ri-file-list-3-line' />}>
            求片处理
          </MenuItem>
        )}
        <MenuItem href='/request' icon={<i className='ri-movie-2-line' />}>
          求片
        </MenuItem>
        <MenuItem href='/tickets' icon={<i className='ri-customer-service-2-line' />}>
          工单
        </MenuItem>
        <SubMenu label='知识库' icon={<i className='ri-book-open-line' />}>
          <MenuItem href='/knowledge' icon={<i className='ri-book-read-line' />}>
            浏览
          </MenuItem>
          {isAdmin && (
            <MenuItem href='/knowledge-manage' icon={<i className='ri-article-line' />}>
              管理
            </MenuItem>
          )}
        </SubMenu>
        {isAdmin && (
          <MenuItem href='/announcements' icon={<i className='ri-megaphone-line' />}>
            公告管理
          </MenuItem>
        )}
        {isAdmin && (
          <MenuItem href='/user-manage' icon={<i className='ri-admin-line' />}>
            系统用户
          </MenuItem>
        )}
        {isAdmin && (
          <MenuItem href='/card-manage' icon={<i className='ri-coupon-3-line' />}>
            卡密管理
          </MenuItem>
        )}
        <MenuItem href='/devices' icon={<i className='ri-device-line' />}>
          我的设备
        </MenuItem>
        <MenuItem href='/account' icon={<i className='ri-account-circle-line' />}>
          账户
        </MenuItem>
        {isAdmin && (
          <MenuItem href='/settings' icon={<i className='ri-settings-3-line' />}>
            设置
          </MenuItem>
        )}
      </Menu>
      {/* <Menu
        popoutMenuOffset={{ mainAxis: 10 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        <GenerateVerticalMenu menuData={menuData(dictionary)} />
      </Menu> */}
    </ScrollWrapper>
  )
}

export default VerticalMenu
