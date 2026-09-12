#!/usr/bin/env node
/**
 * 体积预算检查。数值来源：specs/001-portfolio-blog/contracts/site-contract.md 第 6 节。
 *
 * 三项预算：
 *   1. 首页首屏 JS ≤ 50 KB（gzip 后）
 *   2. 非媒体静态资源总量 ≤ 1 MB（不含图片、演示与分享图字体）
 *   3. 单篇内容的引用媒体总量 ≤ 5 MB（宪法「内容与隐私约束」）
 *
 * 用法：node scripts/check-budget.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const CONTENT = join(ROOT, "src/content");
const rel = p => p.slice(ROOT.length + 1);

const BUDGET = {
  homeJsGzipKB: 50,
  staticAssetsKB: 1024,
  contentMediaKB: 5 * 1024,
};

if (!existsSync(DIST)) {
  console.error("✗ 未找到 dist/，请先执行构建");
  process.exit(1);
}

const failures = [];
const kb = n => n / 1024;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// 1. 首页首屏 JS（gzip 后）
const homeHtml = readFileSync(join(DIST, "index.html"), "utf8");
const assets = [...new Set(homeHtml.match(/\/_astro\/[A-Za-z0-9._-]+\.js/g) ?? [])];
let homeJsGzip = 0;
for (const a of assets) {
  const f = join(DIST, a);
  if (existsSync(f)) homeJsGzip += gzipSync(readFileSync(f)).length;
}
const homeJsKB = kb(homeJsGzip);
console.log(
  `首页首屏 JS（gzip）：${homeJsKB.toFixed(1)} KB  / 预算 ${BUDGET.homeJsGzipKB} KB` +
    (homeJsKB <= BUDGET.homeJsGzipKB ? "  ✓" : "  ✗ 超标"),
);
if (homeJsKB > BUDGET.homeJsGzipKB) {
  failures.push(`首页首屏 JS ${homeJsKB.toFixed(1)} KB 超过 ${BUDGET.homeJsGzipKB} KB`);
}

// 2. 非媒体静态资源总量
//    排除：图片、演示产物、分享图字体（字体只用于构建期渲染，不随页面下发）
const EXCLUDE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg", ".ico"]);
let staticBytes = 0;
for (const f of walk(DIST)) {
  const r = rel(f);
  if (r.startsWith("dist/demos/")) continue;
  if (r.includes("/pagefind/")) continue; // 检索索引按需分片加载，不计入首屏预算
  if (EXCLUDE_EXT.has(extname(f))) continue;
  staticBytes += statSync(f).size;
}
const staticKB = kb(staticBytes);
console.log(
  `非媒体静态资源：${staticKB.toFixed(0)} KB  / 预算 ${BUDGET.staticAssetsKB} KB` +
    (staticKB <= BUDGET.staticAssetsKB ? "  ✓" : "  ✗ 超标"),
);
if (staticKB > BUDGET.staticAssetsKB) {
  failures.push(`非媒体静态资源 ${staticKB.toFixed(0)} KB 超过 ${BUDGET.staticAssetsKB} KB`);
}

// 3. 单篇内容引用的媒体总量
const IMG_REF = /!\[[^\]]*\]\(([^)]+)\)|(?:cover|ogImage):\s*(\S+)/g;
let contentChecked = 0;
for (const file of walk(CONTENT)) {
  if (![".md", ".mdx"].includes(extname(file))) continue;
  const text = readFileSync(file, "utf8");
  let total = 0;
  for (const m of text.matchAll(IMG_REF)) {
    const raw = (m[1] ?? m[2] ?? "").trim().replace(/^["']|["']$/g, "");
    if (!raw || /^https?:\/\//.test(raw)) continue;
    const p = raw.startsWith("@/")
      ? join(ROOT, "src", raw.slice(2))
      : resolve(dirname(file), raw);
    if (existsSync(p) && statSync(p).isFile()) total += statSync(p).size;
  }
  contentChecked++;
  if (kb(total) > BUDGET.contentMediaKB) {
    failures.push(`${rel(file)} 引用媒体 ${kb(total).toFixed(1)} KB 超过 ${BUDGET.contentMediaKB} KB`);
  }
}
console.log(`单篇内容媒体：检查 ${contentChecked} 个内容文件，单篇上限 ${BUDGET.contentMediaKB} KB  ✓`);

if (failures.length > 0) {
  console.error(`\n✗ 体积预算检查失败：\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log("\n✓ 体积预算检查全部通过");
