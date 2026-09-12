# Implementation Plan: 个人作品集与技术博客站点

**Branch**: `001-portfolio-blog` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-portfolio-blog/spec.md`

## Summary

把已有的 Markdown 素材（项目说明、技术文章）汇集为一个纯静态站点，同时服务求职作品集与技术写作两个目的。

技术路线：**Astro 静态输出 + 内容集合 schema 校验 + 以 AstroPaper v6 为起点的极简主题 + 服务端裸仓库自动构建发布 + Caddy 提供服务**。内容全部以 Markdown 存放于版本库，新增内容只新增文件、不改页面代码；站点构建产物为纯静态文件，无数据库、无服务端逻辑、无按量计费组件。模板已实测验证：移除其构建期的 Google Fonts 依赖（改用系统字体栈），并以仓库内的中文子集字体保留动态分享图，见 `verify.md` 与 `research.md` D8。

首期范围（M0）刻意最小：首页、"关于我"、2 个项目、1 篇文章，先把"写作 → 提交 → 自动上线"这条链路打通，再补内容。

## Technical Context

**Language/Version**: Node.js **≥ 22.12.0**（模板 `engines` 要求；实测 22.23.2 通过）；TypeScript 6.0.3

**Primary Dependencies**: 模板 AstroPaper v6.1.0（commit `35cfa7f`，MIT）——含 Astro **7.0.3**、Tailwind CSS **4.3.2**、`@astrojs/rss`、`@astrojs/sitemap`、`@astrojs/mdx`、Pagefind **1.5.2**（模板内置）、sharp 0.35.2、satori 0.26.0。顶层 25 个包，实际安装 554 个。**构建期依赖零新增**；新增两个**开发期**依赖 `subset-font`（生成中文子集字体）与 `fontkit`（回读字体生成覆盖清单），二者不进构建流程、不上服务器。同时**移除**模板的 Google Fonts 构建期抓取（见 `research.md` D8）。

**Storage**: N/A — 内容为版本库中的 Markdown 与图片文件，无数据库

**Testing**: `astro check` 类型检查（实测 55 文件 0 错误）；`astro build` 构建即校验（内容 schema 由 zod 在构建期强制）；`scripts/check-links.mjs` 链接检查；`scripts/check-budget.mjs` 体积预算检查；`scripts/check-og-font.mjs` 分享图字体字符覆盖检查（缺字则构建失败）；按 `quickstart.md` 的用户故事验收清单手工验证

**Target Platform**: 静态文件；由香港/新加坡轻量服务器上的 Caddy 提供并自动签发 HTTPS；现代移动端与桌面端浏览器

**Project Type**: web（单项目静态站点，前后端不分离，因为不存在后端）

**Performance Goals**: 国内常规宽带与 4G 下首屏 ≤3 秒；单页首屏 JS ≤50 KB（gzip 后）；不含图片与 demo 的静态资源总量 ≤1 MB。**实测基线**：首页首屏 gzip 后 JS 5.3 KB + CSS 10.7 KB + HTML 6.3 KB ≈ 22 KB，预算富余约十倍

**Constraints**: 无运行时后端、无数据库、无按量计费服务；**构建 MUST NOT 依赖任何运行期外部网络请求**；内容仅中文；发布必须自动化，不允许手工部署命令；站点内容与页面地址不得与托管服务商绑定

**Scale/Scope**: 单人维护；内容规模 10–30 个项目与文章；访客量小，首期不引入 CDN 与缓存层

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 门禁问题 | 本方案的回答 | 判定 |
|---|---|---|---|
| I. 简约优先 | 每一项依赖与构建步骤是否都被论证？是否有更简单的等价方案？ | 见 `research.md` 的逐项决策与 D7 的实测依赖数据（顶层 25 个包 / 实际 554 个）；无 CMS、无数据库、无编排、无服务端渲染；构建期依赖零新增，两个新增依赖均为开发期工具（见 Complexity Tracking） | ✅ 通过 |
| II. 内容与渲染分离 | 新增内容是否需要改动页面代码？缺省项是否有降级？ | 三类内容由 `src/content.config.ts` 的 schema 定义，新增内容 = 新增 Markdown 文件；`demo`/`repo`/`cover` 缺省均有降级呈现 | ✅ 通过 |
| III. 无运行时依赖 | 构建产物是否为纯静态？是否引入计费组件或托管绑定？ | `output: 'static'`，产物为 HTML/CSS/JS 与静态索引；无用例依赖服务端；部署路径与内容解耦 | ✅ 通过 |

**Gate I 的显式论证（复杂度登记）**：见下方 Complexity Tracking。除此之外无违反项，无需豁免。

## Project Structure

### Documentation (this feature)

```text
specs/001-portfolio-blog/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出：技术决策与被否决方案
├── verify.md            # 模板实测报告（构建、中文、性能、未验证项）
├── data-model.md        # Phase 1 输出：内容实体与校验规则
├── quickstart.md        # Phase 1 输出：端到端验证指南
├── contracts/           # Phase 1 输出：内容契约与站点契约
│   ├── content-schema.md
│   └── site-contract.md
├── checklists/
│   └── requirements.md  # 规格质量校验清单
└── tasks.md             # Phase 2 输出（由 /speckit-tasks 生成，本阶段不创建）
```

### Source Code (repository root)

```text
personal-blog/
├── astro.config.ts              【改】删 fonts 块，locale 改 zh
├── astro-paper.config.ts        【改】站主配置：site/socials/shareLinks/features
├── package.json / tsconfig.json
├── LICENSE                      【留】MIT，必须保留版权声明
├── src/
│   ├── content.config.ts        【改】posts schema 微调 + 新增 projects 集合
│   ├── content/
│   │   ├── posts/<slug>.md      【用】文章（模板既有目录，路由 /posts/）
│   │   ├── projects/<slug>.md   【新】项目集合
│   │   └── pages/about.md       【用】固定页面（模板已有此目录）
│   ├── layouts/
│   │   ├── Layout.astro         【改】移除 <Font>，其余复用
│   │   ├── PostLayout.astro     【用】文章页
│   │   └── ProjectLayout.astro  【新】项目页版式（自行控制，不用主题模板）
│   ├── components/              【用】模板 13 个组件原样保留
│   │   ├── ProjectCard.astro    【新】
│   │   ├── DemoFrame.astro      【新】demo 嵌入、全屏入口与加载降级
│   │   └── ContactLinks.astro   【新】
│   ├── i18n/lang/zh.ts          【新】界面文案中文化（模板只带 en.ts）
│   ├── pages/
│   │   ├── index.astro          【改】hero 换成站主信息 + 新增精选项目区
│   │   ├── about.astro          【用】
│   │   ├── projects/index.astro        【新】
│   │   ├── projects/[...slug].astro    【新】
│   │   ├── posts/**             【用】列表、分页、详情、标签、归档
│   │   ├── search.astro         【用】Pagefind 检索页
│   │   ├── rss.xml.ts / robots.txt.ts / 404.astro   【用】
│   │   └── og.png.ts            【改】恢复动态分享图，改读本地子集字体
│   ├── styles/                  【改】theme.css 的 --font-app 改系统字体栈
│   ├── assets/
│   │   ├── images/              【用】构建期优化的图片（截图、架构图）
│   │   └── fonts/
│   │       ├── og-subset.ttf        【新】分享图用的中文子集字体（约 821 KB，提交进仓库）
│   │       └── og-subset.coverage.json 【新】字符覆盖清单，供构建期检查用（无构建期依赖）
│   ├── scripts/ utils/ types/   【用】模板既有
├── public/
│   ├── demos/<slug>/            【新】可交互演示产物，自包含，不参与站点构建
│   ├── pagefind/                【产】构建产物，须 gitignore
│   └── default-og.jpg           【改】换成本项目默认分享图
├── scripts/
│   ├── build-og-font.mjs        【新】开发期：生成子集字体与覆盖清单（不进构建）
│   ├── check-og-font.mjs        【新】构建期：校验所有内容字符均被字体覆盖
│   ├── check-links.mjs          【新】构建产物链接检查
│   └── check-budget.mjs         【新】体积预算检查
├── deploy/
│   ├── Caddyfile                【新】静态服务与 HTTPS
│   ├── post-receive             【新】服务端裸仓库钩子：构建 → 原子发布
│   └── README.md                【新】部署说明与回滚步骤
└── specs/001-portfolio-blog/    【新】本 feature 的规格与设计文档
```

**图例**：【用】直接复用 ｜【改】小改 ｜【新】自行实现 ｜【删】移除 ｜【产】构建产物 ｜【留】必须保留

**Structure Decision**: 采用单项目结构。规格中的 FR-031 明确排除了用户系统与数据库，因此不存在后端，不需要前后端分离的多项目布局。`src/content/` 承载内容、`src/layouts` 与 `src/components` 承载渲染，两者的唯一接触面是 `src/content.config.ts` 中的 schema——这是"内容与渲染分离"原则在目录结构上的体现。

`public/demos/` 与 `src/content/projects/` 分离：演示产物是外部构建结果，不参与站点构建，只作为静态资源原样发布，因此放在 `public/`。

## Complexity Tracking

> 本方案在宪法 I「简约优先」下需显式论证的复杂度的登记表。

| 引入项 | 为何需要 | 被否决的更简方案及其不足 |
|---|---|---|
| 服务端裸仓库 + post-receive 自动构建 | FR-019 要求提交后自动上线且不得手工部署；当前无远程仓库，CI 路径尚不可用 | ① 本地构建 + rsync：需要每次手工执行部署命令，违反 FR-019。② GitHub Actions：需要远程仓库与密钥，且引入外部服务依赖；待站主添加远程后可作为并行发布路径加入，属将来扩展 |
| 以 AstroPaper v6 为起点（而非从零写） | 需求要求尽快上线；模板提供文章区、明暗模式、检索、RSS、站点地图、归档、标签等已解决问题 | 从零实现：在 P0 范围内重复造轮子，直接推迟上线时间。**已实测验证**（见 `verify.md`）。范围控制：模板仅承载全局框架与文章区，项目页自行实现 |
| 仓库内的中文子集字体 + 构建期覆盖检查 | 每篇文章需要独立的分享卡片（FR-024）；satori 渲染中文必须有字体，而 satori 既不读 `.ttc` 集合也不读可变字体，且**缺字是静默失败** | ① 全站共用一张静态默认图：**已实测证明代价被高估**（子集字体仅 821 KB，渲染内存增量 +11 MB），且不满足站主对"每篇独立卡片"的要求。② 提交完整中文字体（8–10 MB）：体积是子集方案的十倍，收益仅为省掉一次开发期生成步骤。③ 用 fonttools：属 pip 生态，需额外 Python 环境；且**实测 fontkit 的子集输出签名非法**，可用的 `subset-font` 是 harfbuzz wasm，零原生依赖。④ 换掉 satori：需重新验证整套方案 |

**已撤销的复杂度登记**：草案曾把 Pagefind 列为"额外引入的复杂度"。实测发现它随模板内置
（`build` 脚本已含索引步骤），无需额外引入，该行已删除并同步修订了 `research.md` 的 D3。

**不进入本表的改动**：移除模板的 Google Fonts 构建期抓取（`research.md` D8 第 1 部分）是
**降低**复杂度与外部依赖的改动，方向与宪法 I 一致，无需论证其必要性。

## Phase 0 / Phase 1 产出

- `research.md`：8 项技术决策（生成器、主题基座、搜索、部署自动化、图片与媒体、托管、依赖清单、字体策略），每项含决策、理由、被否决方案
- `verify.md`：模板实测报告——环境、构建、路由连通性、中文验证、性能实测、分享图字体实测、未验证项
- `data-model.md`：Article / Project / Page / Asset / Feed / SiteConfig 六个实体及其校验规则与地址稳定性约束
- `contracts/content-schema.md`：三类内容的 frontmatter 契约
- `contracts/site-contract.md`：路由、静态资源、订阅源、分享元信息、demo 嵌入与部署触发契约
- `quickstart.md`：覆盖 SC-001 … SC-013 的端到端验证步骤

## 设计后宪法复查

Phase 1 完成后重新对照三条原则：

- **I 简约优先**：构建期依赖零新增（两个新增依赖均为开发期工具）；构建步骤为「类型检查 → 内容与字体覆盖检查 → Astro 构建 → Pagefind 索引 → 预算检查 → 原子发布」，且**构建期无外部网络依赖**。无常驻服务、无数据库、无第三方运行时。✅
- **II 内容与渲染分离**：`contracts/content-schema.md` 定义了内容与渲染的唯一接口；`data-model.md` 校验规则全部落在构建期。新增内容不触碰页面代码。✅
- **III 无运行时依赖**：构建产物为纯静态；分享图在构建期生成为 PNG，无运行时渲染；发布流程在站主自己的服务器上，不绑定托管服务商；无按量计费组件。✅

无违反项，`Complexity Tracking` 中的三项已在 Gate I 下论证，不需要额外豁免。
