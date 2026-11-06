import { defineConfig } from "vitepress";

const base = process.env.NODE_ENV === "production" ? "/speed-board/docs/" : "/";

export default defineConfig({
  title: "Speed Board",
  description: "基于原生 SVG 与 Plait 引擎打造的现代无界白板与思维导图套件",
  base,
  sitemap: {
    hostname: "https://whateveryoudo.github.io/speed-board/docs/",
  },
  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    [
      "meta",
      {
        name: "keywords",
        content:
          "speed-board, plait, 白板, 思维导图, vue3, svg, 协同白板, 曼哈顿避障, 流程图, 架构图",
      },
    ],
    ["meta", { name: "author", content: "Speed Platform" }],
    [
      "meta",
      {
        property: "og:title",
        content: "Speed Board - 现代原生白板与思维导图套件",
      },
    ],
    [
      "meta",
      {
        property: "og:description",
        content:
          "原生 SVG 视口 · Plait 引擎 · 独立白板与思维导图双模式 · 11种导图布局 · 19+几何图元 · 曼哈顿正交避障连线。",
      },
    ],
    ["meta", { property: "og:type", content: "website" }],
    [
      "meta",
      {
        property: "og:url",
        content: "https://whateveryoudo.github.io/speed-board/docs/",
      },
    ],
  ],
  themeConfig: {
    logo: "🎨",
    siteTitle: "Speed Board",
    nav: [
      { text: "指南", link: "/guide/" },
      { text: "配置与 API", link: "/config/props" },
      { text: "思维导图", link: "/mindmap/" },
      {
        text: "在线体验",
        link: "https://whateveryoudo.github.io/speed-board/demo/",
      },
      { text: "GitHub", link: "https://github.com/whateveryoudo/speed-board" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "入门指南",
          items: [
            { text: "介绍与特性", link: "/guide/" },
            { text: "快速开始", link: "/guide/quickstart" },
          ],
        },
      ],
      "/config/": [
        {
          text: "配置与 API",
          items: [
            { text: "组件 Props 与 Emits", link: "/config/props" },
            { text: "Board 门面常用 API", link: "/config/api-ref" },
          ],
        },
      ],
      "/mindmap/": [
        {
          text: "思维导图",
          items: [
            { text: "独立思维导图组件", link: "/mindmap/" },
            { text: "11 种布局与节点标记", link: "/mindmap/layouts" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/whateveryoudo/speed-board" },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © Speed Platform",
    },
  },
});
