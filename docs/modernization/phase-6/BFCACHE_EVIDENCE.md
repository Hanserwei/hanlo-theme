# BFCache 真实浏览器证据

## 自动化边界

Playwright 的 headless Chromium、Firefox 与 WebKit 在当前 CI/本机环境中均报告
`pagehide.persisted === false`；Chromium CDP 给出的未恢复原因是 circumstantial
`BrowsingInstanceNotSwapped`。因此自动化用例明确分为：

- 真实 back/forward 文档 History 导航；
- `pagehide/pageshow` persisted 状态机单元测试；
- 合成 `pageshow.persisted === true` 时不重复挂载、只发出 restore 的控制器契约测试。

这些测试不再冒充真实 BFCache 命中。

## Headed Chrome + 真实 Halo

使用已配置的 Chrome DevTools MCP、Google Chrome `152.0.7977.75` 和本地 Halo 2.26，执行：

```text
首页 → 点击真实文章链接 → 浏览器后退 → 首页恢复
```

在首页进入 History 前记录 Realm token 和活动控制器，恢复后得到：

```json
[
  {
    "type": "pagehide",
    "persisted": true,
    "path": "/",
    "controllers": [
      "theme-mode",
      "content-elements",
      "categories-3d",
      "site-shell",
      "translation",
      "shiki",
      "effects",
      "page-widgets"
    ]
  },
  {
    "type": "hanlo:page:restore",
    "path": "/"
  },
  {
    "type": "pageshow",
    "persisted": true,
    "path": "/"
  }
]
```

恢复前后 Realm token 完全相同，8 个活动控制器名称和数量完全相同，restore 恰好一次；继续前进/后退时
首页仍多次报告 `pagehide.persisted === true`。这证明真实主题首页可进入 BFCache，并按阶段 6 契约恢复，
没有重新下载或重复挂载控制器。

文章详情是否进入 BFCache 仍取决于当前内容和插件组合；本阶段只承诺“浏览器判定可进入的页面”按正确
状态恢复。WebKit 的状态机和 History 已由自动化覆盖，真实 Safari 命中仍保留为公开 Release 前硬件门禁。
