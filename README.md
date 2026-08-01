# 她的时间 · her-time

清新柔和的月经周期记录与预测应用。**完全本地运行**：无后端、无账号、数据只存在你自己的设备上。

**线上体验**：https://19338126485.github.io/her-time/

手机浏览器打开后「添加到主屏幕」即可像原生 App 一样安装使用（PWA）。

## 功能

- **经期日历**：玫红标记实际经期、浅粉标记预测经期、灰色虚线为初始估算
- **三档智能预测**：1 条记录用预设周期估算 → 2 条用实际间隔 → ≥3 条用最近 3 次均值 ± 偏差给出预测范围
- **倒计时横幅**：距离下次月经天数，推迟时显示"已推迟 X 天"
- **周期阶段**：月经期 / 卵泡期 / 排卵日（下次月经前 14 天）/ 黄体期，实际记录优先于推算
- **每日身体记录**：痛经、血块、流量、颜色、不适、白带状态、日记，均带健康提示
- **健康小知识**：分类百科 + 搜索，覆盖经期护理、排卵期、私处健康等
- **本地提醒**：经期提醒（预测开始日提前 N 天）、排卵提醒、每日记录提醒、睡眠提醒
- **隐私优先**：所有数据存 localStorage，已申请持久化存储（`navigator.storage.persist()`），无任何数据上报

## 技术栈

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · react-router 7 · framer-motion · lucide-react · sonner · vite-plugin-pwa

架构要点：`records`（经期记录）为唯一事实源，预测引擎（`src/utils/cycle-store.ts`）为纯函数三档模型，无全局状态库。详见 [AGENTS.md](AGENTS.md)。

## 本地开发

```bash
npm install
npm run dev        # http://localhost:8001
npm run lint       # typecheck + eslint
npm run icons      # 重新生成 PWA 图标
```

## 部署

push 到 `main` 分支即触发 GitHub Actions 自动构建并部署到 GitHub Pages
（`.github/workflows/deploy.yml`，产物 `dist/client`）。

## 项目结构

```
src/
  app.tsx                路由表
  components/            Layout、BottomTabBar、WheelPicker、DatePickerSheet、ui/
  data/                  经期类型定义、健康知识文章
  hooks/usePeriodData.ts 核心数据 hook
  utils/cycle-store.ts   三档周期预测引擎（纯函数）
  utils/date.ts          日期工具
  pages/                 日历、知识库、我的、onboarding 等页面
```

## 许可证

Copyright (C) 2026 她的时间项目贡献者们（her-time contributors）

本项目采用 [GNU Affero General Public License v3.0](LICENSE)（AGPL-3.0）开源：
你可以自由使用、修改、分发本项目，但衍生作品（包括基于本项目部署的网络服务）必须以相同许可证开源。
