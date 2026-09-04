# 阶段 6 完成审计

## 1. 审计结论

阶段 6 的源码、自动化、真实 Halo 验收、性能预算和 2.0.0 构建产物已完成。主题不再包含 PJAX，所有
用户可见导航回归原生文档语义；完整目标文档接管 head、页面 CSS、模块脚本和插件资源；BFCache
状态机、View Transitions、reduced-motion 和 conservative prefetch 均有跨浏览器测试，另有 headed
Chrome + 真实 Halo 的 BFCache 命中证据。

| 字段 | 结果 |
| --- | --- |
| 版本 | `2.0.0`，Halo `>= 2.26.0` |
| 当前代码中的退休导航引用 | `src/`、当前 tests、package、lockfile、通知、生成 templates 均为 0 |
| CSS | 70 模块、0 个 `!important`、主入口与 19 个条件入口全部使用真实语义 layer |
| 语义 HTML | parse5 门禁：无伪链接、JavaScript URL 或 anchor 内联导航 |
| 单元测试 | 17 文件、67 项通过 |
| Chrome 合成矩阵 | 86 项通过、24 项真实 Halo 用例按设计跳过 |
| Firefox | 10 项通过 |
| WebKit | 10 项通过 |
| 真实 Halo | 18 项通过、6 项非固定项目按设计跳过 |
| 真实页面 | 13 路由 × 4 视口/模式；页面异常、Console error、主题失败请求、本地 4xx/5xx 为 0 |
| 截图 | 9 页面 × 桌面/移动 × 浅色/深色，共 36 张 WebP，SHA-256 可复核 |
| Lighthouse 首页 | 桌面/移动 Accessibility 100、Best Practices 100、Agentic 100、SEO 92 |
| Lighthouse 文章 | Accessibility 96、Best Practices 100、SEO 100、Agentic 100 |
| 最终 ZIP | 2,818,276 bytes、221 条目、SHA-256 `4fdce061bb31cd1e1ff193464f099f713d4cd009c293286654f03afacf99b502` |

## 2. N0–N5 证据

### N0：基线与回滚

- 固化实施前提交、1.2.1 ZIP、SHA-256、Halo/浏览器/插件版本和 13 路由。
- 使用同一数据卷和浏览器分别采集旧 PJAX 与新 document 的冷/暖性能。
- 21 个活动主题设置组中未发现旧导航对象引用；不提交未脱敏配置原文。
- 旧 ConfigMap 不需要迁移，1.2.1 ZIP 可直接作为回滚制品。

### N1：语义化

- 模板与 `src/js/features` 不再直接调用旧导航器。
- 卡片、评论、相册、瞬间、推荐和返回入口均有真实 href。
- 动作链接转换为 button；禁用 JavaScript 的真实链接测试通过。
- 随机文章、页码和 AI 返回首页集中到受限 `navigateTo()`。

### N2：原生文档生命周期

- 删除依赖、类型、全局、XHR 事件、DOM selector 同步、module 重放、统计补报和失败回退 router。
- 新 Realm 每文档 initial 一次；pagehide 非持久化清理，BFCache 保留，pageshow 发 restore 且不重挂载；
  headless 测试明确验证状态机，headed Chrome 真实首页验证 persisted 命中与 Realm/控制器保持。
- 10 次连续导航、后退/前进、hash、下载、新窗口、500 和未完成请求离页测试通过。
- 请求类型全部为 document，旧导航请求头为 0。

### N3：过渡与加载

- Chromium 与 WebKit 识别根级 cross-document opt-in 和 200ms 时长。
- Firefox 即使不使用该增强也完成全部普通导航、History 和资源测试。
- reduced-motion 项目禁用过渡动画且 8 项生命周期测试全部通过。
- loading box 仅在直接访问或跨站进入时显示，同源 referrer 与无 JavaScript 场景隐藏；模拟进度条设置和运行时已删除。

### N4：预取

- Chromium 使用 conservative Speculation Rules；规则不含 prerender。
- Firefox/WebKit fallback 仅在交互意图后生成 link prefetch。
- 资格纯函数覆盖同源、协议、hash、target、download、rel、Save-Data、慢网、认证/API/Feed 和副作用参数。
- 预取不是导航正确性的依赖，缓存资源没有重复传输。

### N5：测试与发布治理

- CI 安装 Chromium、Firefox、WebKit，Action 全部固定到不可变提交 SHA。
- 测试矩阵增加 WebKit、Firefox、reduced-motion 和禁用 JavaScript 项目。
- 真实 Halo 固定路由已更新为当前导入数据，不再引用失效开发 slug。
- 加入冷 LCP/CLS、暖导航中位数、请求头、缓存传输和单文档统计预算。
- `templates/layout.html` 实现 Halo 2.26 `html(head, content)` 契约，并由源码门禁验证。

## 3. CSS 二次审计

| 指标 | 开始 | 完成 |
| --- | ---: | ---: |
| 生效 `!important` | 446 | 0 |
| ID selector entry | 1,866 | 1,807 |
| 4+ combinator selector | 200 | 200（兼容预算，禁止增长） |
| 最大单 selector ID | 4 | 4（兼容预算，禁止增长） |
| 主 CSS `gzip -9` | 51,583 bytes | 51,542 bytes |

目录与 layer 映射、CSS AST 指标和模板语义均已变成失败即阻塞的自动门禁。

## 4. 浏览器与真实 Halo

- Google Chrome 152：桌面/移动、浅色/深色、reduced-motion、无 JavaScript、MCP 网络与 Lighthouse。
- Firefox 146.0.1：10 项原生导航、无过渡降级和 fallback 测试。
- WebKit 26.0：官方 Playwright 1.58.2 noble 容器中 10 项通过，包含实际 `pageswap.viewTransition`；避免在 Arch 主机伪造旧 ICU/libxml2。
- Halo 2.26：18 项真实测试通过，包含 13 路由、重复导航、整卡命中、插件、条件 CSS、视觉和性能。
- Lighthouse 剩余文章对比度项来自 `plugin-shiki` 自己的 Shadow DOM（`#6A737D` / `#24292E`，3.04）；
  主题不能跨 Shadow DOM 覆盖。主题自有按钮名称和 Shiki 颜色问题均已修复。
- 首页唯一 SEO 扣分是当前站点未配置 meta description；主题按 Halo SEO 契约不重复注入。

## 5. 最终质量门禁

- [x] `pnpm install --frozen-lockfile`
- [x] `pnpm check`
- [x] `pnpm test:unit`
- [x] Chrome 合成浏览器矩阵
- [x] Firefox 原生降级矩阵
- [x] WebKit 官方容器矩阵
- [x] 真实 Halo 四象限与性能预算
- [x] Lighthouse 桌面/移动首页与文章页
- [x] `pnpm build`、ZIP 完整性、生成模板同步与退休引用零扫描
- [x] 两个隔离 Halo 2.26 实例分别完成 2.0.0 全新安装及 1.2.1 → 2.0.0 升级；Page Layout Supported，前台请求全 200
- [ ] Safari 18.2+ 真实硬件冒烟（公开 Release 前外部门禁）

## 6. 回滚

本阶段没有数据库或内容模型迁移。若公开发布前的 Safari 真机门禁失败，可重新安装已固化 SHA-256 的
`theme-hanlo-1.2.1.zip`。旧 ConfigMap 中 `loadProgressBar` 字段允许保留，因此 2.0.0 与 1.2.1 之间
回滚不要求修改配置数据。
