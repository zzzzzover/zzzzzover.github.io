# Phase 1 数据模型：个人作品集与技术博客站点

**Feature**: `001-portfolio-blog` | **Date**: 2026-09-12

本文件定义站点承载的内容实体。实体全部以版本库中的纯文本文件表示，无数据库、无运行时存储（宪法 III）。字段的权威定义落在 `src/content.config.ts` 的 schema 中，本文件与 `contracts/content-schema.md` 是它的规格来源。

---

## 实体总览

| 实体 | 存储形态 | 数量级 | 地址 | 对应需求 |
|---|---|---|---|---|
| Article（文章） | `src/content/articles/<slug>.md` | 10–30 | `/writing/<slug>/` | FR-012 … FR-016 |
| Project（项目） | `src/content/projects/<slug>.md` | 5–15 | `/projects/<slug>/` | FR-007 … FR-011 |
| Page（固定页面） | `src/content/pages/<slug>.md` | 1–3 | 由内容指定 | FR-003 |
| Asset（素材） | `src/assets/` 或 `public/` | 随内容增长 | 由构建决定 | FR-014、SC-003 |
| Feed（订阅源） | 构建期派生，无独立文件 | 1 | `/rss.xml` | FR-022 |
| SiteConfig（站点配置） | `src/config.ts`（单例） | 1 | — | FR-001、FR-006、FR-036 |

---

## Article（文章）

**职责**：一篇技术写作，是订阅源与文章列表的数据来源。

| 字段 | 类型 | 必填 | 校验规则 |
|---|---|---|---|
| `title` | string | 是 | 非空；长度 ≤ 80 字符 |
| `summary` | string | 是 | 非空；用于列表与分享卡片，长度 ≤ 160 字符 |
| `date` | date | 是 | ISO `YYYY-MM-DD`；不得晚于构建当日 |
| `draft` | boolean | 否（默认 `false`） | 为 `true` 时该文章 MUST 从构建产物、列表与订阅源中完全排除（FR-020） |
| `cover` | image | 否 | 缺省时列表与分享卡片使用默认样式，MUST NOT 出现破图 |
| `tags` | string[] | 否（默认空） | 元素非空且不重复 |
| `lang` | string | 否（默认 `zh`） | 固定为 `zh`；站点不维护双语正文（FR-035） |

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
| `route` | string | 是 | 目标路径，如 `/about/`；MUST 唯一且不与文章、项目的路由前缀冲突 |

正文 MUST 包含：个人简介、技能概览、工作经历、联系方式与公开技术账号（FR-003、FR-036）。MUST NOT 包含手机号与简历文件（FR-004）。

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

- 数据源为全部已发布文章，按 `date` 倒序。
- MUST 包含标题、摘要、发布日期与正文内容或全文链接。
- 草稿 MUST NOT 出现。

---

## SiteConfig（站点配置）

**职责**：全站单例配置，变更频率最低。

| 字段 | 类型 | 必填 | 校验规则 |
|---|---|---|---|
| `name` | string | 是 | 站点名称 |
| `owner` | string | 是 | 站主身份标识；MUST 在页面上明确标示（FR-006） |
| `tagline` | string | 是 | 一句话定位；用于首页首屏（FR-002） |
| `email` | string | 是 | 公开联系方式（FR-036） |
| `social` | {label, url}[] | 是 | 公开技术账号，至少 1 项；MUST NOT 包含手机号 |
| `nav` | {label, href}[] | 是 | 导航结构；MUST 含首页与联系入口（FR-005） |
| `baseUrl` | url | 是 | 站点根地址；用于订阅源、站点地图与分享元信息 |

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
