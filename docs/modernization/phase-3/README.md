# 阶段 3：JavaScript 与 TypeScript 模块化

## 1. 状态

实现、本地自动化和真实 Halo 2.26 页面矩阵验收已完成，阶段状态为“进行中”。按照总路线图
约定，待 CI 和合并门禁通过后再标记为“已完成”。本阶段没有提前删除 jQuery、Vue 2 或其他
第三方依赖，也没有把 Shiki 的远程运行时改成本地按需包；这些工作仍属于阶段 4。

本地结果和门禁说明见 [`COMPLETION_AUDIT.md`](COMPLETION_AUDIT.md)。

## 2. 模块结构

| 模块 | TypeScript 落点 | 职责 |
| --- | --- | --- |
| 公共核心 | `src/js/core/` | 配置校验、日期、DOM、剪贴板、资源加载、UI 通知和过期存储 |
| 主题模式 | `src/js/features/theme-mode/` | 浅色、深色、系统偏好和用户选择 |
| 站点壳层 | `src/js/features/site-shell/` | 导航、滚动、侧栏、目录、分页、图库、懒加载和页面状态 |
| 页面组件 | `src/js/features/page-widgets/` | 动态标题、页脚运行时间、问候、Typed、关于页和友链画布 |
| 内容元素 | `src/js/features/content-elements/` | 文章自定义元素；移除旧实现中的 `eval` |
| Shiki | `src/js/features/shiki/` | 代码高亮、复制、折叠、行号和评论区增量观察 |
| 朋友圈 | `src/js/features/friend-moments/` | API 分页、筛选、排序、统计、重试和滚动加载 |
| AI 摘要 | `src/js/features/post-ai/` | 本地/Tianli 摘要、逐字动画、推荐文章和模式切换 |
| 右键菜单 | `src/js/features/right-menu/` | 菜单状态、复制/粘贴、图片和导航操作 |
| 页面特效 | `src/js/features/effects/` | 气泡和深色星空动画 |
| 简繁转换 | `src/js/features/translation/` | 页面文本转换、状态保存和控件更新 |
| 追番 | `src/js/features/bangumi/` | 标签切换和客户端分页 |

所有功能控制器通过阶段 2 的 `PageControllerRegistry` 注册。事件监听器、定时器、动画帧、
Observer、请求和第三方实例由 `PageResourceScope` 持有，并在页面离开时释放。

## 3. 模板和配置契约

- `src/modules/variables/site-config.html` 输出完整的只读 `GLOBAL_CONFIG`，并由
  `validateThemeConfig` 在控制器挂载前校验。
- 站点交互使用 `data-hanlo-action` 和控制器事件委托，不再从模板调用 `heo`、`btf`、`halo`、
  `navFn` 或 `rm`。
- 首屏主题模式仍由 `<head>` 中的最小同步引导设置，避免模块延迟造成颜色闪烁；业务切换逻辑
  由 `theme-mode` 控制器负责。
- PJAX 初始化和第三方库标签继续保留在模板中，等待阶段 4 做依赖来源与按需加载治理。
- `link-canvas-data` 是不可执行的 `application/json` 配置，不是业务脚本入口。

阶段 2 的 `legacy-compatibility` 控制器以及 `window.saveToLocal`、`window.btf`、`window.heo` 已
删除。新业务模块只使用显式 import 和已声明的 Halo/PJAX/第三方接口。

## 4. 已删除的旧实现

- `public/assets/js/{utils,halo,main,heo,tw_cn,custom,fmoments}.js`
- `public/assets/zhheo/{blogex,rightmenu}.js`
- `public/assets/libs/gpt/post-ai.js`
- `public/assets/libs/shiki/shiki.js`
- `public/assets/libs/canvas/{bubble,dark}.js`
- 未实际挂载 DOM 的 `public/assets/libs/fcircle/heo-fcircle3mini.js`
- 未被模板引用的 `public/assets/libs/moments/random-friends-post.js`
- 关于页、追番、Typed、动态标题、页脚、问候和友链画布中的可执行内联业务脚本

Halo 原生评论组件没有主题侧 provider 适配脚本；阶段 0 已删除的 Twikoo、Artalk 和 Waline
不会在本阶段重新引入。阶段 0 已删除的音乐馆和导航播放器同样没有待迁移脚本。

## 5. 验收命令

```bash
pnpm check
pnpm test:unit
PLAYWRIGHT_EXECUTABLE_PATH=/usr/sbin/google-chrome-stable pnpm test:e2e
HALO_BASE_URL=http://127.0.0.1:8090 \
PLAYWRIGHT_EXECUTABLE_PATH=/usr/sbin/google-chrome-stable pnpm test:e2e --grep @live
pnpm build
```

Playwright 自带 Chromium 下载在本机网络环境中超时，因此浏览器回归使用系统 Chrome。
设置 `HALO_BASE_URL=http://127.0.0.1:8090` 后，真实 Halo 连续导航和页面矩阵均已通过；截图及
路由证据见 [`evidence/live/README.md`](evidence/live/README.md)。
