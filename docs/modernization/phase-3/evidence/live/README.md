# 阶段 3 真实 Halo 页面证据

## 环境

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-09-01 |
| 站点 | `http://127.0.0.1:8090/` |
| Halo | `2.26.0-SNAPSHOT`，前台 generator 元数据确认 |
| Halo 进程 | Eclipse Temurin 21.0.11 |
| Node.js | 24.16.0 |
| pnpm | 10.33.0 |
| 浏览器 | Google Chrome 152.0.7977.64 |
| 主题 | `theme-hanlo` 1.0.0 |
| 运行时产物 | 服务端与仓库 `templates/assets/js/hanlo-runtime.js` SHA-256 一致 |

本地 Halo 的独立主题副本位于 `/home/hanserwei/halo2-dev/themes/theme-hanlo`。测试前使用
`pnpm build-only` 生成最新 `templates/`，再同步到该开发主题；被替换的旧产物备份在
`/tmp/hanlo-theme-backup.PWQg2L`。

## 自动化结果

- 桌面浅色和移动深色各完成 10 次 PJAX 导航、后退和前进，共 24 次页面进入。
- 两种视口各直接加载 13 个路由，共 26 次完整文档导航。
- 每次导航检查 `#nav` 和 `#body-wrap` 唯一、`GLOBAL_CONFIG` 冻结、主题模式和控制器挂载。
- 页面异常、Console error、失败主题请求、主题资源 HTTP 4xx/5xx 均为 0。
- `/friends` 与 `/todolist` 在当前 Halo 数据集中没有对应自定义页面，返回 404；不计入通过矩阵。

直接加载矩阵：

| 页面 | 路由 | 桌面浅色 | 移动深色 |
| --- | --- | --- | --- |
| 首页 | `/` | 通过 | 通过 |
| 文章 | `/archives/react-dui-zhao-su-cheng-wen-dang` | 通过 | 通过 |
| 普通页面 | `/bi-ji` | 通过 | 通过 |
| 分类 | `/categories/javamian-xiang-dui-xiang` | 通过 | 通过 |
| 标签 | `/tags/source-code-analysis` | 通过 | 通过 |
| 留言板 | `/liu-yan-ban` | 通过 | 通过 |
| 最近评论 | `/newest` | 通过 | 通过 |
| 关于 | `/about` | 通过 | 通过 |
| 相册入口 | `/album` | 通过 | 通过 |
| 瞬间 | `/moments` | 通过 | 通过 |
| 图库 | `/photos` | 通过 | 通过 |
| 追番 | `/bangumis` | 通过 | 通过 |
| 装备 | `/equipments` | 通过 | 通过 |

## 截图

保存 9 个固定页面的桌面浅色与移动深色视口截图，共 18 张 WebP：

- 桌面：1440×900，DPR 1。
- 移动：390×844，DPR 1。
- 文件名格式：`phase3-live__P-<page>__<viewport>__<mode>.webp`。
- `SHA256SUMS` 记录所有截图摘要。

截图已人工抽查，未发现导航、内容卡片、评论区、页脚或响应式布局的明显结构回归。
