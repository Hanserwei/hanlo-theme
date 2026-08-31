# P0-I3 裁剪后冒烟截图

## 1. 采集信息

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-08-31 |
| 运行时主题 | Hanlo Theme 1.0.0，P0-I3 裁剪后工作树 |
| Halo | `2.26.0-SNAPSHOT` |
| 浏览器 | Google Chrome 152.0.7977.64，headless new |
| 场景 | S2：最终保留插件均已启用 |
| 模式 | 浅色 |
| 桌面视口 | 1440×900，DPR 1 |
| 手机视口 | 390×844，DPR 1 |
| 等待 | 每页 8,000 ms 虚拟时间预算 |
| 格式 | WebP quality 82 |

## 2. 文件清单

| 文件 | 尺寸 | 字节数 | SHA-256 |
| --- | ---: | ---: | --- |
| `P0-BL-post__S2__P-category__desktop__light.webp` | 1440×900 | 168968 | `f53fa73fcb99e3c81f54396af7336c94479039fb778b685e2e8aa9cc28a5c987` |
| `P0-BL-post__S2__P-category__mobile__light.webp` | 390×844 | 61980 | `fe5cd8fb57d611da6a57d3ff8ac6bc53d172f8e8633fb1f6c633dad79cec8e2d` |
| `P0-BL-post__S2__P-comments__desktop__light.webp` | 1440×900 | 23692 | `ad69ab9bfc85bfd7da1bad88592e8e6e88e49c8a6bb413b8653ab3eb8dc0a095` |
| `P0-BL-post__S2__P-comments__mobile__light.webp` | 390×844 | 30660 | `5eed0bfed443ed1945a71f22bb07e37d06cfa913061cdb83e62afbbf4d3ce30d` |
| `P0-BL-post__S2__P-home__desktop__light.webp` | 1440×900 | 199062 | `37dc51878ebf016727d6965d1a6c2d8132cf8e8c6820bab06db25a6f959f2630` |
| `P0-BL-post__S2__P-home__mobile__light.webp` | 390×844 | 52764 | `727c04506413db23844703ff0d2db4cc083f6cc1067edf12b4669de7590b0a13` |
| `P0-BL-post__S2__P-page__desktop__light.webp` | 1440×900 | 33354 | `da77e1081e9eadecc482429665559074dcf040b975015ef65d6c762e2ed1b277` |
| `P0-BL-post__S2__P-page__mobile__light.webp` | 390×844 | 23478 | `880d488688a91b06e21b407e1270376732b605c553aca4430ebf3cbb42e4d389` |
| `P0-BL-post__S2__P-post__desktop__light.webp` | 1440×900 | 53838 | `2be550e157b698f16572ab5ece8868f59d196d81b4503bd77463cf2d96abc442` |
| `P0-BL-post__S2__P-post__mobile__light.webp` | 390×844 | 33750 | `388c3686e75e98b5d4ab86cfd12ef156ef64b3ff5b01c5bacb10d963da765856` |
| `P0-BL-post__S2__P-tag__desktop__light.webp` | 1440×900 | 179182 | `37fcb5b5bf27323bc53084b55a22b3125896bf89ca07f6579dd3f6a1428be3f6` |
| `P0-BL-post__S2__P-tag__mobile__light.webp` | 390×844 | 46276 | `14260607e0309e9a71790fa55743426513a4fef5082c9b3169eee6bd380311fb` |

## 3. 与删除前截图对比

使用 FFmpeg SSIM 对同路由、同视口截图进行快速比较。手机端分数为 0.985–0.997，桌面端除首页外为 0.938–0.994。首页桌面端为 0.725，主要受到打字动画、瞬间滚动和粒子/动态区域的采集时刻影响；人工检查未发现核心结构误伤。

这些截图仍是 P0-I3 冒烟证据。P0-I5 会在冻结动态区域后采集正式浅色/深色基线。

## 4. 快速查看

- [首页桌面](P0-BL-post__S2__P-home__desktop__light.webp)
- [首页手机](P0-BL-post__S2__P-home__mobile__light.webp)
- [文章桌面](P0-BL-post__S2__P-post__desktop__light.webp)
- [文章手机](P0-BL-post__S2__P-post__mobile__light.webp)
- [留言板桌面](P0-BL-post__S2__P-comments__desktop__light.webp)
- [留言板手机](P0-BL-post__S2__P-comments__mobile__light.webp)
