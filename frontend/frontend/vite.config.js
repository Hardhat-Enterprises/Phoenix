/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiGatewayUrl = process.env.VITE_API_GATEWAY_URL || 'http://localhost:3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiGatewayUrl,
        changeOrigin: true,
      },
      '/health': {
        target: apiGatewayUrl,
        changeOrigin: true,
      },
    },
  },
})
