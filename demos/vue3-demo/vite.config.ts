import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../packages/vue3-antd/src'),
      '@images': resolve(__dirname, '../../packages/vue3-antd/src/assets/images'),
    },
  },
  server: {
    port: 5175,
    host: true,
  },
})
