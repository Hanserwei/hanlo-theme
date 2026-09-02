# 阶段 5：CSS 架构与视觉系统

## 1. 状态

阶段 5 的实现与本地验收已完成，主题实现版本为 `1.2.0`，Halo 兼容要求保持
`>= 2.26.0`。CSS 已进入 Vite 源码构建链，Tailwind CSS 仅作为带前缀、无运行时的渐进式
utility 层使用；现有视觉继续由语义 Design Tokens 和分层 CSS 所有。

架构约束见 [`CSS_ARCHITECTURE.md`](CSS_ARCHITECTURE.md)，真实 Halo 验收见
[`evidence/live/README.md`](evidence/live/README.md)。远端实现提交和 CI 通过后，完成结论将记录在
`COMPLETION_AUDIT.md`。

## 2. 技术决策

- 使用 Tailwind CSS `4.3.3` 与 `@tailwindcss/vite` `4.3.3`，版本精确锁定。
- 禁用 Tailwind Preflight，避免重置既有 Halo 模板、文章内容和插件组件；所有 utility 使用
  `hl:` 前缀。
- 设计语言继续以原生 CSS Variables 为核心。`tokens.css` 定义颜色、间距、圆角、阴影、字体、
  动画时长和缓动，并把原 `--heo-*` 变量映射到新的 `--hanlo-*` 语义变量。
- 顶层顺序为 `reset, tokens, base, layout, components, pages, utilities, overrides`。迁移中的历史规则
  保持在同一兼容层并严格维持原始字节顺序，防止拆文件改变级联；新样式按职责进入目标层。
- 体积大或只在特定路由/配置启用的样式由 `css-entries.json` 声明为 19 个独立、版本化 CSS 入口，
  模板按条件加载。
- 仅运行时可知的图片、颜色和尺寸通过局部 `--hanlo-*` 自定义属性传入；模板不再直接声明布局或
  组件属性。

## 3. 实现结果

- 原 `public/assets/zhheo/zhheoblog.css`（16,666 行）和 `custom.css`（2,475 行）已拆入
  `src/css/legacy`、`layout`、`components`、`pages` 与 `overrides`。
- 当前共有 68 个第一方 CSS 源模块，最大单文件 1,259 行；架构门禁上限为 1,300 行。
- `public/` 不再保存第一方 CSS；仅保留第三方图标字体自己的 `iconfont.css`。
- 94 个模板中的 176 处静态 `style` 属性全部迁移为 `hl:` utility 或语义类；31 个模板 `<style>`
  块收敛为 1 个集中式 Halo 配置变量块。
- 35 个动态样式点全部限制为 `--hanlo-*` 自定义属性边界。
- 总 `!important` 数由阶段开始前的 470 个降至 460 个；同时删除重复 min CSS、废弃评论弹幕 CSS、
  两个空 `nth-child()` 选择器、错误的 `var(-highlight-bg)`、空动画帧和空规则。
- 主 CSS 构建产物为 295,923 bytes（gzip 52,096 bytes），较原全局三文件
  `zhheoblog.css + custom.css + phase4-runtime.css` 的 403,117 bytes 减少 26.6%。
- 19 个条件入口合计 53,339 bytes；首页、文章和相册的真实网络请求均有自动断言，不加载其他页面
  的条件 CSS。

## 4. 自动化门禁

`pnpm check:css` 同时运行 Stylelint 与 `scripts/validate-css-architecture.mjs`，阻止：

- Tailwind Preflight 或无 `hl:` 前缀的 Tailwind 层进入主题；
- 未登记、重复登记或超过 1,300 行的 CSS 模块；
- 第一方 CSS 回流 `public/`；
- 普通 `style` 属性、组件内 `<style>` 或未通过 `--hanlo-*` 的 `th:style`；
- 已删除的旧 CSS URL、空 `nth-child()` 和错误 CSS 变量重新出现；
- 条件入口存在但模板没有消费。

Playwright 的 `phase5-visual.spec.ts` 固定 Design Token、组件表面、按钮、桌面/移动和浅色/深色四张
像素快照。真实 Halo 用例覆盖 9 个固定页面的四象限截图、13 路由直接加载、PJAX 连续导航和条件
CSS 网络门禁。

## 5. 验收命令

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:unit
PLAYWRIGHT_EXECUTABLE_PATH=/usr/sbin/google-chrome-stable pnpm test:e2e
HALO_BASE_URL=http://127.0.0.1:8090 \
PLAYWRIGHT_EXECUTABLE_PATH=/usr/sbin/google-chrome-stable \
pnpm exec playwright test --grep @live
pnpm build
unzip -t dist/theme-hanlo-1.2.0.zip
```

## 6. 已知边界

- 历史样式仍包含深层 DOM 选择器和 460 个 `!important`。本阶段先固定级联顺序、文件归属和视觉
  门禁，后续应在修改对应组件 HTML 时逐模块降权，不能跨模块批量删除。
- Tailwind 只用于模板中的静态 utility 和新组件，不要求把历史选择器全量转换为 utility class。
- `templates/` 是构建产物；只编辑 `src/`、`public/`、`css-entries.json` 与根构建配置。
