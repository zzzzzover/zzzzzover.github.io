# Phase 1 数据模型：个人作品集与技术博客站点

**Feature**: `001-portfolio-blog` | **Date**: 2026-09-12

本文件定义站点承载的内容实体。实体全部以版本库中的纯文本文件表示，无数据库、无运行时存储（宪法 III）。字段的权威定义落在 `src/content.config.ts` 的 schema 中，本文件与 `contracts/content-schema.md` 是它的规格来源。

---

## 实体总览

| 实体 | 存储形态 | 数量级 | 地址 | 对应需求 |
|---|---|---|---|---|
| Article（文章） | `src/content/posts/<slug>.md` | 10–30 | `/posts/<slug>/` | FR-012 … FR-016 |
| Project（项目） | `src/content/projects/<slug>.md` | 5–15 | `/projects/<slug>/` | FR-007 … FR-011 |
| Page（固定页面） | `src/content/pages/<slug>.md` | 1–3 | 由 `src/pages/*.astro` 决定 | FR-003 |
| Asset（素材） | `src/assets/` 或 `public/` | 随内容增长 | 由构建决定 | FR-014、SC-003 |
| Feed（订阅源） | 构建期派生，无独立文件 | 1 | `/rss.xml` | FR-022 |
| SiteConfig（站点配置） | `src/config.ts`（单例） | 1 | — | FR-001、FR-006、FR-036 |

---

## Article（文章）

**职责**：一篇技术写作，是订阅源与文章列表的数据来源。

> **字段命名基线**：下表使用模板 AstroPaper 的既有字段名，而非另造一套。依据宪法 I
> 「简约优先」——模板的 schema 已经过验证，改名只会增加迁移与维护成本，不产生任何价值。
> 实测确认于 `src/content.config.ts`（见 `verify.md`）。

| 字段 | 类型 | 必填 | 校验规则 |
|---|---|---|---|
| `title` | string | 是 | 非空 |
| `description` | string | 是 | 非空；用于列表与分享卡片 |
| `pubDatetime` | datetime | 是 | 不得晚于构建当日；列表与订阅源按此倒序 |
| `modDatetime` | datetime | 否 | 修订时间；与固定地址配合满足 FR-015 |
| `draft` | boolean | 否（默认 `false`） | 为 `true` 时该文章 MUST 从构建产物、列表与订阅源中完全排除（FR-020） |
| `ogImage` | image 或 string | 否 | 缺省时使用站点默认分享图，MUST NOT 出现破图 |
| `featured` | boolean | 否 | 为 `true` 时进入首页精选区 |
| `tags` | string[] | 否（默认 `["others"]`） | 元素非空且不重复 |
| `author` | string | 否 | 缺省取站点配置 |
| `canonicalURL` | string | 否 | 转载内容的原始地址 |
| `hideEditPost` | boolean | 否 | 隐藏"编辑此页"入口 |

**不设** `lang` 字段：站点仅提供中文（FR-035），语言由站点级 locale 配置决定，逐篇声明是冗余。

**身份与地址稳定性**：`slug` 由文件名决定，MUST 唯一。文章一旦发布，`slug` MUST NOT 变更；标题与正文修订 MUST NOT 改变地址（FR-015、SC-009）。

**状态迁移**：`draft: true` → `draft: false`（发布）。发布后 MUST NOT 回到草稿状态，且 MUST NOT 改用另一个 slug；如需撤下内容，改用取消发布说明页而非删除地址。

---

## Project（项目）

**职责**：一个独立完成的工程作品，是作品集的主体。

| 字段 | 类型 | 必填 | 校验规则 |
|---|---|---|---|
| `title` | string | 是 | 非空；长度 ≤ 80 字符 |
| `summary` | string | 是 | 一句话说明；长度 ≤ 160 字符；用于列表卡片与分享卡片 |
| `role` | string | 是 | 承担角色，如"独立开发" |
| `tech` | string[] | 是 | 至少 1 项（FR-007）；元素非空 |
| `status` | enum | 是 | 取值：`运行中` / `维护中` / `已归档` / `原型` |
| `repo` | url | 否 | 缺省或为空时，页面的源码入口 MUST 呈现为不可用状态而非失效链接（FR-009） |
| `demo` | string | 否 | 站点内路径；提供时 MUST 指向构建产物中真实存在的静态目录，构建期校验（FR-010） |
| `demoNote` | string | 否 | 演示的补充说明，例如"只读实例，数据为快照" |
| `cover` | image | 否 | 缺省时卡片使用默认样式 |
| `featured` | boolean | 否（默认 `false`） | 为 `true` 时进入首页精选区 |
| `order` | number | 否 | 列表排序权重；缺省时按 `title` 排序 |

**正文结构**（MUST 按序包含，对应 FR-008）：

1. 要解决的问题
2. 方案概述
3. 关键技术取舍
4. 架构或流程图
5. 运行截图
6. 结果与现状

**校验规则**：

- `demo` 与 `repo` 相互独立，任一项缺省均不阻塞发布，但 MUST 触发对应的降级呈现（边界情况）。
- 项目 MUST NOT 引用任何凭证、密钥或第三方隐私信息；涉及第三方平台数据的项目，截图与正文 MUST 通过人工核对（FR-032、宪法「内容与隐私约束」）。
- 新增或修改一个项目 MUST 只涉及本文件与相关素材，MUST NOT 触及 `src/layouts/`、`src/components/`、`src/pages/` 下的任何文件（FR-011、SC-005）。

**地址稳定性**：`slug` 由文件名决定，发布后 MUST NOT 变更。

---

## Page（固定页面）

**职责**：无发布时间属性的固定内容，首期为"关于我"。

| 字段 | 类型 | 必填 | 校验规则 |
|---|---|---|---|
| `title` | string | 是 | 非空 |
| `description` | string | 否 | 分享卡片用 |
| `ogImage` | string | 否 | 分享卡片封面 |

正文 MUST 包含：个人简介、技能概览、工作经历、联系方式与公开技术账号（FR-003、FR-036）。MUST NOT 包含手机号与简历文件（FR-004）。

**路由由页面文件决定，不由内容声明**（与最初设计不同，已按模板实测结果修正）。模板通过
`src/pages/about.astro` 渲染 `src/content/pages/about.md`，内容文件没有 `route` 字段。新增一个
固定页面需要新增一个 `.astro` 文件。这是可接受的：固定页面变更频率极低，且 FR-011 的"不改代码"
约束只针对**项目与文章**，不包括固定页面。

---

## Asset（素材）

**职责**：随内容一起发布的静态文件。分两类，边界明确：

| 类别 | 位置 | 是否参与构建优化 | 用途 |
|---|---|---|---|
| 构建期优化的图片 | `src/assets/` | 是 | 截图、架构图；由内容以相对路径引用 |
| 原样发布的静态资源 | `public/` | 否 | 演示产物 `public/demos/<slug>/`、站点图标 |

**校验规则**：

- 单个内容项引用的媒体总量 SHOULD 不超过 5 MB（宪法「内容与隐私约束」）。
- 演示产物 MUST 完全自包含，MUST NOT 依赖站点构建流程或其他项目的运行时。
- 素材 MUST NOT 包含凭证、令牌或第三方个人隐私信息（FR-032）。

---

## Feed（订阅源）

**职责**：文章集合的机器可读视图，供阅读器消费（FR-022、SC-010）。

非独立实体，由 Article 在构建期派生。派生规则：

- 数据源为全部已发布文章，按 `pubDatetime` 倒序。
- MUST 包含标题、摘要、发布日期与正文内容或全文链接。
- 草稿 MUST NOT 出现。

---

## SiteConfig（站点配置）

**职责**：全站单例配置，变更频率最低。

**实现在两个文件中**（模板既有结构，实测确认）：

- `astro-paper.config.ts`（仓库根）—— 站主直接编辑的配置：站点名称、描述、作者、时区、语言、
  `posts.perPage`、`features.*`（明暗模式、动态分享图、搜索、归档）、社交账号、分享目标。
- `src/config.ts` —— 内部归一化层，把上面的用户配置收敛为派生默认值后供页面引用。

下表字段落在 `astro-paper.config.ts`。

| 字段 | 类型 | 必填 | 校验规则 |
|---|---|---|---|
| `site.title` | string | 是 | 站点名称 |
| `site.description` | string | 是 | 站点描述；用于分享卡片（FR-024） |
| `site.author` | string | 是 | 站主身份标识；MUST 在页面上明确标示（FR-006） |
| `site.url` | url | 是 | 站点根地址；用于订阅源、站点地图与分享元信息 |
| `site.profile` | url | 否 | 站主主页；用于结构化数据 |
| `site.ogImage` | string | 是 | 默认分享图文件名（置于 `public/`）；无独立封面时使用 |
| `site.lang` | string | 是 | 固定 `zh`（FR-035） |
| `site.timezone` | string | 是 | 固定 `Asia/Shanghai`；影响日期显示与定时发布判定 |
| `socials` | {name, url}[] | 是 | 公开技术账号，至少 1 项；MUST NOT 含手机号（FR-036） |
| `shareLinks` | {name, url}[] | 是 | 文章页分享目标，精简为中国读者常用的（FR-024） |
| `posts.perPage` / `posts.perIndex` | number | 是 | 列表分页条数与首页条数 |

**导航结构不在本配置内**：导航项在 `Header.astro`，其文案取自 i18n（`nav.*`）。增加 Projects
入口需要改这两处，属一次性改动。

---

## 实体关系

```text
SiteConfig ──被所有页面引用──► Page / Article / Project
Article ──派生──► Feed
Article ──引用──► Asset（封面、正文内图片）
Project ──引用──► Asset（封面、架构图、截图）
Project ──可选引用──► Asset（public/demos/<slug>/ 下的演示产物）
```

无外键、无级联约束——所有关系在构建期由 Astro 的内容集合解析，解析失败即构建失败。
