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
- 内置页脚动物装饰栏，随主题提供图片并预留布局空间
- 本地霞鹜文楷字体与开启连字的 Maple Mono NF CN 代码字体
- 847 个 Ant Design 菜单图标，桌面子菜单可选择下拉或横向排列
- 统一个人卡片，支持透明或图片背景、头像与个人介绍切换

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

### 升级到 2.3.3：更新默认错误页插图

404 和 500 页面分别使用新的内置 SVG 插图，图片居中完整显示，不再使用旧 GIF 或蓝色图片底板。404 图片比例为 3:2，500 为 1:1。已保存的旧默认 GIF 地址以及留空配置会自动使用对应新插图，自选图片地址继续生效。

可在「主题设置 → 资源与页面效果 → 页面不存在时（404）／服务异常时（500）」替换图片，尺寸建议已同步更新。无需恢复或迁移主题配置。

### 升级到 2.3.2：适配装备插件 2.0

装备页 `/equipments` 保留 Hanlo 的导航、横幅和页脚，按新版插件适配文档复用 `plugin:equipment:modules/equipment :: list(groups)`，并加载插件自带的 `equipment.css?v=2.0.0`。卡片读取主题配色变量，沿用霞鹜文楷、明暗模式、圆角与响应式布局；主题只补充横幅与装备区之间的间距，不复制一套参数卡片模板。

支持设备类型、使用状态、重点展示宽卡、完整概述与多行使用感受，以及按顺序展示的结构化参数；参数名称可以重复，参数内容保留换行。未填封面显示设备类型图标，未填或无效的详情链接不显示按钮，空分组与空列表使用插件空状态。旧卡片的规格单行截断、描述三行限制和绝对定位底栏已移除。内容由服务端直接渲染，不新增浏览器 API 请求或 JavaScript。

**安装顺序：Halo 2.26.0 或更高版本 → 安装启用装备插件 2.0.0 或更新版本 → 安装本主题包。** 旧插件缺少新版片段时会显示简短的暂不可用提示，避免解析不存在的插件模板。装备资料在后台「装备」中维护，顶部介绍继续在「主题设置 → 装备页面」配置，无须迁移主题配置。

### 升级到 2.3.1：统一全部设置交互

重新整理全部 20 个主题设置页和 5 类扩展设置（文章、菜单、友链分组、友链、相册分组）。每页提供用途说明，字段按页面位置命名，图片注明建议尺寸和裁切方式，链接、代码、数量等输入提供示例和有效范围。提示卡颜色跟随 Halo 控制台明暗模式。

开关联动仅显示当前功能需要的选项，关闭后保留已经填写的值；首屏图片与视频互斥，手机独立菜单仍可选择菜单组，关于页面只显示已启用区块的编辑项。列表条目使用自己的字段控制显示，修复社交图标选择时影响其他条目的问题。文章扩展设置可以明确选择「跟随主题设置」。

移除四个未实际生效的输入：`sidebar.archivesQuantity`、`link.fcircleUrl`、`photos.detail`、`other.vanillaLazyload.loadingImg`。其余配置路径和已有值继续使用，配置备份恢复时删除这四个键即可。升级前导出的私人配置应保存在主题仓库外，避免进入安装包。

同步修复设置对应的页面问题：自定义技术栈成对展示越界、宽屏左右交替封面失效、简洁相册标题读取不存在字段、转载链接判断错误、单篇开启 AI 摘要却被全局开关清空内容，以及双背景视频重复 ID。

`pnpm settings:check` 校验设置分组、字段、重复 ID、条件引用、图片说明和 FormKit 表达式；`pnpm test:settings` 使用 Halo 相同版本的 FormKit 验证联动和隐藏后的值保留。`pnpm test` 同时执行主题单元测试和表单测试。

### 升级到 2.3.0：统一个人卡片

个人卡片参考 [Roozen](https://roozen.top/) 的信息结构重新设计，统一为一套布局：顶部可切换的个人标签、中间头像与个人介绍、底部名称、一句话简介和社交入口。移除了「默认／样式一」选择、两套旧样式及纯色渐变背景。已有名称、简介、介绍、标签和社交链接继续使用。

在「主题设置 → 侧栏 → 个人卡片」设置背景图。**留空时卡片背景透明**；选择图片时居中铺满，并加暗色遮罩搭配白色文字。推荐 **4:5 竖图、800 × 1000 像素**，至少 400 × 500，优先 WebP 或 AVIF；重要内容放在中央，边缘可能裁切。旧版本自带的默认背景会回到透明，已选的自定义背景继续使用，清空后即恢复透明。

头像可以独立设置，留空跟随站点 Logo；建议至少 256 × 256 像素。右下角贴纸可选，建议 96 × 96 像素透明图片。顶部标签支持中文或英文逗号分隔，点击切换到另一个标签；只有一个标签时展示为静态标签。

鼠标悬浮卡片显示介绍，移出后恢复头像；也可使用「认识我／查看头像」按钮主动切换，触屏和键盘均可操作，Escape 收起介绍并返回按钮。长介绍在中间区域滚动，不挤占底部信息；介绍留空时仅显示头像。社交入口最多两个，支持 `GithubOutlined`、`MailOutlined` 等图标名称及已有图标类名、图片地址。

### 升级到 2.2.1：页脚记录与导航留白

「主题设置 → 页脚 → 站点记录与 Logo」新增可自定义的页脚图片、多行记录文字，以及运行时间和旅行者 1 号里程开关。默认使用原柴犬图片，桌面和手机均显示，点击返回顶部；可选择附件替换，留空恢复柴犬。旧「社交媒体 → 中间 logo」由这个新图片设置替代，升级时默认显示柴犬，原社交链接继续保留。

运行时间从「基础 → 建站时间」的当地零点开始统计，只更新文本，不重复创建或加载图片。无效日期隐藏计时行，未来日期从零开始；隐藏页面暂停文本刷新。旅行者里程从发射时刻按 17 千米/秒估算，文案明确标记为飞行里程估算，不代表实时距地球距离。

导航一级菜单增加选项间距、图标与文字间距和按钮四周内边距，悬浮底色完整包裹内容。字体加载后会重新检查可用宽度。设置中的图标说明改为较小的提示卡片，分行展示填写位置、示例和图标预览链接。

### 升级到 2.2.0：字体、菜单图标与子菜单布局

页脚「内容 → 中间」整组设置及相关功能已移除，包括网站所有者、运行时间、上下班徽标和自定义徽标。底部页脚版权信息仍由「底部页脚」控制。旧配置中的这些字段会被忽略，无需手动清空配置。2.2.1 起，运行时间和可自定义图片由新的「站点记录与 Logo」分组提供。

普通主题文字使用 **LXGW WenKai（霞鹜文楷）v1.522**，代码块、行内代码、键盘提示和等宽文本使用 **Maple Mono NF CN v7.9**，开启 `calt`、`liga` 连字。字体以 WOFF2 随主题提供，保留完整中文字形及 Maple 的 Nerd Font 字形；旧字体设置已移除。6 个字体文件合计约 41.3 MiB，浏览器按实际使用的字重与样式加载，首次加载期间先显示后备字体。第三方插件独立组件或 Shadow DOM 内的字体由插件控制。

菜单图标改用 **@antdv-next/icons 1.1.2**，包含 847 个线框、实底及双色图标。在「外观 → 菜单」编辑菜单项，将「图标」设为 `HomeOutlined`、`GithubOutlined`、`CameraFilled`、`HeartTwoTone` 等完整名称。升级后可访问站点的 `/themes/theme-hanlo/assets/icon/antdv-next/catalog.html` 预览全部图标，使用浏览器查找功能搜索并复制名称。旧 `#icon-xxx` Symbol 值需要换成新名称；已有图片地址及传统图标类名继续兼容。主导航、手机菜单与左侧菜单共用这套图标。Vue 只用于构建图标，前台直接使用本地 SVG。

「主题设置 → 导航 → 菜单控制 → 桌面子菜单布局」支持 **下拉** 和 **横向**，默认下拉。也可在「外观 → 菜单」的单个菜单项中选择「跟随主题设置／下拉／横向」。横向布局在父菜单下方展开胶囊形菜单栏，过长时换行，靠近屏幕边缘时调整位置；支持悬浮、键盘聚焦、方向下键展开、Escape 收起及触屏点击。手机端继续使用折叠菜单。旧 `isVertical` 注解已由新布局选项取代，升级后按新选项设置需要单独覆盖的菜单。

### 升级到 2.1.2：留言板与评论摘要

留言板信封卡片现在使用主题统一的文字与背景色，明暗模式下保持配对，移除了强制浅色背景的工具类。最近评论页和侧栏评论摘要统一转换为纯文本，处理段落、换行、链接、HTML 实体和图片说明，悬停提示也不再显示 HTML 标签。解析器仅在有评论摘要时加载，不执行评论 HTML，不请求其中的外部资源。

留言板下方的评论区由官方评论插件提供，头像服务与主题侧栏的头像镜像是两个独立设置。插件出现头像错误图标时，检查“评论组件 → 头像设置 → 头像服务镜像地址”，填写真正的 Gravatar 兼容服务（例如 `https://cravatar.cn`），不要填博客域名，除非已自行部署 `/avatar/{hash}` 代理。是否有个人头像及默认头像图案由该服务决定；主题不会覆盖评论插件内部的头像组件。

### 升级到 2.1.1：页脚动物栏

2.1.1 修复了 2.1.0 页脚开关表达式调用 `.get()` 导致的模板渲染失败（可能表现为空白页面或连接中断）。Halo 的配置由 JsonPropertyAccessor 包装，需要通过属性读取；本版已修正并增加构建检查。已安装 2.1.0 的站点请升级此修复版，无需清空或重置主题配置。

动物栏现在由主题渲染，图片包含在主题包中。默认开启，可在“主题设置 → 页脚 → 动物装饰栏”关闭；已有配置缺少此字段时也会正常显示。

动物和矮墙使用同一网格区域，占据实际高度，并与正文末尾保持间距。动物图最大宽度为 880px，手机端按可用宽度缩放。2.1.x 的运行时间和柴犬徽标在 2.2.0 移除，2.2.1 通过新的「站点记录与 Logo」设置重新提供。

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
| `THIRD_PARTY_NOTICES.txt` | 由生产依赖图及字体、图标许可生成并随 ZIP 分发的通知文本                 |

菜单图标通过 `scripts/generate-menu-icons.mjs` 生成，运行 `pnpm menu-icons:sync` 更新图标集和预览页，`pnpm menu-icons:check` 校验。字体版本、来源、许可和转换说明见 `public/assets/fonts/PROVENANCE.md`。

发现问题或希望提交改进时，请通过当前仓库的 Issues 和 Pull Requests 反馈。

## 致谢

- [Halo](https://github.com/halo-dev/halo)
- [Halo Theme Hao](https://github.com/chengzhongxue/halo-theme-hao)
- [Hexo Theme Butterfly](https://github.com/jerryc127/hexo-theme-butterfly)
- [Heo](https://blog.zhheo.com/)

## 许可证

本项目基于 [GPL-3.0](./LICENSE) 协议开源。使用、修改和分发时请遵守许可证要求，并保留必要的版权与来源说明。
