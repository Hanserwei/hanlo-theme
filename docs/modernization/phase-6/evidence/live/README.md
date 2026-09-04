# 阶段 6 真实 Halo 视觉证据

## 环境

- Halo：2.26，Podman 容器 `halo2-theme-dev`，readiness `UP`
- 浏览器：Google Chrome 152.0.7977.75
- 主题源码：2.0.0；本地 Halo 资源仍登记 1.2.1，因此测试期间使用指向同一 2.0.0 产物的临时符号链接；
  链接已在最终构建前移除，不进入 ZIP
- 视口：1440×900 desktop、390×844 mobile
- 模式：light、dark

## 覆盖

截图页面为首页、文章、普通页、分类、标签、留言板、最新评论、关于、相册，共 9 × 4 = 36 张。
无截图路由仍由自动矩阵覆盖瞬间、图库、追番和装备，总计 13 条真实 Halo 路由。

最终真实 Halo 命令结果：18 项通过、6 项非固定项目按设计跳过。断言页面异常、Console error、
失败主题请求、本地异常响应和旧前端依赖请求均为 0；重复导航全部为 document 请求且无旧请求头。

## 校验

```bash
cd docs/modernization/phase-6/evidence/live
sha256sum --check SHA256SUMS
```

截图由 Playwright 先生成 PNG，再以 ImageMagick quality 82 转为 WebP；哈希清单记录最终提交文件。
