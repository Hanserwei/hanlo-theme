# 阶段 6 基线与性能证据

## 1. 固化基线

| 项目 | 值 |
| --- | --- |
| 实施前提交 | `01a9d599cad8cd913f0a36922b0a9856cc17c86f` |
| 实施前主题版本 | `1.2.1` |
| 目标主题版本 | `2.0.0` |
| Halo | `registry.fit2cloud.com/halo/halo:2.26`，readiness `UP` |
| 上一正式 ZIP | `dist/theme-hanlo-1.2.1.zip`，2,468,145 bytes |
| 上一 ZIP SHA-256 | `55fa0b4a511c8333b3b6e76eb2f55749fcf5b4e79c13f7b11a0f888c383037f5` |
| Chrome | Google Chrome `152.0.7977.75` |
| Firefox | Playwright Firefox `146.0.1`（revision 1509） |
| WebKit | Playwright WebKit `26.0`（revision 2248，官方 noble 容器） |

实施前通过临时 detached Git worktree 挂载旧模板，并顺序复用同一 Halo 数据卷采样；采样结束后删除临时
容器与 worktree，恢复开发容器。两个版本使用相同内容、主题 ConfigMap、插件、Chrome、1440×900 视口、
禁用 HTTP cache 的冷加载设置。

已安装插件基线：AI Foundation 1.1.0、App Store 1.18.1、Equipment 1.1.1、Bilibili Bangumi 1.4.0、
Comment Widget 3.2.2、Feed 1.5.0、KaTeX 3.0.0、Links 2.3.0、Moments 1.18.0、Photos 2.1.2、
Search Widget 1.7.1、Sitemap 1.3.0、Shiki 1.5.1 等。Halo MCP 检查全部 21 个活动主题设置组，未发现
用户配置引用已退休导航对象；为避免把潜在密钥或私人 URL 写入仓库，没有提交未脱敏 ConfigMap 原文。

## 2. 路由与功能基线

固定 13 路由：

```text
/
/archives/spring-boot-starter-api-request-logging-aspect
/privacy-policy
/categories/spring-backend
/tags/java
/comments
/newest
/about
/album
/moments
/photos
/bangumis
/equipments
```

自动化同时覆盖评论、搜索、Shiki、Tocbot、KaTeX、Swiper、图库、瞬间瀑布流、相册条件 CSS、错误页、
下载、新窗口、hash、History 和未完成可选请求离页。

## 3. 冷加载性能

每个版本执行 5 次独立 BrowserContext、禁用 cache、`networkidle + 1500ms` 后读取 buffered LCP/CLS。

| 指标 | 1.2.1 样本 | 1.2.1 中位数 | 2.0.0 样本 | 2.0.0 中位数 | 结果 |
| --- | --- | ---: | --- | ---: | --- |
| LCP (ms) | 536, 296, 304, 296, 208 | 296 | 152, 112, 136, 128, 128 | 128 | 改善 56.8% |
| CLS | 0.1396, 0.1249, 0.1525, 0.1393, 0.1401 | 0.1396 | 0.0156, 0.0141, 0.0153, 0.0151, 0.0161 | 0.0153 | 改善 89.0%，低于 0.1 |

CLS 改善来自把首页 `full-page` 条件 CSS 从 body 片段提升到 head，消除首屏从 25rem 切换到 100vh 的
晚到样式重排。

## 4. 暖缓存导航性能

首页与同一文章页预热后交替导航 10 次。计时从真实 anchor 激活到新文档 `HanloLifecycle.whenIdle()`；
过渡后的 250ms 间隔不计入样本。

| 版本 | 请求模型 | 10 次样本 (ms) | 中位数 | P95/最大值 |
| --- | --- | --- | ---: | ---: |
| 1.2.1 | PJAX XHR | 201.8, 258.1, 197.3, 163.6, 203.4, 144.5, 194.5, 156.7, 232.3, 149.5 | 195.9 | 258.1 |
| 2.0.0 | document | 331.3, 149.7, 252.8, 139.4, 253.0, 153.3, 259.9, 148.2, 259.1, 143.9 | 203.1 | 331.3 |

中位数只增加 `7.2ms`，远低于允许的 `+250ms`。2.0.0 的 10 次请求全部为 `document`，旧请求头为 0；
最后一个文档中的主 CSS、runtime loader 与主 ESM `transferSize` 均为 0。统计 counter 仅在有可统计主体的
5 个文章文档各请求一次，没有单文档重复 pageview。

## 5. 资源体积

| 资源 | 1.2.1 | 2.0.0 | 变化 |
| --- | ---: | ---: | ---: |
| 主 ESM | 117,831 bytes | 99,754 bytes | -15.3% |
| 主 ESM `gzip -9` | 44,591 bytes | 39,925 bytes | -10.5% |
| 主 CSS | 296,190 bytes | 295,964 bytes | -226 bytes |
| 主 CSS `gzip -9` | 51,583 bytes | 51,542 bytes | -41 bytes |

最终 `dist/theme-hanlo-2.0.0.zip` 为 2,818,276 bytes、221 个条目，SHA-256 为
`4fdce061bb31cd1e1ff193464f099f713d4cd009c293286654f03afacf99b502`；包含
`templates/layout.html`、第三方通知和全部 2.0.0 版本化资源，不包含 1.2.1 兼容别名。

PJAX 删除后没有引入新的导航运行时第三方依赖。生产依赖许可清单由 106 项降为 105 项。

## 6. 自动预算

真实 Halo Playwright 用例固定以下门槛：

- 三次冷加载中位 CLS `<= 0.1`。
- 三次冷加载中位 LCP `<= 296 × 1.05 = 310.8ms`。
- 十次暖缓存导航中位数 `<= 195.9 + 250 = 445.9ms`。
- 10 次导航均为 document 且不存在旧请求头。
- 每个文档最多一个 tracker counter 请求。
- 最后文档重复使用的主 CSS/runtime/ESM `transferSize === 0`。
