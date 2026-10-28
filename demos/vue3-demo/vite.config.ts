import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5176,
    open: false,
  },
  resolve: {
    alias: {
      '@speed-board/core': path.resolve(__dirname, '../../packages/core/src'),
      '@speed-board/vue3': path.resolve(__dirname, '../../packages/vue3/src'),
      '@speed-board/vue3-antd': path.resolve(__dirname, '../../packages/vue3-antd/src'),
      '@speed-board/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@speed-board/extension-mindmap': path.resolve(__dirname, '../../packages/extensions/extension-mindmap/src'),
    },
  },
});
