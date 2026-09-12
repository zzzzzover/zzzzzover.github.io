# Implementation Plan: 个人作品集与技术博客站点

**Branch**: `001-portfolio-blog` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-portfolio-blog/spec.md`

## Summary

把已有的 Markdown 素材（项目说明、技术文章）汇集为一个纯静态站点，同时服务求职作品集与技术写作两个目的。

技术路线：**Astro 静态输出 + 内容集合 schema 校验 + 以 Astro Paper 为起点的极简主题 + 服务端裸仓库自动构建发布 + Caddy 提供服务**。内容全部以 Markdown 存放于版本库，新增内容只新增文件、不改页面代码；站点构建产物为纯静态文件，无数据库、无服务端逻辑、无按量计费组件。

首期范围（M0）刻意最小：首页、"关于我"、2 个项目、1 篇文章，先把"写作 → 提交 → 自动上线"这条链路打通，再补内容。

## Technical Context

**Language/Version**: Node.js 22 LTS；TypeScript（Astro 默认）

**Primary Dependencies**: Astro（`output: 'static'`）；以 Astro Paper 模板为起点；`@astrojs/rss`；`@astrojs/sitemap`；Pagefind（构建后索引）；Tailwind CSS（随模板）。依赖清单在 `research.md` 中逐项论证。

**Storage**: N/A — 内容为版本库中的 Markdown 与图片文件，无数据库

**Testing**: `astro build` 构建即校验（内容 schema 由 zod 在构建期强制）；`scripts/check-links.mjs` 链接检查；构建产物体积预算检查；按 `quickstart.md` 的用户故事验收清单手工验证

**Target Platform**: 静态文件；由香港/新加坡轻量服务器上的 Caddy 提供并自动签发 HTTPS；现代移动端与桌面端浏览器

**Project Type**: web（单项目静态站点，前后端不分离，因为不存在后端）

**Performance Goals**: 国内常规宽带与 4G 下首屏 ≤3 秒；单页首屏 JS ≤50 KB（gzip 后）；不含图片与 demo 的静态资源总量 ≤1 MB

**Constraints**: 无运行时后端、无数据库、无按量计费服务；内容仅中文；发布必须自动化，不允许手工部署命令；站点内容与页面地址不得与托管服务商绑定

**Scale/Scope**: 单人维护；内容规模 10–30 个项目与文章；访客量小，首期不引入 CDN 与缓存层

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 门禁问题 | 本方案的回答 | 判定 |
|---|---|---|---|
| I. 简约优先 | 每一项依赖与构建步骤是否都被论证？是否有更简单的等价方案？ | 见 `research.md` 的逐项决策；无 CMS、无数据库、无编排、无服务端渲染。依赖清单共 5 项，每项均记录被否决的更简方案 | ✅ 通过 |
| II. 内容与渲染分离 | 新增内容是否需要改动页面代码？缺省项是否有降级？ | 三类内容由 `src/content.config.ts` 的 schema 定义，新增内容 = 新增 Markdown 文件；`demo`/`repo`/`cover` 缺省均有降级呈现 | ✅ 通过 |
| III. 无运行时依赖 | 构建产物是否为纯静态？是否引入计费组件或托管绑定？ | `output: 'static'`，产物为 HTML/CSS/JS 与静态索引；无用例依赖服务端；部署路径与内容解耦 | ✅ 通过 |

**Gate I 的显式论证（复杂度登记）**：见下方 Complexity Tracking。除此之外无违反项，无需豁免。

## Project Structure

### Documentation (this feature)

```text
specs/001-portfolio-blog/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出：技术决策与被否决方案
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
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── src/
│   ├── content.config.ts        # 三类内容的 schema；契约的唯一实现点
│   ├── content/
│   │   ├── articles/<slug>.md   # 文章
│   │   ├── projects/<slug>.md   # 项目
│   │   └── pages/about.md       # 无时间属性的固定页面
│   ├── layouts/
│   │   ├── BaseLayout.astro     # 头部、导航、页脚、明暗切换、分享元信息
│   │   ├── ArticleLayout.astro  # 文章页（可复用主题既有实现）
│   │   └── ProjectLayout.astro  # 项目页（自行实现，不使用主题模板）
│   ├── components/
│   │   ├── ProjectCard.astro
│   │   ├── DemoFrame.astro      # demo 嵌入、全屏入口与加载降级
│   │   └── ContactLinks.astro
│   ├── pages/
│   │   ├── index.astro          # 首页
│   │   ├── about.astro          # 关于我
│   │   ├── projects/index.astro
│   │   ├── projects/[...slug].astro
│   │   ├── writing/index.astro
│   │   ├── writing/[...slug].astro
│   │   ├── rss.xml.ts           # 订阅源
│   │   └── 404.astro
│   ├── assets/                  # 需要构建期优化的图片（截图、架构图）
│   └── styles/
├── public/
│   ├── demos/<slug>/            # 可交互演示的构建产物，按项目 slug 分目录
│   └── favicon/
├── scripts/
│   ├── check-links.mjs          # 构建产物链接与资源检查
│   └── check-budget.mjs         # 体积预算检查
├── deploy/
│   ├── Caddyfile                # 静态服务与 HTTPS
│   ├── post-receive             # 服务端裸仓库钩子：构建 → 原子发布
│   └── README.md                # 部署说明与回滚步骤
└── specs/001-portfolio-blog/    # 本 feature 的规格与设计文档
```

**Structure Decision**: 采用单项目结构。规格中的 FR-031 明确排除了用户系统与数据库，因此不存在后端，不需要前后端分离的多项目布局。`src/content/` 承载内容、`src/layouts` 与 `src/components` 承载渲染，两者的唯一接触面是 `src/content.config.ts` 中的 schema——这是"内容与渲染分离"原则在目录结构上的体现。

`public/demos/` 与 `src/content/projects/` 分离：演示产物是外部构建结果，不参与站点构建，只作为静态资源原样发布，因此放在 `public/`。

## Complexity Tracking

> 本方案在宪法 I「简约优先」下需显式论证的复杂度的登记表。

| 引入项 | 为何需要 | 被否决的更简方案及其不足 |
|---|---|---|
| Pagefind（站内检索） | FR-025 要求站内关键词检索，且内容为中文；Pagefind 以 CJK n-gram 处理中文，构建后生成静态索引，运行时无服务端 | ① 不做搜索：直接违反 FR-025。② 仅标题与摘要的客户端模糊匹配：零依赖，但无法检索正文关键词，检索价值低。③ Fuse.js 全量索引：需把全部正文下发到客户端，首屏体积与隐私都不划算 |
| 服务端裸仓库 + post-receive 自动构建 | FR-019 要求提交后自动上线且不得手工部署；当前无远程仓库，CI 路径尚不可用 | ① 本地构建 + rsync：需要每次手工执行部署命令，违反 FR-019。② GitHub Actions：需要远程仓库与密钥，且引入外部服务依赖；待站主添加远程后可作为并行发布路径加入，属将来扩展 |
| 以 Astro Paper 为起点（而非从零写） | 需求要求尽快上线；模板提供文章列表、文章页、明暗模式、SEO、RSS、sitemap 等已解决问题 | 从零实现：在 P0 范围内重复造轮子，直接推迟上线时间。注意：模板仅承载文章区与全局框架，项目页自行实现（见 spec 的 User Story 2），避免"继承别人代码"的范围失控 |

## Phase 0 / Phase 1 产出

- `research.md`：5 项技术决策（生成器、主题基座、搜索、部署自动化、图片与媒体），每项含决策、理由、被否决方案
- `data-model.md`：Article / Project / Page / Asset / Feed / SiteConfig 六个实体及其校验规则与地址稳定性约束
- `contracts/content-schema.md`：三类内容的 frontmatter 契约
- `contracts/site-contract.md`：路由、静态资源、订阅源、分享元信息、demo 嵌入与部署触发契约
- `quickstart.md`：覆盖 SC-001 … SC-013 的端到端验证步骤

## 设计后宪法复查

Phase 1 完成后重新对照三条原则：

- **I 简约优先**：最终依赖 5 项、构建步骤为「Astro 构建 → Pagefind 索引 → 预算检查 → 原子发布」。无常驻服务、无数据库、无第三方运行时。✅
- **II 内容与渲染分离**：`contracts/content-schema.md` 定义了内容与渲染的唯一接口；`data-model.md` 校验规则全部落在构建期。新增内容不触碰页面代码。✅
- **III 无运行时依赖**：构建产物为纯静态；发布流程在站主自己的服务器上，不绑定托管服务商；无按量计费组件。✅

无违反项，`Complexity Tracking` 中的三项已在 Gate I 下论证，不需要额外豁免。
