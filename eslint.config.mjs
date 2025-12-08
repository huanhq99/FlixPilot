import nextConfig from 'eslint-config-next'

const config = [
  {
    ignores: ['.next/**', 'out/**', 'build/**']
  },
  ...nextConfig
]

export default config
