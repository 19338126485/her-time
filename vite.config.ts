import path from 'path'
import { defineConfig } from '@lark-apaas/coding-preset-vite-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * 部署子路径：本地开发/预览为 '/'，GitHub Pages 项目仓库为 '/her-time/'
 * （由 CI 通过 APP_BASE_PATH 环境变量注入，必须以 / 结尾）
 */
const BASE = process.env.APP_BASE_PATH || '/'

/**
 * 平台 preset 会把 <title>/favicon/og 标签改写成 {{appName}} 等 HBS 占位符，
 * 并把路由 basename 换成运行时 window.__BASENAME__ = "{{basename}}"
 * （都由平台部署运行时替换）。本地开发/独立部署没有该运行时，
 * 占位符原样输出会导致 React Router basename 不匹配 → 白屏。
 * 此插件在 preset 之后把所有占位符还原为真实值。彻底解绑平台后可删除。
 */
function restoreTitlePlugin() {
  return {
    name: 'restore-title',
    enforce: 'post' as const,
    transformIndexHtml(html: string) {
      return (
        html
          .replace(/<title>[^<]*<\/title>/i, '<title>她的时间</title>')
          .replace(
            /(<link\s+[^>]*rel=["']?(?:icon|shortcut icon)["']?[^>]*href=)["'][^"']*["']/gi,
            `$1"${BASE}favicon.svg"`
          )
          // 路由 basename 占位符 → 部署路径（否则 Routes 匹配不到任何路由，白屏）
          // react-router 的 basename 不带尾斜杠
          .replace(
            /"\{\{basename\}\}"/g,
            JSON.stringify(BASE === '/' ? '/' : BASE.replace(/\/$/, ''))
          )
          // og 标签与 window.* 全局的其余占位符 → 合理默认值/空串
          .replace(/\{\{appName\}\}/g, '她的时间')
          .replace(/\{\{appDescription\}\}/g, '记录与预测月经周期，数据保存在本地')
          .replace(/\{\{appAvatar\}\}/g, `${BASE}favicon.svg`)
          .replace(/"\{\{[a-zA-Z]+\}\}"/g, '""')
          // 剥掉平台注入的外部监控 SDK（slardar/performance/collect 等 CDN 脚本），
          // 本地运行的应用不需要也不应该向字节埋点平台上报
          .replace(/<script[^>]*src="https?:\/\/[^"]*"[^>]*>\s*<\/script>/gi, '')
      )
    },
  }
}

export default defineConfig({
  base: BASE,
  plugins: [
    restoreTitlePlugin(),
    // PWA：autoUpdate 自动更新 SW；icons 由 scripts/generate-icons.mjs 生成（npm run icons）
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '她的时间',
        short_name: '她的时间',
        description: '记录与预测月经周期，数据保存在本地',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#E0F7FA',
        theme_color: '#E0F7FA',
        // 相对路径，兼容任意 base path
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
})
