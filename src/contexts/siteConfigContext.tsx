'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SiteConfig {
  name: string
  description: string
  logo: string
}

interface SiteConfigContextType {
  config: SiteConfig
  loading: boolean
  refresh: () => Promise<void>
}

const defaultConfig: SiteConfig = {
  name: 'StreamHub',
  description: '您的私人流媒体管理中心',
  logo: ''
}

const SiteConfigContext = createContext<SiteConfigContextType>({
  config: defaultConfig,
  loading: true,
  refresh: async () => {}
})

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        if (data.site) {
          setConfig({
            name: data.site.name || defaultConfig.name,
            description: data.site.description || defaultConfig.description,
            logo: data.site.logo || defaultConfig.logo
          })
        }
      }
    } catch (e) {
      console.error('Load site config failed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  return (
    <SiteConfigContext.Provider value={{ config, loading, refresh: loadConfig }}>
      {children}
    </SiteConfigContext.Provider>
  )
}

export function useSiteConfig() {
  return useContext(SiteConfigContext)
}
