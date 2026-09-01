# 阶段 4 依赖与替代登记

## npm 生产依赖

以下直接依赖由 `package.json` 精确声明并由 `pnpm-lock.yaml` 锁定。完整生产依赖图（含传递依赖）的包名、版本、许可证元数据、主页及包内 LICENSE/COPYING/NOTICE 文本由根目录 `THIRD_PARTY_NOTICES.txt` 记录。

| 依赖 | 版本 | 许可证 | 用途与加载范围 | 替换成本 |
| --- | --- | --- | --- | --- |
| `pjax` | `0.2.8` | MIT | 核心无刷新导航；进入主 ESM，所有页面使用 | 高：与页面生命周期、历史导航和元数据替换紧密耦合 |
| `shiki` | `4.4.3` | MIT | 仅支持的代码语言存在且设置启用时加载限定高亮分块 | 中：可退回纯文本或改为服务端高亮 |
| `swiper` | `14.2.0` | MIT | 首页瞬间条存在时动态加载 | 低：可改为原生垂直轮播 |
| `tocbot` | `4.36.8` | MIT | 同时存在带标题正文和目录目标时动态加载 | 中：需重写层级目录和滚动激活 |
| `qrcode` | `1.5.4` | MIT | 文章移动分享容器存在时动态生成 Canvas | 低：可改为服务端/API 图片 |
| `fast-average-color` | `9.5.2` | MIT | 动态文章封面配色启用且封面存在时加载 | 低：可使用固定主题色 |
| `dplayer` | `1.27.1` | MIT | `hao-dplayer` 内容元素存在时加载 | 中：可替换为原生 `<video>`，会失去现有播放器 UI |
| `hls.js` | `1.7.1` | Apache-2.0 | 仅 DPlayer 的 `.m3u8` 来源动态加载 | 中：Safari 可原生播放，其他浏览器需 HLS 实现 |
| `typed.js` | `2.0.12` | MIT | 首页打字元素存在时动态加载 | 低：可用原生定时器重写 |

开发类型依赖为 `@types/dplayer@1.25.6` 与 `@types/qrcode@1.5.6`；其余直接运行时包使用包自带类型。

## 第一方替代

- 原生 TypeScript/CSS：图库与灯箱、IntersectionObserver 懒加载、Snackbar、瞬间瀑布流、导航进度、内部链接预取、3D 分类和友链 Canvas。
- 关于页 `.hello-about` 动画使用 PointerEvent 与 CSS transform，不再分发 GSAP。
- `public/assets/css/friend-circle.css` 是 Hanlo 第一方友链可读性/响应式增强，不复制旧 FriendCircle 声明。
- `public/assets/css/shiki.css`、`categories-3d.css` 与 `phase4-runtime.css` 是主题展示样式，不是第三方可执行依赖。

## 平台集成

- Halo 评论由 `plugin-comment-widget` 所有，主题不复制或安装评论运行时。
- 侧栏音乐卡仅显示用户配置的远程图片与普通链接，不包含音乐播放器。
- 可选 Halo 插件 Finder 与组件继续由 Halo 插件生命周期管理。

## 已移除副本与来源决策

- 删除 `public/assets/libs/` 下 jQuery、Vue 2、Fancybox、DPlayer/HLS、Shiki、Swiper、Tocbot 等手工 vendor 副本；保留依赖改由 pnpm/Vite 生成。
- 删除旧互动友链 iframe、Box2D、ProtoClass 与自定义 vendor 应用，改为第一方 Canvas 控制器。
- 删除来自 immmmm / Rock-Candy-Tea FriendCircle 演示仓库、未在复制文件中声明许可证的 `heo-fcircle3.css`，没有把来源不明代码重新标记为第一方。
- 删除 GSAP 直接依赖，避免将其非 OSI 标准许可作为可再分发主题运行时；简单指针动画已原生重写。
- 删除主样式中完整 Fancybox 实现块及安全可机械移除的专用选择器。

## 通知生成与已知缺口

执行 `pnpm notices` 会从安装后的生产 pnpm 图重新生成 `THIRD_PARTY_NOTICES.txt`；`node scripts/generate-third-party-notices.mjs --check` 只校验且在漂移时失败。`pnpm validate`、`pnpm check` 和构建均包含该检查，主题打包 CLI 会把根通知文件放入 ZIP。

当前生成结果覆盖 106 个生产图包（包括 DPlayer 的传递依赖与 Shiki 子包），没有缺失许可证元数据；`emoji-regex@8.0.0` 包内没有 LICENSE/COPYING/NOTICE 文件，因此通知中明确标记文本缺口。此登记是来源与分发信息，不构成法律审核或许可适用性保证。

## 更新治理

`.github/dependabot.yml` 每月检查 pnpm/npm 依赖与 GitHub Actions。升级运行时依赖必须同时验证通知漂移、动态加载门禁、PJAX 重入、桌面/移动状态和最终 ZIP，不得仅根据 lockfile 更新成功就合并。
