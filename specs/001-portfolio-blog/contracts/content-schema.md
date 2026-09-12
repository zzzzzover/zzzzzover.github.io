# 契约：内容 schema

**Feature**: `001-portfolio-blog` | **Date**: 2026-09-12

本契约定义**内容与渲染之间的唯一接口**。它是宪法 II「内容与渲染分离」的可执行形式：只要满足本契约，新增内容就不需要改动任何页面代码。

**权威实现点**：模板 AstroPaper 的 `src/content.config.ts`（草案阶段设计的字段名已按实测结果修正，见 `../verify.md`）。字段语义与校验规则见 `../data-model.md`。二者冲突时以 `data-model.md` 为准，并修正本文件。

**违反本契约的后果**：构建失败（由 schema 在构建期强制），或降级呈现不符合规格。二者都不会产生"悄悄上线的坏页面"。

---

## 0. 两条通用规则

**下划线前缀即隐藏**：内容加载器使用 `**/[^_]*.{md,mdx}`，文件名或目录名以 `_` 开头的条目**不参与构建**。临时草稿可借此彻底排除（比 `draft: true` 更彻底）。

**字段命名沿用模板**：不另造同义字段。理由见宪法 I。

---

## 1. 文章

路径：`src/content/posts/<slug>.md` → 地址 `/posts/<slug>/`

```yaml
---
title: 用 mihomo TUN 修复 cloudflared 边缘连接黑洞
description: 排查远程连接随机失效，最终定位到数据面不走代理并给出可回滚的修复步骤。
pubDatetime: 2026-09-12T10:00:00+08:00
tags:
  - 网络
  - 代理
draft: false
# ogImage: ../../assets/images/mihomo-cover.png   # 可选
# featured: true                                   # 可选，进首页精选
# modDatetime: 2026-09-20T10:00:00+08:00           # 可选，修订时间
---
正文…
```

| 字段 | 必填 | 缺省行为 |
|---|---|---|
| `title` | 是 | — |
| `description` | 是 | — |
| `pubDatetime` | 是 | — |
| `draft` | 否 | `false`（发布）。为 `true` 时完全排除出构建、列表与订阅源 |
| `tags` | 否 | `["others"]` |
| `ogImage` | 否 | 使用站点默认分享图 `site.ogImage` |
| `featured` | 否 | `false`，不进首页精选区 |
| `modDatetime` | 否 | 不显示修订时间 |
| `author` | 否 | 取站点配置 |
| `canonicalURL` | 否 | 不输出规范链接覆盖 |
| `hideEditPost` | 否 | 显示"编辑此页"入口（若已启用该功能） |

---

## 2. 项目

路径：`src/content/projects/<slug>.md` → 地址 `/projects/<slug>/`

**这是新增的集合**，模板中不存在，schema 由本项目定义。

```yaml
---
title: B 站 UP 主动态存档与直播自动录制
summary: 定时轮询指定 UP 主的动态，增量存档、自动下载新视频，并在开播时自动分段录屏。
role: 独立开发
tech:
  - Node.js
  - Python
  - ffmpeg
status: 运行中
repo: https://github.com/<account>/bili-dynamics     # 可选
demo: /demos/bili-dynamics/                          # 可选
demoNote: 只读快照，数据为录制当日的静态导出。        # 可选，仅在 demo 存在时有意义
cover: ../../assets/images/bili-cover.png            # 可选
featured: true                                       # 可选
order: 10                                            # 可选
---

## 要解决的问题
…
## 方案概述
…
## 关键技术取舍
…
## 架构
…（架构图）
## 运行截图
…
## 结果与现状
…
```

| 字段 | 必填 | 缺省行为 |
|---|---|---|
| `title` / `summary` / `role` / `tech` / `status` | 是 | — |
| `repo` | 否 | 详情页源码入口呈现为**不可用状态**，不是失效链接 |
| `demo` | 否 | 详情页**不出现**演示区域，不留空占位 |
| `demoNote` | 否 | 演示区域不显示补充说明 |
| `cover` | 否 | 卡片使用默认样式 |
| `featured` | 否 | `false`，不进首页精选区 |
| `order` | 否 | 按 `title` 排序 |

> **注意字段名差异**：项目集合用 `summary` 与 `cover`，文章集合用 `description` 与 `ogImage`。
> 这是有意为之——文章沿用模板既有命名以确保兼容，项目是本项目自有集合、命名可以自洽。
> 两套并存不是疏漏，改动其中一套属于破坏性变更，需先修订 `data-model.md`。

**`demo` 字段的约定**：

- 取值是站点内的绝对路径，指向 `public/` 下真实存在的目录。
- 构建期校验该目录存在；不存在则构建失败（避免上线死链）。
- 独立服务型演示填外部完整 URL，页面按外链方式呈现，不嵌入。
- 无论哪种形式，页面 MUST 提供全屏打开入口与加载失败时的降级提示。

---

## 3. 固定页面

路径：`src/content/pages/<slug>.md`，由对应的页面文件渲染。

```yaml
---
title: 关于我
description: 个人简介、技能与联系方式。
---
正文…（个人简介、技能概览、工作经历、联系方式、公开技术账号）
```

| 字段 | 必填 | 校验 |
|---|---|---|
| `title` | 是 | 非空 |
| `description` | 否 | 分享卡片用 |
| `ogImage` | 否 | 分享卡片封面 |

**没有 `route` 字段**：地址由 `src/pages/<name>.astro` 决定，不由内容声明（模板既有行为，实测确认）。

正文 MUST NOT 出现手机号或简历文件下载入口（FR-004）。

---

## 4. 站点配置

**两个文件**，职责不同（模板既有结构）：

**`astro-paper.config.ts`（仓库根）—— 站主维护**

```ts
export default defineAstroPaperConfig({
  site: {
    url: "https://example.com/",
    title: "…",
    description: "…",
    author: "…",
    profile: "…",              // 可选
    ogImage: "default-og.jpg", // 放 public/
    lang: "zh",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: { perPage: 8, perIndex: 4, scheduledPostMargin: 15 * 60 * 1000 },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,     // 必须 false，原因见 ../verify.md
    showArchives: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [ /* 至少 1 项，MUST NOT 含手机号 */ ],
  shareLinks: [ /* 精简为中国读者常用的 */ ],
});
```

**`src/config.ts` —— 内部归一化层**，不要在此处填站主信息；它把上面的配置收敛为派生默认值。

---

## 5. 契约的稳定性

- 新增字段属于**扩展**，MUST 提供缺省行为，MUST NOT 使既有内容构建失败。
- 重命名或删除字段属于**破坏性变更**，MUST 先修订 `../data-model.md` 与本文件，并一次性迁移既有内容。
- 任何使"新增内容需要改动页面代码"的变更，直接违反宪法 II，MUST 被否决。
