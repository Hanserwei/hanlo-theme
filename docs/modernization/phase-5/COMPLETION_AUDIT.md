# 阶段 5 完成审计

> 本文记录 2026-09-02 首次收尾的历史事实。阶段 6 已继续完成语义 Cascade Layer 迁移、
> `!important` 清零与 CSS AST 预算；当前状态见 [`../phase-6/COMPLETION_AUDIT.md`](../phase-6/COMPLETION_AUDIT.md)。

## 1. 审计结论

阶段 5 已完成。CSS 已从 `public/` 中不可维护的单体文件迁入 Vite 源码链，建立 Design Tokens、
Cascade Layers、条件入口、Tailwind 前缀 utility、Stylelint 和架构门禁；静态内联样式全部移除；
桌面/移动与浅色/深色四象限视觉、合成浏览器、真实 Halo 2.26、确定性构建和远端 CI 均已通过。

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-09-02 |
| 实现提交 | [`f3e2f0d7`](https://github.com/Hanserwei/hanlo-theme/commit/f3e2f0d7b8f2610a1a62b2984dbb735b6ab749eb) |
| 实现 CI | [CI 33635471058](https://github.com/Hanserwei/hanlo-theme/actions/runs/33635471058)，通过全部门禁并上传主题包 |
| 收尾版本 | `1.2.1`；唯一版本来源仍为 `theme.yaml:spec.version` |
| Halo 兼容要求 | `>= 2.26.0`，未提高 |
| CSS 工具链 | Vite Plus + Tailwind CSS 4.3.3 + `@tailwindcss/vite` 4.3.3 + Stylelint 17.14.1 |
| CSS 源码 | 68 个模块、23,788 行；最大单文件 1,259 行，门禁上限 1,300 行 |
| 模板样式 | 0 个静态 `style` 属性；1 个集中式配置变量块；35 个 `--hanlo-*` 动态属性边界 |
| 主 CSS | `hanlo-theme-1.2.1.css`，295,923 bytes，gzip 52,096 bytes |
| 条件 CSS | 19 个版本化入口，合计 53,339 bytes，按路由和配置加载 |
| 单元测试 | 16 个文件、36 项测试通过 |
| 合成浏览器测试 | 52 项通过、12 项真实 Halo 用例按设计跳过；包含 4 张像素快照 |
| 真实 Halo 测试 | 12 项通过；3 类用例 × 4 个视口/模式 |
| 真实页面矩阵 | 13 个路由 × 4 个视口/模式，共 52 次直接加载通过 |
| 截图证据 | 9 个固定页面 × 4 个视口/模式，共 36 张 WebP，SHA-256 全部通过 |
| 构建输出 | 180 项，其中 94 个 HTML；两次构建树哈希同为 `2ef4943801f85fb5be556f5d64d28a6e758df39415c77520257528711d7e09eb` |
| 安装包 | `dist/theme-hanlo-1.2.1.zip`，2,468,145 bytes、212 个条目，完整性通过 |

## 2. 路线图任务证据

| 任务 | 结果 | 证据 |
| --- | --- | --- |
| 提取 Design Tokens | 通过 | `tokens.css` 统一颜色、间距、圆角、阴影、字体、时长和缓动；Tailwind theme 映射到同一语义来源 |
| 统一浅色/深色映射 | 通过 | `[data-theme="light"]` 与 `[data-theme="dark"]` 只赋语义 Token，旧 `--heo-*` 从 `--hanlo-*` 兼容映射 |
| 拆分主样式 | 通过 | 原 16,666 行主文件与 2,475 行覆盖文件拆为 68 个职责模块；最大文件 1,259 行 |
| 迁移模板内联样式 | 通过 | 176 个静态属性迁为 `hl:` utilities/语义类，30 个组件 `<style>` 块进入 CSS 模块；仅保留集中式动态变量块 |
| 清理无效和重复 CSS | 通过 | 删除重复 min 文件与废弃弹幕 CSS，移除空 `nth-child()`、错误 CSS 变量、空规则/关键帧；总 `!important` 470 → 460 |
| 组件命名约定 | 通过 | `hanlo-*` 组件/状态、`--hanlo-*` Token/动态值、`hl:` utilities 三类命名写入架构文档并由脚本检查 |
| Playwright 视觉回归 | 通过 | 四个浏览器项目的 Design System 像素快照；真实 Halo 36 张四象限页面证据 |
| 评估 Tailwind | 通过 | 采用 Tailwind v4 渐进模式：禁用 Preflight、强制 `hl:` 前缀、只用于静态 utility 和新组件，不全量重写历史选择器 |

## 3. CSS 架构与构建边界

- `src/css/index.css` 固定 `reset, tokens, base, layout, components, pages, utilities, overrides`
  层顺序。
- 迁移中的历史规则虽然已按职责拆文件，但暂时处于同一兼容层并保持原顺序，避免文件移动改变
  specificity/cascade。真实截图首次暴露顺序变化后已修复并加入文档约束。
- `css-entries.json` 是 19 个条件入口的唯一登记表；构建生成
  `assets/css/<entry>-<version>.css`，架构审计要求每个入口都有模板消费者且不能重复进入全局入口。
- `public/` 仅保留图标字体自带的 `iconfont.css`；第一方 CSS 必须位于 `src/css`。
- 主 CSS 从原三个全局文件 403,117 bytes 降至 295,923 bytes，减少 107,194 bytes（26.6%）。
- Halo 页面网络门禁验证首页、文章、相册只加载各自满足条件的 CSS；条件入口之间无全站泄漏。

详细规则与扩展流程见 [`CSS_ARCHITECTURE.md`](CSS_ARCHITECTURE.md)。

## 4. 真实 Halo 与视觉证据

- Halo `2.26.0-SNAPSHOT` 上，连续 PJAX、浏览器前进/后退在四个视口/模式项目中通过。
- 首页、文章、普通页、分类、标签、留言、最近评论、关于和相册的桌面/移动、浅色/深色截图均已
  人工查看，未发现导航缺失、模式错误、明显布局崩坏或大面积空白。
- 13 路由直接加载时，页面异常、Console error、失败主题请求和本地 HTTP 错误均为 0。
- 第一次把全部模块合并到全局入口时，截图发现历史 Cascade Layer 顺序改变与条件样式泄漏；修复为
  同层保序兼容模块和独立条件入口后，完整矩阵重新通过。
- 本地 Halo Theme 资源仍登记旧版本，验收使用未提交的逐字节兼容别名；细节与哈希见
  [`evidence/live/README.md`](evidence/live/README.md)。发布 ZIP 不包含别名。

## 5. 质量门禁

- [x] `pnpm install --frozen-lockfile`
- [x] `pnpm check`：76 个文件格式检查，65 个文件 Lint/类型检查；CSS 另通过 68 模块架构审计
- [x] `pnpm test:unit`：16 个文件、36 项测试
- [x] 合成 Playwright：52 项通过，含四象限像素快照
- [x] 真实 Halo Playwright：12 项通过，含页面矩阵、导航和 CSS 网络门禁
- [x] 36 张 WebP 执行 `sha256sum --check`
- [x] 两次 `pnpm build-only` 的 180 项产物树哈希一致
- [x] `pnpm build` 与 `unzip -t dist/theme-hanlo-1.2.1.zip`
- [x] 实现提交远端 CI 33635471058 全部通过

## 6. 剩余技术债

- 历史兼容模块仍有深层 DOM 选择器和 460 个 `!important`。它们已具备文件归属、固定级联和视觉
  防护，但继续清理时必须配合组件 HTML 小步迁移，不应批量降权。
- Tailwind Preflight 保持禁用；若未来启用，必须单独验证文章正文、Halo 评论/搜索插件和全部页面矩阵。
- 阶段 6 继续处理性能预算、完整可访问性门禁、SEO、自动发布与预发布版本流程。
