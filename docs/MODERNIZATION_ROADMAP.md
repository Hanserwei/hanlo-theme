# Hanlo Theme 渐进式现代化重构路线图

## 文档目的

本文档用于指导本仓库后续的长期定制化开发。它记录当前技术基线、目标架构、迁移原则、实施阶段和验收标准，避免重构过程中反复推翻方向或在没有回归保障的情况下进行大规模重写。

这是一份持续维护的路线图，而不是一次性任务清单。每完成一个阶段，应同步更新本文档中的状态、决策和遗留问题。

## 总体结论

本主题适合采用渐进式现代化，不适合直接重写为 React 或 Vue 单页应用。

Halo 在运行时通过 Thymeleaf 渲染页面，并提供主题配置、Finder API、插件检测和 SEO 所需的数据。目标架构应继续保留这层服务端渲染能力，把现代化工作的重点放在前端源码管理、模块边界、依赖治理、页面生命周期、测试和发布流程上。

推荐方向：

> 保留 Halo + Thymeleaf 服务端渲染，引入 Halo 官方 Vite 主题工具链，使用 TypeScript、ES Modules、pnpm、按功能加载和自动化测试，逐步替换 jQuery、Vue 2、全局脚本以及手工维护的第三方库。

在阶段 0–5 已完成工程化、统一生命周期、业务模块化和样式治理后，阶段 6 将进一步移除
PJAX，恢复浏览器原生文档导航，并以 Cross-document View Transitions 作为渐进增强。主题不引入
新的 AJAX 路由或 DOM 替换库；不支持过渡 API 的浏览器继续使用完整、可访问的普通页面跳转。

## 重构原则

1. **保持 Halo 兼容性**：不得为了前端框架迁移而破坏 Finder API、主题设置、插件集成和服务端渲染。
2. **先建立基线，再修改行为**：视觉、交互和性能优化必须建立在可复现构建和回归验证之上。
3. **小步提交**：一个提交只解决一个明确问题，确保容易审阅、验证和回滚。
4. **源码与产物分离**：现代化后以 `src/` 为源码，`templates/` 为 Halo 可读取的构建产物。
5. **功能按需加载**：评论、音乐、视频、图库和代码高亮等能力不应在所有页面无条件加载。
6. **先裁剪再迁移**：明确不再需要的广告、赞助、统计和小组件应直接删除，不为废弃功能支付迁移成本。
7. **兼容迁移优先于全量重写**：先为旧代码建立模块边界和生命周期，再逐个替换内部实现。
8. **每个阶段都可发布**：任何阶段结束时，`master` 都应保持可构建、可安装、可运行。

## 技术基线

### 阶段 0 裁剪后的初始基线

以下数据是阶段 0 收尾时的历史快照；裁剪前数据保留在阶段 0 基线文档中：

| 领域 | 阶段 0 收尾状态 |
| --- | --- |
| 运行平台 | Halo `>= 2.26.0` |
| 服务端模板 | Thymeleaf，深度使用 Halo Finder API 和主题配置 |
| HTML | 98 个页面、片段和组件模板 |
| JavaScript | 39 个文件；业务脚本以原生 JS、jQuery 和全局对象为主 |
| CSS | 21 个文件；主样式文件约 1.75 万行 |
| 主题配置 | `settings.yaml` 约 2850 行，包含 21 个设置分组 |
| 静态资源 | `templates/` 约 4.9 MiB，其中第三方库约 1.3 MiB |
| 页面导航 | PJAX，依靠手动销毁和重新初始化脚本 |
| 高亮方案 | Shiki 4.4.3，通过远程 ESM CDN 在浏览器运行时加载 |
| 前端构建 | 尚无正式构建、类型检查、Lint 和 lockfile |
| 发布流程 | GitHub Actions 手动复制文件并压缩，仍使用 Node.js 16 和旧版 Actions |
| 自动化测试 | 暂无单元测试、模板验证和浏览器端回归测试 |

### 阶段 6 收尾后的当前状态

| 领域 | 当前状态 |
| --- | --- |
| 主题版本 | `2.0.0`；唯一版本来源为 `theme.yaml:spec.version` |
| 运行平台 | Halo `>= 2.26.0`，本地验证环境为容器化 Halo `2.26` |
| 模板源码 | `src/` 中运行时 Thymeleaf 模板和构建入口；`templates/` 继续由构建生成 |
| 第一方脚本 | TypeScript ESM 入口生成版本化的 `hanlo-runtime-<version>.js` 与按功能拆分的动态分块，入口与分块共享同一模块 URL |
| 第三方脚本 | 保留依赖均由 pnpm 精确锁定；仓库不再签入 `public/assets/libs/` vendor JavaScript |
| 页面生命周期 | 浏览器原生 Document Navigation + `DOMContentLoaded` / `pagehide` / `pageshow` / BFCache；控制器每文档只挂载一次 |
| CSS 架构 | 70 个 `src/css` 模块；真实语义 Cascade Layers、0 个 `!important`、AST 质量预算和 19 个按需入口 |
| 前端构建 | pnpm、严格 TypeScript、Vite Plus、Halo Vite 插件、冻结 lockfile 和主题打包 CLI |
| 自动化测试 | Vitest、Stylelint/PostCSS/parse5 门禁、Chrome/Firefox/WebKit/reduced-motion/no-JS、真实 Halo、性能与视觉测试 |
| 阶段 6 收尾 | 开发实现与自动化验收完成，详见 `docs/modernization/phase-6/`；真实 Safari 与 Console ZIP 安装保留为公开 Release 外部门禁 |

阶段 1 的模板保真桥仍有意保留：现有 Thymeleaf 片段和首屏同步主题引导尚不能无差异地交给
Vite HTML 转换。原生导航运行时已进入本地 ESM；移除该桥仍需单独迁移模板构建
语法并重新执行完整页面矩阵，不属于阶段 0–3 的未完成验收项。

### 阶段 4 治理后的主要运行时依赖

- Halo 2.x 与 Thymeleaf
- Shiki、Swiper、DPlayer / HLS.js、Tocbot、Typed.js、QRCode 和 FastAverageColor，按功能动态导入
- 原生 TypeScript 图库/灯箱、懒加载、Snackbar、瀑布流、保守文档预取、3D 分类和友链 Canvas

精确版本、许可证、用途和替换成本见
[`docs/modernization/phase-4/DEPENDENCIES.md`](modernization/phase-4/DEPENDENCIES.md)。

### 阶段 0 识别的主要技术债

其中“构建不可复现”已由阶段 1 解决，“全局脚本耦合”已由阶段 3 解决，“PJAX 生命周期脆弱”
已由阶段 2 解决。第三方资源治理和 CSS 架构仍分别由阶段 4、5 继续处理。

#### 构建不可复现

- `package.json` 没有声明实际前端依赖，也没有 lockfile。
- 第三方库以复制后的 JS/CSS 文件存放在仓库中，来源和版本难以追踪。
- `theme.yaml` 与 `package.json` 的版本号不一致。
- 发布工作流存在重复打包逻辑。

#### 全局脚本耦合

- 大量功能通过 `window`、`var` 和全局对象通信。
- 页面功能集中在少数大型脚本中，缺少明确模块边界。
- 多个模板包含内联脚本和样式，难以进行静态检查和复用。
- 新功能必须了解并适配整套全局初始化顺序。

#### PJAX 生命周期脆弱

- 页面进入、离开、组件销毁和重新挂载没有统一协议。
- 部分事件监听器和 `MutationObserver` 可能重复注册。
- 目录、代码高亮和图片组件各自处理 PJAX，行为不一致。

#### 资源加载过重

- 多个仅在特定页面使用的库被全站加载。
- Vue 2、jQuery 和部分第三方库存在重复副本或只服务于单个功能。
- Shiki 在客户端加载完整语言和主题集合，依赖外部 CDN 可用性。
- 大型图片和未按需加载的工具资源增加了安装包与页面负担。

#### 样式维护困难

- 主 CSS 文件体积大，布局、组件、页面和覆盖样式混杂。
- HTML 结构与选择器高度耦合。
- 页面模板中仍有较多内联样式。
- 当前缺少视觉回归基线，不适合立即进行全量 CSS 重写。

## 目标技术栈

| 领域 | 目标方案 |
| --- | --- |
| 运行时 | Halo 2.x + Thymeleaf 服务端渲染 |
| 构建工具 | Vite Plus，跟随 Halo 官方主题脚手架 |
| Halo 集成 | `@halo-dev/vite-plugin-halo-theme` |
| 主题打包 | `@halo-dev/theme-package-cli` |
| 包管理 | pnpm + `pnpm-lock.yaml` |
| 开发语言 | TypeScript，开启严格类型检查 |
| 模块系统 | 原生 ES Modules |
| 页面导航 | 浏览器原生多页文档导航，不使用客户端 Router 或 AJAX DOM 替换 |
| 导航动效 | Cross-document View Transitions；不支持时自动降级为普通导航 |
| 导航预取 | 保守的 Speculation Rules `prefetch`，并提供非阻断回退；首版不启用 `prerender` |
| UI 交互 | 原生 TypeScript 组件或控制器为主 |
| 局部复杂组件 | 只有在确有收益时使用 Lit 或 Alpine.js |
| 样式体系 | 原生 CSS、CSS Variables、Cascade Layers；Tailwind v4 前缀 utility，不启用 Preflight |
| 代码高亮 | 本地安装 Shiki 核心包，仅打包实际使用的语言和主题 |
| 单元测试 | Vitest |
| 浏览器测试 | Playwright |
| 代码质量 | Vite Plus Check/Format、TypeScript 和 CSS 检查 |
| CI/CD | Halo 官方 reusable theme workflow |

### 目标目录结构

```text
.
├── src/
│   ├── index.html
│   ├── post.html
│   ├── page.html
│   ├── partials/
│   ├── macro/
│   ├── js/
│   │   ├── entries/
│   │   │   ├── main.ts
│   │   │   ├── post.ts
│   │   │   └── comments.ts
│   │   ├── core/
│   │   │   ├── config.ts
│   │   │   ├── lifecycle.ts
│   │   │   └── events.ts
│   │   └── features/
│   │       ├── theme-mode/
│   │       ├── shiki/
│   │       ├── comments/
│   │       ├── music/
│   │       └── gallery/
│   └── css/
│       ├── tokens.css
│       ├── base.css
│       ├── layouts/
│       ├── components/
│       └── pages/
├── public/
│   └── assets/
├── templates/              # Vite 生成的 Halo 运行时产物
├── tests/
│   ├── unit/
│   └── e2e/
├── theme.yaml
├── settings.yaml
├── vite.config.ts
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

## 明确不采用的方向

### 不改造成全站 React 或 Vue SPA

全站 SPA 会迫使项目重新实现 Halo 已提供的服务端数据、路由、分页、SEO、主题设置和插件兼容能力，成本与收益不匹配。需要复杂交互时，可以在局部组件中引入轻量方案，但不改变页面的服务端渲染模型。

### 不在第一阶段全量迁移 Tailwind CSS

现有 CSS 和模板结构耦合很深。立即转换会同时改变构建、结构和视觉，难以判断回归原因。先完成 CSS 分层、设计变量和死代码清理，再决定是否只在新组件中引入 Tailwind。

### 不在第一阶段直接删除或替换 PJAX

当前音乐、滚动状态、评论和组件初始化都依赖 PJAX。应先建立统一生命周期，再评估继续使用、迁移到其他导航方案或恢复普通页面跳转。

阶段 2–5 已完成上述前置条件。阶段 6 的正式决策是恢复原生多页文档导航，并使用
Cross-document View Transitions 提供渐进式动效；不以 Swup、Turbo、Barba 或自研 Router
替换 PJAX，因为这些方案仍需维护 fetch、DOM 替换、`<head>` 同步和第三方脚本生命周期。

## 分阶段实施计划

阶段状态说明：

- `未开始`：尚未进入实施
- `进行中`：已有对应分支或 Pull Request
- `已完成`：全部验收条件通过并合并到 `master`
- `暂停`：等待外部条件或架构决策

### 阶段 0：功能盘点与回归基线

**状态：已完成，并在阶段 6 二次收尾**

执行入口与迭代记录见 [`docs/modernization/phase-0/README.md`](modernization/phase-0/README.md)。

目标是在大规模改动前明确真正需要保留的功能，并建立可比较的行为与视觉基线。

任务：

- [x] 建立功能清单，标记“保留、重写、可选、删除”。
- [x] 删除确认不再需要的广告、赞助、群聊和推广功能及其静态资源。
- [x] 决定是否保留微信组件、开往、51 统计、音乐、3D 分类和右键菜单。
- [x] 确定继续支持的评论系统，避免同时维护过多实现。
- [x] 确定必须兼容的 Halo 最低版本和浏览器范围。
- [x] 为首页、文章页、独立页面、分类、标签、评论和移动端建立截图基线。
- [x] 记录浅色、深色、无插件和可选插件启用时的行为。
- [x] 记录当前安装包大小和关键页面资源加载情况。

验收标准：

- 功能清单有明确负责人或决策结果。
- 至少覆盖桌面端与移动端的核心页面基准截图。
- 删除功能后，主题仍可在最低支持的 Halo 版本安装和启用。
- 不再为已废弃功能保留设置项、模板、脚本、样式和资源。

### 阶段 1：建立现代构建基础

**状态：已完成**

目标是在不改变页面外观和业务行为的前提下，让项目拥有可复现的开发、检查、构建和打包流程。

任务：

- [x] 使用 pnpm 管理依赖并提交 lockfile。
- [x] 引入 TypeScript、Vite Plus 和 Halo 官方 Vite 主题插件。
- [x] 引入 `@halo-dev/theme-package-cli`。
- [x] 建立 `src/` 源码目录和 `templates/` 构建产物约定。
- [x] 首次迁移以原样复制和构建通过为主，不主动重写业务代码。
- [x] 增加 `dev`、`check`、`build-only` 和 `build` 脚本。
- [x] 统一项目版本号来源，消除 `theme.yaml` 与 `package.json` 的差异。
- [x] 更新 GitHub Actions，使用受支持的 Node.js、pnpm 和 Halo 官方发布流程。
- [x] 评估并移除没有实际用途的 Maven/Spring Boot 配置。
- [x] 补充本地 Halo 开发环境说明，并关闭开发环境的 Thymeleaf 缓存。

验收标准：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

- 上述命令在本地和 CI 中通过。
- 构建结果能够生成 Halo 可安装的主题 ZIP。
- ZIP 在最低支持 Halo 版本中可以安装、启用和切换设置。
- 核心页面与阶段 0 的截图基线没有非预期差异。
- 同一提交在不同环境中能生成结构一致的构建产物。

### 阶段 2：建立统一页面生命周期

**状态：已完成**

执行说明与本地验收记录见 [`docs/modernization/phase-2/README.md`](modernization/phase-2/README.md)
和 [`docs/modernization/phase-2/COMPLETION_AUDIT.md`](modernization/phase-2/COMPLETION_AUDIT.md)。
实现提交 [`ea0df66`](https://github.com/Hanserwei/hanlo-theme/commit/ea0df66ebad37a4c3156830800ab329560af4ab5)
已位于 `master`，远端 [CI 33424572166](https://github.com/Hanserwei/hanlo-theme/actions/runs/33424572166)
通过全部检查、测试、构建和打包门禁。

目标是先解决 PJAX 和组件初始化的公共问题，为后续逐模块迁移提供稳定边界。

建议接口：

```ts
export interface PageController {
  mount(root: ParentNode): void | Promise<void>;
  unmount(): void | Promise<void>;
}
```

任务：

- [x] 定义首次加载、页面离开、页面进入和销毁事件。
- [x] 建立组件注册表，统一执行 `mount` 与 `unmount`。
- [x] 使用 `AbortController` 或等价机制统一清理事件监听器。
- [x] 统一清理定时器、播放器、Observer 和第三方组件实例。
- [x] 把 Thymeleaf 输出的前端配置改为有类型、可校验的只读对象。
- [x] 保留兼容层，让尚未迁移的旧脚本仍可运行。
- [x] 增加连续 PJAX 导航和浏览器前进/后退的自动化测试。

验收标准：

- 同一页面连续进入和离开不会重复绑定事件。
- 页面销毁后不存在已知的定时器、Observer 或组件实例泄漏。
- 旧模块和新模块可以通过同一生命周期协同工作。
- PJAX 错误能安全回退到普通页面导航。

### 阶段 3：JavaScript 与 TypeScript 模块化

**状态：已完成**

执行入口与第一轮迁移记录见
[`docs/modernization/phase-3/README.md`](modernization/phase-3/README.md) 和
[`docs/modernization/phase-3/COMPLETION_AUDIT.md`](modernization/phase-3/COMPLETION_AUDIT.md)。
实现提交 [`0d5a2d11`](https://github.com/Hanserwei/hanlo-theme/commit/0d5a2d11dc524b81d650d2889999b4c38fd68437)
已位于 `master`，远端 [CI 33454750241](https://github.com/Hanserwei/hanlo-theme/actions/runs/33454750241)
通过全部检查、测试、构建和打包门禁。

目标是逐步清除业务脚本中的隐式全局状态，并按功能建立可测试模块。

建议迁移顺序：

1. 公共工具函数和类型定义。
2. 主题模式、本地存储和导航。
3. 页面滚动、侧栏、目录和返回顶部。
4. Shiki 代码高亮。
5. 评论系统适配器。
6. 图库、瞬间和相册。
7. 音乐、视频和播放器。
8. 右键菜单及其他附加组件。

每个模块的任务：

- [x] 将脚本迁移为 TypeScript 和 ES Module。
- [x] 声明输入配置与对外接口。
- [x] 移除不必要的 `window` 变量和旧式 `var`。
- [x] 实现幂等 `mount` 和完整 `unmount`。
- [x] 为纯函数和关键状态逻辑补充 Vitest 测试。
- [x] 保持现有模板结构和视觉效果，行为变化单独提交。
- [x] 删除对应旧脚本和兼容层代码。

验收标准：

- TypeScript 严格检查通过。
- 新模块不创建未经声明的全局变量。
- 单个模块可以独立挂载、卸载和测试。
- 迁移完成的功能不再依赖旧的全局初始化入口。

### 阶段 4：第三方依赖治理与按需加载

**状态：已完成**

执行说明、依赖登记与完成审计见 [`docs/modernization/phase-4/README.md`](modernization/phase-4/README.md)、
[`docs/modernization/phase-4/DEPENDENCIES.md`](modernization/phase-4/DEPENDENCIES.md) 和
[`docs/modernization/phase-4/COMPLETION_AUDIT.md`](modernization/phase-4/COMPLETION_AUDIT.md)。实现提交
[`93d4cdb8`](https://github.com/Hanserwei/hanlo-theme/commit/93d4cdb8874c78b88e0acf49da5b5efff6904667)
已位于 `master`，远端 [CI 33523065226](https://github.com/Hanserwei/hanlo-theme/actions/runs/33523065226)
通过全部检查、测试、构建、产物同步和 ZIP 门禁。

目标是让第三方依赖来源明确、版本可控，并减少首屏无效资源。

任务：

- [x] 将仍需维护的依赖纳入 pnpm 和 lockfile。
- [x] 删除重复的 Vue 2、jQuery 和其他 vendor 副本。
- [x] 重写图库后移除 jQuery 及旧 Fancybox 依赖。
- [x] 重写 3D 分类页后移除 Vue 2。
- [x] 评论保持 Halo 插件所有，视频、图库和其他重型功能使用动态导入；侧栏音乐卡无脚本运行时。
- [x] Shiki 改为本地构建，仅包含启用的主题和常用语言。
- [x] 为可配置外部 CDN 提供失败回退或明确错误提示。
- [x] 使用 Dependabot 管理版本更新。
- [x] 记录每个第三方库的用途、许可证和替换成本，并生成随包分发的第三方通知。

验收标准：

- 仓库中不存在无来源、无版本说明的业务依赖副本。
- 不启用对应功能时，不下载评论、音乐、视频等大型依赖。
- 核心页面不再强制依赖 jQuery 和 Vue 2。
- 外部 CDN 不可用时，核心页面内容仍可阅读和导航。

### 阶段 5：CSS 架构与视觉系统

**状态：已完成**

执行说明、架构约定和完成审计见 [`docs/modernization/phase-5/README.md`](modernization/phase-5/README.md)、
[`docs/modernization/phase-5/CSS_ARCHITECTURE.md`](modernization/phase-5/CSS_ARCHITECTURE.md) 和
[`docs/modernization/phase-5/COMPLETION_AUDIT.md`](modernization/phase-5/COMPLETION_AUDIT.md)。实现提交
[`f3e2f0d7`](https://github.com/Hanserwei/hanlo-theme/commit/f3e2f0d7b8f2610a1a62b2984dbb735b6ab749eb)
已位于 `master`，远端 [CI 33635471058](https://github.com/Hanserwei/hanlo-theme/actions/runs/33635471058)
通过源码检查、浏览器测试、构建、产物同步、ZIP 校验和 artifact 上传。

阶段 6 继续把所有主入口模块迁入真实语义 Cascade Layer，将生效 `!important` 从 446 降为 0，
清理重复 ID，并增加 PostCSS AST 质量预算和 parse5 模板语义门禁。二次收尾数据见
[`docs/modernization/phase-6/COMPLETION_AUDIT.md`](modernization/phase-6/COMPLETION_AUDIT.md)。

目标是在保持现有视觉风格的基础上降低样式耦合，为后续定制提供稳定设计语言。

建议层级：

```css
@layer reset, tokens, base, layout, components, pages, utilities, overrides;
```

任务：

- [x] 提取颜色、间距、圆角、阴影、字体和动画 Design Tokens。
- [x] 将浅色与深色主题统一映射到语义变量。
- [x] 按 reset、基础、布局、组件和页面拆分主样式。
- [x] 将模板内联样式迁移到对应模块。
- [x] 清理重复规则、废弃选择器和无效 `!important`。
- [x] 为组件建立命名约定，减少依赖 DOM 层级的选择器。
- [x] 增加 Playwright 视觉回归测试。
- [x] 在 CSS 稳定后，再评估是否只为新组件引入 Tailwind。

验收标准：

- 核心组件的样式有明确文件归属和变量来源。
- 浅色、深色、桌面端和移动端视觉回归通过。
- 主样式不再依赖一个不可维护的超大单文件。
- 删除样式时可以通过测试确认影响范围。

### 阶段 6：原生导航、测试、性能与发布治理

**状态：已完成（2.0.0 发布候选；公开发布前需 Safari 真机冒烟）**

实施说明、基线/性能数据、完成审计和真实 Halo 证据见
[`docs/modernization/phase-6/README.md`](modernization/phase-6/README.md)、
[`docs/modernization/phase-6/BASELINE_AND_PERFORMANCE.md`](modernization/phase-6/BASELINE_AND_PERFORMANCE.md)、
[`docs/modernization/phase-6/COMPLETION_AUDIT.md`](modernization/phase-6/COMPLETION_AUDIT.md) 和
[`docs/modernization/phase-6/evidence/live/README.md`](modernization/phase-6/evidence/live/README.md)。
有管理员权限的 Halo Console 最终 ZIP 全新安装与 1.2.1 升级已在两个隔离 Halo 2.26 实例通过；
真实 Safari 18.2+ 仍是公开 Release 前外部门禁。

目标是删除 PJAX 及其兼容层，将主题切换到浏览器原生多页文档导航，并使用 Cross-document
View Transitions 和保守预取改善体验；同时把测试、性能、可访问性和发布要求落实为固定门禁。
由于本阶段会删除 `window.pjax`、PJAX 事件和相关设置，建议作为主题 `2.0.0` 交付；
`theme.yaml:spec.requires` 继续保持 Halo `>= 2.26.0`。

#### 6.1 目标架构

```text
Halo 2.26+ + Thymeleaf SSR
          │
          ▼
语义化 <a href> / <button>
          │
          ▼
浏览器原生 Document Navigation
          │
          ├── 原生 History / Scroll / Focus / Error / Download
          ├── 完整目标文档的 <head>、HTML 属性和页面资源
          └── BFCache 前进与后退恢复
          │
          ▼
Cross-document View Transitions（渐进增强）
          │
          └── 不支持时自动退化为普通文档导航
          │
          ▼
保守的 Speculation Rules / link prefetch（可选性能增强）
```

架构不变量：

- [x] 所有用户可见的站内导航都有真实 URL，并在禁用 JavaScript 时可用。
- [x] 站内页面切换产生 `document` 请求，不产生 PJAX XHR 或自定义 DOM 替换。
- [x] 不再手动同步 `<head>`、页面级 CSS、Open Graph 标签或重放 `<script>`。
- [x] `<halo:footer />`、`<halo:comment>` 和插件注入资源在每个文档中只初始化一次。
- [x] `PageControllerRegistry` 与 `PageResourceScope` 继续作为文档内组件边界。
- [x] View Transitions 和预取均为渐进增强，失败或不支持时不影响导航。
- [x] 只修改 `src/`、配置和测试源码；`templates/` 始终由现有构建生成。
- [x] 最终运行时代码、类型、模板、依赖图和第三方通知中不存在 PJAX。

#### 6.2 范围与非目标

本阶段包含：

- 将模板内导航改为语义化链接和按钮。
- 删除 `pjax@0.2.8`、`window.pjax`、PJAX 事件、标记和资源同步逻辑。
- 将页面生命周期改为 `DOMContentLoaded`、`pageshow`、`pagehide` 和 BFCache 语义。
- 添加根页面跨文档淡入淡出以及减少动态效果降级。
- 将全屏加载动画限制为冷启动，删除 PJAX 模拟进度条。
- 添加保守文档预取、跨浏览器测试、真实性能预算和发布验收。

本阶段不包含：

- 不改造成 React、Vue 或其他 SPA。
- 不引入 Swup、Turbo、Barba、htmx boost 或自研客户端 Router。
- 首个版本不启用 `prerender`，不把预取作为导航正确性的前提。
- 首个版本不实现文章卡片、封面或标题的 shared-element transition。
- 不恢复全局背景视频或宇宙 Canvas 的跨文档播放进度；页面切换后允许重新开始。
- 不顺带重构页面视觉、Finder API、主题设置结构或 Halo 页面布局契约。
- 不改写阶段 0–5 的历史 PJAX 验收证据。

#### 6.3 当前迁移面

阶段开始时以静态扫描重新确认以下基线：

- 模板中约 11 处 `pjax.loadUrl()` 内联导航。
- TypeScript 业务模块中 4 处 `window.pjax.loadUrl()` 程序化导航。
- 模板中约 36 个 `data-pjax-state` 标记。
- `src/js/core/navigation.ts` 中的 PJAX 实例、选择器、页面 CSS 同步、module script
  重放、模拟进度和统计回调。
- `src/js/core/runtime.ts` 中的 `pjax:send`、`pjax:complete`、`pjax:error` 适配和
  `loadUrl()` monkey patch。
- `src/js/core/global.d.ts`、`src/js/core/types.ts`、测试夹具和 Playwright 用例中的
  PJAX 类型及事件契约。
- 评论首次请求和 KaTeX 等模板中的 PJAX workaround 注释或加载逻辑。

#### 6.4 实施批次

| 批次 | 目标 | 主要结果 | 依赖 |
| --- | --- | --- | --- |
| N0 | 决策与基线 | 固化 ADR、网络/视觉/功能基线和回滚制品 | 无 |
| N1 | 导航语义化 | 业务模板和功能模块不再直接调用 PJAX | N0 |
| N2 | 原生导航切换 | 删除 PJAX 依赖和适配层，启用文档生命周期 | N1 |
| N3 | 过渡与加载体验 | 根级跨文档过渡、减少动态效果、冷启动加载动画 | N2 |
| N4 | 预取与性能 | 保守 prefetch、数据节省降级和性能预算 | N3 |
| N5 | 发布治理 | 跨浏览器/真实 Halo/ZIP 安装升级验收 | N4 |

N2 和 N3 必须在同一个发布版本中交付，避免长期保留只有整页跳转、但尚未完成视觉衔接的中间状态。

##### N0：决策、基线和回滚点

- [x] 新增 ADR-008，记录候选方案、最终选择、浏览器降级和已接受的状态重建行为。
- [x] 记录开始实施时的 `master` 提交、主题版本、Halo 版本和已启用插件版本。
- [x] 保存上一正式版主题 ZIP、SHA-256、主题配置导出和 13 条真实路由证据。
- [x] 重新采集首页、文章和留言板的冷加载、暖缓存及当前 PJAX 导航数据。
- [x] 记录 title、canonical、Open Graph、页面级 CSS、脚本和统计请求基线。
- [x] 确认用户可配置的自定义代码是否引用 `window.pjax`，并在版本说明中标记破坏性变化。

##### N1：导航语义化与业务解耦

- [x] 将真正导航的卡片、评论、相册、文章和返回入口改为带真实 `href` 的 `<a>`。
- [x] 卡片全区域点击使用合法的 stretched-link 或等价语义结构，禁止嵌套链接。
- [x] 将 `href="javascript:;"`、无 `href` 的动作链接和页内控件改为 `<button type="button">`。
- [x] 删除模板导航相关的内联 `onclick`，保留 Ctrl/Cmd 点击、中键、新窗口和复制链接行为。
- [x] 动态生成的推荐文章只设置 `href`，不拦截链接点击。
- [x] 为随机文章、延迟返回首页和分页输入等真正需要程序化跳转的场景提供最小
  `navigateTo()` 接口；该接口不得负责 fetch、DOM 替换、History 或动画。
- [x] N1 中可由 `navigateTo()` 暂时委托现有 PJAX，以便此批次保持导航行为不变；N2 只在
  这一处切换为 `location.assign()` / `location.replace()`。
- [x] 保留仍用于旧内核排除行为的 `data-pjax-state`，统一到 N2 删除，避免半迁移状态。

N1 验收：模板和 `src/js/features/` 中不再直接出现 `pjax.loadUrl()`；禁用 JavaScript
后所有真实导航可用；现有 PJAX、视觉和真实 Halo 页面矩阵继续通过。

##### N2：删除 PJAX 并切换文档生命周期

- [x] 从 `package.json` 和 `pnpm-lock.yaml` 删除 `pjax`，重新生成第三方许可通知。
- [x] 删除 `installPjaxNavigation()`、`PJAX_SELECTORS`、XHR 事件监听和 `loadUrl()` patch。
- [x] 删除手动页面 CSS 同步、module script 重建、模拟进度和 PJAX analytics pageview。
- [x] `main.ts` 不再安装客户端导航器；普通 `<a>` 完全由浏览器处理。
- [x] 删除 `HanloPjax`、`window.pjax`、`NavigationSource = "pjax"` 和相关接口。
- [x] 删除所有 `data-pjax-state`、`data-pjax` 和只为选择器存在的 `.js-pjax` 包装。
- [x] 保留 `data-hanlo-page-style` 作为条件资源审计标记，但不再由 JavaScript 管理其生命周期。
- [x] 删除评论模板中过时的 PJAX 已知问题说明。
- [x] 在真实 Halo 中验证 KaTeX 脚本后，只移除 PJAX 专属 workaround；仍被插件直接加载需要的
  资源不得仅因注释过时而删除。
- [x] 由构建更新 `templates/` 和版本化资产，禁止手工同步生成文件。

文档生命周期契约：

| 场景 | 控制器和事件行为 |
| --- | --- |
| 冷启动或新的文档导航 | 校验当前文档配置并挂载控制器一次，发出初始就绪事件 |
| `pagehide.persisted == false` | 发出离开事件并尽力清理；浏览器随后销毁整个 JavaScript Realm |
| `pagehide.persisted == true` | 不卸载控制器，允许页面进入 BFCache |
| `pageshow.persisted == true` | 不重复挂载，只发出历史恢复信号并刷新必要的瞬时状态 |
| 同文档 hash 跳转 | 使用浏览器原生行为，不重新挂载页面控制器 |
| 控制器挂载失败 | 发出 `hanlo:page:error`，但不得劫持或回滚浏览器导航 |

`HanloLifecycle.config`、`activeControllers`、`register()` 和 `whenIdle()` 继续保留，供功能模块和
测试使用。禁止增加 `beforeunload` 监听，以免破坏 BFCache。

N2 验收：内部导航请求类型为 `document`，不再发送 `X-PJAX` 或 `X-PJAX-Selectors`；
目标页面的 title、canonical、Open Graph、HTML 属性、条件 CSS 和插件脚本均来自完整目标文档，
且只生效一次。

##### N3：Cross-document View Transitions 与加载体验

- [x] 在全局 CSS 中以顶层规则启用同源跨文档过渡：

  ```css
  @view-transition {
    navigation: auto;
  }
  ```

- [x] 首版只提供根页面 180–220ms 淡入淡出，不添加路由方向和 shared-element 动画。
- [x] 使用 `prefers-reduced-motion: reduce` 禁止非必要动画。
- [x] View Transitions 不支持、跨域、重定向链不满足条件或浏览器拒绝过渡时，保持普通导航。
- [x] 保留 `<head>` 中的同步主题模式引导，确保目标文档首帧不会从错误的深浅色开始。
- [x] 将全屏 loading box 调整为冷启动或外部进入时显示；同源内部导航不应在目标快照中显示它。
- [x] 删除 `#hanlo-navigation-progress`、`ThemeConfig.loadProgressBar`、前端配置输出以及
  `settings.yaml` 的“加载进度条”字段。
- [x] 保留 `loadingBoxEnable`，但将文案明确为“首次进入加载动画”。旧 ConfigMap 中多余的
  `loadProgressBar` 值允许保留并被新版本忽略。
- [x] 明确验收全局背景视频和宇宙 Canvas 在新文档中重新开始；首版不保存播放进度。

##### N4：渐进式文档预取

- [x] 支持 Speculation Rules 时只启用 `prefetch`，首版使用 `conservative`。
- [x] 只有经数据证明高概率访问的文章详情、上一篇/下一篇等链接才允许升级为 `moderate`。
- [x] 首个版本不启用 `prerender`，避免统计、LocalStorage 和插件脚本在用户访问前执行。
- [x] 不支持 Speculation Rules 或 CSP 不允许时，使用轻量 `<link rel="prefetch">` 或普通导航回退。
- [x] 遵守 `Save-Data` 和慢速网络，不把预取结果作为页面正确性的依赖。
- [x] 只预取同源、安全 GET 文档；排除新窗口、下载、`external` / `nofollow`、hash、登录、退出、
  用户中心、管理入口、API、Feed、带副作用 URL 和显式 `data-no-prefetch`。
- [x] 通过 `Sec-Purpose`、Network 和统计请求确认预取不会增加浏览量或产生业务副作用。

##### N5：测试、性能与发布治理

自动化测试：

- [x] 使用真实 `<a>` 点击、`page.waitForURL()` 和新文档 `HanloLifecycle.whenIdle()` 替换
  `window.pjax.loadUrl()` 测试辅助函数。
- [x] 跨文档累计事件存入 `sessionStorage` 或由 Playwright 侧采集，不依赖旧页面的 `window`。
- [x] 断言站内导航请求 `resourceType()` 为 `document`，并且没有 PJAX 请求头。
- [x] 覆盖直接加载、连续 10 次链接跳转、后退、前进、BFCache、滚动恢复和 hash 定位。
- [x] 覆盖 Ctrl/Cmd 点击、中键、新窗口、下载、外链、查询参数、重定向、404 和 500。
- [x] 覆盖页面级 CSS 自动切换、module script 单次执行、统计单次上报和未完成请求离页。
- [x] 使用 Vitest 覆盖预取资格、程序化导航和文档生命周期状态转换。
- [x] 保留并继续执行模板、YAML、CSS 架构、构建产物和 ZIP 完整性校验。

浏览器矩阵：

| 浏览器 | 最低验收 |
| --- | --- |
| Chromium | 原生导航、View Transition、BFCache、桌面/移动、浅色/深色 |
| WebKit | 原生导航、View Transition、主题模式和插件组件 |
| Firefox | 无 View Transition 时的普通导航、History、滚动、键盘和插件功能 |
| Safari 18.2+ 真机 | 发布前执行一次跨文档过渡和主题模式冒烟测试 |
| `reducedMotion: "reduce"` | 动画禁用，全部导航和焦点行为保持正常 |

真实 Halo 页面矩阵继续覆盖首页、文章、独立页面、分类、标签、留言板、最近评论、关于、相册、
瞬间、图库、追番和装备，并验证评论、搜索、Shiki、Tocbot、KaTeX、DPlayer / HLS、Swiper 以及
插件未安装、已停用、版本不满足和正常启用状态。Console error、页面异常、失败主题请求、重复
统计请求和本地 4xx/5xx 均必须为 0（主动访问的错误页除外）。

建议性能预算：

- [x] 不增加新的导航运行时第三方依赖，主运行时压缩体积应下降。
- [x] 暖缓存导航只传输目标 HTML 和目标页面新增资源，不重复传输主 CSS、运行时 ESM 和字体。
- [x] 冷加载 LCP 相对阶段开始基线退化不超过 5%，CLS 不高于 0.1。
- [x] 同环境暖缓存点击到目标文档可交互的中位数，相对现有 PJAX 基线最多增加 250ms；超过时，
  N4 预取优化转为发布阻塞项。
- [x] 每个真实页面访问只产生一次统计 pageview。
- [x] 可进入 BFCache 的页面通过后退/前进恢复时不重新下载文档。

#### 6.5 Pull Request 与发布边界

建议拆为三个 Pull Request：

1. `refactor: make theme navigation semantic`
   - 只处理 N1；PJAX 暂时保留，当前导航和视觉行为不变。
2. `refactor: replace pjax with native document navigation`
   - 原子完成 N2、N3、生命周期测试和根级 View Transition。
3. `perf: add progressive document prefetching`
   - 完成 N4、跨浏览器矩阵、性能证据、发布文档和 N5 收尾。

不增加长期存在的“PJAX / Native”主题开关。双内核会让生命周期、插件组合和回归矩阵翻倍；
灰度发布应通过独立 Halo 测试实例、预发布 ZIP 和明确回滚点完成。

发布前执行：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:unit
pnpm test:e2e
pnpm build
```

真实 Halo 环境执行：

```bash
HALO_BASE_URL="https://测试站点地址" pnpm exec playwright test tests/e2e/halo-live.spec.ts
```

同时在干净 Halo 实例和已安装上一正式版主题的实例中验证全新安装、升级、重载配置、切换主题、
停用和重新启用。最低 Halo `2.26.x` 与计划支持的当前 Halo 版本都必须完成关键路径验证。

#### 6.6 回滚方案

- [x] 开始前保存上一正式版 ZIP、源码提交、主题配置导出和 SHA-256。
- [x] N1 可独立 revert，不影响导航内核。
- [x] N2 与 N3 形成一个可整体 revert 的提交组和预发布 ZIP。
- [x] 本阶段不迁移数据库或内容模型；失败时重新安装上一正式版 ZIP 即可恢复。
- [x] 已移除设置对应的旧 ConfigMap 字段允许保留，因此不会阻止版本回滚。
- [x] 评论或搜索插件无法初始化、目标 `<head>` 错误、脚本重复执行、Firefox 普通导航失效、
  主题资源出现异常 4xx/5xx 或性能超过预算且无法改善时，停止发布并回滚。

#### 6.7 阶段验收标准

- [x] `src/`、当前测试、`package.json`、lockfile 和第三方通知中无 PJAX；历史证据目录除外。
- [x] 所有真实导航使用浏览器文档请求，禁用 JavaScript 后核心链接仍可访问。
- [x] Chromium 与 WebKit 显示跨文档过渡；Firefox 和减少动态效果模式安全降级。
- [x] 前进、后退、BFCache、滚动、hash、下载、外链和错误页行为符合浏览器原生语义。
- [x] Halo 评论、搜索及保留插件在完整页面矩阵中无重复实例、失败请求或控制台错误。
- [x] title、canonical、Open Graph、页面级 CSS 和脚本均来自当前文档并正确更新。
- [x] Pull Request 通过检查、单元测试、跨浏览器 E2E、真实 Halo、构建和 ZIP 门禁。
- [x] 性能和可访问性退化未超过预算，或存在经过评审的明确例外记录。
- [x] Release 自动生成可安装 ZIP，记录源码提交、Halo 版本、浏览器、插件、已知限制和 SHA-256。
- [x] 通过隔离 Halo 2.26 Console 完成上一正式版升级与全新安装，`master` 源码恢复到可发布状态。

## 推荐迭代方式

### 分支策略

- `master` 始终保持可发布。
- 每项改动使用短生命周期分支，例如 `chore/vite-foundation`、`refactor/page-lifecycle`。
- 一个分支只覆盖一个阶段中的一个可验收任务。
- 大型模块使用兼容层并分多次合并，避免长期分支与主线分叉。

### 提交建议

推荐使用清晰的提交类型：

```text
chore: establish Vite build pipeline
refactor: migrate theme mode to TypeScript
refactor: replace pjax with native document navigation
test: cover document navigation and bfcache
perf: lazy-load comment providers
style: split post component styles
docs: update modernization roadmap
```

### 每次 Pull Request 的完成定义

- [ ] 说明改动范围和不在本次处理的内容。
- [ ] 通过格式化、类型检查和构建。
- [ ] 为行为变化补充测试或手工验证记录。
- [ ] 检查桌面端、移动端、浅色和深色模式。
- [ ] 检查直接加载、原生文档导航、前进/后退和无过渡降级。
- [ ] 不引入新的未声明全局变量或无版本 vendor 文件。
- [ ] 更新相关文档、设置说明和迁移状态。
- [ ] 产物可以安装到受支持的 Halo 版本。

## 建议的首个重构提交

首个工程化提交建议命名为：

```text
chore: establish Vite and TypeScript build pipeline
```

范围严格限定为：

- 引入 `src/`、`vite.config.ts` 和 `tsconfig.json`。
- 使用 pnpm 管理开发依赖。
- 接入 Halo 官方 Vite 插件和主题打包工具。
- 添加可复现的开发、检查、构建和发布命令。
- 更新 CI 并统一版本号。
- 保持现有模板输出、页面结构、功能和视觉不变。
- 暂不重写业务代码，不删除 PJAX，不全量调整 CSS。

这个提交完成后，后续所有迁移都应建立在新的构建和质量检查基础上。

## 风险与控制措施

| 风险 | 控制措施 |
| --- | --- |
| 模板构建后 Thymeleaf 表达式被错误处理 | 为所有页面建立构建快照，并在真实 Halo 环境验证 |
| 原生导航切换后控制器重复挂载或 BFCache 状态错误 | 以 `pageshow` / `pagehide` 的 `persisted` 状态驱动生命周期，并增加连续导航与恢复测试 |
| Halo 插件脚本、评论或页面级资源在新导航下异常 | 使用完整文档加载，覆盖插件启停、`<head>`、`<halo:footer />` 和 `<halo:comment>` 的真实 Halo 测试 |
| View Transitions 浏览器覆盖不完整 | 仅作为渐进增强；Firefox、减少动态效果和 API 失败时保留普通文档导航 |
| 全屏加载动画出现在目标页面快照中 | 将 loading box 限制为冷启动，内部导航使用 View Transition 或浏览器原生反馈 |
| 预取触发统计或其他副作用 | 首版只启用保守 `prefetch`，排除敏感 URL，检查 `Sec-Purpose` 和统计请求，不启用 `prerender` |
| 用户自定义代码依赖 `window.pjax` | 作为破坏性变化写入版本说明，提供语义化链接和 `location.assign()` 迁移示例，并保留上一版 ZIP 回滚 |
| CSS 拆分造成大范围视觉回归 | 建立截图基线，按组件迁移，禁止首轮同时重构 HTML |
| 删除依赖后冷门功能失效 | 先建立功能清单，按配置组合验证，记录废弃决策 |
| 依赖升级引入破坏性变化 | 使用 lockfile，单独提交升级，保留回滚点 |
| 长期重构分支难以合并 | 小步提交，兼容层过渡，持续合并到可发布的 `master` |
| `templates/` 产物与源码不同步 | CI 强制重新构建并检查差异 |

## 决策记录

重大技术决策应在本节或单独的 ADR 文档中记录，至少包含背景、选项、结论和影响。

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| ADR-001 | 保留 Halo + Thymeleaf 服务端渲染，不改造成全站 SPA | 已接受 |
| ADR-002 | 采用 Halo 官方 Vite 主题工具链 | 已接受 |
| ADR-003 | 使用 TypeScript 和 ES Modules 逐步替换全局脚本 | 已接受 |
| ADR-004 | 第一阶段不全量迁移 Tailwind CSS | 已接受 |
| ADR-005 | 在建立统一生命周期前不直接替换 PJAX | 已接受 |
| ADR-006 | Tailwind v4 仅用于带 `hl:` 前缀的新 utility，禁用 Preflight，不全量重写历史 CSS | 已接受 |
| ADR-007 | 条件样式通过 `css-entries.json` 构建为版本化入口，模板按路由和配置加载 | 已接受 |
| ADR-008 | 删除 PJAX，采用原生多页文档导航，以 Cross-document View Transitions 和保守 prefetch 渐进增强 | 已接受 |

## 进度总览

| 阶段 | 状态 | 目标 |
| --- | --- | --- |
| 阶段 0 | 已完成 | 功能盘点、裁剪与回归基线 |
| 阶段 1 | 已完成 | Vite、TypeScript、pnpm、CI 和可复现构建 |
| 阶段 2 | 已完成 | 统一页面与 PJAX 生命周期；本地、CI 与合并门禁通过 |
| 阶段 3 | 已完成 | JavaScript/TypeScript 模块化；本地、CI 与合并门禁通过 |
| 阶段 4 | 已完成 | 第三方依赖治理与按需加载；本地、真实 Halo 与远端 CI 门禁通过 |
| 阶段 5 | 已完成 | CSS 架构与视觉系统；本地、四象限真实 Halo 与远端 CI 门禁通过 |
| 阶段 6 | 已完成 | 原生导航、跨文档过渡、预取、性能、可访问性和 Console 安装/升级完成；Safari 真机为公开 Release 外部门禁 |

### 阶段 0–5 收尾复核（2026-09-02）

| 阶段 | 复核结论 | 关键证据 |
| --- | --- | --- |
| 阶段 0 | 已完成，路线图任务已补齐勾选 | 36 张基线截图的 `SHA256SUMS` 全部通过；功能、决策、资源和完成审计文件齐备 |
| 阶段 1 | 已完成，模板保真桥仍是必要边界 | 实现 `e4a10bf` 与 CI 33414807718 通过；默认 Vite HTML 转换隔离试验会改变现有 Thymeleaf 输出和运行时入口 |
| 阶段 2 | 已完成 | 实现 `ea0df66` 已进入 `master`；CI 33424572166 通过全部质量门禁 |
| 阶段 3 | 已完成 | 实现 `0d5a2d11` 已进入 `master`；CI 33454750241 通过；18 张固定证据截图校验通过 |
| 阶段 4 | 已完成 | 实现 `93d4cdb8` 已进入 `master`；CI 33523065226 通过；依赖、许可、按需加载、真实 Halo 与 18 张截图证据齐备 |
| 阶段 5 | 已完成 | 实现 `f3e2f0d7` 已进入 `master`；CI 33635471058 通过；CSS 架构审计、4 张像素快照、真实 Halo 四象限与 36 张截图证据齐备 |

本次以主题 `1.0.1` 重新执行了冻结安装、`pnpm check`、29 项 Vitest 断言、6 项合成 Playwright
用例、构建与 ZIP 完整性检查。构建产物共 194 项，其中 98 个 HTML；安装包
`dist/theme-hanlo-1.0.1.zip` 为 2,354,169 bytes、254 个条目，并与提交中的 `templates/`
保持同步。

本地 Halo `2.26.0-SNAPSHOT` 重载后报告主题 `1.0.1`、`READY`。真实浏览器测试覆盖 13 个固定
路由的桌面浅色与移动深色直接加载，以及两种视口下各 12 次 PJAX/历史导航；页面异常、Console
error、失败主题请求和本地 HTTP 错误均为 0。

以下项目明确不影响阶段 0–5 的完成结论：

- Halo 2.26 可选的 `templates/layout.html` 页面布局契约仍为 `MISSING`，插件页面会使用 Halo
  fallback；这是后续插件集成工作，不在现有阶段验收条件内。
- 历史 CSS 的深层选择器和剩余 `!important` 已由模块、级联顺序和视觉门禁约束；继续逐组件降权是
  后续维护，不影响阶段 5 已定义的拆分和回归验收。
- 性能预算、自动发布和更完整的可访问性门禁属于阶段 6。

## 参考资料

- [Halo 主题开发文档](https://docs.halo.run/developer-guide/theme/prepare)
- [Halo Theme Vite Starter](https://github.com/halo-dev/theme-vite-starter)
- [Halo Vite Theme Plugin](https://github.com/halo-sigs/vite-plugin-halo-theme)
- [Halo Theme Package CLI](https://github.com/halo-dev/theme-package-cli)
- [Vite 文档](https://vite.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs/installation/using-vite)
- [Stylelint 文档](https://stylelint.io/)
- [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [MDN 跨文档 View Transitions 使用指南](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using#basic_mpa_view_transition)
- [MDN Speculation Rules API](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API)
- [Halo 主题与插件集成](https://docs.halo.run/developer-guide/theme/plugin-integration)
- [Halo 主题调试与测试](https://docs.halo.run/developer-guide/theme/testing)
- [Halo 主题发布验收清单](https://docs.halo.run/developer-guide/theme/release-checklist)

---

维护约定：每个阶段开始时将状态改为“进行中”；验收条件全部通过并合并到 `master` 后改为“已完成”，同时记录对应 Pull Request 或提交。
