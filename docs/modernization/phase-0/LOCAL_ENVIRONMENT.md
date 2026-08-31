# 阶段 0 本地环境盘点

## 1. 环境信息

采集日期：2026-08-31。

| 字段 | 值 |
| --- | --- |
| 站点 | `http://localhost:8090/` |
| Halo | `2.26.0-SNAPSHOT`；前台 generator 元数据确认 |
| Halo 源码目录 | `/home/hanserwei/halo-project/halo-2.26.0/` |
| Java | Eclipse Temurin 21.0.11 |
| CLI | Halo CLI 0.5.0 |
| 当前主题 | `theme-hanlo` / Hanlo Theme 1.0.0 |
| 主题运行状态 | `READY` |
| 浏览器 | Google Chrome 152.0.7977.64 |
| 认证方式 | PAT，仅从 halo-cli `.env.local` 注入进程，未写入仓库 |

运行时主题目录是 `/home/hanserwei/halo2-dev/themes/theme-hanlo`，不是本仓库目录。P0-I2 采集的是删除前运行时副本；实施后的验证需要先备份运行时副本，再同步本仓库可安装文件并执行主题重载。

安全记录：`.env.local` 的内容和 PAT 未输出到日志或文档。盘点时发现该文件权限为 `0644`，建议由维护者改为 `0600`。

## 2. 当前主题状态

| 项目 | 值 |
| --- | --- |
| 当前运行时最低版本声明 | `>=2.22.1` |
| 本仓库目标声明 | `>=2.26.0` |
| 评论 | 开启，provider 为 `commentWidget` |
| 右键菜单 | 开启 |
| 开往 | 关闭，但功能保留 |
| 分类样式 | `default`，3D 功能保留 |
| 左下角导航播放器 | 关闭，将删除 |
| 侧栏 | 右侧 |
| 首页/文章侧栏音乐卡片 | 已配置并启用，保留 |
| 51LA ID | 空，将删除设置和代码 |

Halo 当前报告一项现有主题状态：

```text
pageLayout.state = MISSING
pageLayout.reason = MissingLayoutTemplate
pageLayout.message = templates/layout.html was not found.
```

这是插件页面复用主题外壳所需的可选页面布局契约，不是 P0-I1/P0-I2 引入的回归。阶段 0 只记录；是否补齐应作为后续独立任务处理。

## 3. 已启用插件

本地环境共有 14 个插件，均处于 `STARTED`：

| metadata.name | 显示名称 | 版本 | 阶段 0 用途 |
| --- | --- | --- | --- |
| `halo-cli` | Halo CLI | 0.5.0-SNAPSHOT | 环境盘点与验证 |
| `vditor-mde` | Vditor 编辑器 | 1.10.3 | 内容编辑，不参与前台基线 |
| `plugin-mail-template` | 邮件模板管理 | 1.1.6 | 非主题能力 |
| `equipment` | 装备管理 | 1.1.1 | 可选特殊页面 |
| `plugin-katex` | KaTeX | 3.0.0 | 文章内容增强 |
| `plugin-bilibili-bangumi` | 追番插件 | 1.4.1-beta.1 | 可选特殊页面 |
| `text-diagram` | 文本绘图 | 1.5.2 | 文章内容增强 |
| `PluginMoments` | 瞬间 | 1.17.1 | 首页与特殊页面 |
| `PluginPhotos` | 图库管理 | 2.1.2 | 图库页面 |
| `PluginLinks` | 链接管理 | 2.3.0 | 明确保留的友链能力 |
| `app-store-integration` | 应用市场 | 1.18.1 | 非主题前台能力 |
| `PluginSearchWidget` | 搜索组件 | 1.7.1 | 导航搜索 |
| `PluginFeed` | RSS | 1.5.0 | 页脚 RSS |
| `PluginCommentWidget` | 评论组件 | 3.2.2 | 唯一保留评论实现 |

本地环境没有安装 `plugin-afdian`，符合删除爱发电后的目标插件组合。

## 4. 内容规模

| 内容 | 数量 |
| --- | ---: |
| 已发布文章 | 110 |
| 已发布公开页面 | 6 |
| 分类 | 44 |
| 标签 | 44 |
| 已审核评论 | 8 |

现有内容足以覆盖长文、代码块、表格和评论。基准文章“React 对照速成文档”包含约 27,016 个 Markdown 字符、42 对 fenced code 标记和多行表格，并已有审核评论。

## 5. 固定核心路由

| 页面 ID | 路由 | 样本说明 |
| --- | --- | --- |
| P-home | `/` | 首页首屏、导航、瞬间、文章卡片和侧栏 |
| P-post | `/archives/react-dui-zhao-su-cheng-wen-dang` | 长文、代码块、表格、目录和原生评论 |
| P-page | `/bi-ji` | 无自定义模板的普通独立页面 |
| P-category | `/categories/javamian-xiang-dui-xiang` | 26 篇可见文章的分类页 |
| P-tag | `/tags/source-code-analysis` | 9 篇可见文章的标签页 |
| P-comments | `/liu-yan-ban` | 使用 `comments.html` 的留言板，已有审核评论 |

附加页面：

| 路由 | 模板 | 用途 |
| --- | --- | --- |
| `/newest` | `new_comment.html` | 最近评论；外部 provider 删除后验证原生评论分支 |
| `/album` | `album.html` | 图库入口 |
| `/about` | `about.html` | 关于页和保留的直接打赏能力 |

## 6. 删除前冒烟结果

| 检查 | 结果 |
| --- | --- |
| 6 个核心路由直接加载 | 通过 |
| 1440×900 桌面浅色截图 | 6/6 |
| 390×844 手机浅色截图 | 6/6 |
| 移动菜单打开/关闭与滚动恢复 | 通过 |
| 连续 10 次 PJAX 导航 | 10/10 `pjax:complete` |
| 最终 DOM 唯一 `#nav` 与 `#body-wrap` | 通过 |
| 稳定 JavaScript 异常 | 0 |
| 稳定失败请求 | 0 |

截图清单见 [`evidence/pre-removal/README.md`](evidence/pre-removal/README.md)。
