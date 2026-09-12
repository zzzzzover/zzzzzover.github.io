# 契约：内容 schema

**Feature**: `001-portfolio-blog` | **Date**: 2026-09-12

本契约定义**内容与渲染之间的唯一接口**。它是宪法 II「内容与渲染分离」的可执行形式：只要满足本契约，新增内容就不需要改动任何页面代码。

权威实现点：`src/content.config.ts`。字段的语义与校验规则见 `../data-model.md`；本文件给出可直接照抄的书写形式。二者冲突时以 `data-model.md` 为准，并修正本文件。

**违反本契约的后果**：构建失败（由 schema 在构建期强制），或降级呈现不符合规格。二者都不会产生"悄悄上线的坏页面"。

---

## 1. 文章

路径：`src/content/articles/<slug>.md` → 地址 `/writing/<slug>/`

```yaml
---
title: 用 mihomo TUN 修复 cloudflared 边缘连接黑洞
summary: 排查远程连接随机失效，最终定位到数据面不走代理并给出可回滚的修复步骤。
date: 2026-09-12
draft: false
cover: ../../assets/articles/mihomo-tun/cover.png   # 可选
tags:
  - 网络
  - 代理
---
正文…
```

| 字段 | 必填 | 缺省行为 |
|---|---|---|
| `title` | 是 | — |
| `summary` | 是 | — |
| `date` | 是 | — |
| `draft` | 否 | `false`（发布）。为 `true` 时完全排除出构建、列表与订阅源 |
| `cover` | 否 | 列表与分享卡片使用默认样式 |
| `tags` | 否 | 空数组 |
| `lang` | 否 | `zh` |

---

## 2. 项目

路径：`src/content/projects/<slug>.md` → 地址 `/projects/<slug>/`

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
cover: ../../assets/projects/bili-dynamics/cover.png # 可选
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
| `featured` | 否 | `false`，不进入首页精选区 |
| `order` | 否 | 按 `title` 排序 |

**`demo` 字段的约定**：

- 取值是站点内的绝对路径，指向 `public/` 下真实存在的目录。
- 构建期校验该目录存在；不存在则构建失败（避免上线死链）。
- 独立服务型演示填外部完整 URL，页面按外链方式呈现，不嵌入。
- 无论哪种形式，页面 MUST 提供全屏打开入口与加载失败时的降级提示。

---

## 3. 固定页面

路径：`src/content/pages/<slug>.md`

```yaml
---
title: 关于我
route: /about/
---
正文…（个人简介、技能概览、工作经历、联系方式、公开技术账号）
```

| 字段 | 必填 | 校验 |
|---|---|---|
| `title` | 是 | 非空 |
| `route` | 是 | 唯一，且不与 `/writing/`、`/projects/` 前缀冲突 |

正文 MUST NOT 出现手机号或简历文件下载入口（FR-004）。

---

## 4. 站点配置

路径：`src/config.ts`，单例。

```ts
export const site = {
  name: '…',
  owner: '…',           // 站主标识，页面上必须可见
  tagline: '…',         // 首页首屏一句话定位
  email: '…',           // 公开联系方式
  social: [ { label: 'GitHub', url: '…' } ],
  nav: [ { label: '首页', href: '/' }, { label: '联系', href: '/about/' } ],
  baseUrl: 'https://…',
}
```

`email` 与 `social` 至少各一项；MUST NOT 含手机号。

---

## 5. 契约的稳定性

- 新增字段属于**扩展**，MUST 提供缺省行为，MUST NOT 使既有内容构建失败。
- 重命名或删除字段属于**破坏性变更**，MUST 先修订 `../data-model.md` 与本文件，并一次性迁移既有内容。
- 任何使"新增内容需要改动页面代码"的变更，直接违反宪法 II，MUST 被否决。
