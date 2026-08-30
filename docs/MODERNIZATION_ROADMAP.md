# Hanlo Theme 渐进式现代化重构路线图

## 文档目的

本文档用于指导本仓库后续的长期定制化开发。它记录当前技术基线、目标架构、迁移原则、实施阶段和验收标准，避免重构过程中反复推翻方向或在没有回归保障的情况下进行大规模重写。

这是一份持续维护的路线图，而不是一次性任务清单。每完成一个阶段，应同步更新本文档中的状态、决策和遗留问题。

## 总体结论

本主题适合采用渐进式现代化，不适合直接重写为 React 或 Vue 单页应用。

Halo 在运行时通过 Thymeleaf 渲染页面，并提供主题配置、Finder API、插件检测和 SEO 所需的数据。目标架构应继续保留这层服务端渲染能力，把现代化工作的重点放在前端源码管理、模块边界、依赖治理、页面生命周期、测试和发布流程上。

推荐方向：

> 保留 Halo + Thymeleaf 服务端渲染，引入 Halo 官方 Vite 主题工具链，使用 TypeScript、ES Modules、pnpm、按功能加载和自动化测试，逐步替换 jQuery、Vue 2、全局脚本以及手工维护的第三方库。

## 重构原则

1. **保持 Halo 兼容性**：不得为了前端框架迁移而破坏 Finder API、主题设置、插件集成和服务端渲染。
2. **先建立基线，再修改行为**：视觉、交互和性能优化必须建立在可复现构建和回归验证之上。
3. **小步提交**：一个提交只解决一个明确问题，确保容易审阅、验证和回滚。
4. **源码与产物分离**：现代化后以 `src/` 为源码，`templates/` 为 Halo 可读取的构建产物。
5. **功能按需加载**：评论、音乐、视频、图库和代码高亮等能力不应在所有页面无条件加载。
6. **先裁剪再迁移**：明确不再需要的广告、赞助、统计和小组件应直接删除，不为废弃功能支付迁移成本。
7. **兼容迁移优先于全量重写**：先为旧代码建立模块边界和生命周期，再逐个替换内部实现。
8. **每个阶段都可发布**：任何阶段结束时，`master` 都应保持可构建、可安装、可运行。

## 当前技术基线

以下数据用于描述开始重构时的规模，后续会随项目演进而变化：

| 领域 | 当前状态 |
| --- | --- |
| 运行平台 | Halo `>= 2.22.1` |
| 服务端模板 | Thymeleaf，深度使用 Halo Finder API 和主题配置 |
| HTML | 约 107 个页面、片段和组件模板 |
| JavaScript | 约 48 个文件；业务脚本以原生 JS、jQuery 和全局对象为主 |
| CSS | 约 25 个文件；主样式文件接近 1.9 万行 |
| 主题配置 | `settings.yaml` 超过 3200 行，包含 21 个设置分组和约 450 个表单项 |
| 静态资源 | `templates/` 约 7 MiB，其中第三方库约 2.3 MiB |
| 页面导航 | PJAX，依靠手动销毁和重新初始化脚本 |
| 高亮方案 | Shiki 4.4.3，通过远程 ESM CDN 在浏览器运行时加载 |
| 前端构建 | 尚无正式构建、类型检查、Lint 和 lockfile |
| 发布流程 | GitHub Actions 手动复制文件并压缩，仍使用 Node.js 16 和旧版 Actions |
| 自动化测试 | 暂无单元测试、模板验证和浏览器端回归测试 |

### 当前主要依赖

- Halo 2.x
- Thymeleaf
- jQuery
- PJAX
- Vue 2，仅在少量页面功能中使用
- Shiki
- Swiper
- Fancybox
- APlayer / Meting
- DPlayer / HLS.js
- Twikoo、Artalk、Waline
- Tocbot
- GSAP
- Vanilla LazyLoad
- Clipboard.js
- QRCode.js
- FastAverageColor
- Waterfall.js
- Node Snackbar

### 当前主要技术债

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
- 音乐、评论、目录、代码高亮和图片组件各自处理 PJAX，行为不一致。

#### 资源加载过重

- 多个仅在特定页面使用的库被全站加载。
- Vue 2、jQuery 和部分第三方库存在重复副本或只服务于单个功能。
- Shiki 在客户端加载完整语言和主题集合，依赖外部 CDN 可用性。
- 大型评论、播放器和图片资源增加了安装包与页面负担。

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
| UI 交互 | 原生 TypeScript 组件或控制器为主 |
| 局部复杂组件 | 只有在确有收益时使用 Lit 或 Alpine.js |
| 样式体系 | 原生 CSS、CSS Variables、Cascade Layers |
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

## 分阶段实施计划

阶段状态说明：

- `未开始`：尚未进入实施
- `进行中`：已有对应分支或 Pull Request
- `已完成`：全部验收条件通过并合并到 `master`
- `暂停`：等待外部条件或架构决策

### 阶段 0：功能盘点与回归基线

**状态：未开始**

目标是在大规模改动前明确真正需要保留的功能，并建立可比较的行为与视觉基线。

任务：

- [ ] 建立功能清单，标记“保留、重写、可选、删除”。
- [ ] 删除确认不再需要的广告、赞助、群聊和推广功能及其静态资源。
- [ ] 决定是否保留微信组件、开往、51 统计、音乐、3D 分类和右键菜单。
- [ ] 确定继续支持的评论系统，避免同时维护过多实现。
- [ ] 确定必须兼容的 Halo 最低版本和浏览器范围。
- [ ] 为首页、文章页、独立页面、分类、标签、评论和移动端建立截图基线。
- [ ] 记录浅色、深色、无插件和可选插件启用时的行为。
- [ ] 记录当前安装包大小和关键页面资源加载情况。

验收标准：

- 功能清单有明确负责人或决策结果。
- 至少覆盖桌面端与移动端的核心页面基准截图。
- 删除功能后，主题仍可在最低支持的 Halo 版本安装和启用。
- 不再为已废弃功能保留设置项、模板、脚本、样式和资源。

### 阶段 1：建立现代构建基础

**状态：未开始**

目标是在不改变页面外观和业务行为的前提下，让项目拥有可复现的开发、检查、构建和打包流程。

任务：

- [ ] 使用 pnpm 管理依赖并提交 lockfile。
- [ ] 引入 TypeScript、Vite Plus 和 Halo 官方 Vite 主题插件。
- [ ] 引入 `@halo-dev/theme-package-cli`。
- [ ] 建立 `src/` 源码目录和 `templates/` 构建产物约定。
- [ ] 首次迁移以原样复制和构建通过为主，不主动重写业务代码。
- [ ] 增加 `dev`、`check`、`build-only` 和 `build` 脚本。
- [ ] 统一项目版本号来源，消除 `theme.yaml` 与 `package.json` 的差异。
- [ ] 更新 GitHub Actions，使用受支持的 Node.js、pnpm 和 Halo 官方发布流程。
- [ ] 评估并移除没有实际用途的 Maven/Spring Boot 配置。
- [ ] 补充本地 Halo 开发环境说明，并关闭开发环境的 Thymeleaf 缓存。

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

**状态：未开始**

目标是先解决 PJAX 和组件初始化的公共问题，为后续逐模块迁移提供稳定边界。

建议接口：

```ts
export interface PageController {
  mount(root: ParentNode): void | Promise<void>;
  unmount(): void | Promise<void>;
}
```

任务：

- [ ] 定义首次加载、页面离开、页面进入和销毁事件。
- [ ] 建立组件注册表，统一执行 `mount` 与 `unmount`。
- [ ] 使用 `AbortController` 或等价机制统一清理事件监听器。
- [ ] 统一清理定时器、播放器、Observer 和第三方组件实例。
- [ ] 把 Thymeleaf 输出的前端配置改为有类型、可校验的只读对象。
- [ ] 保留兼容层，让尚未迁移的旧脚本仍可运行。
- [ ] 增加连续 PJAX 导航和浏览器前进/后退的自动化测试。

验收标准：

- 同一页面连续进入和离开不会重复绑定事件。
- 页面销毁后不存在已知的定时器、Observer 或组件实例泄漏。
- 旧模块和新模块可以通过同一生命周期协同工作。
- PJAX 错误能安全回退到普通页面导航。

### 阶段 3：JavaScript 与 TypeScript 模块化

**状态：未开始**

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

- [ ] 将脚本迁移为 TypeScript 和 ES Module。
- [ ] 声明输入配置与对外接口。
- [ ] 移除不必要的 `window` 变量和旧式 `var`。
- [ ] 实现幂等 `mount` 和完整 `unmount`。
- [ ] 为纯函数和关键状态逻辑补充 Vitest 测试。
- [ ] 保持现有模板结构和视觉效果，行为变化单独提交。
- [ ] 删除对应旧脚本和兼容层代码。

验收标准：

- TypeScript 严格检查通过。
- 新模块不创建未经声明的全局变量。
- 单个模块可以独立挂载、卸载和测试。
- 迁移完成的功能不再依赖旧的全局初始化入口。

### 阶段 4：第三方依赖治理与按需加载

**状态：未开始**

目标是让第三方依赖来源明确、版本可控，并减少首屏无效资源。

任务：

- [ ] 将仍需维护的依赖纳入 pnpm 和 lockfile。
- [ ] 删除重复的 Vue 2、jQuery 和其他 vendor 副本。
- [ ] 重写图库后移除 jQuery 及旧 Fancybox 依赖。
- [ ] 重写或移除 3D 分类页后移除 Vue 2。
- [ ] 评论、音乐、视频、图库等模块使用动态导入。
- [ ] Shiki 改为本地构建，仅包含启用的主题和常用语言。
- [ ] 为可配置外部 CDN 提供失败回退或明确错误提示。
- [ ] 使用 Dependabot、Renovate 或定期人工检查管理版本更新。
- [ ] 记录每个第三方库的用途、许可证和替换成本。

验收标准：

- 仓库中不存在无来源、无版本说明的业务依赖副本。
- 不启用对应功能时，不下载评论、音乐、视频等大型依赖。
- 核心页面不再强制依赖 jQuery 和 Vue 2。
- 外部 CDN 不可用时，核心页面内容仍可阅读和导航。

### 阶段 5：CSS 架构与视觉系统

**状态：未开始**

目标是在保持现有视觉风格的基础上降低样式耦合，为后续定制提供稳定设计语言。

建议层级：

```css
@layer reset, tokens, base, layout, components, pages, utilities, overrides;
```

任务：

- [ ] 提取颜色、间距、圆角、阴影、字体和动画 Design Tokens。
- [ ] 将浅色与深色主题统一映射到语义变量。
- [ ] 按 reset、基础、布局、组件和页面拆分主样式。
- [ ] 将模板内联样式迁移到对应模块。
- [ ] 清理重复规则、废弃选择器和无效 `!important`。
- [ ] 为组件建立命名约定，减少依赖 DOM 层级的选择器。
- [ ] 增加 Playwright 视觉回归测试。
- [ ] 在 CSS 稳定后，再评估是否只为新组件引入 Tailwind。

验收标准：

- 核心组件的样式有明确文件归属和变量来源。
- 浅色、深色、桌面端和移动端视觉回归通过。
- 主样式不再依赖一个不可维护的超大单文件。
- 删除样式时可以通过测试确认影响范围。

### 阶段 6：测试、性能与发布治理

**状态：未开始**

目标是把“可持续维护”落实为合并和发布的固定质量门槛。

任务：

- [ ] 使用 Vitest 覆盖工具函数、配置转换和生命周期逻辑。
- [ ] 使用 Playwright 覆盖核心页面和关键交互。
- [ ] 增加模板构建、主题 ZIP 和 YAML 配置验证。
- [ ] 增加 Lighthouse 或等价性能预算。
- [ ] 检查可访问性、键盘操作、颜色对比度和减少动画偏好。
- [ ] 检查 SEO、Open Graph、结构化数据和错误页面。
- [ ] 建立预发布版本和更新日志流程。
- [ ] 自动生成并上传可安装主题包。

最低浏览器测试矩阵：

- 首页、文章、独立页面、分类和标签。
- 桌面端与移动端导航。
- 浅色模式、深色模式和跟随系统。
- PJAX 连续跳转、前进和后退。
- 代码高亮、复制、折叠和评论动态插入。
- 评论、音乐和图库等可选功能。
- 对应 Halo 插件缺失时的安全降级。

验收标准：

- Pull Request 必须通过检查、构建和核心 E2E 测试。
- Release 自动生成可安装 ZIP，并记录对应源码提交。
- 性能和可访问性退化超过预算时阻止合并。
- 发布前不再依赖人工复制文件或手工修改版本号。

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
test: cover PJAX lifecycle navigation
perf: lazy-load comment providers
style: split post component styles
docs: update modernization roadmap
```

### 每次 Pull Request 的完成定义

- [ ] 说明改动范围和不在本次处理的内容。
- [ ] 通过格式化、类型检查和构建。
- [ ] 为行为变化补充测试或手工验证记录。
- [ ] 检查桌面端、移动端、浅色和深色模式。
- [ ] 检查普通加载和 PJAX 导航。
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
| PJAX 重复初始化或资源泄漏 | 先建立生命周期接口，再迁移组件；增加连续导航测试 |
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

## 进度总览

| 阶段 | 状态 | 目标 |
| --- | --- | --- |
| 阶段 0 | 未开始 | 功能盘点、裁剪与回归基线 |
| 阶段 1 | 未开始 | Vite、TypeScript、pnpm、CI 和可复现构建 |
| 阶段 2 | 未开始 | 统一页面与 PJAX 生命周期 |
| 阶段 3 | 未开始 | JavaScript/TypeScript 模块化 |
| 阶段 4 | 未开始 | 第三方依赖治理和按需加载 |
| 阶段 5 | 未开始 | CSS 架构与视觉系统 |
| 阶段 6 | 未开始 | 测试、性能、可访问性和发布治理 |

## 参考资料

- [Halo 主题开发文档](https://docs.halo.run/developer-guide/theme/prepare)
- [Halo Theme Vite Starter](https://github.com/halo-dev/theme-vite-starter)
- [Halo Vite Theme Plugin](https://github.com/halo-sigs/vite-plugin-halo-theme)
- [Halo Theme Package CLI](https://github.com/halo-dev/theme-package-cli)
- [Vite 文档](https://vite.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)

---

维护约定：每个阶段开始时将状态改为“进行中”；验收条件全部通过并合并到 `master` 后改为“已完成”，同时记录对应 Pull Request 或提交。
