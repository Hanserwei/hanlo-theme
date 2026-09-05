<div align="center">
  <img width="96" src="./public/assets/images/hanlo-logo.png" alt="Hanlo Theme Logo">
  <h1>Hanlo Theme</h1>
  <p>适用于 Halo 2.x 的响应式博客主题</p>
</div>

> Hanlo Theme 基于 [Halo Theme Hao](https://github.com/chengzhongxue/halo-theme-hao) 定制，后续将独立维护，功能和配置可能与上游版本不同。

[功能特性](#功能特性) · [环境要求](#环境要求) · [快速开始](#快速开始) · [插件支持](#插件支持) · [参与开发](#参与开发)

## 简介

Hanlo Theme 是一款基于 Thymeleaf、面向 [Halo 2.x](https://github.com/halo-dev/halo) 的博客主题。主题设计参考了 Hexo 社区的 [Heo](https://blog.zhheo.com/) 与 [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly)。

本分支已在原主题基础上完成定制化改造，并使用 Shiki 替代 Prism 提供代码高亮。

## 功能特性

- 响应式博客布局，适配桌面端与移动端
- 可视化主题设置，无需直接修改模板
- 支持文章、独立页面、友链、瞬间、图库等内容类型
- 使用 Halo 官方评论组件，并支持搜索以及多种 Halo 插件集成
- 使用 Shiki 渲染代码高亮
- 使用浏览器原生文档导航，并以 View Transitions 和保守预取渐进增强
- 使用 Design Tokens、语义 Cascade Layers 和零 `!important` 的现代 CSS 架构
- 提供关于、留言板、待办清单、相册等自定义页面模板
- 内置页脚动物装饰栏，随主题提供图片并预留布局空间；紧凑柴犬徽标适配桌面与手机

## 环境要求

- Halo `2.26.0` 或更高版本
- 安装主题前建议先备份 Halo 数据及现有主题配置

具体版本要求以 [`theme.yaml`](./theme.yaml) 中的 `spec.requires` 字段为准。

## 快速开始

### 安装主题

1. 从本仓库的 Releases 页面下载主题压缩包，或在本地打包主题。
2. 登录 Halo 控制台，进入“外观 → 主题”。
3. 选择“安装主题”，上传主题压缩包。
4. 安装完成后启用 Hanlo Theme，并进入主题设置完成初始化。

首次启用时请填写“建站时间”等必填项，并保存各个设置分组。如果启用后出现 `500` 错误，请先确认 Halo 版本符合要求，再重新保存全部主题设置。

从 1.x 升级到 2.0.0 时，自定义代码若使用 `window.pjax` 或旧 PJAX 事件，需要改为真实链接、
`location.assign()` 或原生文档生命周期。

### 升级到 2.1.2：留言板与评论摘要

留言板信封卡片现在使用主题统一的文字与背景色，明暗模式下保持配对，移除了强制浅色背景的工具类。最近评论页和侧栏评论摘要统一转换为纯文本，处理段落、换行、链接、HTML 实体和图片说明，悬停提示也不再显示 HTML 标签。解析器仅在有评论摘要时加载，不执行评论 HTML，不请求其中的外部资源。

留言板下方的评论区由官方评论插件提供，头像服务与主题侧栏的头像镜像是两个独立设置。插件出现头像错误图标时，检查“评论组件 → 头像设置 → 头像服务镜像地址”，填写真正的 Gravatar 兼容服务（例如 `https://cravatar.cn`），不要填博客域名，除非已自行部署 `/avatar/{hash}` 代理。是否有个人头像及默认头像图案由该服务决定；主题不会覆盖评论插件内部的头像组件。

### 升级到 2.1.1：页脚动物栏

2.1.1 修复了 2.1.0 页脚开关表达式调用 `.get()` 导致的模板渲染失败（可能表现为空白页面或连接中断）。Halo 的配置由 JsonPropertyAccessor 包装，需要通过属性读取；本版已修正并增加构建检查。已安装 2.1.0 的站点请升级此修复版，无需清空或重置主题配置。

动物栏现在由主题渲染，图片包含在主题包中。默认开启，可在“主题设置 → 页脚 → 动物装饰栏”关闭；已有配置缺少此字段时也会正常显示。

动物和矮墙使用同一网格区域，占据实际高度，并与正文末尾保持间距。动物图最大宽度为 880px，手机端按可用宽度缩放。运行时间上方的柴犬徽标桌面最大 104px、手机 72px，保留返回顶部功能。

原来通过 Halo“代码注入 → 页脚”加入动物栏的用户，升级后可以删除旧的 `<div id="footer-animal">…</div>` 及对应 `<style>` 中的 `#footer-animal`、`.animal-wall`、`img.animal` 和 `#footer-banner` 样式，保留其他注入内容。新主题会隐藏页脚中遗留的 `#footer-animal`，防止重复显示；主题开关关闭时也会隐藏旧动物栏。`halo:footer` 仍保留用于插件及其他代码注入。

### 本地打包

项目使用 pnpm 10、TypeScript、Vite Plus 和 Halo 官方主题构建插件。在仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

构建会从 `src/` 和 `public/` 重新生成 `templates/`，并在 `dist/` 输出可直接上传至 Halo 控制台的 `theme-hanlo-<version>.zip`。版本唯一来源是 `theme.yaml` 的 `spec.version`。

## 插件支持

所有插件均为可选依赖；未安装插件时，对应功能不会显示。

| 功能                   | 插件                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| 评论                   | [plugin-comment-widget](https://www.halo.run/store/apps/app-YXyaD)    |
| 搜索                   | [plugin-search-widget](https://www.halo.run/store/apps/app-DlacW)     |
| 友链                   | [plugin-links](https://www.halo.run/store/apps/app-hfbQg)             |
| 瞬间                   | [plugin-moments](https://www.halo.run/store/apps/app-SnwWD)           |
| 追番                   | [plugin-bilibili-bangumi](https://www.halo.run/store/apps/app-OTFPN)  |
| 图库                   | [plugin-photos](https://www.halo.run/store/apps/app-BmQJW)            |
| 数学公式               | [plugin-katex](https://www.halo.run/store/apps/app-ISCsX)             |
| 装备页面               | [plugin-equipment](https://www.halo.run/store/apps/app-ytygyqml)      |
| Markdown / HTML 内容块 | [plugin-hybrid-edit-block](https://www.halo.run/store/apps/app-NgHnY) |

插件兼容性可能随 Halo 或插件版本变化。遇到问题时，请先确认 Halo、主题和插件均使用兼容版本。

## 参与开发

```bash
git clone <repository-url> hanlo-theme
cd hanlo-theme
git switch master
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` 会监听源码并持续生成 `templates/`。本地 Halo 必须安装并启用当前主题，同时通过 `spring.thymeleaf.cache: false` 或环境变量 `SPRING_THYMELEAF_CACHE=false` 关闭 Thymeleaf 缓存。

主要目录和文件：

| 路径                      | 说明                                                                    |
| ------------------------- | ----------------------------------------------------------------------- |
| `theme.yaml`              | 主题元数据与 Halo 版本要求                                              |
| `settings.yaml`           | 主题设置项定义                                                          |
| `annotation-setting.yaml` | 文章与页面的扩展设置                                                    |
| `src/`                    | Thymeleaf 页面与片段源码；应在此修改模板                                |
| `public/assets/`          | 原样复制到主题包的第一方样式、字体和图片；第三方运行时由 pnpm/Vite 构建 |
| `templates/`              | Vite 生成、Halo 实际读取的运行时产物；不要手动修改                      |
| `vite.config.ts`          | Vite Plus 与 Halo 主题构建插件配置                                      |
| `THIRD_PARTY_NOTICES.txt` | 由生产依赖图生成并随 ZIP 分发的第三方许可与通知文本                     |

发现问题或希望提交改进时，请通过当前仓库的 Issues 和 Pull Requests 反馈。

## 致谢

- [Halo](https://github.com/halo-dev/halo)
- [Halo Theme Hao](https://github.com/chengzhongxue/halo-theme-hao)
- [Hexo Theme Butterfly](https://github.com/jerryc127/hexo-theme-butterfly)
- [Heo](https://blog.zhheo.com/)

## 许可证

本项目基于 [GPL-3.0](./LICENSE) 协议开源。使用、修改和分发时请遵守许可证要求，并保留必要的版权与来源说明。
