# 蔚蓝档案鼠标点击特效

主题通过固定版本的 npm 依赖 `ba-click-fx@1.3.2` 集成 [CialloKing/ba-click-fx](https://github.com/CialloKing/ba-click-fx)。源码使用 MIT 许可证，包内许可证与上游第三方说明一起写入主题的 `THIRD_PARTY_NOTICES.txt`。

## 设置与行为

在「主题设置 → 全站外观 → 启用蔚蓝档案鼠标点击特效」中控制，默认开启。关闭并保存后，新加载的页面不下载该特效模块，也不创建画布、指针监听或动画。

- 点击出现原版蓝色圆环和碎片；按住拖动时显示光尾。
- 触屏点击同样可触发，保留页面滚动和缩放。
- 透明覆盖层不拦截链接、按钮及表单操作。
- 开启系统“减少动态效果”时自动停用；偏好恢复后可再次启用。
- 页面进入后台或浏览器历史缓存时清空并暂停动画，返回时恢复同一实例。
- 页面资源销毁时释放上游画布、监听器和渲染资源；异步下载完成后会再次确认页面仍然有效。

资源随主题发布，使用时不从第三方 CDN 加载。无 Canvas 支持或模块下载失败时保留正常页面功能。

## 实现位置

`settings.yaml` 中的 `style.baClickEnable` 通过 `src/modules/variables/site-config.html` 输出为 `GLOBAL_CONFIG.effects.baClick`，由配置校验器验证布尔类型。

`src/js/features/effects/index.ts` 仅在开关开启时调用 `click-effect.ts`。适配层动态导入上游包，使用 `browser-overlay` 输出和 `touchAction: auto`，保留库的默认颜色、点击参数、按下拖尾及渲染回退机制。设备像素比上限保持为上游默认值 1。

安装包会包含独立的 `ba-click-fx-*.js` 文件；关闭功能时该文件保留在安装包中，但不会被浏览器加载执行。

离线验证使用 `pnpm check`、`pnpm test`、`pnpm build`；真实浏览器的最终视觉效果由安装后的测试确认。
