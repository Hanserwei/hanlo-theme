# 阶段 5 真实 Halo 验收证据

## 环境

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-09-02 |
| Halo | `2.26.0-SNAPSHOT`，最低兼容要求保持 `>= 2.26.0` |
| 主题源码/模板 | `theme-hanlo` `1.2.0` |
| 浏览器 | Google Chrome 152 |
| 矩阵 | 桌面 1440×900、移动 390×844；浅色与深色四种组合 |
| 主 CSS | `hanlo-theme-1.2.0.css`，295,923 bytes，gzip 52,096 bytes |

## 自动化结果

```text
HALO_BASE_URL=http://127.0.0.1:8090 \
PLAYWRIGHT_EXECUTABLE_PATH=/usr/sbin/google-chrome-stable \
pnpm exec playwright test --grep @live

12 passed
```

- 四个浏览器项目分别完成连续 PJAX、浏览器前进/后退和直接加载页面矩阵。
- 13 个真实路由 × 4 个视口/模式，共 52 次直接访问；HTTP、主题资源、Console 和页面异常均为 0。
- 9 个固定页面 × 4 个视口/模式，共保存 36 张截图并人工查看联系图。
- 首页、文章与相册分别验证条件 CSS 请求集合；未出现其他页面入口泄漏。
- 合成浏览器门禁另有 52 项通过，其中包含 4 张 Design System 像素快照。

## 本地主题版本说明

本地 Halo 的 Theme 资源在文件同步后仍缓存登记版本 `1.1.1`，已有 PAT 和浏览器会话无主题管理权限。
测试目录因此临时创建 `1.1.1` 文件名兼容别名；别名与 `1.2.0` CSS/JS 逐字节相同，SHA-256
分别一致。别名只存在于 `/home/hanserwei/halo2-dev/themes/theme-hanlo`，未进入 Git 或主题 ZIP。
安装/升级最终 ZIP 时，Halo 会按 `theme.yaml` 正常登记收尾版本 `1.2.1`。

## 截图与完整性

截图文件名格式：

```text
phase5-live__P-<page>__<desktop|mobile>__<light|dark>.webp
```

固定页面为首页、文章、普通页、分类、标签、留言、最近评论、关于和相册。人工复核未发现导航缺失、
主题模式错误、明显布局崩坏或大面积空白；阶段五首次合并全局 CSS 时发现的级联顺序与条件样式泄漏
均已修复。`SHA256SUMS` 覆盖全部 36 张 WebP，并已通过 `sha256sum --check`。

## 恢复点

修改前已创建两个未纳入 Git 的可恢复归档：

- `/home/hanserwei/halo-project/.backups/hanlo-theme-phase5-css-before-modernization-20260901T1545Z.tar.zst`
- `/home/hanserwei/halo-project/.backups/halo-runtime-theme-hanlo-before-phase5-20260901T1545Z.tar.zst`
