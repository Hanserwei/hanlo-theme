# 阶段 2：建立统一页面生命周期

## 1. 状态

实现和本地验收已完成，阶段状态为“进行中”。按照总路线图的维护约定，待 CI 通过并合并到
`master` 后再标记为“已完成”。本阶段没有替换 PJAX，也没有提前执行阶段 3 的全量业务脚本模块化。

## 2. 运行时结构

| 路径 | 职责 |
| --- | --- |
| `src/js/core/types.ts` | 页面控制器、导航上下文和生命周期事件类型 |
| `src/js/core/resource-scope.ts` | 统一持有并释放监听器、定时器、动画帧、Observer 和第三方实例 |
| `src/js/core/registry.ts` | 注册控制器并串行执行 `mount` / `unmount` |
| `src/js/core/config.ts` | 校验并深度冻结 Thymeleaf 输出的 `GLOBAL_CONFIG` |
| `src/js/core/runtime.ts` | 将首次加载、PJAX、历史导航和整页离开转换为统一事件 |
| `src/js/entries/main.ts` | 浏览器 ESM 入口 |
| `templates/assets/js/hanlo-runtime.js` | Vite 生成的稳定运行时产物，不直接编辑 |

主题继续通过阶段 1 的模板兼容桥原样复制旧 Thymeleaf 模板。只有新的 TypeScript 入口交给 Vite
打包，因此可以在不改变现有页面结构和样式的前提下逐步迁移旧模块。

## 3. 生命周期契约

浏览器全局只暴露冻结后的 `window.HanloLifecycle` API：

```ts
interface PageController {
  mount(root: ParentNode): void | Promise<void>;
  unmount(): void | Promise<void>;
}
```

公共事件按导航过程触发：

| 事件 | 时机 |
| --- | --- |
| `hanlo:page:initial` | 首次文档加载完成并挂载控制器后 |
| `hanlo:page:leave` | PJAX 发出请求或文档即将离开时 |
| `hanlo:page:destroy` | 当前控制器与资源完成销毁后 |
| `hanlo:page:enter` | PJAX 新页面配置校验、冻结并完成挂载后 |
| `hanlo:page:error` | 生命周期操作失败或 PJAX 需要回退到普通导航时 |

事件的 `detail.navigation` 提供只读的导航 ID、来源、方向和 URL。来源区分 `initial`、`pjax`、
`history` 与 `document`；历史导航进一步区分 `forward` 和 `backward`。

## 4. 控制器注册与资源清理

新模块应通过注册表接入，并把页面级资源交给 `resources` 管理：

```ts
window.HanloLifecycle.register({
  name: "example",
  create: ({ resources }) => ({
    mount(root) {
      resources.listen(root, "click", handleClick);
      resources.interval(refresh, 1_000);
      resources.observe(observer);
      resources.track(player, (instance) => instance.destroy());
    },
    unmount() {},
  }),
});
```

在主入口执行前必须注册的控制器可以先放入 `window.HanloPageControllers`。资源作用域销毁是幂等的，
按后进先出的顺序清理，并使用 `AbortController` 统一释放事件监听器。

## 5. 旧脚本兼容边界

- PJAX 仍由现有 `Pjax` 全局实例负责；阶段 3 已移除业务脚本兼容控制器。
- 生命周期转换器串行化销毁和挂载，旧模块与新控制器在同一导航中协同运行。
- 已迁移清理边界包括主脚本的页面监听器与 LazyLoad、首页 Swiper、Typed.js、AI 摘要、朋友圈、
  动态标题、关于页轮播文案和气泡动画。
- PJAX 请求或切换失败时，运行时使用目标 URL 执行普通文档导航；不会停留在半更新页面。
- 阶段 3 仍需把旧全局函数按功能迁移为控制器；兼容层在迁移完成前保留。

## 6. 验收命令

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:unit
pnpm test:e2e
pnpm build
```

针对本地 Halo 2.26 实例运行真实导航测试：

```bash
HALO_BASE_URL=http://127.0.0.1:8090 pnpm test:e2e --grep @live
```

未设置 `HALO_BASE_URL` 时，`@live` 用例自动跳过；CI 始终运行不依赖 Halo 数据的合成 PJAX 用例。
详细证据和剩余门禁见 [`COMPLETION_AUDIT.md`](COMPLETION_AUDIT.md)。
