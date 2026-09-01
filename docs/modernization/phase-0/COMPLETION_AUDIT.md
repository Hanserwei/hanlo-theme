# 阶段 0 完成审计

## 1. 审计结论

阶段 0 的实施、运行时验证、视觉基线和资源基线已经完成。实施与验收通过提交 `9a0d77d` 落到 `master`，[`MODERNIZATION_ROADMAP.md`](../../MODERNIZATION_ROADMAP.md) 已标记阶段 0 为“已完成”。

## 2. 明确需求与证据

| 需求 | 结论 | 证据 |
| --- | --- | --- |
| 删除 Google AdSense 和自定义广告 | 通过 | P0-DEC-003；设置、模板、样式和引用残留扫描为 0 |
| 删除爱发电 | 通过 | P0-DEC-004；侧栏、Finder/API、资源和文档已删除；直接打赏保留 |
| 删除微信公众号组件 | 通过 | P0-DEC-006；侧栏配置、模板、样式和图片已删除 |
| 删除 51LA | 通过 | P0-DEC-008；全站脚本、关于页请求、设置和样式已删除 |
| 保留友链与开往 | 通过 | `PluginLinks` 2.3.0 恢复为 STARTED；友链/开往模板、设置和脚本仍在 |
| 只保留侧栏音乐卡片 | 通过 | 首页 `.card-music=1`；音乐馆、导航播放器和 APlayer/Meting 已删除 |
| 评论只保留 Halo 原生支持 | 通过 | PluginCommentWidget 3.2.2 正常加载；外部 provider 资源与分支为 0 |
| Halo `>=2.26.0` | 通过 | 最终 ZIP 升级 API 返回 200；当前主题 `requires>=2.26.0`、`READY=TRUE` |
| 只支持桌面/手机 Chromium | 通过 | Chrome 152 桌面与手机视口基线，非 Chromium 不在测试合同中 |
| 使用本地 Halo 和 PAT | 通过 | Halo CLI 只从 `.env.local` 注入 PAT，文档和日志不含 Token |
| 截图随 Git 保存 | 通过 | 正式基线 36 张 WebP，`SHA256SUMS` 校验通过 |

## 3. 路线图阶段 0 验收

| 验收项 | 结果 | 证据 |
| --- | --- | --- |
| 功能清单有决策结果 | 通过 | [`FEATURE_INVENTORY.md`](FEATURE_INVENTORY.md)、[`DECISION_REGISTER.md`](DECISION_REGISTER.md) |
| 桌面与移动核心截图 | 通过 | S2 24 张、S0 12 张 |
| 最低 Halo 版本可升级并启用 | 通过 | ZIP 2,353,855 bytes；升级 HTTP 200；READY TRUE |
| 主题设置可保存 | 通过 | `colorScheme=system` 同值写回与读取一致 |
| 废弃功能无设置、模板、脚本、样式和专属资源 | 通过 | 精确标识残留扫描为 0；共享 IconFont 除外并已解释 |
| 浅色、深色、无插件和保留插件行为 | 通过 | S0/S1/S2/S3 场景记录与截图 |
| 安装包和关键页面资源 | 通过 | [`REGRESSION_BASELINE.md`](REGRESSION_BASELINE.md)、`RESOURCE_BASELINE.json` |

## 4. 最终静态结果

| 指标 | 裁剪前 | 裁剪后 |
| --- | ---: | ---: |
| HTML | 107 | 98 |
| JavaScript | 48 | 39 |
| CSS | 25 | 21 |
| `templates/` 文件 | 234 | 208 |
| 静态资源字节 | 6,598,813 | 4,230,695 |
| vendor 字节 | 2,234,834 | 1,341,475 |
| 已知全站本地集合 | 897,009 | 761,650 |
| 主题 ZIP | 4,008,711 | 2,353,855 |

## 5. 阶段 0 遗留问题的后续状态

这些不是阶段 0 阻塞项；阶段 0–3 收尾复核后的状态如下：

1. **仍待后续集成**：Halo 报告 `MissingLayoutTemplate`，主题尚未提供可选的插件页面布局契约；
   不影响主题安装、启用或阶段 0–3 的页面合同。
2. **已解决**：当前源码和构建产物中已无 Fancybox `/null` 占位。
3. **已解决**：阶段 2 统一生命周期会在离页时取消 Typed.js 延迟任务并销毁实例，连续导航回归通过。
4. **待阶段 4/6**：首页冷加载图片和外部资源仍需按需加载与性能预算治理。
5. **待阶段 4**：Shiki 仍需改为本地按语言和主题打包。
6. **环境提醒**：本地 `.env.local` 权限仍需由维护者按实际共享方式决定是否收紧为 `0600`。

## 6. 提交记录与后续入口

- 实施与验收提交：`9a0d77d chore: complete phase zero modernization baseline`。
- 本次文档收尾提交负责将路线图阶段 0 状态标记为“已完成”。
- 阶段 1 应以正式截图和资源基线作为无意回归判断依据。
