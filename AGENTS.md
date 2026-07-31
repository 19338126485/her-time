# 她的时间 — 月经周期记录应用

> 本文档基于 2026-07-31 的代码审计与一轮全面 bug 修复重写，描述**代码的真实现状**。
> 旧版文档（存储键 `__app_period_*`、AI 助手 tab 等）已全部过时，以本文为准。

## 产品目标

主要功能**完全本地运行**的移动端 Web App：记录与预测月经周期和身体变化，提供健康小知识。无后端，数据全在 localStorage。界面中文，移动端优先（`max-w-md` 居中），水蓝/浅粉/玫粉的柔和配色。最终形态目标：PWA，手机浏览器"添加到主屏幕"即安装。

## 技术栈

- Vite 8 + React 19 + TypeScript + Tailwind CSS 4 + react-router-dom 7
- shadcn 风格组件（`src/components/ui/`，Radix 系）
- 状态：无全局状态库，React hooks + localStorage
- **平台脚手架**：本工程由妙搭/Lark APAAS 平台生成，`tsconfig.app.json`、`eslint.config.mjs` 继承平台 preset；`scripts/build.sh` 依赖平台环境（`MIAODA_*` 变量、rsync）。长期目标是解绑平台、转为标准 Vite 工程。
  - `vite.config.ts` 里的 `restoreTitlePlugin`：平台 preset 会把 `<title>`/favicon/og 标签和路由 basename 改写成 `{{appName}}`/`{{basename}}` 等占位符（由平台部署运行时替换，没有运行时**产物会白屏**），此插件把占位符还原为真实值，并剥掉平台注入的外部监控 SDK（slardar/performance/collect 等 CDN 脚本）。彻底解绑平台后可删。
  - `scripts/dev.mjs` 已修 Windows 兼容：用 `node + vite/bin/vite.js` 直接启动（原 `spawn npx` 在 Windows 必崩）。
  - `index.tsx` 使用 `process.env.CLIENT_BASE_PATH`（非标准 Vite 写法，靠 preset 的 define 注入）；**已移除平台 toolkit 的 AppContainer/ErrorRender**（会向平台上报 + 注入"由妙搭搭建"水印），错误兜底用本地 `ErrorFallback`。toolkit 仅保留 `scopedStorage`（纯 localStorage 加前缀，无网络行为）。
  - 本地构建验证用 `npx vite build` + `npx vite preview`（产物 `dist/client/`）；`npm run build` 是平台脚本，需要 `MIAODA_*` 环境变量，本地不可用。

## 常用命令

```bash
npm run dev        # 开发，http://localhost:8001
npm run build      # 构建（平台部署目录 dist/output*）
npm run typecheck  # tsc -p tsconfig.app.json
npm run lint       # typecheck + eslint
npm run icons      # 重新生成 PWA 图标（scripts/generate-icons.mjs，@resvg/resvg-js）
```

## 部署（GitHub Pages，2026-07 已上线）

- **线上地址**：https://19338126485.github.io/her-time/ （HTTPS，PWA 可安装）
- 仓库：https://github.com/19338126485/her-time （公开）
- CI：`.github/workflows/deploy.yml`，push 到 `main` 自动 `APP_BASE_PATH=/her-time/ npx vite build` 并部署 `dist/client`。**改仓库名必须同步改 workflow 里的 APP_BASE_PATH。**
- 子路径适配：`vite.config.ts` 的 `BASE`（`APP_BASE_PATH` 环境变量，默认 `/`）同时控制 vite base、路由 basename、图标路径。
- gh CLI 在 `C:/Users/19338/tools/gh/gh.exe`（winget 安装失败，手动放的；不在 PATH）。

## PWA（2026-07 已接入）

- `vite.config.ts` 里 `VitePWA`（restoreTitlePlugin 之后）：`registerType: 'autoUpdate'`，manifest 中/英文案与图标，`start_url`/`scope` 用 `./` 相对路径兼容任意 base path。
- 图标：`public/icons/icon-192.png`、`icon-512.png`、`icon-maskable-512.png`（80% 安全区），由 `scripts/generate-icons.mjs` 生成；同一玫粉弯月图形也写回 `public/favicon.svg`。改设计请改脚本里的 `glyph()` 后重跑 `npm run icons`，不要手改 PNG。
- SW：构建产物在 `dist/client/`（preset 的 outDir），`registerSW.js` 由插件自动注入；dev 下 SW 不启用（devOptions 默认）。
- `src/index.tsx` 启动时调用 `navigator.storage.persist()`，防止浏览器自动清除 localStorage。

## 目录结构

```
src/
  app.tsx                  路由表（权威路由定义）
  index.tsx                入口（ErrorBoundary + 本地 ErrorFallback + Toaster + persist 存储申请）
  components/              Layout、BottomTabBar、WheelPicker、DatePickerSheet
  components/ui/           shadcn 组件（仅保留实际使用的 image/button/switch/sonner 4 个）
  data/period.ts           经期/每日身体记录的类型与选项定义
  data/knowledge.ts        健康知识文章数据（静态内容）
  hooks/usePeriodData.ts   核心数据 hook（状态 + 持久化 + 预测桥接）
  utils/cycle-store.ts     三档周期预测引擎（纯函数，无存储、无副作用）
  utils/date.ts            日期工具（本地时区处理正确）
  pages/                   见下方路由表
  tailwind-theme.css       主题 token（水蓝/浅粉/玫粉）
shared/                    平台占位目录（capabilities/static 只有 README）
```

## 路由与页面（实际状况）

默认路由 `/` → `/calendar`。底部导航 3 tab：日历 `/calendar`、知识库 `/knowledge`、我 `/profile`。未完成 onboarding 时 Layout 守卫重定向到 `/onboarding`。

| 路由 | 页面 | 状态 |
|---|---|---|
| `/onboarding` | OnboardingPage | ✅ 问卷；重复日期 UI 层拒绝 + 数据层去重 |
| `/calendar` | CalendarPage + DailyLogSection | ✅ 核心页：倒计时横幅（含"已推迟 X 天"）、月历、预测/实际经期标记、经期开关、每日身体记录 |
| `/knowledge` | KnowledgePage | ✅ 搜索 + 分类入口 |
| `/knowledge/:category` | KnowledgeDetailPage | ✅ 合集→章节→文章三级，markdown 渲染 |
| `/profile` | ProfilePage | ✅ |
| `/profile/edit` | ProfileEditPage | ✅ 编辑菜单页 |
| `/profile/avatar` | AvatarPage | ⚠️ 预设头像 URL 硬编码平台地址，脱离托管 404（待本地化到 `public/`） |
| `/profile/nickname` | NicknamePage | ✅ 随机昵称生成 |
| `/profile/settings` | PeriodSettingsPage | ✅ 三项设置全部实时生效；"上次月经日期"用 DatePickerSheet，禁选未来日期 |
| `/profile/reminders` | RemindersPage | ✅ 提醒已接预测数据（经期=预测开始日-offset，排卵=预测开始日-14 天） |
| `/profile/feedback` | FeedbackPage | ✅ mailto 至 3961793751@qq.com |
| `*` | NotFoundPage | ✅ |

已删除的死代码：`pages/AiAssistantPage/`、`pages/ExamplePage/`、`use-mobile.ts`、各模块未使用的导出函数。

## 数据层（重要，先读再改）

### 架构原则：records 单一事实源

**`records`（实际经期记录）是经期数据的唯一事实源。** 预测引擎（`utils/cycle-store.ts`）是纯函数模块：不读写 localStorage、无副作用，`computePrediction(historyDates, presetCycle, periodDays)` 的输入全部由调用方从 records/settings 派生。历史上曾存在独立的 cycle-store 存储键（双轨制），因多条路径漏同步导致预测脏数据，已于 2026-07 重构消灭——**不要重新引入第二份经期存储**。

### localStorage 键（真实键名）

所有键经 `@lark-apaas/client-toolkit-lite` 的 `scopedStorage` 加 `__miaoda_<appId>__:` 前缀：

| 键 | 内容 | 读写处 |
|---|---|---|
| `period-tracker-settings` | 周期长度、经期天数、上次月经日期 | `usePeriodData.ts` |
| `period-tracker-records` | 实际经期记录 `IPeriodRecord[]`（唯一事实源） | `usePeriodData.ts` |
| `period-tracker-daily-log` | 每日身体记录 | `usePeriodData.ts` |
| `period-tracker-onboarding` | 是否已完成问卷 | `usePeriodData.ts`、`Layout.tsx` |
| `period-reminders` / `user-avatar` / `user-nickname` | 各页面内联读写，键名常量在多个文件重复硬编码（待抽常量） | 各页面 |

### 预测算法（cycle-store.ts，纯函数）

三档模型：
- level1（1 个历史日期）：用 presetCycle（默认 28）估算，日历上灰色虚线
- level2（2 个日期）：用实际间隔推算
- level3（≥3 个日期）：最近 3 次间隔均值 ± 最大偏差给出预测范围（至少 ±2 天）

防御：输入日期内部去重排序；间隔/均值 < 15 天视为脏数据回退到预设周期；`cycleDays <= 0` 直接返回空集——**重复日期导致死循环的漏洞已堵死**。

排卵日 = 预测下次月经开始日 - 14 天（黄体期固定 14 天的常用近似）；阶段优先级：实际经期记录 > 月经期推算 > 排卵日 > 黄体期 > 卵泡期。

### usePeriodData 已知限制

它是普通 hook，`Layout`、CalendarPage、PeriodSettingsPage、ProfilePage、RemindersPage 各持一份独立 state，靠 localStorage + 路由重挂载同步。同页内跨实例不同步。中期应提升为 Context 单例。

## 已修复的重大 bug（2026-07，回归测试参考）

1. toast 全灭 → `index.tsx` 已挂载 `<Toaster />`。
2. Onboarding 重复日期 → 预测死循环 → 三层防御（UI 拒绝 / 数据去重 / 引擎 guard）。
3. 数据双轨不同步（设置页改日期无效、删经期预测不更新）→ cycle-store 纯函数化。
4. 提醒功能是假的（每天到点就报）→ 已接预测数据；UTC 日期 bug 已修（用 `formatDate` 本地时区）。
5. Onboarding 历史记录 endDate=null 把之后所有日子染红 → 按默认经期天数补齐 endDate；`getActualPeriodDates` 对 null 只标开始日一天。
6. **页面切换动画卡死**：Layout 的 `AnimatePresence mode="wait"` 退出动画在 StrictMode 下有概率永不完成，页面永久停在 `opacity: 0`——已改为仅进入动画。**不要再给 Layout 加回 AnimatePresence 退出动画**；日历月份切换的 AnimatePresence 保留（未复现问题，如复发同样处理）。
7. 倒计时横幅月经推迟永远显示"还有 0 天" → 显示"已推迟 X 天"。
8. WheelPicker 拖拽 offset 与 spring 动画打架 → 拖拽中禁用过渡；触摸/鼠标 handler 已合并。
9. 日历开关小球错位冲出轨道 → 补 `left-0.5` 定位，位移 0↔20px。
10. 预测只推 13 个月但日历可翻 2 年 → 预测范围扩到 2 年。
11. 平台 preset 把标题写成 `{{appName}}` → `vite.config.ts` 加 restoreTitlePlugin；`index.html` 清理。
12. **构建产物白屏**：preset 把路由 basename 换成运行时 `window.__BASENAME__ = "{{basename}}"`，脱离平台运行时占位符不被替换 → Routes 全部匹配失败 → 白屏。restoreTitlePlugin 已将所有占位符还原（此 bug 也说明：改动构建配置后必须用 `vite preview` 验证产物，dev 正常≠产物正常）。

## 遗留事项（按优先级）

0. ~~已知 bug：首次 onboarding 提交后进入日历页，页面比例异常放大、底部导航消失~~（2026-08-01 已修：根因是移动端聚焦 font-size<16px 输入框时浏览器自动放大且缩放残留到下一页。修复：viewport 加 `maximum-scale=1.0, user-scalable=no` + `index.css` 全局规则移动端输入框强制 16px——iOS 10+ 忽略 user-scalable，字号是唯一可靠手段）。若仍复发，查 `visualViewport.scale` 与 SW 缓存。
1. ~~依赖瘦身~~（2026-07 已完成：未使用的 56 个 ui 组件已删，17 个杂项包 + 28 个 @radix-ui 包已卸载，仅剩 react-slot/react-switch）。
2. ~~PWA 化~~（2026-07 已完成，见上方"PWA"一节）。
3. **平台解绑**（部分完成：AppContainer/ErrorRender/外部监控 SDK/占位符已处理）：剩余 vite/ts/eslint preset 本地化、`process.env.CLIENT_BASE_PATH` 改 `import.meta.env`、build.sh 改标准输出、头像预设 URL 本地化到 `public/`。
4. **数据导出/导入**（JSON 备份恢复，换设备刚需）；**usePeriodData 提升为 Context 单例**；抽取 `user-avatar`/`user-nickname`/`period-reminders` 键名常量。
5. KnowledgeDetailPage 的 stories 分类（"她言·故事集"）0 篇文章不可达——补内容或删除分支。
6. 拆分巨石：CalendarPage（550+ 行）、KnowledgeDetailPage（610+ 行）。

## 设计规范（简版）

- 主色：水蓝底 `hsl(195 60% 97%)`（`--background`）、玫粉主交互 `hsl(340 70% 70%)`（`--primary`）、浅粉辅助（`--accent`）。以 `tailwind-theme.css` 实际值为准。
- 日历三态：普通（白）/ 预测经期（浅粉 `rgba(255,182,193,0.5)`）/ 实际经期（玫红 `#D6336C`，目前内联，应收敛进 token）；level1 预测为灰色虚线框。
- 圆角大（卡片 rounded-2xl、按钮 rounded-full）、阴影极轻、动效克制（150–300ms）。
- 字体 Noto Sans SC；移动端优先 `max-w-md mx-auto`；底部导航约 64px + 安全区。

## 工作约定

- **最小改动**：修 bug 不顺手重构，重构不夹带行为变更。
- **改数据层前必读"数据层"一节**；records 是唯一事实源，预测输入一律从 records/settings 派生，禁止新增第二份经期存储。
- 新增 UI 优先复用 `components/` 已有组件（WheelPicker、DatePickerSheet），不要在页面内内联重复实现。
- 弹层/页面切换动画谨慎使用 `AnimatePresence` 退出态（StrictMode 下有卡死风险），优先只用进入动画。
- 删文件前全局搜索引用；`components/ui/` 下未引用的组件可安全删除，但需同步卸载对应 radix 依赖。
- 改动后跑 `npm run lint`（含 typecheck）。
- 不引入后端；数据保持 localStorage 本地存储。
