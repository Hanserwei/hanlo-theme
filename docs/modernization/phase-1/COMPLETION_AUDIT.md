# 阶段 1 完成审计

## 1. 审计结论

阶段 1 的实现和本地验收已通过。正式状态保持“进行中”，原因只有两项：本次改动尚未提交或合并，GitHub CI 也尚未在远端实际运行。

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-09-01 |
| 基准提交 | `04a03538` |
| Halo | `2.26.0-SNAPSHOT`，最低兼容目标 `2.26.0` |
| Node.js | `24.16.0` |
| pnpm | `10.33.0` |
| 主题 | `theme-hanlo` 1.0.0 |

## 2. 任务与证据

| 任务 | 结果 | 证据 |
| --- | --- | --- |
| pnpm 与 lockfile | 通过 | `packageManager=pnpm@10.33.0`；根目录与干净临时目录的 `pnpm install --frozen-lockfile` 均通过 |
| TypeScript 与 Vite Plus | 通过 | 严格 `tsconfig.json`；`pnpm check` 类型、格式和 Lint 检查通过 |
| Halo Vite 插件 | 通过 | `@halo-dev/vite-plugin-halo-theme` 1.0.3 负责输出目录、基础路径、构建生命周期和 `public/` 复制 |
| Halo 打包 CLI | 通过 | `@halo-dev/theme-package-cli` 1.1.1 生成 `dist/theme-hanlo-1.0.0.zip` |
| 源码与产物边界 | 通过 | 95 个运行时模板源码位于 `src/`，113 个原样静态资源位于 `public/`，构建生成 208 个 `templates/` 文件 |
| 首次原样迁移 | 通过 | 98 个输出 HTML 和全部静态资源与阶段 0 运行时快照逐字节一致；未改写 PJAX、业务脚本和 CSS |
| 构建脚本 | 通过 | `dev`、`check`、`build-only`、`build`、`validate`、`verify-build` 均已提供；watch 初始构建通过，触碰 `src/index.html` 后触发第二次构建 |
| 版本单一来源 | 通过 | 版本只保留在 `theme.yaml:spec.version`；校验脚本拒绝 `package.json` 再声明版本 |
| CI/CD | 本地静态通过 | CI 使用 Node.js 24、pnpm 10.33.0、冻结安装、检查、构建、产物差异和 ZIP 校验；CD 使用 Halo 官方 `theme-cd.yaml@v4`；YAML 解析通过 |
| Maven/Spring Boot | 通过 | 无 Java 源码和 Maven 主题构建用途，已删除 `pom.xml` |
| 本地 Halo 文档 | 通过 | `LOCAL_DEVELOPMENT.md` 记录 Halo 目录、监听构建和 `spring.thymeleaf.cache: false` |

## 3. 命令验收

以下命令在当前工作树通过：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
unzip -t dist/theme-hanlo-1.0.0.zip
```

额外执行了两轮从空 `templates/` 开始的构建，以及一个不含 `node_modules` 和 `templates` 的干净临时目录构建。结果如下：

| 检查 | 结果 |
| --- | --- |
| 构建输出 | 208 个文件，98 个 HTML |
| 源码逐字节校验 | 208/208 通过 |
| ZIP | 2,390,559 bytes，268 个条目，压缩数据完整 |
| 独立构建结构 | 两个 ZIP 解包后的路径和文件内容完全一致 |
| ZIP 字节哈希 | 不要求一致；ZIP 条目时间戳会变化，解包内容一致 |

## 4. Halo 运行时验收

最终 ZIP 通过 Console API 原位升级，HTTP 200；主题状态为 `READY=TRUE`。将 `style.colorScheme=system` 同值写回后读取一致，最终配置已恢复为 `system`。

以下固定路由在最终升级后均返回 HTTP 200：

- `/`
- `/archives/react-dui-zhao-su-cheng-wen-dang`
- `/bi-ji`
- `/categories/javamian-xiang-dui-xiang`
- `/tags/source-code-analysis`
- `/liu-yan-ban`
- `/newest`
- `/album`
- `/about`

使用 Chrome 152 对首页和文章页执行了桌面 1440×900、手机 390×844 的浅色截图抽查。页面结构和视觉行为保持阶段 0 基线；截图差异来自打字文案、粒子、滚动条和预加载时机等既有动态噪声。更直接的构建证据是全部 208 个运行时文件与改造前逐字节一致。

## 5. 临时兼容边界

现有 Thymeleaf 片段包含 Vite HTML 解析器不能安全处理的内联旧脚本。阶段 1 在 `vite.config.ts` 中保留兼容桥，让 Halo 插件建立构建环境后逐字节复制 `src/**/*.html`。这是有意的过渡方案：

- 保证首轮工程化不改变页面行为和视觉。
- 旧脚本、PJAX 和样式仍按阶段 0 行为运行。
- 后续阶段完成脚本模块化后，应逐页交给 Vite 正常转换并删除兼容桥。

## 6. 正式完成条件

- [ ] 在 GitHub 上触发并通过新增 CI。
- [ ] 将阶段 1 改动提交并合并到 `master`。
- [ ] 将路线图阶段 1 状态从“进行中”改为“已完成”，补充提交或 Pull Request 链接。
