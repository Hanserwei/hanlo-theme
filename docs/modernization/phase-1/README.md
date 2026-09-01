# 阶段 1：建立现代构建基础

## 1. 状态

已完成。实现提交为 [`e4a10bf`](https://github.com/Hanserwei/hanlo-theme/commit/e4a10bf76a5a5033677cffdd2b3101c54e2fe4e2)，远端 [CI 运行 33414807718](https://github.com/Hanserwei/hanlo-theme/actions/runs/33414807718) 已通过。

阶段目标是在不改变页面结构、功能和视觉的前提下，把主题迁移到可复现的 pnpm、TypeScript、Vite Plus 和 Halo 官方主题工具链。

## 2. 源码与产物边界

| 路径 | 职责 | 是否直接编辑 |
| --- | --- | --- |
| `src/**/*.html` | Thymeleaf 页面与模板片段源码 | 是 |
| `public/assets/**` | 暂未模块化、需要原样复制的脚本、样式、图片和 vendor 文件 | 是 |
| `templates/**` | `@halo-dev/vite-plugin-halo-theme` 生成的 Halo 运行时目录 | 否 |
| `dist/*.zip` | `@halo-dev/theme-package-cli` 生成的安装包 | 否 |

阶段 1 只迁移工程结构。旧业务 JavaScript、PJAX 和 CSS 保持原状，后续阶段再逐模块重写。

现有 Thymeleaf 片段、首屏同步主题引导和模板级 PJAX 初始化直接交给 Vite HTML 解析器会改变
内容与入口文件名。`vite.config.ts` 因此提供一个模板保真桥：Halo 官方插件仍负责输出目录、基础路径、
构建生命周期和 `public/` 复制，随后将 `src/**/*.html` 逐字节复制到运行时目录。阶段 3 已完成
第一方业务脚本模块化，但该桥仍需保留；未来只有在模板构建语法完成独立迁移并通过完整页面矩阵后
才能删除。

## 3. 固定工具链

- Halo 最低版本：`2.26.0`
- Node.js：`^20.19.0 || ^22.18.0 || >=24.11.0`，CI 使用 Node.js 24
- pnpm：`10.33.0`
- TypeScript：严格模式，构建前执行无输出类型检查
- Vite Plus：负责检查、格式化基础设施和执行 Vite 构建
- Halo Vite 插件：将 `src/` 与 `public/` 构建为 `templates/`
- Halo Theme Package CLI：从 `theme.yaml` 读取主题名称和版本并生成 ZIP
- YAML 与产物校验：检查主题配置关系，并逐字节核对阶段 1 源文件和构建结果

主题版本只在 `theme.yaml` 的 `spec.version` 中维护。`package.json` 不再声明第二份版本号。

## 4. 命令

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm build-only
pnpm build
```

`pnpm build-only` 生成 `templates/`；`pnpm build` 还会生成 `dist/theme-hanlo-<version>.zip`。

## 5. CI 与发布

- `CI` 在 `master` 推送和 Pull Request 中执行冻结安装、检查、构建、产物同步检查和 ZIP 完整性检查。
- `CD` 在 GitHub Release 发布时调用 Halo 官方 `theme-cd.yaml@v4` reusable workflow。
- 当前未配置 Halo 应用市场应用 ID，因此发布流程只上传 GitHub Release 资产。

## 6. 本阶段不做

- 不重写业务 JavaScript 或引入新的页面控制器。
- 不替换或删除 PJAX。
- 不拆分、格式化或重构现有 CSS。
- 不改变 Thymeleaf 表达式、Finder API、页面结构或主题设置。

## 7. 验收入口

完成审计记录在 [`COMPLETION_AUDIT.md`](COMPLETION_AUDIT.md)。运行环境与开发反馈循环见 [`LOCAL_DEVELOPMENT.md`](LOCAL_DEVELOPMENT.md)。
