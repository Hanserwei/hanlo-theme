# Hanlo Theme 图片配置指南

本文用于记录 Hanlo Theme 1.0.0 中「基础」「顶部」「侧栏」「页脚」四个设置组涉及的图片入口、推荐尺寸、内容建议、处理方式和上线检查流程，方便后续建站直接复用。

> 文档中的相对文件路径均以主题工程根目录为基准。

适用范围：

- Hanlo Theme 1.0.0
- Halo 2.26 本地测试环境
- 图片通过 Halo 附件本地存储策略上传
- 配置路径以 `theme.config` 下的 JSON 路径表示

> 本文尺寸是根据 Hanlo Theme 1.0.0 的 Setting Schema、模板 CSS 和本次实际渲染结果整理的。主题升级后应重新检查 `settings.yaml` 和对应模板。

范围边界：本文只覆盖用户指定的「基础」「顶部」「侧栏」「页脚」四组。Hanlo Theme 的「布局」「文章」「关于」等其他设置组也有文章随机封面、关于页背景、打赏二维码等图片字段，应在配置对应功能时另行整理。

## 一页速查

| 用途 | 推荐尺寸 | 比例 | 推荐格式 | 建议体积 |
| --- | ---: | ---: | --- | ---: |
| PC 首屏背景 | 1920×1080 | 16:9 | WebP / JPEG | 250–500 KB |
| 手机首屏背景 | 1080×1920 | 9:16 | WebP / JPEG | 150–350 KB |
| 全局背景 | 1920×1080 | 16:9 | WebP / JPEG | 200–500 KB |
| 今日推荐封面 | 1200×675 | 16:9 | WebP / JPEG | 100–250 KB |
| 宠物挂件 | 512×512 | 1:1 | 透明 WebP / PNG | 30–150 KB |
| 技术栈图标 | 128×128 | 1:1 | SVG / WebP / PNG | 小于 30 KB |
| 个人卡片背景 | 840×990 | 28:33 | WebP / JPEG | 80–250 KB |
| 个人卡片贴纸 | 256×256 | 1:1 | 透明 WebP / PNG | 小于 80 KB |
| 公众号卡片背景 | 900×330 | 30:11 | WebP / JPEG | 50–180 KB |
| 公众号正面 / 背面 | 1000×400 | 20:8 | WebP / PNG / JPEG | 80–250 KB |
| 音乐卡片正反面 | 600×810 | 20:27 | WebP / JPEG | 60–200 KB |
| Steam 卡片 | 600×810 | 20:27 | WebP / JPEG | 60–200 KB |
| 侧栏自定义广告 | 600×400 | 3:2 | WebP / JPEG | 60–180 KB |
| 页脚中心 Logo | 200×200 | 1:1 | 透明 WebP / PNG | 小于 50 KB |
| 上班 / 下班徽标 | 700×400 | 14:8 | WebP / PNG / SVG | 30–150 KB |
| 页脚框架徽标 | 700×400 | 14:8 | WebP / PNG / SVG | 30–150 KB |
| 自定义云服务商 Logo | 240×80 | 3:1 | SVG / 透明 WebP / PNG | 小于 50 KB |

## 通用制作原则

### 1. 不要拉伸原图

Hao 多数背景使用 `cover` 或 CSS `background-size`。应先等比放大，再从中间裁剪到目标比例，不要直接把原图压成固定宽高。

建议使用：

```text
scale=目标宽高并保持比例 → center crop=目标宽高
```

### 2. 为文字保留安全区域

- 首屏背景：主体尽量放在中间，四周预留约 15% 安全区。
- 手机首屏：主体不要靠左右边缘，避免窄屏裁掉。
- 今日推荐：标题会覆盖图片，避免在文字区域放复杂细节。
- 个人卡片：头像、名称和按钮会覆盖图片，背景应降低对比度。
- 徽标：主要文字和图形放在中央 80% 范围内。

### 3. 照片与透明素材使用不同格式

- 风景、照片、渐变背景：优先 WebP，其次 JPEG。
- Logo、贴纸、宠物、二维码：优先透明 WebP、PNG 或 SVG。
- 不建议把需要透明背景的贴纸和 Logo 保存为 JPEG。
- AVIF 体积更小，但应先确认目标浏览器和附件处理链路兼容。

### 4. 控制文件大小

- 1920×1080 大背景建议小于 500 KB，最多不要超过 1 MB。
- 侧栏卡片建议小于 200 KB。
- Logo、图标和徽标建议小于 50–100 KB。
- 同时开启首屏和全局背景时，首页会加载两张大图，应更加重视压缩。

### 5. 配置中优先使用站内相对地址

本地附件上传后的地址通常类似：

```text
/upload/example.jpg
```

相对地址能跟随站点域名变化，迁移开发、预发布和生产环境时更方便。需要确认备份中包含附件文件。

## 基础设置组

Hanlo Theme 1.0.0 的「基础」组没有专用 `$formkit: attachment` 图片字段，主要包含：

- 站点名称
- 建站时间
- ICP 备案
- 公安备案
- 版权协议

因此正常情况下不应为了放图片而修改基础组。

### 可选：在站点名称中嵌入图片

`basics.siteTitle` 是支持 HTML 的代码字段，技术上可以写 `<img>`，但这不是专用图片配置，容易影响导航高度和移动端布局。

如果确实需要图片站点名称：

| 项目 | 建议 |
| --- | --- |
| 原始尺寸 | 240×80 或 300×100 |
| 页面显示高度 | 约 32–40 px |
| 格式 | 透明 SVG / WebP / PNG |
| 内容 | 横向文字 Logo，不要使用复杂壁纸 |

示例：

```html
<img src="/upload/site-title-logo.webp" alt="站点名称" style="height:36px;width:auto">
```

除非已在 PC 和手机导航中测试，否则更推荐继续使用纯文本站点名称。

### 站点 Logo 和侧栏头像不在这四组内

默认个人卡片中的头像读取 Halo 的站点 Logo：如果站点 Logo 为空，才回退到 Hao 内置 Logo。因此正式站点头像应在 Halo Console 的站点设置中配置，不是修改 `sidebar.profile`。

推荐站点 Logo / 头像：

| 项目 | 建议 |
| --- | --- |
| 尺寸 | 512×512，最低 256×256 |
| 比例 | 1:1 |
| 格式 | 透明 WebP / PNG |
| 内容 | 头像、品牌符号、简化 Logo |

## 顶部设置组

### 首页第一屏

#### `top.above.index_img`

| 项目 | 说明 |
| --- | --- |
| 用途 | PC 首页全屏首屏背景 |
| 推荐尺寸 | 1920×1080；高分屏可用 2560×1440 |
| 比例 | 16:9 |
| 建议内容 | 横向风景、建筑、抽象背景；主体居中 |
| 启用条件 | `top.above.enable_above=true` 且 `enable_above_video=false` |

#### `top.above.phone_index_img`

| 项目 | 说明 |
| --- | --- |
| 用途 | 手机首页首屏背景 |
| 推荐尺寸 | 1080×1920 |
| 比例 | 9:16 |
| 建议内容 | 竖构图，主体位于中间偏上 |
| 启用条件 | 与 PC 首屏相同 |

Setting Schema 的预览比例写成了 16:9，但模板在手机视口中使用背景覆盖。正式建站更推荐准备独立的 9:16 手机图，而不是复用 PC 横图。

#### `top.above.index_video`

这是动态壁纸视频，不属于图片字段。启用视频后，PC / 手机首屏图片只适合作为加载失败时的后备素材。建议 MP4 H.264、1080p、无音轨、短循环，并严格控制体积。

### 全局背景

#### `top.global_background.global_background_img`

| 项目 | 说明 |
| --- | --- |
| 用途 | 全站页面底层背景 |
| 推荐尺寸 | 1920×1080 或 2560×1440 |
| 比例 | 16:9 |
| 建议内容 | 低对比度、低细节、暗部或浅色留白较多的图片 |
| 启用条件 | `enable_global_background_img=true` 且视频模式为 false |

全局背景会位于大量卡片和正文后方，过亮、过花会降低文字可读性。正式使用建议提前降低饱和度、亮度或增加暗色蒙层。

### 宠物挂件

#### `top.climb.climbImg`

| 项目 | 说明 |
| --- | --- |
| 用途 | 首页瞬间栏附近可点击移动的宠物挂件 |
| 推荐尺寸 | 512×512，最低 270×270 |
| 比例 | 1:1 或接近正方形 |
| 建议内容 | 宠物、吉祥物、人物半身；背景透明 |
| 推荐格式 | 透明 WebP / PNG |
| 启用条件 | `climbEnable=true`、顶部 Banner 和瞬间栏可用 |

模板 CSS 最大显示宽度约 270 px，上传 512 px 是为了兼顾高分屏。

### Banner 左侧技术栈图标

#### `top.BannerLeft.techStack[].url`

字段名是 `url`，实际用途是技术栈图标图片路径。

| 项目 | 说明 |
| --- | --- |
| 推荐尺寸 | 128×128，页面显示通常更小 |
| 比例 | 1:1 |
| 推荐格式 | SVG / 透明 WebP / PNG |
| 建议内容 | 编程语言、框架、工具 Logo |
| 启用条件 | `bannersBackground=techStack` |

建议所有图标使用相同画布和视觉边距，避免大小参差。

### 今日推荐封面

#### `top.BannerRight.todayRecommendContent.todayRecommendCover`

| 项目 | 说明 |
| --- | --- |
| 用途 | 首页右侧“今日推荐”卡片背景 |
| 推荐尺寸 | 1200×675；最低 600×338 |
| 比例 | 16:9 |
| 建议内容 | 文章封面、专题图、横向壁纸 |
| 启用条件 | `recentTop=true`、`todayRecommend=true` |

## 侧栏设置组

### 个人卡片

#### `sidebar.profile.backgroundImg`

| 项目 | 说明 |
| --- | --- |
| 用途 | 默认个人资料卡片背景 |
| 推荐尺寸 | 840×990；最低约 280×330 |
| 比例 | 28:33，接近竖图 |
| 建议内容 | 人像环境图、工作台、低对比度风景 |
| 生效样式 | `profileStyle=default` |

虽然 Setting Schema 标注了 16:9 预览，字段提示和实际卡片布局更接近 280×330。正式图片应按竖向卡片制作。

#### `sidebar.profile.stickerImg`

| 项目 | 说明 |
| --- | --- |
| 用途 | “样式一”头像旁的小贴纸 |
| 推荐尺寸 | 256×256 |
| 比例 | 1:1 |
| 建议内容 | Emoji、吉祥物、认证角标 |
| 推荐格式 | 透明 WebP / PNG |
| 生效样式 | `profileStyle=one` |

`backgroundImg` 与 `stickerImg` 分别属于两个不同的个人卡片样式，不会同时显示。可以都配置好，切换样式时直接复用。

### 公众号卡片

#### `sidebar.wechat.wechatImg`

| 项目 | 说明 |
| --- | --- |
| 用途 | 公众号卡片底层背景 |
| 推荐尺寸 | 900×330 |
| 比例 | 30:11 |
| 建议内容 | 品牌背景、渐变、公众号名称；不要直接放小二维码 |

模板实际显示区域约为 300×110，本尺寸相当于 3 倍图。

#### `sidebar.wechat.wechatImgFace`

| 项目 | 说明 |
| --- | --- |
| 用途 | 公众号翻转卡片正面 |
| 推荐尺寸 | 1000×400 |
| 比例 | 20:8，也就是 2.5:1 |
| 建议内容 | 关注提示、品牌口号、公众号名称 |

#### `sidebar.wechat.wechatImgBack`

| 项目 | 说明 |
| --- | --- |
| 用途 | 公众号翻转卡片背面 |
| 推荐尺寸 | 1000×400 |
| 比例 | 20:8 |
| 建议内容 | 真实公众号二维码和简短扫描提示 |
| 推荐格式 | PNG / WebP，避免有损压缩破坏二维码 |

测试时可以使用普通壁纸验证翻转效果，正式建站必须替换为真实公众号物料。

### 音乐卡片

以下四个字段分别用于浅色 / 深色模式的正面和翻转背面：

- `sidebar.music.lightMsimg`
- `sidebar.music.lightBackMsimg`
- `sidebar.music.darkMsimg`
- `sidebar.music.darkBackMsimg`

| 项目 | 说明 |
| --- | --- |
| 推荐尺寸 | 600×810 |
| 比例 | 20:27 |
| 实际显示区域 | 约 300×405 |
| 建议内容 | 歌单封面、最近常听、音乐统计截图 |
| 推荐格式 | WebP / JPEG |

这些字段可以直接写静态图片，也可以写第三方动态音乐卡片接口。使用第三方接口时应先确认 URL 中的歌单 ID 不是示例 `xxxxxx`。

### Steam 卡片

#### `sidebar.steam.cardSteam`

| 项目 | 说明 |
| --- | --- |
| 推荐尺寸 | 600×810 |
| 比例 | 20:27 |
| 建议内容 | Steam 统计、游戏库、游戏封面拼图 |
| 推荐格式 | WebP / JPEG |

可以使用静态图进行布局测试；正式使用动态卡片服务时，需要把 URL 中的 Steam ID 替换为真实 ID，并检查接口隐私和稳定性。

### 自定义广告图片

#### `sidebar.adbox.ad_custom.ad_pic_url`

此字段是普通文本 URL，不是附件选择器。

| 项目 | 说明 |
| --- | --- |
| 推荐尺寸 | 600×400 或 1200×628 |
| 推荐比例 | 3:2 或约 1.91:1 |
| 建议内容 | 活动 Banner、产品图、站内推荐 |
| 启用条件 | 侧栏包含 `adbox`，且 `adType=customAd` |

广告图应同时配置 `ad_redirect_url`，并避免使用会伪装成系统按钮的素材。

## 页脚设置组

### 页脚中心 Logo

#### `footer.social_media.centerImg`

| 项目 | 说明 |
| --- | --- |
| 用途 | 页脚社交按钮中间、点击回到顶部的 Logo |
| 推荐尺寸 | 200×200；最低 100×100 |
| 实际显示尺寸 | 约 50×50 |
| 比例 | 1:1 |
| 推荐格式 | 透明 WebP / PNG / SVG |
| 建议内容 | 站点 Logo、头像、简化图标 |

### 社交媒体自定义图片

`footer.social_media.socialMediaLeft[].icon` 和 `socialMediaRight[].icon` 支持图标或自定义 HTML。若使用 `<img>`：

| 项目 | 建议 |
| --- | --- |
| 原始尺寸 | 64×64 或 128×128 |
| 格式 | SVG / 透明 WebP / PNG |
| 内容 | 社交平台 Logo |

该字段会进入 HTML，必须只使用可信内容，并为图片添加 `alt`。

### 上班和下班徽标

#### `footer.footerContent.style_one.work_img`

#### `footer.footerContent.style_one.offduty_img`

| 项目 | 说明 |
| --- | --- |
| 推荐尺寸 | 700×400；最低 350×200 |
| 比例 | 14:8，也就是 1.75:1 |
| 建议内容 | “工作中 / 休息中”状态徽标、简单插画 |
| 推荐格式 | WebP / PNG / SVG |
| 启用条件 | `runtime_enable=true` |

正式徽标建议使用带文字的扁平设计或 SVG；普通壁纸只能验证图片加载和时间切换逻辑。

### 自定义徽标列表

#### `footer.footerContent.style_one.bdageitem[].shields`

| 项目 | 说明 |
| --- | --- |
| 推荐尺寸 | 700×400，或按 14:8 等比缩小 |
| 建议内容 | Halo、云服务、开源协议、运行状态徽标 |
| 推荐格式 | SVG / 透明 WebP / PNG |
| 启用条件 | `bdageitem_enable=true` |

每个徽标还需要：

- `link`：点击跳转地址
- `message`：悬停提示文字

### 自定义云服务商 Logo

#### `footer.footerContent.default_enable_group.yunzhichi_url`

| 项目 | 说明 |
| --- | --- |
| 推荐尺寸 | 240×80 或同等 3:1 横向比例 |
| 建议内容 | 云服务商 Logo |
| 推荐格式 | SVG / 透明 WebP / PNG |
| 启用条件 | `yunzhichi=true` 且 `yunzhichi_list=custom_cloud` |

`yunzhichi_url_link` 在 Schema 中也被声明成 attachment，但语义上是“点击跳转地址”，应填写普通 `https://...` URL，而不是上传一张图片。

### “了解更多”Logo

`footer.footer_bar.logo` 是支持 HTML 的代码字段，不是专用图片字段。如果使用图片：

| 项目 | 建议 |
| --- | --- |
| 原始尺寸 | 240×60 或 320×80 |
| 格式 | SVG / 透明 WebP / PNG |
| 内容 | 横向文字 Logo |
| 页面显示高度 | 建议限制为 32–40 px |

## 本次功能测试的图片映射

本次原图目录：

```text
/home/hanserwei/Pictures/Wallpapers/api-random-download/
```

原始 PNG 未被覆盖。处理后的测试图上传到 Halo 后使用以下相对地址：

| 配置用途 | 原始文件 | 处理尺寸 | 当前 Halo 地址 | 最终状态 |
| --- | --- | ---: | --- | --- |
| PC 首屏 | `wall_1780495686.png` | 1920×1080 | `/upload/top-hero-desktop-1920x1080.jpg` | 已启用 |
| 手机首屏 | `wall_1780750351.png` | 1080×1920 | `/upload/top-hero-mobile-1080x1920.jpg` | 已启用 |
| 全局背景 | `wall_1780500113.png` | 1920×1080 | `/upload/top-global-background-1920x1080.jpg` | 已启用 |
| 今日推荐 | `wall_1780750347.png` | 1200×675 | `/upload/top-today-recommend-1200x675.jpg` | 已启用 |
| 宠物挂件 | `wall_1783701852.png` | 512×512 | `/upload/top-climb-512x512.jpg` | 已启用，测试用非透明图 |
| 个人卡片背景 | `wall_1780750349.png` | 840×990 | `/upload/sidebar-profile-840x990.jpg` | 已启用 |
| 个人卡片贴纸 | `wall_1780818583.png` | 256×256 | `/upload/sidebar-sticker-256x256.jpg` | 已配置；样式一时显示 |
| 公众号背景 | `wall_1780927039.png` | 900×330 | `/upload/sidebar-wechat-bg-900x330.jpg` | 已启用 |
| 公众号正面 | `wall_1780750347.png` | 1000×400 | `/upload/sidebar-wechat-face-1000x400.jpg` | 已启用，需换正式物料 |
| 公众号背面 | `wall_1780495686.png` | 1000×400 | `/upload/sidebar-wechat-back-1000x400.jpg` | 已启用，需换真实二维码 |
| 音乐浅色正面 | `wall_1780500113.png` | 600×810 | `/upload/sidebar-music-light-600x810.jpg` | 已启用 |
| 音乐浅色背面 | `wall_1780750349.png` | 600×810 | `/upload/sidebar-music-back-light-600x810.jpg` | 已启用 |
| 音乐深色正面 | `wall_1780818583.png` | 600×810 | `/upload/sidebar-music-dark-600x810.jpg` | 已启用 |
| 音乐深色背面 | `wall_1783701852.png` | 600×810 | `/upload/sidebar-music-back-dark-600x810.jpg` | 已启用 |
| Steam 卡片 | `wall_1780750351.png` | 600×810 | `/upload/sidebar-steam-600x810.jpg` | 已启用 |
| 页脚 Logo | `wall_1780927039.png` | 200×200 | `/upload/footer-logo-200x200.jpg` | 已启用，正式版建议透明 Logo |
| 上班徽标 | `wall_1780750347.png` | 700×400 | `/upload/footer-work-700x400.jpg` | 已启用 |
| 下班徽标 | `wall_1780495686.png` | 700×400 | `/upload/footer-offduty-700x400.jpg` | 已启用 |
| Halo 框架徽标 | `wall_1780818583.png` | 700×400 | `/upload/footer-badge-700x400.jpg` | 已启用 |

本次配置还做了以下功能测试调整：

- 开启首页第一屏。
- 开启全局背景。
- 开启宠物挂件。
- 首页侧栏加入音乐和 Steam 卡片。
- 音乐和 Steam 测试卡片的点击地址暂设为 `/`。
- 开启页脚自定义徽标。
- 个人卡片最终保持 `profileStyle=default`；贴纸已用 `profileStyle=one` 单独验证。

## FFmpeg 裁剪模板

本次使用 FFmpeg 的等比放大和中心裁剪，不会修改原图：

```bash
ffmpeg -hide_banner -loglevel error -y \
  -i source.png \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080" \
  -frames:v 1 -q:v 4 -pix_fmt yuvj420p \
  output-1920x1080.jpg
```

可复用函数：

```bash
crop_jpeg() {
  local input="$1"
  local output="$2"
  local width="$3"
  local height="$4"

  ffmpeg -hide_banner -loglevel error -y \
    -i "$input" \
    -vf "scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height}" \
    -frames:v 1 -q:v 4 -pix_fmt yuvj420p \
    "$output"
}
```

JPEG 4:2:0 要求宽高为偶数。像 1200×675 这样的奇数高度可使用：

```bash
-pix_fmt yuvj444p
```

本次完整处理脚本位于：

```text
build/hanlo-image-assets/process-images.sh
```

该目录被 Git 忽略，并且执行项目根目录的 `./gradlew clean` 后可能被删除。本文保留了核心命令，因此不依赖该临时文件也能重新制作。

## 上传到 Halo

### 1. 先确认存储策略

```bash
halo-cli attachment policies --json
```

本地存储策略示例：

```text
default-policy
```

### 2. 上传图片

```bash
attachment_json=$(halo-cli attachment upload \
  --file ./output-1920x1080.jpg \
  --policy default-policy \
  --json)

attachment_name=$(printf '%s' "$attachment_json" | jq -r '.metadata.name')
permalink=$(printf '%s' "$attachment_json" | jq -r '.status.permalink')
```

当前 CLI 的 `attachment upload` 不直接接受 `--tags`，需要上传后更新：

```bash
halo-cli attachment update "$attachment_name" \
  --tags hanlo-theme \
  --json
```

### 3. 验证附件

```bash
curl -fL \
  -o /dev/null \
  -w 'HTTP %{http_code} %{content_type} %{size_download} bytes\n' \
  "https://your-halo.example${permalink}"
```

至少确认：

- HTTP 200
- `Content-Type` 是预期图片类型
- 文件体积没有异常增大
- 浏览器可以直接打开

## 写入主题配置

### 修改一个字段

```bash
halo-cli theme config-set theme-hanlo \
  /top/above/index_img \
  '"/upload/top-hero-desktop-1920x1080.jpg"'
```

布尔值不要加字符串引号：

```bash
halo-cli theme config-set theme-hanlo \
  /top/above/enable_above \
  true
```

### 合并一组配置

准备局部 JSON：

```json
{
  "top": {
    "above": {
      "enable_above": true,
      "enable_above_video": false,
      "index_img": "/upload/top-hero-desktop-1920x1080.jpg",
      "phone_index_img": "/upload/top-hero-mobile-1080x1920.jpg"
    }
  }
}
```

执行递归合并：

```bash
halo-cli theme config-import theme-hanlo \
  --file ./hanlo-images.json
```

不要随意使用 `--replace`，否则局部 JSON 会覆盖掉其他完整主题配置。

### 清除主题缓存

```bash
halo-cli theme invalidate-cache theme-hanlo
```

## 备份与回滚

修改前导出完整配置：

```bash
halo-cli theme config-export theme-hanlo \
  --output ./theme-hanlo-backup.json \
  --include-secrets
```

备份可能包含评论系统 Token 等敏感字段，应设置为 `0600`、禁止提交 Git，并在使用后安全保存或删除。

完整回滚：

```bash
halo-cli theme config-import theme-hanlo \
  --file ./theme-hanlo-backup.json \
  --replace \
  --yes

halo-cli theme invalidate-cache theme-hanlo
```

如果只需回滚一个字段，优先用 `config-set` 写回旧值。

## 上线前验证清单

### 图片本身

- [ ] 所有图片 URL 返回 HTTP 200。
- [ ] `Content-Type` 与文件格式一致。
- [ ] PC 首屏和手机首屏分别测试。
- [ ] 图片没有被拉伸。
- [ ] 文字、头像和按钮没有遮挡主体。
- [ ] 深色和浅色模式下都能看清文字。
- [ ] 二维码使用 PNG / WebP 并能真实扫码。
- [ ] Logo、宠物和贴纸需要透明背景时没有使用 JPEG。

### 页面功能

- [ ] `/` 首页返回 200。
- [ ] `/about` 关于页返回 200。
- [ ] 首页第一屏正确显示 PC 和手机图片。
- [ ] 全局背景没有降低正文可读性。
- [ ] 宠物挂件可以点击移动。
- [ ] 个人卡片 `default` 和 `one` 两种样式分别测试。
- [ ] 公众号卡片正反面翻转正常。
- [ ] 音乐卡片深浅色正反面均正常。
- [ ] Steam 卡片图片和点击地址正常。
- [ ] 页脚中心 Logo、上下班徽标和框架徽标正常。

### 性能

- [ ] 首页大图合计体积可接受。
- [ ] 不同时启用不必要的背景视频和大图。
- [ ] 第三方动态图片接口不存在 `xxxxxx` 等示例 ID。
- [ ] 外部图片已替换为可靠 CDN 或站内附件。
- [ ] 备份中包含附件文件和主题配置。

## 正式建站时优先替换的测试素材

本次使用壁纸进行的是功能测试，正式建站应优先替换：

1. 公众号背面图：换成真实、可扫码二维码。
2. 公众号正面图：换成公众号品牌物料。
3. 宠物挂件：换成透明背景吉祥物。
4. 个人卡片贴纸：换成透明小图标。
5. 页脚中心 Logo：换成正式透明 Logo。
6. 上下班和框架徽标：换成真正的状态徽标或 SVG。
7. 音乐卡片：换成真实歌单或动态音乐卡片。
8. Steam 卡片：换成真实 Steam 统计卡片。
9. PC / 手机首屏：分别人工确认构图，不要只依赖自动居中裁剪。

完成正式替换后，再运行一次本文的 URL、页面和移动端检查清单。
