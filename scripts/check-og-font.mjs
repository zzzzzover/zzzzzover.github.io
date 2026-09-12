#!/usr/bin/env node
/**
 * 构建期检查：所有会进入分享卡片的字符，都必须被分享图字体的覆盖清单包含。
 *
 * 为什么必须有这一步：渲染器（satori）遇到字体里没有的字形时**静默留空白**——
 * 不报错、不显示占位符、也不会让构建失败。没有这个检查，缺字会无声上线。
 * 详见 specs/001-portfolio-blog/research.md D8 与 verify.md 4.2。
 *
 * 零构建期依赖：只读清单文件，不解析字体、不做网络请求。
 * 用法：node scripts/check-og-font.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { collectScopedChars, fromCoverage, describeCodepoint } from "./lib/og-font-scope.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONT = join(ROOT, "src/assets/fonts/og-subset.ttf");
const MANIFEST = join(ROOT, "src/assets/fonts/og-subset.coverage.json");
const rel = p => p.slice(ROOT.length + 1);

function fail(msg) {
  console.error(`\n✗ 分享图字体覆盖检查失败\n\n${msg}\n`);
  process.exit(1);
}

if (!existsSync(FONT) || !existsSync(MANIFEST)) {
  fail(
    `缺少分享图字体产物：\n` +
      `  期望 ${rel(FONT)} 与 ${rel(MANIFEST)} 同时存在。\n` +
      `  运行 \`pnpm og-font\` 生成（开发期工具，需联网下载源字体一次）。`,
  );
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch (e) {
  fail(`${rel(MANIFEST)} 解析失败：${e.message}`);
}

const covered = fromCoverage(manifest);
const { codepoints: scoped, sources } = collectScopedChars(ROOT);

const missing = [...scoped].filter(cp => !covered.has(cp));

if (missing.length > 0) {
  // 定位每个缺失字符来自哪个文件，便于直接去改
  const byFile = new Map();
  for (const { file } of sources) {
    const raw = readFileSync(join(ROOT, file), "utf8");
    for (const cp of new Set(missing)) {
      if (raw.includes(String.fromCodePoint(cp))) {
        if (!byFile.has(file)) byFile.set(file, new Set());
        byFile.get(file).add(cp);
      }
    }
  }
  const detail = [...byFile.entries()]
    .map(([file, cps]) => `  ${file}\n    ${[...cps].map(describeCodepoint).join(" ")}`)
    .join("\n");

  fail(
    `${missing.length} 个字符不在分享图字体里，它们会在分享卡片上**静默变成空白**：\n\n` +
      `${detail}\n\n` +
      `处理方式（二选一）：\n` +
      `  1. 改掉这些字符（标题与描述里不要用 emoji 或生僻字）\n` +
      `  2. 扩大字体覆盖范围后重新生成：改 scripts/build-og-font.mjs 的 FIXED_RANGES，再跑 \`pnpm og-font\``,
  );
}

console.log(
  `✓ 分享图字体覆盖检查通过：${scoped.size} 个字符全部被覆盖` +
    `（字体共 ${manifest.glyphCount} 个码位，扫描 ${sources.length} 个来源）`,
);
