# 阶段 4：第三方依赖治理与按需加载

## 1. 状态

阶段 4 的源码实现、本地静态/合成门禁和真实 Halo 页面矩阵均已通过，等待提交、推送和远端 CI 收尾。
主题版本为 `1.1.0`，Halo 兼容要求保持 `>= 2.26.0`，构建系统保持 pnpm、Vite Plus 和 Halo Vite 插件。真实验收证据见 [`evidence/live/README.md`](evidence/live/README.md)。

## 2. 实现结果

- `package.json` 的 `dependencies` 和 `pnpm-lock.yaml` 成为浏览器运行时第三方包的版本来源。
- PJAX 由 `src/js/core/navigation.ts` 本地打包并在生命周期安装前启动；核心入口使用 `hanlo-runtime-<version>.js`，与延迟分块共享同一模块 URL 且不经过用户配置的 CDN。
- 图库、灯箱、懒加载、Snackbar、瞬间瀑布流、导航进度和内部链接预取改为原生 TypeScript。
- 3D 分类保留原视觉能力，使用语义化链接、原生指针倾斜和 `prefers-reduced-motion` 降级，不再加载 Vue 2。
- Shiki 4.4.3 使用 JavaScript 正则引擎、本地显式语言/主题注册表和动态分块；不支持的语言保留原始 `<pre><code>`。
- Swiper、Tocbot、QRCode、FastAverageColor、Typed.js、DPlayer 和 HLS.js 仅在对应 DOM 与设置满足时动态导入；HLS.js 只为 `.m3u8` 来源加载。
- 互动友链画布改为第一方 Canvas 控制器，不再使用 iframe、Box2D 或 ProtoClass。
- Halo 原生评论继续由 `plugin-comment-widget` 所有；主题没有引入评论运行时。侧栏音乐卡仍是图片/链接卡片，没有引入音乐播放器。
- 删除 `public/assets/libs/` 中所有 vendor 副本，以及仅供旧友链 iframe 使用的 HTML；图库、友链和可选动画使用第一方实现。
- 移除来源未声明许可的旧 FriendCircle CSS 与 GSAP，分别以简洁第一方样式和 PointerEvent/CSS transform 替代。
- `THIRD_PARTY_NOTICES.txt` 从安装后的生产 pnpm 图确定性生成，`pnpm validate` 会检查漂移并随主题 ZIP 分发。

## 3. 外部失败降级

- 核心 PJAX/生命周期 ESM 和阶段 4 基础样式始终使用 Halo 本地主题资源 URL，不受自定义静态 CDN 影响。
- 自定义静态资源 CDN 加载失败时显示可访问的页面级提示；服务端渲染内容和普通链接仍可读、可导航。
- 一言接口失败时使用配置文本；友链 API 失败显示现有错误状态；外部用户媒体失败不阻塞页面壳层。
- Shiki 不支持或加载失败时保留可读原代码；图库在 JavaScript 不可用时仍是普通图片网格；3D 分类仍是普通链接卡片。
- Bangumi 星级不再请求 jsDelivr 图片，改为本地 CSS 渐变。

## 4. 验收路径

本地静态检查：

```bash
pnpm install --frozen-lockfile
node scripts/generate-third-party-notices.mjs --check
pnpm check
pnpm test:unit
pnpm build-only
PLAYWRIGHT_EXECUTABLE_PATH=/usr/sbin/google-chrome-stable pnpm test:e2e
```

真实 Halo 由收尾线程覆盖：

- 首页启用/关闭瞬间：首页仅在目标 DOM 存在时加载 Swiper。
- 长文章/普通页：Tocbot、Shiki、二维码、动态图色、原生图库和 PJAX 前进后退。
- `/categories`：默认和 3D 配置、桌面指针、键盘、移动端与减少动态效果。
- `/moments`：瀑布布局、图片加载、窗口变化、PJAX 重入。
- 含 `hao-dplayer` 的文章：MP4 不加载 HLS.js，HLS 来源按需加载并完整销毁。
- 友情链接 Canvas 开启/关闭：互动、刷新、空数据和 PJAX 重入。
- 自定义 CDN 不可用：出现明确提示，服务端内容、核心 ESM 和普通导航继续工作。

## 5. 构建边界

只编辑 `src/`、`public/` 和根配置；`templates/` 由 `pnpm build-only` 生成。动态依赖会产生带哈希的 JS/CSS 分块，`scripts/verify-build.mjs` 会校验这些分块非空，同时继续验证原样复制资源和 Thymeleaf 模板保真。

## 6. 已知限制

- Shiki 本地分块虽只注册常用语言和六个主题，但语法定义仍形成较大的延迟分块；无代码块页面不会下载该分块。
- DPlayer 1.27.1 本身是较大的延迟分块，只有 `hao-dplayer` 存在时加载；HLS.js 进一步按 HLS 来源隔离。
- 真实 Halo 的默认/可选配置、网络请求门禁和截图证据已经完成；本文在提交推送前仍不声明远端 CI 或发布完成。
- 当前通知清单明确记录 `emoji-regex@8.0.0` 包内未附 LICENSE/COPYING/NOTICE 文本；包元数据声明 MIT，但该缺口不应被表述为法律审核通过。
