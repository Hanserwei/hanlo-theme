# CI/CD 与应用市场发布

应用市场：[Hanlo Theme](https://www.halo.run/store/apps/app-pin7ah2e)，应用 ID 为 `app-pin7ah2e`。配置依据 [Halo 发布应用文档](https://docs.halo.run/developer-guide/app-store/publish-app.md)。

## 凭据与工作流

- GitHub Environment 名称为 `HALO_PAT`，其中保存同名 Secret。发布作业显式使用该 Environment；不需要把令牌迁移到仓库，也不应把令牌写入文件。
- Halo 令牌需要「应用市场开发者 → 版本管理」权限。修改令牌时更新 Environment 内的 Secret。
- CI 使用 Node.js 24 / pnpm 10.33.0，执行锁定安装、类型/样式/设置检查、单元和设置测试、实际 Markmap 脚本测试、构建及已提交产物一致性检查。
- CD 接收正式 `release.published`、手动 `workflow_dispatch` 或归档标签的调用。标签须为稳定的 `x.y.z` 或 `vx.y.z`，并匹配其 `theme.yaml`；目前不自动发布预发布版本。
- 普通版本先复用 CI 构建，再上传 ZIP 与 SHA-256，通过固定修订的官方 `halo-sigs/app-store-release-action@v4` 发布到市场；读取正式 GitHub Release 正文作为市场更新说明。
- 发布完成后检查公开市场版本和附件名称、大小及状态。已有同版本及匹配附件会跳过创建；不一致会报错，避免覆盖。若官方 Action 在中途失败并留下不可见草稿，应在市场管理中检查草稿后重试，工作流不自动删除草稿。

## 新版本

1. 修改 `theme.yaml` 的 `spec.version`，更新 `CHANGELOG.md`，在 `releases/<版本>.md` 编写本次发布说明。
2. 执行 `pnpm check`、`pnpm test`、`pnpm test:markmap-runtime`、`pnpm build`；提交源码与生成的 `templates/`。
3. 推送到 `master`，确认 CI 成功。
4. 给通过 CI 的提交创建标签，发布 GitHub 正式 Release，以 `releases/<版本>.md` 为正文。
5. 等待 CD 成功，核对 GitHub 安装包与市场版本。仅推送标签不会触发发布。

## 手动重试

在 GitHub Actions 选择 **CD → Run workflow**，分支选择 `master`，填写已存在且已经发布的标签。

也可使用：

```bash
gh workflow run cd.yml --ref master -f tag=2.7.2
```

重试会重新验证内容。GitHub 若已有安装包，先逐文件对比新构建与原附件，内容一致则复用原附件字节和哈希；不会仅因 ZIP 时间戳不同而覆盖已发布包。应用市场已有同版且附件信息一致时跳过再次创建。

## 2.5.0 之后的历史补发

2.6.0、2.6.1、2.7.0、2.7.1 开发时保存了 ZIP，但未独立提交每个阶段的源码。本次保留原包进行补发，不把最新源码改版本号来重建历史包。

- 原包 SHA-256 和大小固定记录在 `releases/archives.json`。
- 对应标签是从原包解出的运行文件快照，包含 `release-archive.json` 和转发到正式 CD 的工作流；它们不是完整 authored `src/` 历史。
- CD 下载该 Release 的原附件，校验哈希、主题身份、版本、ZIP 完整性，并逐文件与标签运行快照对照。
- 安装包保持原始字节；版本正文说明功能、已知问题与归档来源。
- 2.7.2 使用完整源码、当前 CI 和正式发布流程，作为最新推荐版本。

按 2.6.0 → 2.6.1 → 2.7.0 → 2.7.1 → 2.7.2 顺序发布，等待每版市场同步成功再进行下一版，使最终最新版本为 2.7.2。
