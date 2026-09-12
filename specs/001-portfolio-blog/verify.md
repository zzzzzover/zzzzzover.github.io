# 模板验证报告：AstroPaper

**Feature**: `001-portfolio-blog` | **日期**: 2026-09-12 | **验证对象**: [satnaing/astro-paper](https://github.com/satnaing/astro-paper) @ `35cfa7f`

**目的**：在写任何页面代码之前，确认所选模板能否在本项目约束下真正跑起来——尤其是中文内容、
构建稳定性与小服务器可行性。本报告只记录**实测**结果，不含推测。

**验证位置**：`personal-blog/.verify/astro-paper/`（已 gitignore，验证结束后删除）。

---

## 一、环境

| 项 | 实测值 | 模板要求 |
|---|---|---|
| Node.js | v22.23.2 | `>=22.12.0` ✓ |
| pnpm | 12.3.4 | — |
| 核心依赖 | Astro **7.0.3**、Tailwind **4.3.2**、TypeScript 6.0.3 | — |
| 原生依赖 | sharp 0.35.2、esbuild 0.28.1 | 预编译产物下载正常 ✓ |

## 二、通过的检查

| 检查 | 结果 |
|---|---|
| `pnpm install` | 成功，47.8 秒，**554 个包**（顶层声明 25 个） |
| `astro check` | 55 个文件，**0 error / 0 warning / 0 hint** |
| `pnpm build` | 成功，**45 个页面，9.6 秒** |
| Pagefind 索引 | 成功，17 页 2503 词 |
| `LICENSE` | MIT ✓（保留版权声明即可商用/修改） |

## 三、路由连通性（`pnpm preview` 实测）

| 路径 | 状态 |
|---|---|
| `/` | 200 |
| `/posts/` | 200 |
| `/about/` | 200 |
| `/archives/` | 200 |
| `/tags/` | 200 |
| `/search/` | 200 |
| `/rss.xml` | 200 |
| `/sitemap-index.xml` | 200 |
| `/robots.txt` | 200 |
| `/posts/<slug>/` | 200 |
| `/og.png` | **404（预期）**，见下文第四节 |

## 四、发现的阻碍性问题与修复

### 4.1 构建期抓取 Google Fonts，失败即整体构建失败（已修复）

**现象**：`astro.config.ts` 配置了 20 个 Google Fonts 字体文件，构建时并行抓取。连续两次构建
失败，且**两次挂在不同文件上**（先 `.ttf` 后 `.woff`）：

```
[CannotFetchFontFile] An error occurred while fetching the font file
from https://fonts.gstatic.com/...  Caused by: fetch failed
```

**关键判断**：同一 URL 用 `curl` 单独请求是 **HTTP 200 / 63 KB / 0.38 s**。也就是说问题不是
"不可达"，而是**并发抓取不稳定**——这比彻底不可达更危险，因为它会**随机**让发布失败。模板没有
重试机制，任一文件失败即终止整个构建。

**影响**：`site-contract.md` 规定"构建失败不切换线上版本"。因此该缺陷的后果是**静默地不发布**。

**修复**（已应用，构建通过）：

| 文件 | 改动 |
|---|---|
| `astro.config.ts` | 删除整个 `fonts: [...]` 配置块 |
| `src/styles/theme.css` | `--font-app` 由 `var(--font-google-sans-code)` 改为系统字体栈（含 PingFang SC / Microsoft YaHei / Noto Sans CJK SC） |
| `src/layouts/Layout.astro` | 移除 `import { Font }` 与 `<Font />` 元素 |
| `astro-paper.config.ts` | `features.dynamicOgImage` 改为 `false` |
| `src/pages/og.png.ts` | 删除（该路由不检查开关，缺字体会直接抛错） |

**副作用（需知悉）**：原字体是**全站正文字体**（`--font-app`），不只是代码字体。移除后全站改用
系统字体栈。对中文内容而言观感通常更好，但**站点外观与模板演示站会有差异**，这是有意的取舍。

### 4.2 中文动态分享图不可用（已接受降级）

模板用 **satori** 为每篇文章生成分享卡片，satori 需要**真实字体数据**才能渲染文字。中文字体动辄
5–20 MB，塞进构建产物不现实；且模板依赖的是 Astro 的实验性 API `experimental_getFontFileURL`。

**处置**：关闭 `dynamicOgImage`。模板有优雅降级——自动回退到 `public/{site.ogImage}` 静态默认图，
**满足 FR-024**（分享卡片有标题、摘要、封面）。

**代价**：所有文章共用一张默认分享图，没有逐篇独立卡片。若将来需要，可自行以字体子集化方式补回。

## 五、中文支持验证（通过）

新增一篇中文测试文章并重建（测试文件已删除）：

| 检查 | 结果 |
|---|---|
| 中文字符进入 HTML | ✓ `犀牛望月协议栈`、`隧道黑洞` 均可在产物中检索到 |
| 页面语言属性 | ✓ `<html dir="ltr" lang="zh">` |
| 标题渲染 | ✓ `验证中文标题与正交搜索能力 \| AstroPaper` |
| Pagefind 语言识别 | ✓ **自动识别为 `zh`**，生成 `pagefind.zh_*.pf_meta` |
| 索引词数增长 | ✓ 2503 → 2606（单篇中文文章贡献 103 个索引单元） |
| RSS | ✓ 中文文章正常出现在订阅源 |

Pagefind 提示 "doesn't support stemming for the language zh"——中文不需要词干提取，非问题。

**i18n 现状**：`src/i18n/lang/` 下**只有 `en.ts`**。`src/i18n/index.ts` 用
`import.meta.glob("./lang/*.ts")` 自动加载并回退到英文，因此**新增一个 `zh.ts` 即可**，无须改动
加载逻辑。界面文案（导航、分页、404、无障碍标签）在补 `zh.ts` 之前会保持英文。

## 六、性能实测（远优于预算）

首页首屏实际传输量：

| 资源 | 原始 | gzip |
|---|---|---|
| JS | 16 KB | **5.3 KB** |
| CSS | 68 KB | **10.7 KB** |
| HTML | 44 KB | **6.3 KB** |
| **合计** | | **约 22 KB** |

`plan.md` 定的预算是"单页首屏 JS ≤50 KB（gzip）"，实测 **5.3 KB**，富余约十倍。全站 JS 合计
540 KB 中绝大部分是 Pagefind 的搜索 UI，仅在 `/search/` 加载。

`dist` 总计 6.8 MB，其中**约 5.4 MB 是模板自带的演示图片**（`AstroPaper-v6.png` 单个 824 KB）。
清除演示内容后站点实际体积很小。

## 七、需要处理的模板遗留物

| 项 | 处置 |
|---|---|
| `Dockerfile`、`compose.yaml` | 删除（本项目不用容器） |
| `.github/`（CI、issue 模板、FUNDING） | 删除（上游仓库的，不属于本项目） |
| `eslint.config.js`、`cz.yaml`、`.vscode/` | 删除（不用） |
| `src/content/posts/` 下的演示文章与图片 | 全量删除（约 5.4 MB） |
| `public/default-og.jpg` | 替换为本项目默认分享图 |
| `public/pagefind/` | 构建产物，MUST 加入 `.gitignore` |
| 首页 `src/pages/index.astro` 的 hero 文案 | 硬编码为 `Mingalaba` + AstroPaper 介绍，需替换 |
| `editPost.url` | 指向上游仓库，需改为本项目或关闭 |

## 八、未验证项（须诚实记录）

- **小内存服务器上的构建可行性**：本地 9.6 秒完成，但**未在 1–2 GB 内存的轻量服务器上实测**。
  sharp 与 Astro 构建均有内存峰值。**这是上线前唯一必须实测的风险点。**
- **Pagefind 中文查询的真实效果**：只验证到索引层面（语言识别、索引词数），**未在浏览器中执行
  中文查询并检查命中结果**。
- **移动端视觉呈现**：只检查了状态码与体积，未做视觉检查。
- **服务器、域名、Caddy、备案相关**：全部未验证（尚无服务器）。

## 九、结论

模板**可用**，且中文化与性能表现良好。但**不能开箱即用**：

1. 必须先移除 Google Fonts 构建期依赖，否则发布流程会随机失败（已验证修复有效）。
2. 必须接受"无逐篇动态分享图"这一降级。
3. 首页与项目区需要自行实现，这部分模板不提供。

以上三项已分别反映到 `research.md`、`plan.md`、`data-model.md` 与 `contracts/` 的修订中。
