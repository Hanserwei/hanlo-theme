# 阶段 1 本地开发环境

## 1. 当前兼容环境

| 项目 | 当前值 |
| --- | --- |
| Halo | `2.26.0-SNAPSHOT`，最低兼容目标为 `2.26.0` |
| 站点 | `http://localhost:8090/` |
| 主题 | `theme-hanlo` |
| Node.js | 24.x |
| pnpm | 以 `package.json` 的 `packageManager` 为准 |

本地 Halo 的 `dev` profile 已在 `application/src/main/resources/application-dev.yaml` 中配置：

```yaml
spring:
  thymeleaf:
    cache: false
```

如果使用其他 Halo 实例，可设置环境变量 `SPRING_THYMELEAF_CACHE=false`。该配置只应用于开发环境，不应为了热更新修改生产环境缓存策略。

## 2. 首次准备

```bash
pnpm install --frozen-lockfile
pnpm build-only
```

确保当前仓库作为 Halo 工作目录下的 `themes/theme-hanlo`，或把构建后的主题 ZIP 上传到 Console。主题目录名必须与 `theme.yaml` 的 `metadata.name` 一致。

## 3. 开发反馈循环

1. 启动 Halo，并确认当前启用主题为 `theme-hanlo`。
2. 在主题仓库运行 `pnpm dev`。
3. 只修改 `src/`、`public/`、根目录 YAML 和构建配置。
4. 修改 `theme.yaml`、`settings.yaml` 或注解设置后，在 Console 中重载主题配置。
5. 同时检查 Halo 日志、浏览器 Console 和 Network。

`pnpm dev` 只监听并生成 `templates/`，不会启动 Halo，也不会自动安装或启用主题。

## 4. 提交前检查

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
git diff --exit-code -- templates
unzip -t dist/theme-hanlo-*.zip
```

还应按阶段 0 的固定路由检查首页、文章、独立页面、分类、标签和留言板，并至少覆盖一个共享布局消费者。
