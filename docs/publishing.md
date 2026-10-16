# CI/CD 与版本发布

正式版本通过 [GitHub Releases](https://github.com/Hanserwei/hanlo-theme/releases) 提供安装包与 SHA-256。应用市场目前暂停上架；恢复时使用 [Hanlo Theme](https://www.halo.run/store/apps/app-pin7ah2e)，应用 ID 为 `app-pin7ah2e`，发布接口依据 [Halo 发布应用文档](https://docs.halo.run/developer-guide/app-store/publish-app.md)。

## 凭据与工作流

- GitHub 安装包发布使用工作流的 GitHub Token，不依赖应用市场凭据。
- 应用市场作业仅在仓库变量 `HALO_MARKETPLACE_ENABLED` 为 `true` 时执行。当前暂停上架，默认跳过该作业；恢复前先确认应用市场已允许发布。
- 市场凭据保存在 GitHub Environment `HALO_PAT` 的同名 Secret，需要「应用市场开发者 → 版本管理」权限；无需迁移或下载令牌。
- CI 使用 Node.js 24 / pnpm 10.33.0，执行锁定安装、类型/样式/设置检查、单元和设置测试、实际 Markmap 脚本测试、构建及已提交产物一致性检查。
- CD 接收正式 `release.published`、手动 `workflow_dispatch` 或归档标签的调用。标签须为稳定的 `x.y.z` 或 `vx.y.z`，并匹配其 `theme.yaml`；目前不自动发布预发布版本。
- 普通版本先复用 CI 构建，再校验并上传 ZIP 与 SHA-256。GitHub 已有匹配附件时复用原始字节，不覆盖不同内容。
- 启用市场同步后，通过固定修订的官方 `halo-sigs/app-store-release-action@v4` 发布，读取 GitHub 正式 Release 正文作为更新说明。完成后核对公开版本和附件；已有匹配版本会跳过，不一致时报错。若市场留下不可见草稿，需在市场管理中检查后重试。

## 新版本

1. 修改 `theme.yaml` 的 `spec.version`，更新 `CHANGELOG.md`，在 `releases/<版本>.md` 编写本次发布说明。
2. 执行 `pnpm check`、`pnpm test`、`pnpm test:markmap-runtime`、`pnpm build`；提交源码与生成的 `templates/`。
3. 推送到 `master`，确认 CI 成功。
4. 给通过 CI 的提交创建标签，发布 GitHub 正式 Release，以 `releases/<版本>.md` 为正文。
5. 等待 CD 完成，核对 GitHub 安装包和校验文件。仅在启用市场同步时核对市场版本；只推送标签不会发布。

## 手动重试

在 GitHub Actions 选择 **CD → Run workflow**，分支选择 `master`，填写已存在且已经发布的标签。

也可使用：

```bash
gh workflow run cd.yml --ref master -f tag=2.7.2
```

重试会重新验证内容。GitHub 若已有安装包，先逐文件对比新构建与原附件，内容一致则复用原附件字节和哈希；不会仅因 ZIP 时间戳不同而覆盖已发布包。市场作业关闭时只处理 GitHub；启用后，已有匹配市场版本也会跳过。

## 2.5.0 之后的历史补发

2.6.0、2.6.1、2.7.0、2.7.1 开发时保存了 ZIP，但未独立提交每个阶段的源码。本次保留原包进行补发，不把最新源码改版本号来重建历史包。

- 原包 SHA-256 和大小固定记录在 `releases/archives.json`。
- 对应标签是从原包解出的运行文件快照，包含 `release-archive.json` 和归档工作流；它们不是完整 authored `src/` 历史。该仓库实测嵌套工作流无法取得环境 Secret，因此归档版本采用主分支 CD 的直接入口。
- CD 下载该 Release 的原附件，校验哈希、主题身份、版本、ZIP 完整性，并逐文件与标签运行快照对照。
- 安装包保持原始字节；版本正文说明功能、已知问题与归档来源。
- 2.7.2 使用完整源码、当前 CI 和正式发布流程，作为最新推荐版本。

先创建带原始 ZIP 和校验文件的 GitHub 草稿，再直接运行：

```bash
gh workflow run cd.yml --ref master -f tag=2.6.1 -f publish-archive-draft=true
```

该选项只接受 `archives.json` 中的历史版本，发布前验证 GitHub 附件 digest。工作流使用自己的 GitHub 令牌发布草稿并继续市场同步，不触发第二条嵌套流程；其它版本仍需先正常发布 Release。已发布归档只需普通重试入口。

按 2.6.0 → 2.6.1 → 2.7.0 → 2.7.1 → 2.7.2 顺序发布，等待每版市场同步成功再进行下一版，使最终最新版本为 2.7.2。
