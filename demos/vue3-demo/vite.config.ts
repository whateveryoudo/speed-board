import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

const scDist = path.resolve(__dirname, '../../../speed-components/dist');

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5176,
    open: false,
  },
  resolve: {
    alias: {
      'speed-components-ui/dist/style.css': path.resolve(scDist, 'style.css'),
      'speed-components-ui/components': path.resolve(scDist, 'components.es.js'),
      'speed-components-ui/hooks': path.resolve(scDist, 'hooks.es.js'),
      'speed-components-ui': path.resolve(scDist, 'index.es.js'),
      '@speed-board/core': path.resolve(__dirname, '../../packages/core/src'),
      '@speed-board/vue3': path.resolve(__dirname, '../../packages/vue3/src'),
      '@speed-board/vue3-antd': path.resolve(__dirname, '../../packages/vue3-antd/src'),
      '@speed-board/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@speed-board/extension-draw': path.resolve(__dirname, '../../packages/extensions/extension-draw/src'),
      '@speed-board/extension-mindmap': path.resolve(__dirname, '../../packages/extensions/extension-mindmap/src'),
    },
  },
});
