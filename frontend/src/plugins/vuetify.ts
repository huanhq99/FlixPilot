import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        colors: {
          primary: '#9155FD', // Materio Purple
          secondary: '#8A8D93',
          success: '#56CA00',
          info: '#16B1FF',
          warning: '#FFB400',
          error: '#FF4C51',
          background: '#28243D',
          surface: '#312D4B',
        },
      },
    },
  },
})
