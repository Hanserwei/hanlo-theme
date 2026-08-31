# 阶段 0 功能清单

## 1. 使用方式

本表面向“是否继续维护”决策，不重复 [`Hanlo主题功能总结.md`](../../Hanlo主题功能总结.md) 的所有使用说明。

分类含义：

| 分类 | 含义 |
| --- | --- |
| 保留 | 用户可见行为需要保持，阶段 1 及以后不得无意改变 |
| 重写 | 功能价值保留，但现有实现计划在后续阶段替换 |
| 可选 | 继续支持，但默认可关闭且不应影响核心页面 |
| 删除 | 已接受删除决策后，完整移除设置、模板、脚本、样式和资源 |
| 待确认 | 阶段 0 不能自行推断，需维护者决策 |
| 不存在 | 路线图提到但当前仓库未找到可执行实现 |

“初始结论”是 P0-I0 的工程建议，只有带“已接受”决策编号的删除项才可实施。

## 2. 核心内容与导航

| ID | 功能 | 主要代码落点 | 依赖 | 初始结论 | 决策/说明 |
| --- | --- | --- | --- | --- | --- |
| F-001 | 首页文章流、置顶、分页和多列卡片 | `templates/index.html`、`templates/modules/post-list.html` | Halo Post Finder | 保留 | 核心主题能力 |
| F-002 | 文章详情、元数据和上下篇 | `templates/post.html` | Halo Post Finder | 保留 | 核心主题能力 |
| F-003 | 普通独立页面 | `templates/page.html` | Halo SinglePage | 保留 | 核心主题能力 |
| F-004 | 分类总览与分类文章页 | `templates/categories.html`、`templates/category.html` | Halo Category Finder | 保留 | 3D 展示单独见 F-044 |
| F-005 | 标签总览与标签文章页 | `templates/tags.html`、`templates/tag.html` | Halo Tag Finder | 保留 | 核心主题能力 |
| F-006 | 归档和作者文章页 | `templates/archives.html`、`templates/author.html` | Halo Finder | 保留 | 核心主题能力 |
| F-007 | 404、500 错误页 | `templates/error/` | Halo 错误变量 | 保留 | 需纳入冒烟检查 |
| F-008 | Halo 菜单、多级导航和移动菜单 | `modules/nav.html`、`modules/widgets/nav-*` | Halo Menu Finder | 保留 | 核心导航能力 |
| F-009 | 搜索入口 | 导航和插件插槽 | `plugin-search-widget` | 可选 | 插件缺失时需安全降级 |
| F-010 | 随机文章 | `layout.html`、`nav-right.html` | Post Finder、PJAX | 可选 | 保留行为，后续重写全局实现 |
| F-011 | 登录、退出、控制台和编辑入口 | 导航、文章模板 | Halo 认证状态 | 保留 | 需覆盖登录/匿名差异 |
| F-012 | Open Graph、Twitter Card 和基础 SEO | `modules/common/open-graph.html`、`modules/head.html` | Halo 页面变量 | 保留 | 阶段 6 再扩展自动检查 |

## 3. 首页与文章阅读

| ID | 功能 | 主要代码落点 | 依赖 | 初始结论 | 决策/说明 |
| --- | --- | --- | --- | --- | --- |
| F-013 | 首页首屏、PC/移动背景和视频背景 | `modules/header/index-img.html`、`settings.yaml:top` | 外部或本地媒体 | 可选 | 作为核心视觉场景保留一个固定图片样本 |
| F-014 | 打字文案、一言和时段问候 | 首屏模板、业务脚本 | 外部一言可选 | 可选 | 外部接口失败不得阻塞页面 |
| F-015 | 首页瞬间滚动条 | `modules/moment.html` | `plugin-moments`、Swiper | 可选 | 插件缺失场景需基线 |
| F-016 | 顶部 Banner、技术栈和推荐卡片 | `modules/widgets/banner-group.html`、`top-group.html` | 主题配置、Post Finder | 可选 | 产品价值待长期评估，但阶段 0 暂不删除 |
| F-017 | 文章目录、阅读模式和侧栏切换 | `post.html`、`toc-bot.html`、`main.js` | Tocbot、PJAX | 重写 | 行为保留，阶段 2/3 重构生命周期 |
| F-018 | 图片灯箱、相册和瀑布流 | 文章模板、`view-image`、`waterfall` | 第三方库 | 重写 | 行为保留，阶段 3/4 按需加载 |
| F-019 | 图片懒加载和失败占位 | `layout.html`、`utils.js` | Vanilla LazyLoad | 重写 | 保留体验，阶段 4 治理依赖 |
| F-020 | 文章 AI 摘要 | `post.html`、`libs/gpt/post-ai.js` | Tianli GPT 或本地摘要 | 可选 | 需增加启用/禁用场景说明 |
| F-021 | Shiki 高亮、标题、行号、复制和折叠 | `macro/shiki-code.html`、`libs/shiki/` | 运行时 Shiki CDN | 重写 | 阶段 4 改成本地按需构建 |
| F-022 | 版权声明 | `modules/post/copyright/` | 文章注解 | 保留 | 原创/转载均需样本 |
| F-023 | 文章分享、二维码和相关文章 | `post.html`、QRCode、relatedPosts | Finder、QRCode | 可选 | 是否精简分享入口可后续单独决策 |
| F-024 | 文章打赏 | `aboutReward`、文章底部相关模板 | 微信/支付宝二维码 | 可选 | P0-DEC-005 已接受保留；不属于爱发电实现 |

## 4. 评论与互动

| ID | 功能 | 主要代码落点 | 依赖 | 初始结论 | 决策/说明 |
| --- | --- | --- | --- | --- | --- |
| F-025 | Halo 原生评论组件 | `modules/comment.html` | `plugin-comment-widget` | 保留 | 建议作为唯一必保评论实现 |
| F-026 | Twikoo 评论 | `modules/comment/Twikoo.html`、`js/comment/twikoo.js`、`libs/twikoo/` | 外部后端 | 删除 | P0-DEC-012 已接受 |
| F-027 | Artalk 评论 | `modules/comment/Artalk.html`、`js/comment/artalk.js`、`libs/artalk/` | 外部后端 | 删除 | P0-DEC-012 已接受 |
| F-028 | Waline 评论 | `modules/comment/Waline.html`、`js/comment/waline.js` | 外部后端和 CDN | 删除 | P0-DEC-012 已接受 |
| F-029 | 评论懒加载和匿名身份 | `settings.yaml:comments`、评论适配脚本 | 外部评论实现 | 删除 | 随外部 provider 删除 |
| F-030 | 评论弹幕 | `zhheo/commentBarrage.*`、`halo.js` | 外部评论数据 | 删除 | 当前实现不支持 Halo 原生评论，随外部 provider 删除 |
| F-031 | 最近评论页面、侧栏和中控台 | `new_comment.html`、`aside/comments.html`、`console.html` | 所选评论实现 | 可选 | 必须随评论收敛同步简化 |
| F-032 | 留言板信封样式 | `comments.html`、`settings.yaml:envelope_comment` | 评论系统 | 可选 | 页面能力与评论 provider 分开决策 |

## 5. 特殊页面与插件集成

| ID | 功能 | 主要代码落点 | 依赖 | 初始结论 | 决策/说明 |
| --- | --- | --- | --- | --- | --- |
| F-033 | 友情链接页面 | `page_links.html`、链接宏 | `plugin-links` | 可选 | 建议保留 |
| F-034 | 互动友链物理画布 | `links.html`、`libs/link/` | Box2D 等旧库 | 可选 | 资源较重，后续可单独评估 |
| F-035 | 朋友圈/鱼塘 | `friends.html`、`fmoments.js`、`libs/fcircle/` | 外部 API | 可选 | 当前存在配置不闭环问题 |
| F-036 | 瞬间页面 | `moments.html` | `plugin-moments` | 可选 | 当前只展示最近 30 条 |
| F-037 | 图库和相册入口 | `photos.html`、`album.html` | `plugin-photos` | 可选 | 样式一引用缺失配置 `photos.bigTitle` |
| F-038 | Bilibili 追番 | `bangumis.html` | 追番插件 | 可选 | 插件缺失需安全降级 |
| F-039 | 我的装备 | `equipments.html` | 装备插件 | 可选 | 插件缺失需安全降级 |
| F-040 | 音乐馆页面 | `music.html` | APlayer、Meting、外部 API | 删除 | P0-DEC-009 已接受；只保留侧栏音乐卡片 |
| F-041 | 待办清单页面 | `todolist.html` | 页面配置 | 可选 | 当前注册为自定义页面模板 |
| F-042 | 关于页面和组件 | `about.html`、`modules/about-widgets*` | 主题配置、部分外部接口 | 可选 | 51LA 和打赏子能力单独决策 |
| F-043 | KaTeX、内容块等插件兼容 | `layout.html` 和内容模板 | Halo 可选插件 | 可选 | 记录保留插件版本矩阵 |

## 6. 侧栏、页脚与可选入口

| ID | 功能 | 主要代码落点 | 依赖 | 初始结论 | 决策/说明 |
| --- | --- | --- | --- | --- | --- |
| F-044 | 3D 分类页 | `categories.html`、`libs/no3d/` | Vue 2、no3d | 可选 | P0-DEC-010 已接受保留 |
| F-045 | 个人资料、文章、分类、标签、归档和统计卡片 | `modules/widgets/aside/` | Halo Finder | 可选 | 保留可配置侧栏体系 |
| F-046 | 微信公众号卡片 | `aside/wechat.html`、微信图片资源 | 外部链接/二维码 | 删除 | P0-DEC-006 已接受 |
| F-047 | 侧栏爱发电赞助 | `aside/power.html`、`halo.js`、`images/afadian/` | 爱发电插件或接口 | 删除 | P0-DEC-004 已接受；不包含直接打赏 |
| F-048 | Google/自定义广告卡片 | `aside/adbox.html`、`settings.yaml:sidebar.adbox` | Google Ads 可选 | 删除 | P0-DEC-003 已接受 |
| F-049 | 侧栏音乐卡片 | `aside/music.html`、`settings.yaml:sidebar.music` | 外部图片服务 | 可选 | P0-DEC-009 已接受保留 |
| F-050 | Steam 卡片 | `aside/steam.html` | 外部卡片服务 | 可选 | 暂无路线图删除要求 |
| F-051 | 自定义 HTML 侧栏 | `aside/custom_html.html` | 受信任主题配置 | 可选 | 保留，记录其自定义代码风险 |
| F-052 | 页脚社交、菜单、友链和备案 | `modules/footer.html` | Halo Menu/Link Finder | 保留 | 核心站点信息 |
| F-053 | 页脚运行时间、状态徽标和云厂商标识 | `footer-style-one.html`、footer 设置 | 外部或本地图片 | 可选 | “推广”是否包含云厂商标识需确认 |
| F-054 | 关于页/文章赞赏名单和支付入口 | `aboutReward`、about reward 模板 | 配置和二维码 | 可选 | P0-DEC-005 已接受保留 |

## 7. 全局交互、统计与技术能力

| ID | 功能 | 主要代码落点 | 依赖 | 初始结论 | 决策/说明 |
| --- | --- | --- | --- | --- | --- |
| F-055 | 浅色、深色和跟随系统 | `head.html`、`heo.js`、CSS | 浏览器颜色偏好 | 保留 | 必须纳入视觉基线 |
| F-056 | 响应式布局和移动端菜单 | 主 CSS、导航脚本 | 现代浏览器 | 保留 | 必须纳入移动基线 |
| F-057 | PJAX 无刷新导航 | `layout.html`、`libs/pjax/` | 全局生命周期代码 | 重写 | 阶段 2 建统一生命周期前不替换 |
| F-058 | 右键菜单 | `widgets/right-menu.html`、`zhheo/rightmenu.js` | jQuery、全局对象 | 可选 | P0-DEC-011 已接受保留 |
| F-059 | 开往随机博客 | `nav-right.html`、`blogex.js` | travellings.cn | 可选 | P0-DEC-007、P0-DEC-013 已接受保留 |
| F-060 | 51LA 统计与关于页统计卡 | `common/51-la.html`、`statistics-map.html` | 51.la | 删除 | P0-DEC-008 已接受 |
| F-061 | 左下角导航播放器 | `nav-music.html`、APlayer/Meting | 外部音乐 API | 删除 | P0-DEC-009 已接受；侧栏音乐卡片不受影响 |
| F-062 | 简繁转换 | `tw_cn.js` | 全局 DOM 处理 | 可选 | 后续模块化，不在阶段 0 改写 |
| F-063 | 动态页面标题、粒子背景和 Snackbar | common 模板、canvas、snackbar | 第三方小库 | 可选 | 保持可关闭 |
| F-064 | 预加载、懒加载、主色提取等全局资源 | `head.html`、`layout.html` | 多个本地 vendor | 重写 | 阶段 4 按需治理 |
| F-065 | “群聊/推广”描述 | 对应友链与开往能力 | `plugin-links`、travellings.cn | 可选 | P0-DEC-013 已澄清并接受保留，不存在独立群聊模块 |

## 8. 已知不闭环或疑似无用项

这些项不能仅凭静态结果直接删除，需在 P0-I1/P0-I3 中确认和验证。

| ID | 现象 | 代码证据 | 建议动作 |
| --- | --- | --- | --- |
| G-001 | 朋友圈模板引用 `theme.config.link.fmomentsApiUrl`，设置中未定义 | `templates/friends.html` | 决定修复、删除朋友圈或继续外部默认值 |
| G-002 | 旧友链鱼塘代码引用不存在的 `theme.config.fcircle.apiurl` | 旧 fcircle 资源 | 若不再使用则随朋友圈清理，否则补齐契约 |
| G-003 | 图库样式一引用未定义的 `theme.config.photos.bigTitle` | 图库模板 | 保留样式一则修复配置，否则删除该样式 |
| G-004 | DPlayer、HLS 资源在仓库中，但未找到模板实际加载 | `templates/assets/libs/dplayer/`、`hls/` | 真实页面验证后作为无用资源单独删除 |
| G-005 | APlayer、Meting 和相关 CSS 即使导航音乐关闭也在全站加载 | `layout.html` | 若保留音乐，阶段 4 改为按需；若全删，阶段 0 移除 |
| G-006 | Shiki 本地入口在浏览器运行时加载远程完整包 | `libs/shiki/shiki.js` | 功能保留，阶段 4 本地化并裁剪语言/主题 |
| G-007 | 全站脚本含已注释或疑似旧功能分支 | `blogex.js`、`heo.js`、`halo.js` | 仅随对应已删除功能清理，避免无依据大扫除 |

## 9. 负责人和状态维护

- `待确认` 项负责人：仓库维护者。
- 静态引用和删除影响分析负责人：实施者。
- 每个结论变更必须附 `P0-DEC-*` 编号或实际删除提交。
- P0-I3 完成后，应把所有“删除”项补充残留扫描结果；P0-I6 再做全量复核。
