# CSS 架构约定

## 1. 入口与级联

`src/css/index.css` 是全局入口，层顺序固定为：

```css
@layer reset, tokens, base, layout, components, pages, utilities, overrides;
```

| 层 | 职责 | 约束 |
| --- | --- | --- |
| `reset` | 预留给经过验证的最小重置 | Tailwind Preflight 禁止启用 |
| `tokens` | Tailwind theme 与 `--hanlo-*` Design Tokens | 不写组件选择器 |
| `base` | 元素基础规则与保持原顺序的历史兼容模块 | 历史模块迁移时不可改变相对顺序 |
| `layout` | 页面壳、导航、页脚和全局背景 | 不包含单页业务组件 |
| `components` | 可复用卡片、加载、代码、菜单和运行时组件 | 优先单类名或 `hanlo-*` 状态类 |
| `pages` | 只属于一个路由或自定义页面的规则 | 大型页面样式应使用条件入口 |
| `utilities` | `hl:` Tailwind utilities 与少量原生 utility | 只表达单一职责 |
| `overrides` | 第三方集成或必须高权重的最终覆盖 | 新增时写明被覆盖对象和原因 |

## 2. 命名规则

- 新主题组件、状态和辅助类使用 `hanlo-` 前缀，例如 `hanlo-surface`、
  `hanlo-rightside-disabled`。
- Design Token 与动态值使用 `--hanlo-*`，例如 `--hanlo-color-surface`、
  `--hanlo-card-cover`。
- Tailwind utilities 使用 `hl:` 前缀，例如 `hl:flex`、`hl:text-hanlo-brand`。
- `--heo-*` 是兼容 API。新代码从 `--hanlo-*` 取值，旧选择器可通过映射继续读取 `--heo-*`。
- 不以 DOM 层级创建新的组件名；历史深层选择器只允许在迁移模块中维护。

## 3. 目录所有权

```text
src/css/
├── index.css                 # 全局入口和顺序
├── tokens.css                # 语义 Design Tokens 与 Tailwind theme bridge
├── base.css                  # 新基础规则和可访问焦点
├── legacy/                   # 保持顺序的历史基础规则
├── layout/                   # 页面壳、导航、页脚
├── components/               # 可复用组件
├── pages/                    # 路由/自定义页面
├── utilities.css             # 第一方小型 utility
└── overrides/                # 历史与集成覆盖
```

核心归属：

| 能力 | 源文件 |
| --- | --- |
| 颜色、间距、圆角、阴影、字体、动画 | `tokens.css` |
| 焦点、字体和滚动条 | `base.css` |
| 导航、页脚、页面壳 | `layout/navigation.css`、`layout/footer-*.css`、`layout/shell-legacy.css` |
| 文章正文与扩展标签 | `components/article-*.css`、`pages/post-content.css` |
| 首页文章、分类与侧栏 | `pages/home-*.css` |
| 关于页 | `pages/about-*.css` |
| Shiki、版权、阅读模式、资料卡 | `components/*.css` 条件入口 |
| 相册、追番、朋友圈、3D 分类 | `pages/*.css` 条件入口 |
| Halo 评论/搜索及第三方展示覆盖 | `overrides/integrations.css` 与集中式变量块 |

## 4. 条件入口

`css-entries.json` 是条件 CSS 的唯一登记表。键决定产物名：

```text
assets/css/<entry>-<theme-version>.css
```

新增入口必须同时满足：

1. 源文件位于 `src/css/components` 或 `src/css/pages`；
2. 在 `css-entries.json` 精确登记一次；
3. 在对应 `src/*.html` 或片段中用 `theme.spec.version` 引用；
4. 为条件逻辑或路由补浏览器断言；
5. 不再从 `index.css` 导入同一文件。

## 5. 动态主题值

服务端图片、用户颜色和可配置尺寸无法由 Tailwind 静态扫描。模板只能设置局部变量：

```html
<div
  class="hanlo-card-cover"
  th:style="|--hanlo-card-cover: url('${categoryItem.spec.cover}')|"
></div>
```

属性如何生效必须定义在 CSS 模块中。禁止把 `display`、`position`、间距或完整组件样式重新写入
`th:style`。

## 6. 迁移流程

1. 先用视觉和路由测试固定当前行为。
2. 把目标规则移动到明确模块，不同时改 HTML 结构。
3. 保持历史兼容层中的相对顺序；确认无视觉变化后再迁入目标 Cascade Layer。
4. 用 `--hanlo-*` 替换硬编码语义值，再用 `hanlo-*` 状态类降低选择器耦合。
5. 仅在静态、局部规则有明确收益时改用 `hl:` utility。
6. 运行 `pnpm check:css`、四象限视觉快照和真实 Halo 页面矩阵。
