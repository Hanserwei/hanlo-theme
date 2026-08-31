# 阶段 0 固定测试场景

## 1. 目的

本文将本地 Halo 环境转化为可重复的测试合同。P0-I5、P0-I6 以及后续阶段都应复用这里的路由、插件组合和稳定规则，避免每次临时挑选页面。

## 2. 固定环境

| 字段 | 值 |
| --- | --- |
| Halo | 最低版本 `2.26.0`；当前本地实例为 `2.26.0-SNAPSHOT` |
| 主题 | `theme-hanlo` 1.0.0 |
| 桌面浏览器 | Chrome/Chromium 当前稳定版及前一个大版本 |
| 手机浏览器 | Android Chrome/Chromium 当前稳定版及前一个大版本 |
| 桌面视口 | 1440×900，DPR 1 |
| 手机视口 | 390×844，DPR 1 |
| 当前采集浏览器 | Google Chrome 152.0.7977.64 |

Firefox、Safari、iOS Safari、微信内置浏览器和非 Chromium WebView 不在兼容矩阵中。

## 3. 固定页面

| 页面 ID | 路由 | 数据职责 |
| --- | --- | --- |
| P-home | `/` | 首屏、导航、瞬间、文章列表、侧栏音乐卡片和页脚 |
| P-post | `/archives/react-dui-zhao-su-cheng-wen-dang` | 封面、长文、目录、42 对代码 fence、表格和原生评论 |
| P-page | `/bi-ji` | 普通独立页面 |
| P-category | `/categories/javamian-xiang-dui-xiang` | 多文章分类列表与分页 |
| P-tag | `/tags/source-code-analysis` | 多文章标签列表与分页 |
| P-comments | `/liu-yan-ban` | 留言板、Halo 原生评论和已有评论数据 |
| P-newest | `/newest` | Halo 原生最近评论 |
| P-about | `/about` | 关于组件、地图、直接打赏；不再包含 51LA 与爱发电 |
| P-album | `/album` | 图库入口与图片场景 |

若固定内容被删除或改为非公开，必须在本文件中记录替代资源，不能静默换页。

## 4. 插件场景

### S0：无可选前台插件

目标：验证插件完全缺失时核心文章仍可阅读和导航。

临时停用这些前台插件：

- `PluginCommentWidget`
- `PluginSearchWidget`
- `PluginLinks`
- `PluginMoments`
- `PluginPhotos`
- `plugin-bilibili-bangumi`
- `equipment`
- `plugin-katex`
- `PluginFeed`

`halo-cli`、编辑器、应用市场、邮件模板和文本绘图不属于主题前台可选能力，不纳入 S0 开关范围。S0 完成后必须恢复原启用状态。

### S1：最小日常组合

只启用 `PluginCommentWidget`，验证文章、留言板和最近评论；其他 S0 列出的前台插件保持停用。

### S2：最终保留插件全开

启用本地环境中的全部保留前台插件：

| 插件 | 版本 |
| --- | --- |
| `PluginCommentWidget` | 3.2.2 |
| `PluginSearchWidget` | 1.7.1 |
| `PluginLinks` | 2.3.0 |
| `PluginMoments` | 1.17.1 |
| `PluginPhotos` | 2.1.2 |
| `plugin-bilibili-bangumi` | 1.4.1-beta.1 |
| `equipment` | 1.1.1 |
| `plugin-katex` | 3.0.0 |
| `PluginFeed` | 1.5.0 |

### S3：Halo 原生评论数据

以 S1 或 S2 为基础，要求：

- `comments.commentsEnable=true`。
- `PluginCommentWidget` 为 `STARTED`。
- P-post 和 P-comments 存在已审核评论。
- `/newest` 能列出 Halo 原生评论并跳转到来源页面。

## 5. 主题配置约束

| 配置 | 固定值/规则 |
| --- | --- |
| 主题模式 | 每张截图显式写入 `light` 或 `dark` localStorage，不依赖操作系统 |
| 侧栏 | `right-aside` |
| 首页/文章侧栏 | 保留 `music` 卡片，禁止临时修改排列 |
| 评论 | 开启，只使用 Halo 原生评论 |
| 右键菜单 | 开启，用于保留功能验证 |
| 开往 | 当前站点配置关闭；代码和设置保留，静态验收 |
| 3D 分类 | 当前站点配置为 `default`；3D 文件和设置保留，后续单独场景验证 |

脱敏主题配置备份 SHA-256：`8992fe548e606137487536191a81df9ab91b30f449598ab877a0d1791201924e`。备份位于仓库外，不提交 PAT、Token、Cookie、评论密钥或未脱敏配置。

## 6. 动态噪声处理

正式截图遵循以下规则：

1. 在页面脚本执行前写入指定主题模式的 localStorage。
2. 每页等待 `load` 完成后至少 3 秒，并确认 Shiki 和保留插件完成初始化。
3. 截图前通过测试脚本暂停 CSS animation/transition 和打字光标，不修改仓库样式。
4. 首页瞬间轮播、问候语、随机推荐和当前时间属于允许差异区域；截图清单必须标记。
5. 访问量、评论时间和文章日期不作为像素级通过条件。
6. 截图期间不修改文章、评论、主题设置或插件业务数据。
7. 失败的外部图片/API 请求单独记录，不能通过手工修图掩盖。

## 7. 场景恢复检查

每次插件矩阵切换后执行：

- [ ] `halo-cli plugin list --enabled true` 与目标场景一致。
- [ ] `halo-cli theme current` 返回 `theme-hanlo`、`READY`。
- [ ] 清理主题模板缓存。
- [ ] 核心路由返回期望状态。
- [ ] 测试结束后恢复 S2 插件状态。
