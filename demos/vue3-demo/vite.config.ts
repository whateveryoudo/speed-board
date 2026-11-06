import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import fs from "fs";

const scDist = path.resolve(__dirname, "../../../speed-components/dist");
const useLocalSc = fs.existsSync(scDist) && !process.env.CI;

const scAliases = useLocalSc
  ? {
      "speed-components-ui/dist/style.css": path.resolve(scDist, "style.css"),
      "speed-components-ui/components": path.resolve(
        scDist,
        "components.es.js",
      ),
      "speed-components-ui/hooks": path.resolve(scDist, "hooks.es.js"),
      "speed-components-ui": path.resolve(scDist, "index.es.js"),
    }
  : {};

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/speed-board/demo/" : "/",
  plugins: [vue()],
  server: {
    port: 5176,
    open: false,
    proxy: {
      "/api": {
        target: "http://localhost:8010",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  resolve: {
    alias: {
      ...scAliases,
      "@speed-board/core": path.resolve(__dirname, "../../packages/core/src"),
      "@speed-board/vue3": path.resolve(__dirname, "../../packages/vue3/src"),
      "@speed-board/vue3-antd": path.resolve(
        __dirname,
        "../../packages/vue3-antd/src",
      ),
      "@speed-board/shared": path.resolve(
        __dirname,
        "../../packages/shared/src",
      ),
      "@speed-board/extension-draw": path.resolve(
        __dirname,
        "../../packages/extensions/extension-draw/src",
      ),
      "@speed-board/extension-mindmap": path.resolve(
        __dirname,
        "../../packages/extensions/extension-mindmap/src",
      ),
    },
  },
}));
