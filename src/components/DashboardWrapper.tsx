'use client'

import { ReactNode } from 'react'
import AnnouncementPopup from '@/components/AnnouncementPopup'
import AutoSyncChecker from '@/components/AutoSyncChecker'

interface Props {
  children: ReactNode
}

export default function DashboardWrapper({ children }: Props) {
  return (
    <>
      {children}
      <AnnouncementPopup />
      <AutoSyncChecker />
    </>
  )
}
