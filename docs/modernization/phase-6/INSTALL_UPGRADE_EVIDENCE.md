# Halo Console 安装与升级证据

## 环境与隔离

使用 `registry.fit2cloud.com/halo/halo:2.26` 创建两个临时容器和两个独立数据卷，分别监听
`127.0.0.1:8091` 与 `127.0.0.1:8092`。二者不挂载源码，也不复用开发站数据：

最终被两个实例实际上传的 `theme-hanlo-2.0.0.zip` SHA-256 为
`4fdce061bb31cd1e1ff193464f099f713d4cd009c293286654f03afacf99b502`。

- `halo2-theme-release-test`：先安装并激活固化的 1.2.1 ZIP，再上传最终 2.0.0 ZIP并确认升级。
- `halo2-theme-clean-test`：直接上传最终 2.0.0 ZIP并激活。

验收完成后两个容器和数据卷均已删除，原 `halo2-theme-dev` 保持 running。

这里刻意不使用 `8090` 开发站验证上传升级。该实例把源码仓库只读挂载为活动主题目录，Halo
无法覆盖其中的文件；在该实例上传同名 ZIP 会以 `Read-only file system` 返回 500。此限制只
属于本地热更新拓扑，不代表 ZIP 无法在普通可写 Halo 实例升级。可复现的独立验收服务与命令见
[阶段 1 本地开发环境](../phase-1/LOCAL_DEVELOPMENT.md#4-在-console-验证最终-zip)。

## 从 1.2.1 升级

1. Console 本地安装 `theme-hanlo-1.2.1.zip` 并激活，详情显示 1.2.1。
2. 上传 `theme-hanlo-2.0.0.zip`，在“主题已存在”确认框选择升级。
3. 升级后 Console 显示：

   ```text
   Version: 2.0.0
   Activated
   Requires: >=2.26.0
   Page Layout: Supported
   templates/layout.html declares html(head, content).
   ```

4. 前台确认 `hanlo-theme-2.0.0.css`、`hanlo-runtime-2.0.0.js` 和主 ESM 全部 200；
   `window.pjax` 不存在，8 个页面控制器活动，`GLOBAL_CONFIG` 已冻结。
5. 1.2.1 的旧失效默认图片经精确兼容映射落到主题本地 `hanlo-logo.png` / `home.webp`；
   39 个本地请求全部 200，Console error/warn 为 0。

## 全新安装

1. 在第二个干净 Halo 实例直接上传最终 2.0.0 ZIP并激活。
2. Console 显示 2.0.0、Activated、`>=2.26.0` 和 Page Layout Supported。
3. 前台加载 2.0.0 主 CSS/runtime，生命周期正常；默认页脚、loading 和随机封面均使用本地资源。
4. 40 个本地文档、CSS、字体、脚本、插件和图片请求全部 200，Console error/warn 为 0。

## 结论

最终 ZIP 的全新安装和从上一正式版升级均通过。旧 ConfigMap 无需迁移；已删除的进度条字段被忽略，
旧失效素材默认值被精确兼容，用户自定义 URL 不被改写。
