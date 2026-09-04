# 阶段 6：原生文档导航与发布治理

## 1. 状态

阶段 6 的开发实现与自动化验收已完成，交付版本为 `2.0.0`，Halo 兼容要求继续保持
`>= 2.26.0`。主题已删除 PJAX 依赖、全局对象、事件、选择器、资源同步和模拟进度条，站内页面切换
回归浏览器原生 Document Navigation，并以 Cross-document View Transitions 和保守文档预取做渐进增强。

完成审计见 [`COMPLETION_AUDIT.md`](COMPLETION_AUDIT.md)，基线与性能数据见
[`BASELINE_AND_PERFORMANCE.md`](BASELINE_AND_PERFORMANCE.md)，真实 BFCache 证据见
[`BFCACHE_EVIDENCE.md`](BFCACHE_EVIDENCE.md)，安装/升级证据见
[`INSTALL_UPGRADE_EVIDENCE.md`](INSTALL_UPGRADE_EVIDENCE.md)，真实 Halo 截图见
[`evidence/live/README.md`](evidence/live/README.md)。

这是 `2.0.0` 发布候选。最终 ZIP 已在两个独立 Halo 2.26 实例完成全新安装和从 1.2.1 升级；公开
Release 前仍需要在真实 Safari 18.2+ 上执行一次硬件冒烟，不影响本次源码、构建产物和自动化开发阶段
完成结论。

## 2. 目标架构

```text
Halo 2.26+ / Thymeleaf SSR
          │
          ▼
真实 <a href> 与 <button type="button">
          │
          ▼
浏览器原生 Document Navigation
          ├── 完整目标文档 head / CSS / module / 插件资源
          ├── 原生 History / Scroll / Hash / Download / Error
          └── pagehide / pageshow / BFCache 生命周期
          │
          ├── @view-transition { navigation: auto; }
          │     └── 根页面 200ms；reduced-motion 禁用动画
          │
          └── Speculation Rules conservative prefetch
                └── Firefox 等回退为按交互触发的 link prefetch
```

## 3. 实现结果

### 3.1 语义导航

- 文章卡片使用真实标题链接和 stretched-link，不再由父级 `onclick` 导航。
- 相册、最新评论、瞬间、推荐文章、返回入口均提供可复制、可新窗口打开的真实 URL。
- 追番 Tab、分页、主题切换、搜索、控制台、随机访问等动作入口改为 `<button>`。
- 程序化随机文章、页码输入和延迟返回首页统一调用 `navigateTo()`；该函数只允许同源 HTTP(S)，只调用
  `location.assign()` / `location.replace()`，不 fetch、不替换 DOM、不管理 History。
- `parse5` 门禁禁止源码模板重新出现无 `href` 的 `<a>`、`javascript:` URL 或 anchor 内联点击处理器。

### 3.2 文档生命周期

- 新文档通过 `DOMContentLoaded` 校验并冻结 `GLOBAL_CONFIG`，挂载控制器一次并发出
  `hanlo:page:initial`。
- `pagehide.persisted === false` 发出 leave/destroy 并尽力清理；`persisted === true` 保留完整控制器与
  `PageResourceScope` 进入 BFCache。
- `pageshow.persisted === true` 只发出 `hanlo:page:restore`，不刷新配置、不重新挂载、不重复统计。
- 保留 `HanloLifecycle.config`、`activeControllers`、`register()`、`whenIdle()`、
  `PageControllerRegistry` 和 `PageResourceScope`。
- 瀑布流首轮布局改为同步执行，后续 ResizeObserver/图片事件继续合并到 RAF，避免快速跨文档过渡取消
  首个 RAF 后内容永久隐藏。

### 3.3 资源、过渡与加载体验

- 完整文档天然接管 title、Open Graph、页面级 CSS、module script、`<halo:footer />` 和评论插件脚本；
  删除手工 CSS 同步和 module script 重放。
- 顶层 `@view-transition` 启用同源跨文档根过渡，时长 200ms；不支持时由浏览器忽略。
- `prefers-reduced-motion: reduce` 禁用 View Transition、首次加载和其他非必要动画。
- 全屏 loading box 在直接访问或跨站进入时显示；带同源 referrer 的导航、刷新或新标签页通过同步
  head 引导添加 `hanlo-internal-navigation`，目标快照不显示 loading box；禁用 JavaScript 时默认隐藏。
- 删除 `loadProgressBar` 设置、前端配置和进度 DOM/CSS；旧 ConfigMap 字段被安全忽略。
- 首页首屏条件 CSS 从 body 提升到 head，冷加载 CLS 中位数从 `0.1396` 降至 `0.0153`。

### 3.4 预取

- 支持 Speculation Rules 时使用 `source: "list"`、`eagerness: "conservative"`，不启用 prerender。
- 不支持时仅在 `pointerdown` / `focusin` 后添加 `<link rel="prefetch">`。
- 排除跨域、非 HTTP(S)、hash、新窗口、download、`external`、`nofollow`、`data-no-prefetch`、Save-Data、
  2G/slow-2G、登录/退出、Console、UC、API、Feed、Sitemap 和疑似副作用参数。
- 预取失败不影响导航正确性，且真实网络证据未出现预取导致的重复统计。

### 3.5 Halo 2.26 页面布局

新增根 `src/layout.html`，实现官方 `html(head, content)` 页面布局契约并复用现有主题私有布局。插件页面
因此可以复用主题 head、导航、页脚、运行时、颜色模式和跨文档过渡；`validate-theme.mjs` 会阻止签名回退。

## 4. 阶段 5 二次收尾

本阶段开始前重新审计阶段 5 遗留 CSS，并完成以下收尾：

- 生效 `!important` 从 446 降为 0；Stylelint 与 PostCSS AST 双门禁禁止回增。
- 原先全部塞入 base 的模块改为真实 `layout`、`components`、`pages`、`overrides` Cascade Layer。
- 19 个条件入口也分别包装为 `components`、`pages` 或 `overrides`，不再以未分层规则压过全局层序。
- ID selector entry 从 1,866 降为 1,807；高复杂度 selector 保留兼容但由
  `css-quality-budget.json` 建立只减不增预算。
- 新增语义导航组件层、统一 button reset、stretched-link、24px 小型链接目标和 44px 主操作目标。
- 清理重复 `ai-tag`、`preimg`、问候语和瞬间组件 ID，并同步运行时选择器与测试 fixture。
- 主 CSS 从 296,190 bytes 降至 295,964 bytes；`gzip -9` 从 51,583 降至 51,542 bytes。

## 5. 2.0.0 迁移说明

### 自定义代码

旧代码：

```js
window.pjax.loadUrl("/archives/example");
```

新代码应优先使用 HTML：

```html
<a href="/archives/example">阅读文章</a>
```

确实需要程序化跳转时使用浏览器 API：

```js
window.location.assign("/archives/example");
```

主题不提供长期双导航内核或 `window.pjax` 兼容对象。监听旧 PJAX 事件的自定义代码应迁移为
`DOMContentLoaded`、`pageshow`、`pagehide` 或 `HanloLifecycle.events.restore`。

### 设置兼容

- `other.loadingBoxs.loadingBoxEnable` 保留，含义调整为“直接或跨站进入加载动画”。
- `other.loadingBoxs.loadProgressBar` 从表单和运行时删除；已有 ConfigMap 中的旧值无需手工清理，也不会
  阻止降级回 1.2.1。
- 主题最低 Halo 版本没有提高。

## 6. 验收命令

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:unit
PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e
HALO_BASE_URL=http://127.0.0.1:8090 \
PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
pnpm exec playwright test tests/e2e/halo-live.spec.ts
pnpm build
unzip -t dist/theme-hanlo-2.0.0.zip
```

WebKit 在非 Ubuntu Linux 上使用与 CI 一致的官方 Playwright 1.58.2 容器执行，详见完成审计。
