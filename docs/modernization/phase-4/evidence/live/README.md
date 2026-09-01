# 阶段 4 真实 Halo 验收证据

## 环境

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-09-01 |
| Halo | `2.26.0-SNAPSHOT`，最低兼容要求保持 `>=2.26.0` |
| 主题 | `theme-hanlo` `1.1.0`，状态 `READY=TRUE` |
| 浏览器 | Google Chrome 152；桌面 1440×900 浅色、移动 390×844 深色 |
| 运行时入口 | `/themes/theme-hanlo/assets/js/hanlo-runtime-1.1.0.js`；页面与动态分块共享同一模块 URL |

## 自动化结果

```text
HALO_BASE_URL=http://127.0.0.1:8090 \
PLAYWRIGHT_EXECUTABLE_PATH=/usr/sbin/google-chrome-stable \
pnpm exec playwright test --grep @live

4 passed
```

- 连续执行首页、文章、独立页面、分类、标签、留言板及浏览器前进/后退，共 12 次页面进入；生命周期错误和页面错误均为 0。
- 13 个真实路由分别在桌面浅色和移动深色加载，共 26 次直接访问；HTTP、主题资源、浏览器 Console 和页面异常检查全部通过。
- 真实页面没有请求 `assets/libs`、jQuery、Vue 2 或 Fancybox。
- 首轮真实测试发现 Halo 系统代码注入仍使用 jQuery，以及查询参数使核心 ESM 被浏览器实例化两次。代码注入已在备份后等价迁移为原生 DOM/Web Animations；运行时入口改为版本化文件名并与延迟分块共享同一 URL。修复后的完整矩阵通过。

## 可选路径与网络门禁

- 临时启用 3D 分类后渲染 44 张语义化链接卡片；桌面指针倾斜生效，`prefers-reduced-motion: reduce` 下不写入 transform，PJAX 重入无错误。
- 本地友链数据为空，因此真实 `/links` 不挂载 Canvas；含内联友链数据的合成 Playwright 夹具验证了第一方 Canvas 分块和刷新交互。
- 将自定义静态资源 URL 临时指向不可用地址后，页面显示可访问告警；SSR 内容、本地核心 ESM、本地阶段 4 CSS 和 PJAX 导航仍工作，页面错误为 0。
- 验收结束后已恢复 `categories.use=default`、`link.linksCanvas=false` 和 `other.staticResource.use=local`。
- 逐路由请求证据见 [`NETWORK_EVIDENCE.json`](NETWORK_EVIDENCE.json)，临时配置路径见 [`OPTIONAL_PATH_EVIDENCE.json`](OPTIONAL_PATH_EVIDENCE.json)。

## 截图

9 个固定页面各保存桌面浅色和移动深色截图，共 18 张 WebP。已人工查看两张 3×3 联系图，未发现导航缺失、明显布局崩坏、主题模式错误或大范围空白；图库页在当前插件数据下保留可读空状态。文件完整性见 [`SHA256SUMS`](SHA256SUMS)。

## 恢复点

运行时主题、主题配置和系统代码注入均在改动前单独备份到 `/home/hanserwei/halo-project/.backups/`。这些备份不进入 Git，且系统级代码注入备份不包含在主题发布制品中。
