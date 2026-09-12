---
description: "Task list for 个人作品集与技术博客站点"
---

# Tasks: 个人作品集与技术博客站点

**Input**: Design documents from `specs/001-portfolio-blog/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, verify.md, quickstart.md

**Tests**: 规格未要求 TDD，故不生成单元测试任务。本项目的验证策略是**构建期强制 + 手工验收**：内容 schema 在构建期校验，`scripts/check-*.mjs` 做产物检查，`quickstart.md` 的 V1–V11 做端到端验收。生成单元测试会违反宪法 I。

**Organization**: 按用户故事分组，每个故事可独立实现、独立验收。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件，无未完成依赖）
- **[Story]**: 所属用户故事（US1–US7）
- Setup / Foundational / Polish 阶段**不带**故事标签

## 关键背景（实现前必读）

- 模板 AstroPaper v6 已完整验证，打好补丁的副本在 `personal-blog/.verify/astro-paper/`（gitignore）。
  实测结论见 `verify.md`。**不要重新踩一遍 Google Fonts 那个坑。**
- 宪法三条：简约优先 / 内容与渲染分离 / 无运行时依赖。新增依赖必须先回答"删掉它会损失什么"。
- **构建期不得有任何外网请求**，这是实测得出的硬约束。
- **动态分享图保留**，字体是仓库内的中文子集文件。`research.md` D8 记录了三个必须绕开的坑：
  satori 不读 `.ttc` 集合、不读可变字体、**缺字静默留空白且不报错**。`.verify/astro-paper/og3.mjs`
  是可用的生成配方（含 `variationAxes: { wght: 400 }` 这一步）。

## Path Conventions

单项目静态站点，路径相对仓库根 `personal-blog/`：`src/`、`public/`、`scripts/`、`deploy/`。

---

## Phase 1: Setup（模板落地与清理）

**Purpose**: 把验证过的模板变成项目本体，清掉不属于本项目的东西

- [ ] T001 把模板源码落地到仓库根：从 `.verify/astro-paper/` 复制全部源码到 `personal-blog/`，排除 `node_modules/`、`.git/`、`.github/`、`Dockerfile`、`compose.yaml`、`.vscode/`、`eslint.config.js`、`cz.yaml`；不得覆盖本项目已有的 `.git/`、`.specify/`、`specs/`、`.gitignore`
- [ ] T002 安装依赖并确认构建通过：在仓库根执行 `pnpm install` 后执行 `pnpm build`（脚本定义于 `package.json`），预期 45 个页面构建成功（Node.js MUST ≥ 22.12.0）
- [ ] T003 [P] 清除模板演示内容：删除 `src/content/posts/` 下的演示文章及 `_color-schemes/`、`_releases/`、`examples/` 目录与全部配图（约 5.4 MB），同时删除 `src/assets/images/` 下的演示图
- [ ] T004 [P] 更新根 `.gitignore`：追加 `public/pagefind/`、`dist/`、`.astro/`、`node_modules/`（模板 `build` 脚本会把 Pagefind 索引写回 `public/`）
- [ ] T005 字体处理（两部分，缺一不可）：**① 移除构建期外部依赖**——`astro.config.ts` 删除整个 `fonts` 配置块；`src/layouts/Layout.astro` 移除 `import { Font }` 与 `<Font />`；`src/styles/theme.css` 把 `--font-app` 改为系统字体栈（含 PingFang SC / Microsoft YaHei / Noto Sans CJK SC）。**② 生成分享图子集字体**（开发期工具，不进构建）——新增 `scripts/build-og-font.mjs`，用 `subset-font` 从 Noto Sans SC 生成**静态实例**（必须带 `variationAxes: { wght: 400 }`，否则 satori 因可变字体崩溃），覆盖站点信息 + 全部内容标题与描述 + 3000 常用汉字；用 `fontkit` 回读字体生成字符覆盖清单；产出 `src/assets/fonts/og-subset.ttf`（约 821 KB）与 `src/assets/fonts/og-subset.coverage.json`，二者**提交进仓库**。配方见 `.verify/astro-paper/og3.mjs` 与 `research.md` D8。**动态分享图不在此关闭**，见 T014
- [ ] T006 [P] 整理 `package.json`：修改 `name`，确认 `build` 脚本仍为 `astro check && astro build && pagefind --site dist`，移除不适用的 lint/format 脚本（保留 `prettier` 相关）

**Checkpoint**: `pnpm build` 在无外网构建环境下通过

---

## Phase 2: Foundational（阻塞所有用户故事）

**Purpose**: 所有用户故事共同依赖的基础设施

**⚠️ 外部依赖**：T011 需要一台已开通的香港/新加坡轻量服务器与已解析的域名。**没有它 T011 与 T032 无法完成**，但不阻塞其他任务。

**⚠️ CRITICAL**: 本阶段完成前，任何用户故事都无法产出可验收的成果

- [ ] T007 配置站点信息 `astro-paper.config.ts`：`site.url` / `site.title` / `site.description` / `site.author` / `site.profile` / `site.ogImage` / `site.lang: "zh"` / `site.timezone: "Asia/Shanghai"`；`socials` 至少 1 项，且 MUST NOT 含手机号（FR-036）
- [ ] T008 [P] 界面中文化：新增 `src/i18n/lang/zh.ts`（`satisfies UIStrings`，覆盖 `nav`/`post`/`pagination`/`home`/`footer`/`pages`/`a11y`/`notFound` 全部键，类型定义见 `src/i18n/types.ts`），并在 `astro.config.ts` 设 `i18n.locales: ["zh"]`、`defaultLocale: "zh"`（FR-035）
- [ ] T009 [P] 扩展内容 schema `src/content.config.ts`：新增 `projects` 集合，字段 `title`/`summary`/`role`/`tech`/`status`/`repo`/`demo`/`demoNote`/`cover`/`featured`/`order`；其中 `status` 枚举 MUST 为 `运行中` / `维护中` / `已归档` / `原型`，`tech` MUST 至少 1 项，`repo`/`demo`/`cover` 可选
- [ ] T010 [P] 新增共享组件 `src/components/ProjectCard.astro`：props 对齐 `projects` schema；展示名称、一句话说明、技术要点、状态；`cover` 缺省时用默认样式，MUST NOT 出现破图；卡片链接指向 `/projects/<slug>/`
- [ ] T011 建立部署通道：`deploy/Caddyfile`（静态服务 + 自动 HTTPS）、`deploy/post-receive`（拉取 → 安装 → 构建 → 预算与链接检查 → **原子切换发布目录** → 保留回滚点）、`deploy/README.md`。流水线 MUST 满足 `contracts/site-contract.md` 第 4 节：任一步失败 MUST 中止且 MUST NOT 切换服务目录
- [ ] T012 [P] 新增校验脚本：`scripts/check-links.mjs`（构建产物内部链接与资源可达性）、`scripts/check-budget.mjs`（首屏 JS ≤50 KB gzip、静态资源 ≤1 MB、单篇媒体 ≤5 MB）、`scripts/check-og-font.mjs`（**构建期字符覆盖检查**：扫描全部内容与站点信息，凡有字符不在 `og-subset.coverage.json` 中即构建失败，并报出具体字符与来源文件。零构建期依赖，只读清单）
- [ ] T013 导航增加 Projects 入口：修改 `src/components/Header.astro`，并在 T008 的 zh 文案中补对应键（FR-005）
- [ ] T014 恢复动态分享图并使用本地子集字体：`astro-paper.config.ts` 设 `features.dynamicOgImage: true`；重写 `src/pages/og.png.ts`（全站默认图）与 `src/pages/posts/[...slug]/index.png.ts`（逐篇图），**不再使用 Astro 的 `fontData` / `experimental_getFontFileURL`**，改为直接读取 `src/assets/fonts/og-subset.ttf` 传给 satori；把 `check-og-font` 接入 `package.json` 的 `build` 脚本；同时替换 `public/default-og.jpg` 为本项目默认图（无独立封面时的回退）（FR-024）

**Checkpoint**: 站点可构建、可中文化、项目集合 schema 就绪、部署通道可执行

---

## Phase 3: User Story 1 - 访客快速认识站主并建立联系 (Priority: P1) 🎯 MVP

**Goal**: 招聘方打开首页，不滚动、不点击就能看清"你是谁、做什么、怎么联系"

**Independent Test**: 只实现本阶段并发布，让一个不了解站主的人打开首页，检验他能否说出站主身份、技术方向与联系方式（`quickstart.md` V3）

- [ ] T015 [US1] 重写首页 hero 区 `src/pages/index.astro`：用 `SiteConfig` 替换模板硬编码的 `Mingalaba` 与 AstroPaper 介绍文案；首屏（无需滚动）MUST 可见站主身份、主要技术方向与至少一种联系方式（FR-002）（FR-001、FR-006、SC-001）
- [ ] T016 [P] [US1] 新增 `src/components/ContactLinks.astro`：渲染邮箱与公开技术账号；MUST NOT 输出手机号与简历下载入口（FR-004、FR-036）（FR-005）
- [ ] T017 [US1] 首页新增精选项目区 `src/pages/index.astro`：渲染 `featured: true` 的项目，复用 `ProjectCard`；无精选项目时该区域 MUST 不出现且不留空位
- [ ] T018 [US1] 编写 `src/content/pages/about.md`：个人简介、技能概览、工作经历、联系方式与公开技术账号；MUST NOT 含手机号与简历文件（FR-003、FR-004）
- [ ] T019 [US1] 首页最新文章区中文化 `src/pages/index.astro`：文案取自 zh 翻译，条数由 `posts.perIndex` 控制，链接指向 `/posts/`（FR-001）

**Checkpoint**: 首页与"关于我"独立可用——即使没有项目和文章也是一个成立的站点

---

## Phase 4: User Story 2 - 访客了解一个项目的完整来龙去脉 (Priority: P2)

**Goal**: 面试官读完项目详情页，能提出具体技术问题而不是只能问"这是做什么的"

**Independent Test**: 只发布一个项目详情页并可从首页到达，检验读者能否复述该项目的目标、关键取舍与结果（`quickstart.md` V4）

- [ ] T020 [US2] 新增 `src/layouts/ProjectLayout.astro`：承载六段式正文——要解决的问题 / 方案概述 / 关键技术取舍 / 架构或流程图 / 运行截图 / 结果与现状（FR-008）
- [ ] T021 [US2] 新增项目列表 `src/pages/projects/index.astro`：展示每个项目的名称、一句话说明、技术要点与状态（FR-007），复用 `ProjectCard`（SC-002）
- [ ] T022 [US2] 新增项目详情 `src/pages/projects/[...slug].astro`：地址稳定为 `/projects/<slug>/`；`repo` 缺省时源码入口 MUST 呈现为不可用状态而非失效链接（FR-009）；`demo` 缺省时 MUST 完全不渲染演示区域（FR-010）
- [ ] T023 [P] [US2] 编写首个项目 `src/content/projects/bili-dynamics.md`：六段式正文 + 架构图 + 运行截图；截图与正文 MUST 通过人工核对，不得出现 `.env`/`config.json` 中的凭证或账号信息（FR-032）
- [ ] T024 [P] [US2] 编写第二个项目 `src/content/projects/tech-feed.md`：同上六段式要求（SC-005）
- [ ] T025 [US2] 项目详情响应式核对 `src/pages/projects/[...slug].astro` 与 `src/layouts/ProjectLayout.astro`：宽表格、长代码行、宽截图 MUST NOT 导致整页横向滚动（FR-026）

**Checkpoint**: 项目区独立可用，且新增项目不需要改动任何页面代码（FR-011）

---

## Phase 5: User Story 3 - 读者阅读一篇技术文章 (Priority: P3)

**Goal**: 从外部链接进入的陌生读者能顺畅读完一篇文章，并发现站点还有其他内容

**Independent Test**: 只发布一篇文章，从外部链接直接打开，检验正文可读、地址可分享、页面上有其余内容入口（`quickstart.md` V1、V6）

- [ ] T026 [US3] 文章页中文化核对与调整：`src/layouts/PostLayout.astro` 与 `src/pages/posts/[...slug]/index.astro` 的界面文案改走 zh 翻译；核对相邻文章导航、回到顶部、目录折叠在中文下的表现（FR-012、FR-013、FR-016）
- [ ] T027 [P] [US3] 迁移文章 `src/content/posts/mihomo-tun-remote-fix.md`：正文原样保留，仅补 frontmatter（`title` / `description` / `pubDatetime` / `tags`），MUST NOT 重写正文（FR-021）（SC-006）
- [ ] T028 [P] [US3] 迁移文章 `src/content/posts/tech-feed-intro.md`：同上要求（SC-006）
- [ ] T029 [US3] 移动端阅读核对 `src/pages/posts/[...slug]/index.astro` 与 `src/components/ResponsiveTable.astro`：代码块、表格、引用 MUST 在自身容器内滚动，不产生整页横向滚动（FR-014）

**Checkpoint**: 文章区独立可用，现有 Markdown 素材已可直接承载

---

## Phase 6: User Story 4 - 站主以纯文本方式发布与更新内容 (Priority: P4)

**Goal**: 写完 → 提交 → 推送 → 站点自动更新，全程不登录任何后台、不执行部署命令

**Independent Test**: 新增一篇文章并推送，检验站点是否在无手工部署操作的情况下自动呈现（`quickstart.md` V8）

**依赖**: 需要 T011 完成且服务器可用

- [ ] T030 [US4] 草稿机制核对与文档化：确认 `draft: true` 排除构建，并记录 `_` 前缀目录/文件被加载器 `**/[^_]*.{md,mdx}` 排除这条更强的隐藏路径；写入 `deploy/README.md`（FR-017、FR-018）
- [ ] T031 [US4] 地址稳定性核对 `src/content/posts/` 与 `src/pages/posts/[...slug]/index.astro`：修改一篇已发布文章的标题与正文并重建，确认地址不变、内容更新（FR-015）
- [ ] T032 [US4] 端到端发布演练 `deploy/post-receive`：推送 → 计时确认 5 分钟内线上可见；再故意提交一处导致构建失败的改动，确认**发布中止、服务目录未切换、线上仍是上一版**（FR-019、SC-004）
- [ ] T033 [US4] 在 `deploy/README.md` 中补齐回滚步骤（切回上一个发布目录的具体命令）（SC-012、SC-013）

**Checkpoint**: 发布链路可靠且可回滚——这是站点能否被长期维护的决定性条件

---

## Phase 7: User Story 5 - 读者订阅并发现站点内容 (Priority: P5)

**Goal**: 读者能订阅、能搜到、能搜到站内内容

**Independent Test**: 订阅订阅源并发布新文章，检验阅读器是否收到；用搜索引擎检索标题；用中文关键词做站内检索（`quickstart.md` V5、V7）

- [ ] T034 [P] [US5] 分享目标精简：修改 `astro-paper.config.ts` 的 `shareLinks` 与 `src/pages/posts/[...slug]/_components/ShareLinks.astro`，替换模板默认的 whatsapp / facebook / x / telegram / pinterest 为中国读者常用形式（微信、邮箱、复制链接）
- [ ] T035 [P] [US5] 分享元信息核对：确认每个页面输出 title / description / canonical 与 OG 卡片信息；确认**每篇文章生成独立的分享卡片**（内容为该文章的标题与摘要，非全站共用图），无独立封面时回退到 `site.ogImage` 默认图且 MUST NOT 出现破图（FR-024）（SC-007）
- [ ] T036 [P] [US5] 订阅源与站点地图核对：`src/pages/rss.xml.ts` 与 `@astrojs/sitemap` 输出正确；中文标题正常；草稿 MUST NOT 出现（FR-020、FR-022、FR-023）（SC-010）
- [ ] T037 [US5] 站内检索中文查询实测 `src/pages/search.astro`：在 `pnpm preview` 下用**正文中出现但标题里没有的中文关键词**检索，确认命中；再输入不存在的关键词，确认有明确空结果提示（FR-025、SC-011）。此项**此前未验证**，见 `verify.md` 第八节
- [ ] T038 [US5] 核对 `src/pages/robots.txt.ts` 与搜索引擎收录前置条件（站点地图可达、canonical 正确）

**Checkpoint**: 内容可被订阅、被检索、被分享

---

## Phase 8: User Story 6 - 站主为项目附加可交互演示 (Priority: P6)

**Goal**: 想加 demo 时加一个目录、填一行 frontmatter 即可；不想加时页面上不留痕迹

**Independent Test**: 为一个项目配置演示入口并打开；移除配置后确认页面不出现该区域且不留空位（`quickstart.md` V4 演示部分）

- [ ] T039 [US6] 新增 `src/components/DemoFrame.astro`：嵌入演示并提供全屏打开入口；加载失败或超时 MUST 给出降级提示且 MUST NOT 影响页面其余内容阅读（User Story 6 场景 3）
- [ ] T040 [US6] 项目详情页接入 `demo` 字段：修改 `src/pages/projects/[...slug].astro`，`demo` 存在时渲染 `DemoFrame`，为外链时按外链方式呈现而不嵌入
- [ ] T041 [P] [US6] 放置首个真实演示：把 `tech-feed/demo/index.html` 的静态预览产物放入 `public/demos/tech-feed/`，并在 `src/content/projects/tech-feed.md` 填 `demo: /demos/tech-feed/`
- [ ] T042 [US6] 为 `demo` 字段增加构建期校验（`src/content.config.ts` 或 `scripts/check-links.mjs`）：`demo` 指向的站点内目录不存在时构建 MUST 失败，避免上线死链

**Checkpoint**: 演示能力可随时扩展，且不影响已有页面

---

## Phase 9: User Story 7 - 海外读者访问站点 (Priority: P7)

**Goal**: 将来增加海外线路时，不需要改动内容与页面地址

**Independent Test**: 核对增加第二条线路所需的改动范围，确认不涉及内容文件与页面结构（`quickstart.md` V11）

- [ ] T043 [US7] 核对架构预留：确认站点的内容、页面地址与构建产物均不绑定当前托管位置；确认 `deploy/` 中的发布逻辑不依赖单一服务商（FR-029、FR-034、SC-009）
- [ ] T044 [US7] 在 `deploy/README.md` 记录未来双线路（国内 + 海外）的操作步骤，**本篇只记录不实施**——当前读者以国内为主，此故事不阻塞上线（FR-030）

**Checkpoint**: 扩展路径清晰，且没有为它提前付出成本

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 影响多个用户故事的收尾工作

- [ ] T045 [P] 404 页中文化 `src/pages/404.astro`
- [ ] T046 [P] 模板遗留清理确认：`.github/`、`Dockerfile`、`compose.yaml`、`.vscode/`、`eslint.config.js`、`cz.yaml` 已移除；`LICENSE`（MIT）**保留**；`README.md` 改写为本项目说明
- [ ] T047 [P] 编写站点 `README.md`：定位、如何新增内容、如何发布、常见操作（SC-013）
- [ ] T048 隐私合规扫描：在全量构建产物中检索凭证特征（token / secret / password / 账号配置文件）与手机号；逐项核对含第三方平台数据的项目截图（FR-032、`quickstart.md` V9）（FR-031、FR-033）
- [ ] T049 性能预算核对：执行 `scripts/check-budget.mjs`，确认首屏 JS ≤50 KB gzip、静态资源 ≤1 MB、单篇媒体 ≤5 MB（SC-003、`quickstart.md` V10）（FR-028）
- [ ] T050 响应式与明暗模式全量核对 `src/pages/index.astro`、`src/pages/projects/**`、`src/pages/posts/**`、`src/components/Header.astro`：在移动端与桌面端均无整页横向滚动，明暗两种模式内容均可读（SC-008、FR-027）
- [ ] T051 **小内存服务器构建实测**：在目标轻量服务器（1–2 GB 内存）上完整跑一次构建，确认内存峰值可接受。**这是 `verify.md` 中唯一未验证的风险点，也是上线前必须实测的一项**
- [ ] T052 执行 `quickstart.md` 全量验收（V1–V11），逐项勾选 M0 上线验收清单

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成；**阻塞所有用户故事**
- **User Stories (Phase 3–9)**: 均依赖 Foundational
- **Polish (Phase 10)**: 依赖所需用户故事完成

### 用户故事之间的真实依赖

按设计每个故事应相互独立。本项目有一处**必须承认的例外**：

- **US1 的 T017（首页精选项目区）依赖 US2 的 T010（`ProjectCard`）**。已把 `ProjectCard` 提前到 Foundational，因此该依赖被消除。
- 其余故事之间无依赖：US3 复用模板既有文章页，US5 主要复用了模板的 RSS/sitemap/Pagefind，US6 只新增组件与一个 frontmatter 字段。
- **US7 是纯核对任务**，不产出功能，可随时并行。

### 外部依赖（不受代码控制，会卡上线）

- **T011、T032、T051 需要服务器与域名**。域名实名与服务器开通是串行外部流程，建议最先启动。
- 备案**不在任务范围内**：已确认走香港/新加坡节点，免备案。

### Within Each User Story

- 组件/layout 先于页面
- 页面先于内容文件
- 内容文件先于响应式核对

### Parallel Opportunities

- Phase 1 的 T003、T004、T006 可并行
- Phase 2 的 T008、T009、T010、T012、T014 可并行
- US2 的 T023、T024 两个项目内容文件可并行编写
- US5 的 T034、T035、T036 可并行
- US3 的 T027、T028 两篇文章迁移可并行

---

## Parallel Example: Foundational

```bash
# 以下任务互不冲突，可同时进行：
Task: "新增 src/i18n/lang/zh.ts 并设 locale 为 zh"
Task: "扩展 src/content.config.ts，新增 projects 集合"
Task: "新增 src/components/ProjectCard.astro"
Task: "新增 scripts/check-links.mjs 与 scripts/check-budget.mjs"
Task: "替换 public/default-og.jpg"
```

---

## Implementation Strategy

### MVP First

**建议的 MVP 不是单一个 US1，而是 US1 + US2 + 最小 US3。**

理由：这个站点的价值来自"作品集 + 文章"两者同时存在。只有首页和关于我的站点不能满足"求职作品集"这个首要使命——面试官进来是要看项目的。这与 `quickstart.md` 的 M0 清单一致。

1. 完成 Phase 1 Setup
2. 完成 Phase 2 Foundational（阻塞项，**含部署通道**）
3. 完成 US1 + US2 + US3
4. **STOP & VALIDATE**：执行 `quickstart.md` 的 M0 验收清单
5. 上线

### Incremental Delivery

1. Setup + Foundational → 地基就绪
2. + US1 → 首页可用（严格意义上最小的站点）
3. + US2 → **作品集成立，可以发出去了**（面试官有东西可看）
4. + US3 → 技术写作成立
5. + US4 → 发布链路自动化，进入长期维护状态
6. + US5 → 可被发现、可被订阅
7. + US6 → 演示能力（按需）
8. + US7 → 海外扩展（将来）

### 实施顺序上的两个提醒

- **T005（字体修复）不可跳过**。跳过它构建会随机失败，且因为"失败不切换线上"的设计，表现为静默不发布——很难排查。
- **T051（小内存服务器构建实测）要在写页面之前做，不要等到最后**。如果 1–2 GB 内存吃不下构建，整个部署方案（服务端构建）都需要重新设计，越早发现越好。

---

## Notes

- `[P]` = 不同文件、无未完成依赖
- `[Story]` 标签用于追溯任务归属
- 每个用户故事应当可独立完成与验收
- **不要引入任何新依赖**；确需引入时，先在 `research.md` 记录"删掉它会损失什么"
- 每个阶段结束提交一次，提交信息说明对应任务号
