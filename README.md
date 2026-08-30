<div align="center">
  <img width="96" src="./templates/assets/images/hanlo-logo.png" alt="Hanlo Theme Logo">
  <h1>Hanlo Theme</h1>
  <p>适用于 Halo 2.x 的响应式博客主题</p>
</div>

> Hanlo Theme 基于 [Halo Theme Hao](https://github.com/chengzhongxue/halo-theme-hao) 定制，后续将独立维护，功能和配置可能与上游版本不同。

[功能特性](#功能特性) · [环境要求](#环境要求) · [快速开始](#快速开始) · [插件支持](#插件支持) · [重构路线图](./docs/MODERNIZATION_ROADMAP.md) · [参与开发](#参与开发)

## 简介

Hanlo Theme 是一款基于 Thymeleaf、面向 [Halo 2.x](https://github.com/halo-dev/halo) 的博客主题。主题设计参考了 Hexo 社区的 [Heo](https://blog.zhheo.com/) 与 [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly)。

本分支在原主题基础上进行定制化开发，目前已使用 Shiki 替代 Prism 提供代码高亮。

项目将按照[渐进式现代化重构路线图](./docs/MODERNIZATION_ROADMAP.md)持续演进，在保持 Halo 兼容性和页面稳定性的前提下，逐步完善构建、类型、模块化、测试和发布体系。

## 功能特性

- 响应式博客布局，适配桌面端与移动端
- 可视化主题设置，无需直接修改模板
- 支持文章、独立页面、友链、瞬间、图库等内容类型
- 支持评论、搜索以及多种 Halo 插件集成
- 使用 Shiki 渲染代码高亮
- 提供关于、音乐、留言板、待办清单、相册等自定义页面模板

## 环境要求

- Halo `2.22.1` 或更高版本
- 安装主题前建议先备份 Halo 数据及现有主题配置

具体版本要求以 [`theme.yaml`](./theme.yaml) 中的 `spec.requires` 字段为准。

## 快速开始

### 安装主题

1. 从本仓库的 Releases 页面下载主题压缩包，或在本地打包主题。
2. 登录 Halo 控制台，进入“外观 → 主题”。
3. 选择“安装主题”，上传主题压缩包。
4. 安装完成后启用 Hanlo Theme，并进入主题设置完成初始化。

首次启用时请填写“建站时间”等必填项，并保存各个设置分组。如果启用后出现 `500` 错误，请先确认 Halo 版本符合要求，再重新保存全部主题设置。

### 本地打包

在仓库根目录执行：

```bash
git archive --format=zip \
  --output=theme-hanlo-1.0.0.zip \
  HEAD theme.yaml settings.yaml annotation-setting.yaml templates
```

生成的 `theme-hanlo-1.0.0.zip` 可直接上传至 Halo 控制台。

## 插件支持

所有插件均为可选依赖；未安装插件时，对应功能不会显示。

| 功能 | 插件 |
| --- | --- |
| 评论 | [plugin-comment-widget](https://www.halo.run/store/apps/app-YXyaD) |
| 搜索 | [plugin-search-widget](https://www.halo.run/store/apps/app-DlacW) |
| 友链 | [plugin-links](https://www.halo.run/store/apps/app-hfbQg) |
| 瞬间 | [plugin-moments](https://www.halo.run/store/apps/app-SnwWD) |
| 追番 | [plugin-bilibili-bangumi](https://www.halo.run/store/apps/app-OTFPN) |
| 图库 | [plugin-photos](https://www.halo.run/store/apps/app-BmQJW) |
| 数学公式 | [plugin-katex](https://www.halo.run/store/apps/app-ISCsX) |
| 装备页面 | [plugin-equipment](https://www.halo.run/store/apps/app-ytygyqml) |
| Markdown / HTML 内容块 | [plugin-hybrid-edit-block](https://www.halo.run/store/apps/app-NgHnY) |

插件兼容性可能随 Halo 或插件版本变化。遇到问题时，请先确认 Halo、主题和插件均使用兼容版本。

## 参与开发

```bash
git clone <repository-url> hanlo-theme
cd hanlo-theme
git switch master
```

主要目录和文件：

| 路径 | 说明 |
| --- | --- |
| `theme.yaml` | 主题元数据与 Halo 版本要求 |
| `settings.yaml` | 主题设置项定义 |
| `annotation-setting.yaml` | 文章与页面的扩展设置 |
| `templates/` | Thymeleaf 模板及静态资源 |

发现问题或希望提交改进时，请通过当前仓库的 Issues 和 Pull Requests 反馈。

## 致谢

- [Halo](https://github.com/halo-dev/halo)
- [Halo Theme Hao](https://github.com/chengzhongxue/halo-theme-hao)
- [Hexo Theme Butterfly](https://github.com/jerryc127/hexo-theme-butterfly)
- [Heo](https://blog.zhheo.com/)

## 许可证

本项目基于 [GPL-3.0](./LICENSE) 协议开源。使用、修改和分发时请遵守许可证要求，并保留必要的版权与来源说明。
