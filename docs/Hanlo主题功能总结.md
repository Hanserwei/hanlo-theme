# Hanlo Theme 1.0.0 功能总结

## 总体结论

这是一个功能非常完整的 Halo 2.x 个人博客与生活方式主题，不只是简单的文章样式主题。它覆盖了博客内容展示、个人主页、社交互动、图库、追番、装备、音乐、打赏、评论和大量视觉交互。

当前主题版本以 [`theme.yaml`](../theme.yaml) 为准，是 **Hanlo Theme 1.0.0**，要求 **Halo >= 2.22.1**。项目中包含：

- 21 组后台主题设置
- 108 个 Thymeleaf HTML 模板
- 49 个 JavaScript 文件
- 273 个主题模板及静态资源文件

主要功能配置集中在 [`settings.yaml`](../settings.yaml)，文章、菜单、友链和相册的扩展字段位于 [`annotation-setting.yaml`](../annotation-setting.yaml)。

## 1. 博客基础功能

主题完整实现了 Halo 博客的常规页面：

- 首页文章流
- 文章详情页
- 普通独立页面
- 分类总览和分类文章页
- 标签云和标签文章页
- 按年月归档
- 作者文章列表
- 上一篇、下一篇
- 相关文章推荐
- 首页、分类、标签、归档分页
- 自定义 404、500 页面，并在错误页推荐最近文章
- 登录用户可从前台快速进入控制台或编辑当前文章

首页文章卡片支持：

- 单列、双列、三列布局
- 封面放在上方、左侧、右侧或交替显示
- 没有封面时使用随机图
- 置顶标记、分类、标签、摘要、相对发布时间
- “未读”提示
- 卡片擦亮动画
- 分类、标签或自定义链接导航条

相关实现位于 [`templates/index.html`](./templates/index.html) 和 [`templates/modules/post-list.html`](./templates/modules/post-list.html)。

## 2. 首页和导航

首页顶部可以组合出比较复杂的门户效果：

- 全屏首屏
- PC 与移动端分别设置背景图
- 视频动态壁纸
- 自定义打字机文案
- 接入“一言”随机文案
- 按时间段显示早安、午安、晚安等问候语
- 首页瞬间滚动条
- 可点击移动位置的宠物挂件
- 顶部 Banner
- 默认技术栈图标墙或自定义技术栈
- 自定义大标题、小标题和两个渐变快捷入口
- 最近六篇文章或人工指定文章推荐
- “今日推荐”卡片

首屏实现位于 [`templates/modules/header/index-img.html`](./templates/modules/header/index-img.html)，推荐区域位于 [`templates/modules/widgets/top-group.html`](./templates/modules/widgets/top-group.html)。

导航栏支持：

- Halo 主菜单和多级递归菜单
- 菜单图标和彩色 IconFont Symbol
- 横向或纵向子菜单
- 独立的站点名称左侧菜单
- PC、移动端菜单分别控制
- 搜索按钮
- 随机文章
- 深浅色切换
- “开往”随机博客
- 登录、退出和进入控制台
- 中控台入口
- 滚动进度和回到顶部
- 屏幕宽度不足时自动切换移动菜单

## 3. 文章阅读功能

文章页是该主题功能最丰富的部分，主要实现在 [`templates/post.html`](./templates/post.html)。

文章头部会显示：

- 大封面和波浪动画
- 原创或转载标记
- 分类和标签
- 作者
- 字数统计
- 预计阅读时间
- 发布时间和最后更新时间
- 访问热度
- 评论数量
- 博客独享或公众号同步状态
- 登录作者的快捷编辑入口

正文阅读支持：

- 根据文章封面自动提取主色
- 自动生成桌面及移动端目录
- 目录模糊效果
- 阅读模式
- 隐藏或显示侧栏
- 表格横向滚动适配
- 图片灯箱、幻灯、全屏和缩略图
- 相册瀑布流布局
- 过期文章提醒
- 深浅色自适应
- 图片懒加载和加载失败占位图

文章 AI 摘要支持：

- 每篇文章单独开启或关闭
- 使用文章摘要的本地模式
- Tianli GPT 模式
- 摘要切换按钮
- 随机摘要次数、请求 Key、Referer 等配置

文章底部支持：

- 两种版权声明样式
- 每篇文章分别设置原创、转载及声明链接
- “运营模式与责任”链接
- 微信、支付宝打赏
- 手机访问二维码
- 微博分享
- 复制文章链接
- 上一篇、下一篇
- 按同分类推荐 2 篇或 6 篇文章

## 4. 代码块功能

主题内置 Prism 代码高亮，也能检测 Halo Prism 插件。

内置代码块支持：

- 浅色、深色分别选择代码主题
- 约 30 多套代码配色
- 自动识别语言
- 代码标题
- 标题分割线
- 行号
- 一键复制
- 代码折叠
- 超高代码块限制与展开
- PJAX 切页后重新高亮

相关实现位于 [`templates/assets/js/halo.js`](./templates/assets/js/halo.js)。

## 5. 评论和互动

主题支持四套评论方案：

- Halo 默认 `plugin-comment-widget`
- Twikoo
- Artalk
- Waline

评论模板位于 [`templates/modules/comment.html`](./templates/modules/comment.html)。

附加评论功能包括：

- 评论系统总开关
- 评论懒加载
- 匿名评论，自动生成“形容词 + 蔬菜水果”昵称
- 默认匿名邮箱
- 评论区隐私政策入口
- 右下角热门评论弹幕
- 弹幕数量和间隔设置
- 博主身份识别
- 独立“最近评论”页面
- 最近评论页面同时适配默认评论、Twikoo、Artalk、Waline
- 侧栏最近评论
- 中控台最近评论
- 友链、瞬间、图库、追番等特殊页面评论

留言板还有单独的信封动画样式，可自定义信纸图片、标题、正文提示、底部文本和展开高度，相关实现位于 [`templates/comments.html`](./templates/comments.html)。

## 6. 特殊页面

| 页面 | 主要功能 |
| --- | --- |
| 关于页 | 个人标签、头像、介绍、想法、问候、职业、16 型人格、座右铭、游戏、追番、兴趣、音乐、地图、统计、心路历程、十年之约、打赏名单 |
| 友链页 | 友链分组、默认/美化/失联样式、网站截图、标签、标签颜色、随机访问、友链申请、底部自定义内容 |
| 互动友链 | 将友链头像放入 Box2D 物理画布，可点击“换个头像试试” |
| 瞬间页 | 展示文字、图片和视频瞬间，首页轮播最近瞬间 |
| 图库页 | 相册分组、分组封面、Banner、分组描述、标签、分页、瀑布流、图片灯箱 |
| 相册入口页 | 以卡片方式展示所有图库分组 |
| 追番页 | Bilibili 想看、在看、已看三种状态，显示评分、播放量、追番数、硬币、弹幕和分页 |
| 我的装备 | 按分组展示装备封面、名称、规格、描述和详情链接 |
| 音乐馆 | APlayer + Meting 歌单，可接网易云、QQ、酷狗等服务 |
| 待办清单 | 左右双栏、分组、完成/未完成状态、已完成划线 |
| 最近评论 | 汇总最近评论并跳转到对应文章或页面 |
| 朋友圈 | 文章统计、作者筛选、标题搜索、排序、升降序、滚动加载和错误重试 |

主题在 [`theme.yaml`](./theme.yaml) 中注册了 7 个可在 Halo 后台选择的自定义页面模板：

- 友情链接页面模板
- 关于页面模板
- 音乐页面模板
- 留言板页面模板
- 待办清单页面模板
- 相册页面模板
- 最近评论页面模板

## 7. 侧栏和中控台

侧栏可以放在左侧、右侧或完全隐藏，并能为首页、文章页、分类页、标签页、普通页面分别排列组件。

可用组件包括：

- 个人资料卡
- 社交媒体
- 微信公众号翻转卡片
- 爱发电赞助
- Steam 卡片
- 音乐卡片
- 友情链接
- 最新文章
- 热门文章
- 最新评论
- 分类
- 标签云
- 归档
- 网站统计
- 标签、归档、统计组合卡
- Google AdSense
- 自定义广告
- 自定义 HTML
- 文章目录

中控台集中展示：

- 最近评论
- 标签云
- 月份归档
- 微信、支付宝打赏
- 深浅色开关
- 侧栏开关
- 评论弹幕开关
- 音乐开关

## 8. 页脚功能

页脚支持：

- “了解更多”横条
- 左右社交媒体按钮
- 自定义中心 Logo，点击回到顶部
- Halo 菜单生成的多列链接
- 随机换一批友情链接
- 网站所有者和版权年份
- 实时运行天数、小时、分钟、秒
- 上班/下班状态徽标
- 自定义 Shields 徽标
- RSS 订阅
- 主题、关于入口
- ICP 和公安备案
- CC 版权协议
- 又拍云、阿里云、腾讯云、华为云或自定义云服务商标识
- 隐私协议提醒弹窗

相关实现位于 [`templates/modules/footer.html`](./templates/modules/footer.html)。

## 9. 外观、交互和体验

主题内置了大量前端交互：

- 跟随系统、固定深色、固定浅色
- 用户手动切换并保存在浏览器
- 没有系统偏好时按时间判断日夜
- 深色模式粒子背景
- 浅色、深色分别配置主题色
- 简体、繁体切换
- 自定义全局字体
- 全局背景图或背景视频
- 页面气泡动画
- 渐变滚动条
- 标签云随机颜色
- 离开网页和返回网页时动态修改标题
- 加载 Logo 和页面进度条
- 右下角操作按钮
- 响应式移动端菜单和独立移动端首屏图

可选自定义右键菜单包括：

- 前进、后退、刷新、回到顶部
- 复制选中文本
- 粘贴文本
- 引用文本到评论
- 新窗口打开链接或图片
- 复制、下载图片
- 站内搜索、百度搜索
- 音乐播放、暂停、上一首、下一首、复制歌名
- 随机文章、分类、标签
- 评论弹幕、深浅色、简繁切换

## 10. 性能与 SEO

主题在体验层面还实现了：

- PJAX 无刷新切页
- PJAX 后重新初始化评论、代码、目录、相册和音乐
- InstantPage 链接预加载
- Vanilla LazyLoad 图片懒加载
- Halo 缩略图生成
- 本地静态资源和自定义 CDN 二选一
- Open Graph 元数据
- Twitter Card 元数据
- 图片查看器和瀑布流按需加载
- 主题状态、侧栏状态和部分接口数据的本地缓存
- 51LA 统计接入

相关入口位于 [`templates/modules/layouts/layout.html`](./templates/modules/layouts/layout.html) 和 [`templates/modules/common/open-graph.html`](./templates/modules/common/open-graph.html)。

## 11. 插件依赖

[`README.md`](./README.md) 中声明的插件都是可选的，未安装时对应功能不显示或不可用：

- 评论插件
- 搜索插件
- 友链插件
- 瞬间插件
- Bilibili 追番插件
- 图库插件
- KaTeX 插件
- 我的装备插件
- Markdown/HTML 内容块插件
- 爱发电插件

### 插件 GitHub 地址

以下源码地址来自各插件对应的 Halo 应用市场页面，并已检查可以正常访问：

| 插件 | GitHub 仓库 |
| --- | --- |
| 评论组件 | [halo-dev/plugin-comment-widget](https://github.com/halo-dev/plugin-comment-widget) |
| 搜索组件 | [halo-dev/plugin-search-widget](https://github.com/halo-dev/plugin-search-widget) |
| 链接管理 | [halo-sigs/plugin-links](https://github.com/halo-sigs/plugin-links) |
| 瞬间 | [halo-sigs/plugin-moments](https://github.com/halo-sigs/plugin-moments) |
| Bilibili 追番插件 | [Roozenlz/plugin-bilibili-bangumi](https://github.com/Roozenlz/plugin-bilibili-bangumi) |
| 图库管理 | [halo-sigs/plugin-photos](https://github.com/halo-sigs/plugin-photos) |
| KaTeX | [halo-sigs/plugin-katex](https://github.com/halo-sigs/plugin-katex) |
| 装备管理 | [chengzhongxue/plugin-equipment](https://github.com/chengzhongxue/plugin-equipment) |
| Markdown/HTML 内容块 | [halo-sigs/plugin-hybrid-edit-block](https://github.com/halo-sigs/plugin-hybrid-edit-block) |
| 爱发电插件 | [carolcoral/plugin-afdian](https://github.com/carolcoral/plugin-afdian) |

代码还额外兼容：

- RSS Feed 插件
- PrismJS 插件
- 公众号或平台同步插件
- 友链自助申请插件
- Twikoo、Artalk、Waline 外部评论后端

## 12. 当前项目里需要留意的地方

有几项是“代码已经存在，但 1.0.0 配置还不完全闭环”：

- `templates/friends.html` 朋友圈模板引用了 `theme.config.link.fmomentsApiUrl`，但当前 `settings.yaml` 没有这个配置项。
- 旧友链鱼塘代码还引用了不存在的 `theme.config.fcircle.apiurl`。
- 相册的样式一引用了没有定义的 `theme.config.photos.bigTitle`。
- 瞬间页模板明确写着只展示最近 30 条，分页尚未实现。
- 仓库包含 DPlayer、HLS 等资源文件，但目前没有模板实际加载它们，因此不能算作当前已启用的视频播放功能。

## 总结

Hanlo Theme 是一套偏个人品牌展示、生活记录和社交互动的重型 Halo 主题，文章阅读只是其中一部分。它尤其适合带有关于页、瞬间、图库、友链、音乐、追番、装备和打赏体系的个人博客。
