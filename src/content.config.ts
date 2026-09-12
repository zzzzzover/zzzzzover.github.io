import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { existsSync } from "node:fs";
import { join } from "node:path";
import config from "@/config";

export const BLOG_PATH = "src/content/posts";

/**
 * 内容与渲染之间的唯一接口。字段语义与校验规则见
 * specs/001-portfolio-blog/data-model.md 与 contracts/content-schema.md。
 *
 * 命名说明：posts 沿用模板既有字段名（description / pubDatetime / ogImage）以保证兼容；
 * projects 是本项目自有集合，用 summary / cover。两套并存是有意的，
 * 详见 contracts/content-schema.md 第 2 节末尾的说明。
 */

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(config.site.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      /** 为 true 时完全排除出构建、列表与订阅源（FR-020） */
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
    }),
});

/** 项目状态的合法取值。用中文是因为站点仅提供中文（FR-035）。 */
export const PROJECT_STATUSES = ["运行中", "维护中", "已归档", "原型"] as const;

const isAbsoluteUrl = (v: string) => /^https?:\/\//.test(v);

/**
 * `demo` 的取值约束（FR-010）：
 *   - 外部演示：完整 https:// 地址
 *   - 站内演示：以 / 开头的路径，且 public/ 下对应目录必须真实存在
 * 后者在构建期校验，避免上线死链；缺省时详情页完全不渲染演示区域。
 */
const demoField = z
  .string()
  .optional()
  .refine(
    (v: string | undefined): boolean => {
      if (v === undefined) return true;
      if (isAbsoluteUrl(v)) return true;
      if (!v.startsWith("/")) return false;
      return existsSync(join(process.cwd(), "public", v));
    },
    "demo 必须是以 / 开头且确实存在于 public/ 下的站点内路径，或完整的 https:// 地址",
  );

const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** 一句话说明，用于列表卡片与分享卡片 */
      summary: z.string(),
      /** 承担角色，如「独立开发」 */
      role: z.string(),
      /** 技术要点，至少 1 项（FR-007） */
      tech: z.array(z.string()).min(1),
      status: z.enum(PROJECT_STATUSES),
      /** 源码位置；缺省时详情页源码入口呈现为不可用状态而非失效链接（FR-009） */
      repo: z
        .string()
        .refine(isAbsoluteUrl, "repo 必须是完整的 http(s) 地址")
        .optional(),
      demo: demoField,
      /** 演示的补充说明，例如「只读实例，数据为快照」 */
      demoNote: z.string().optional(),
      cover: image().or(z.string()).optional(),
      /** 为 true 时进入首页精选区 */
      featured: z.boolean().optional(),
      /** 列表排序权重；缺省时按 title 排序 */
      order: z.number().optional(),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

export const collections = { posts, projects, pages };
