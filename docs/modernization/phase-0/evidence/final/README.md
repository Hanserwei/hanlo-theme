# 阶段 0 正式视觉与行为基线

## 1. 采集范围

| 场景 | 页面 | 视口 | 模式 | 截图数 |
| --- | --- | --- | --- | ---: |
| S2 保留插件全开 | 首页、文章、独立页面、分类、标签、留言板 | desktop、mobile | light、dark | 24 |
| S0 无可选前台插件 | 首页、文章、留言板 | desktop、mobile | light、dark | 12 |
| 合计 |  |  |  | 36 |

采集环境为 Halo `2.26.0-SNAPSHOT`、Hanlo Theme 1.0.0、Google Chrome 152.0.7977.64。视口和稳定规则见 [`TEST_SCENARIOS.md`](../../TEST_SCENARIOS.md)。

全部截图均为 WebP quality 82。文件哈希保存在 [`SHA256SUMS`](SHA256SUMS)，已通过 `sha256sum -c` 验证。

关键页面冷加载、缓存刷新和 PJAX 网络数据保存在 [`RESOURCE_BASELINE.json`](RESOURCE_BASELINE.json)，SHA-256 为 `bdd89f3d0485764e01b4ac790d52374c0771ffb10615d007f7f155d6d392b895`。

## 2. 行为结果

| 能力 | 结果 |
| --- | --- |
| S0 插件缺失降级 | 核心页面 200，无空评论入口、无插件脚本异常 |
| S1 最小原生评论 | PluginCommentWidget 3.2.2 正常加载 |
| S2 保留插件恢复 | 9/9 前台插件恢复为 `STARTED` |
| Shiki | 42 个代码块、复制按钮和折叠按钮；折叠交互通过 |
| 右键菜单 | 桌面端可显示 |
| 移动菜单 | 打开时锁定滚动，关闭后恢复 |
| 浏览器历史 | 分类 → 标签 → 后退 → 前进路径正确 |
| DOM 唯一性 | 导航后保持单一 `#nav` 和 `#body-wrap` |

## 3. 目录说明

- [`S2/`](S2/)：六条核心路由的桌面/手机、浅色/深色正式基线。
- [`S0/`](S0/)：首页、文章和留言板在无前台可选插件时的安全降级基线。

命名格式：

```text
P0-BL-final__<场景>__<页面>__<视口>__<模式>.webp
```

## 4. 已知问题

- 桌面部分页面存在 `/null` 相对路径 404，来源为现有 Fancybox CSS 占位配置。
- Typed.js 在无等待的快速 PJAX 压力切换下可能访问已离开页面节点。
- Halo 仍报告缺少可选 `templates/layout.html` 页面布局契约。

这些问题均已在 P0-I3/P0-I5 日志中登记，不作为本次已删除功能的残留。
