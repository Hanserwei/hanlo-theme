# 阶段 4 完成审计

## 1. 审计结论

阶段 4 已完成。第三方运行时依赖已由 pnpm 精确锁定或由第一方原生实现替代；核心页面不再依赖 jQuery、Vue 2 或 Fancybox；重型功能按 DOM 与设置动态加载；本地、合成浏览器、真实 Halo 2.26 和远端 CI 质量门禁均已通过。

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-09-01 |
| 实现提交 | [`93d4cdb8`](https://github.com/Hanserwei/hanlo-theme/commit/93d4cdb8874c78b88e0acf49da5b5efff6904667) |
| 远端 CI | [CI 33523065226](https://github.com/Hanserwei/hanlo-theme/actions/runs/33523065226)，通过 |
| 收尾版本 | `1.1.1`；唯一版本来源仍为 `theme.yaml:spec.version` |
| Halo 兼容要求 | `>= 2.26.0`，未提高 |
| 构建系统 | pnpm + Vite Plus + Halo Vite 插件，未替换 |
| 直接运行时依赖 | 9 个，全部使用精确版本并写入 lockfile |
| 第三方通知 | 106 个生产依赖图包；0 个许可证元数据缺口，1 个包内通知文本缺口已披露 |
| 单元测试 | 16 个文件、36 项测试 |
| 合成浏览器测试 | 12 个场景 × 2 个视口/模式，共 24 项通过；真实 Halo 用例在无环境变量时按设计跳过 |
| 真实 Halo 连续导航 | 桌面浅色与移动深色共 2 项通过；24 次页面进入 |
| 真实 Halo 页面矩阵 | 13 个路由 × 2 个视口/模式，共 26 次直接加载通过 |
| 截图证据 | 9 个固定页面 × 2 个视口/模式，共 18 张 WebP，SHA-256 全部通过 |
| 构建输出 | 175 项输出，其中 94 个 HTML；两次构建 SHA-256 一致 |
| 安装包 | `dist/theme-hanlo-1.1.1.zip`，2,472,503 bytes、208 个条目，完整性通过 |

## 2. 路线图任务证据

| 任务 | 结果 | 证据 |
| --- | --- | --- |
| 依赖纳入 pnpm 与 lockfile | 通过 | `package.json` 精确声明 PJAX、Shiki、Swiper、Tocbot、QRCode、FastAverageColor、DPlayer、HLS.js 和 Typed.js；冻结安装通过 |
| 删除重复 vendor 副本 | 通过 | 删除 `public/assets/libs/`、重复 Vue 2、Clipboard.js、ViewImage、旧 iframe/Box2D 栈及生成副本 |
| 图库移除 jQuery/Fancybox | 通过 | 原生图库与可访问灯箱；焦点循环、键盘导航、关闭后恢复焦点及 PJAX 清理均有浏览器测试 |
| 3D 分类移除 Vue 2 | 通过 | 语义化链接卡片、原生 PointerEvent 倾斜和 `prefers-reduced-motion` 降级；真实 Halo 渲染 44 张卡片 |
| 重型功能动态导入 | 通过 | 合成测试覆盖无目标 DOM、正向目标、MP4/HLS 分离、Tocbot 目标门禁、Shiki 支持/不支持语言、图库和友链 Canvas |
| Shiki 本地裁剪 | 通过 | JavaScript 正则引擎、18 种显式语言、6 个显式主题；不支持语言不请求高亮分块并保留原代码 |
| 外部 CDN 失败降级 | 通过 | 自定义 CDN 指向不可用地址时出现可访问告警；SSR 内容、本地核心 ESM/CSS 与 PJAX 导航保持工作 |
| 版本更新治理 | 通过 | Dependabot 每月检查 npm/pnpm 与 GitHub Actions；已实际创建 4 个 Actions 更新 PR |
| 用途、许可证与替换成本登记 | 通过 | `DEPENDENCIES.md` 记录直接依赖/第一方替代/平台边界；`THIRD_PARTY_NOTICES.txt` 覆盖完整生产依赖图并随 ZIP 分发 |

## 3. 审查与真实环境修复记录

独立审查和真实 Halo 验收发现并修复了以下问题：

- PJAX 排除下载链接，并用代次与可取消定时器消除导航进度竞态。
- 友链 Canvas 不再为普通第三方头像强制匿名 CORS；无 ACAO 的图片可以渲染。
- 灯箱加入焦点循环、Escape/方向键处理和触发图恢复焦点。
- Tocbot 同时要求正文标题与实际目录目标；删除引用旧 vendor 的遗留片段。
- Shiki 在导入 2 MiB 以上高亮分块前先用轻量注册表判断语言是否受支持。
- 瞬间瀑布流用单一 ResizeObserver/回退监听器响应图片与容器尺寸，并由资源作用域清理。
- 移除 GSAP、完整 Fancybox CSS 和未声明许可证的旧 FriendCircle CSS，分别以第一方 PointerEvent/CSS、原生灯箱和简洁友链样式替代。
- Vite 构建清理预构建依赖内的包管理器源码路径，产物校验阻止 `node_modules/.pnpm` 残留回归。
- 真实 Halo 首轮发现系统代码注入仍直接调用 jQuery；该系统配置在单独备份后等价迁移为原生 DOM/Web Animations，主题没有重新引入 jQuery。
- 真实 Halo 首轮还发现查询参数使核心 ESM 与动态分块把运行时实例化两次；入口改为无查询参数的 `hanlo-runtime-<version>.js`，页面与分块引用同一模块 URL。

多轮聚焦复审最终结论均为 `Merge verdict: OK`，没有剩余 P0/P1 问题。

## 4. 真实 Halo 证据

- Halo `2.26.0-SNAPSHOT`，主题 `1.1.0` 实现版本在运行时为 `READY=TRUE`；仓库与运行时入口、`theme.yaml` SHA-256 一致。
- 默认配置的桌面浅色与移动深色页面矩阵、连续 PJAX 和浏览器前进/后退全部通过。
- 真实 Network 中没有 `assets/libs`、jQuery、Vue 2 或 Fancybox 请求；普通独立页、瞬间页和默认关闭的友链页不下载无关重型分块。
- 3D 分类、减少动态效果、自定义 CDN 失败和空友链数据均按预期降级；临时配置测试结束后已恢复默认配置。
- 18 张截图已人工检查联系图，未发现明显布局崩坏、主题模式错误或大面积空白。
- 详细证据见 [`evidence/live/README.md`](evidence/live/README.md)、[`NETWORK_EVIDENCE.json`](evidence/live/NETWORK_EVIDENCE.json) 和 [`OPTIONAL_PATH_EVIDENCE.json`](evidence/live/OPTIONAL_PATH_EVIDENCE.json)。

## 5. CI、打包与更新治理

- [x] `pnpm install --frozen-lockfile`、`pnpm check`、单元测试、合成 Playwright、构建、产物同步检查和 ZIP 完整性全部通过。
- [x] 实现提交 `93d4cdb8` 已进入并推送到 `master`。
- [x] 远端 CI 33523065226 的 `build` 作业成功。
- [x] 最终 ZIP 包含 `THIRD_PARTY_NOTICES.txt`，不包含 `assets/libs`、jQuery、Vue 2、Fancybox 或 GSAP。
- [x] 两次本地构建的 175 项 `templates/` 输出 SHA-256 完全一致。

Dependabot 配置已实际工作，并创建了 4 个 GitHub Actions 更新 PR，相关 PR CI 均通过。npm 更新器对 Typed.js、Playwright、Node 类型和 TypeScript 的个别更新尝试报告 GitHub 托管的 `unknown_error`；其他依赖扫描继续完成。该外部更新器限制不影响当前精确锁定依赖、冻结安装或阶段 4 运行时验收，后续依赖维护时应继续观察。

## 6. 版本 1.1.1 收尾复核

在实现提交与远端 CI 通过后，将主题版本提升至 `1.1.1` 并重新生成版本化运行时入口与全部动态分块。收尾门禁包括：

- 72 个文件格式检查、62 个文件 Lint/类型检查通过。
- 16 个 Vitest 文件、36 项测试通过。
- 24 项合成 Playwright 通过；4 项真实 Halo 用例已在带 `HALO_BASE_URL` 的独立运行中通过。
- 175 项构建输出通过来源、非空、版本化入口和包管理器路径残留检查。
- `theme-hanlo-1.1.1.zip` 包含第三方通知并通过 `unzip -t`。
- 阶段 4 的 18 张 WebP 截图通过 `SHA256SUMS` 校验。

已知且明确披露的剩余信息：`emoji-regex@8.0.0` 的包元数据声明 MIT，但安装包内未附单独的 LICENSE/COPYING/NOTICE 文本；通知生成器保留该缺口，不将本审计表述为法律意见。
