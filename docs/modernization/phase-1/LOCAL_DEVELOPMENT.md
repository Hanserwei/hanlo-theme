# 阶段 1 本地开发环境

## 1. 当前兼容环境

| 项目 | 当前值 |
| --- | --- |
| Halo | 社区版 `2.26.x`，最低兼容目标为 `2.26.0` |
| 站点 | `http://localhost:8090/` |
| 制品验收站点 | `http://localhost:8091/`（按需启动） |
| 运行方式 | Rootless Podman + Compose，配置位于仓库根目录 `compose.yaml` |
| 开发数据 | Podman 命名卷 `halo2-theme-dev-data` |
| 制品验收数据 | Podman 命名卷 `halo2-theme-package-test-data` |
| 主题 | `theme-hanlo` |
| Node.js | 24.x |
| pnpm | 以 `package.json` 的 `packageManager` 为准 |

`compose.yaml` 使用 Halo 官方社区版镜像和适合本地开发的 H2 数据库。它只把
`8090` 端口发布到本机回环地址，并将当前仓库只读挂载到
`/root/.halo2/themes/theme-hanlo`。命名卷与现有的 `~/.halo2` 完全隔离，不会修改原有
Halo 数据。

因此，`8090` 开发站不能通过 Console 上传同名 ZIP 来升级主题：Halo 升级时需要覆盖主题目录，
只读挂载会返回 `Read-only file system`。这不是主题 ZIP 损坏。需要验证真实上传安装或升级时，
使用第 4 节的独立可写实例。

容器通过以下环境变量关闭 Thymeleaf 缓存，使重新生成的模板无需重启 Halo 即可生效：

```yaml
SPRING_THYMELEAF_CACHE: "false"
```

H2 仅适合开发和测试，不应将此 Compose 配置直接用于生产环境。

## 2. 首次启动

确认 Podman 和 Compose provider 可用：

```bash
podman --version
podman compose version
```

先安装前端依赖并生成 Halo 实际读取的 `templates/`，再启动容器：

```bash
pnpm install --frozen-lockfile
pnpm build-only
podman compose up -d
podman compose logs -f halo
```

首次拉取镜像和初始化数据库可能需要一段时间。日志出现 Halo 已启动后，访问
[http://localhost:8090/console](http://localhost:8090/console)：

1. 按初始化向导设置站点信息和管理员账号。
2. 进入“外观 → 主题”，点击“切换主题”。
3. 在“未安装”列表找到 `Hanlo Theme`，安装并启用。
4. 进入主题设置，填写“建站时间”等必填项并保存。

可用以下命令检查容器、HTTP 入口和主题挂载：

```bash
podman compose ps
curl --fail http://localhost:8090/actuator/health/readiness
podman exec halo2-theme-dev \
  test -f /root/.halo2/themes/theme-hanlo/theme.yaml
```

## 3. 开发反馈循环

在一个终端持续构建主题：

```bash
pnpm dev
```

在另一个终端观察 Halo：

```bash
podman compose logs -f halo
```

只修改 `src/`、`public/`、根目录 YAML 和构建配置。`pnpm dev` 会持续生成
`templates/`，容器通过只读 bind mount 立即读取这些宿主机产物。修改页面模板或资源后刷新
浏览器；修改 `theme.yaml`、`settings.yaml` 或注解设置后，还需要在 Console 中重载主题配置。
同时检查 Halo 日志、浏览器 Console 和 Network。

`pnpm dev` 只监听并生成 `templates/`，不会启动 Halo，也不会自动安装或启用主题。

## 4. 在 Console 验证最终 ZIP

`halo-package-test` 服务不挂载源码，主题目录位于独立可写数据卷，专门用于验证 Halo Console
中的“本地安装 / 升级”流程：

```bash
podman compose -p hanlo-theme-package-test \
  -f tests/compose.package-test.yaml up -d
podman compose -p hanlo-theme-package-test \
  -f tests/compose.package-test.yaml logs -f halo-package-test
```

访问 [http://localhost:8091/console](http://localhost:8091/console) 完成初始化。验证全新安装时直接
上传最终 ZIP；验证升级时先安装旧版 ZIP，再上传最终 ZIP 并确认覆盖。`8091` 与 `8090` 使用不同
数据卷，上传过程不会覆盖源码仓库，也不会修改开发站数据。

验证结束后可停止并删除测试容器，同时保留测试数据：

```bash
podman compose -p hanlo-theme-package-test \
  -f tests/compose.package-test.yaml down
```

仅当确认不再需要测试站数据时，才删除 `halo2-theme-package-test-data` 数据卷。

## 5. 容器与数据管理

```bash
# 停止后保留容器
podman compose stop

# 再次启动
podman compose start

# 删除容器和网络，但保留开发数据卷
podman compose down

# 获取 2.26 系列最新补丁版本并重建容器
podman compose pull
podman compose up -d
```

不要在仍需保留站点数据时运行 `podman compose down -v`，该命令会删除
`halo2-theme-dev-data`。可通过 `podman volume inspect halo2-theme-dev-data` 查看数据卷信息。

## 6. 提交前检查

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
git diff --exit-code -- templates
unzip -t dist/theme-hanlo-*.zip
```

还应按阶段 0 的固定路由检查首页、文章、独立页面、分类、标签和留言板，并至少覆盖一个共享布局消费者。
