<div align="center">
  <img width="96" src="./public/assets/images/hanlo-logo.png" alt="Hanlo Theme Logo">
  <h1>Hanlo Theme</h1>
  <p>适用于 Halo 2.x 的响应式博客主题</p>
</div>

Hanlo 基于 [Halo Theme Hao](https://github.com/chengzhongxue/halo-theme-hao) 定制并独立维护，设计参考 [Heo](https://blog.zhheo.com/) 与 [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly)。

[应用市场](https://www.halo.run/store/apps/app-pin7ah2e) · [下载安装包](https://github.com/Hanserwei/hanlo-theme/releases) · [版本变更](CHANGELOG.md) · [问题反馈](https://github.com/Hanserwei/hanlo-theme/issues)

> [!CAUTION]
> 各位关注本项目的用户大家好，
> 
> 经过与 Halo 官方团队的多轮沟通，由于原参考主题（Hao Theme）维护者的异议及平台审核机制的限制，本项目目前**无法通过官方应用市场审核**。鉴于此情况，我们做出如下说明与承诺：
> 
> 1. **长期下架状态**：在未来很长一段时间内，本主题将不会出现在 Halo 官方商店中。现有用户请继续使用 GitHub Releases 进行手动安装与更新。
> 2. **积极争取授权**：我们正在尝试与原主题作者（[@HeoZhang / Zhang Hong](https://blog.zhheo.com/)）建立直接联系，旨在就代码复用范围、灵感来源致谢等细节达成正式共识，以寻求获得明确的“衍生/致敬”授权，从而合规地重新上架。
> 3. **技术架构完全独立**：需要澄清的是，本项目并非对 Hao 主题的简单修改或分支。由于两者底层前端架构差异巨大（从传统 CSS 巨型文件重构为模块化现代架构），且设计理念存在根本性分歧，**我们承诺绝不会向 Hao 主题同步任何代码或补丁**。两者已属于完全不同的技术栈实现。
> 4. **开源理念坚持**：我们将继续遵循开源协议，保留所有历史贡献记录。无论是否上架，本项目都将作为独立的开源作品持续维护，服务于追求高性能与新生态兼容的用户群体。
> 
> 感谢大家的理解与支持，如有进展我们将第一时间公告。

## 功能

- 响应式布局、亮暗模式、可视化设置，以及文章、独立页面、友链、瞬间和图库等页面。
- Shiki 全语言按需高亮，支持代码复制、行号与折叠；适配 Vditor 公式、图表、脑图和五线谱。
- 本地 OpenCC 简繁转换，保留代码与公式原文，并同步图表内容。
- 本地霞鹜文楷与 Maple Mono NF CN 字体、847 个菜单图标、统一个人卡片。
- 「瓶中沧海」3D 关于页、互动表情、立体分类卡片和可选点击/卡片动效。
- 原生文档导航与按需资源加载，动效遵循系统「减少动态效果」偏好。

## 安装

需要 **Halo 2.26.0 或更高版本**，具体要求见 [theme.yaml](theme.yaml)。

1. 在 Halo 应用市场安装 Hanlo，或从 [GitHub Releases](https://github.com/Hanserwei/hanlo-theme/releases) 下载 `theme-hanlo-<版本>.zip`。
2. 在 Halo 控制台进入「外观 → 主题」，上传安装包并启用。
3. 填写建站时间等必填项，保存主题设置。升级注意事项见 [版本变更记录](CHANGELOG.md)。

`.zip.sha256` 用于校验安装包；GitHub 自动生成的 **Source code** 压缩包不作为安装包使用。若启用后出现 500 错误，先检查 Halo 版本并重新保存主题设置。

## 使用文档

| 内容 | 文档 |
| --- | --- |
| Vditor、代码高亮与简繁转换 | [书写说明](docs/vditor-writing.md) · [测试文章](docs/examples/vditor-render-demo.md) · [语言列表](docs/shiki-languages.md) |
| 关于页面 | [瓶中沧海](docs/about-bottle.md) · [表情互动](docs/about-emotions.md) |
| 页面动效 | [立体分类](docs/categories-3d.md) · [点击特效](docs/click-effect.md) · [卡片光晕](docs/card-motion.md) |
| 字体与许可 | [字体来源](public/assets/fonts/PROVENANCE.md) · [第三方声明](THIRD_PARTY_NOTICES.txt) |
| 开发者发布 | [CI/CD 与发布说明](docs/publishing.md) |

## 插件支持

插件按需安装；缺少对应插件时相关功能不可用。

| 功能 | 插件 |
| --- | --- |
| 评论 | [评论组件](https://www.halo.run/store/apps/app-YXyaD) |
| 搜索 | [搜索组件](https://www.halo.run/store/apps/app-DlacW) |
| 友链 | [链接管理](https://www.halo.run/store/apps/app-hfbQg) |
| 瞬间 | [瞬间](https://www.halo.run/store/apps/app-SnwWD) |
| 追番 | [哔哩哔哩追番](https://www.halo.run/store/apps/app-OTFPN) |
| 图库 | [图库](https://www.halo.run/store/apps/app-BmQJW) |
| 数学公式 | [KaTeX](https://www.halo.run/store/apps/app-ISCsX) |
| 装备页面 | [装备](https://www.halo.run/store/apps/app-ytygyqml)，需 2.0.0 或更新版本 |
| Markdown / HTML 内容块 | [混合内容编辑块](https://www.halo.run/store/apps/app-NgHnY) |

## 开发

使用 Node.js 24 和 pnpm 10.33.0：

```bash
git clone https://github.com/Hanserwei/hanlo-theme.git
cd hanlo-theme
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

`src/` 是模板和脚本源码，`public/assets/` 保存图片、字体等资源；`templates/` 为 Halo 读取的生成文件，应随源码提交。安装包输出到 `dist/`，版本来自 `theme.yaml`。

`pnpm dev` 持续构建。本地 Halo 需启用该主题，并关闭 Thymeleaf 缓存。`pnpm test:markmap-runtime` 可额外验证实际 Vditor Markmap 脚本；首次运行会下载并校验固定版本。

[CI](.github/workflows/ci.yml) 在推送和 PR 时检查、测试并构建主题；发布正式 GitHub Release 后，[CD](.github/workflows/cd.yml) 上传安装包并同步 Halo 应用市场，支持按标签手动重试。详情见 [发布说明](docs/publishing.md)。

## 许可证

基于 [GPL-3.0](LICENSE) 开源。感谢 [Halo](https://github.com/halo-dev/halo)、[Hao](https://github.com/chengzhongxue/halo-theme-hao)、[Butterfly](https://github.com/jerryc127/hexo-theme-butterfly) 与 [Heo](https://blog.zhheo.com/)。
