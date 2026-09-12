#!/usr/bin/env node
/**
 * 构建产物链接检查：站内链接与本地资源必须真实存在。
 *
 * 为什么需要：内容里的相对链接、删掉的图片、改了名的文章地址都不会让构建失败，
 * 只会在线上变成 404。发布流水线要求零死链，所以这里显式检查。
 *
 * 用法：node scripts/check-links.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const rel = p => p.slice(ROOT.length + 1);

/**
 * 读取 astro.config.ts 的 base 前缀。
 * 部署在子路径下时（例如 GitHub Pages 的项目页 /repo/），产物里的链接都带这个前缀，
 * 但文件仍输出到 dist/ 根，因此比对时必须先剥掉它。
 */
function readBase() {
  // 与 astro.config.ts 一致：优先取环境变量
  if (process.env.SITE_BASE !== undefined) {
    return process.env.SITE_BASE.replace(/\/+$/, "");
  }
  // 回退：base 被直接写死在配置里的情况
  try {
    const cfg = readFileSync(join(ROOT, "astro.config.ts"), "utf8");
    const m = /base:\s*["']([^"']+)["']/.exec(cfg);
    return m ? m[1].replace(/\/+$/, "") : "";
  } catch {
    return "";
  }
}
const BASE = readBase();

if (!existsSync(DIST)) {
  console.error("✗ 未找到 dist/，请先执行构建");
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** 站内路径 → dist 中对应的文件 */
function resolveInternal(pathOnly) {
  const clean = decodeURIComponent(pathOnly.split("#")[0].split("?")[0]);
  if (clean === "" || clean === "/") return join(DIST, "index.html");
  const base = join(DIST, clean);
  const candidates = [
    base,
    `${base}.html`,
    join(base, "index.html"),
    join(DIST, clean.replace(/^\//, "")),
  ];
  return candidates.find(p => existsSync(p) && statSync(p).isFile()) ?? null;
}

const ATTR = /(?:href|src)\s*=\s*["']([^"']+)["']/g;
const IGNORE_PREFIX = ["http://", "https://", "//", "mailto:", "tel:", "data:", "javascript:"];

const problems = [];
let checked = 0;

for (const file of walk(DIST)) {
  if (extname(file) !== ".html") continue;
  const html = readFileSync(file, "utf8");
  for (const [, raw] of html.matchAll(ATTR)) {
    const url = raw.trim();
    if (!url || IGNORE_PREFIX.some(p => url.startsWith(p))) continue;
    if (!url.startsWith("/")) continue; // 只检查根相对路径，避免噪声
    // 带 base 部署时，站内链接都带前缀；先剥离再比对文件系统
    if (BASE && !url.startsWith(BASE)) continue;
    const withoutBase = BASE ? url.slice(BASE.length) : url;
    checked++;
    if (resolveInternal(withoutBase) === null) {
      problems.push(`${rel(file)}  →  ${url}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`\n✗ 链接检查失败：${problems.length} 个站内目标不存在\n`);
  for (const p of problems.slice(0, 30)) console.error(`  ${p}`);
  if (problems.length > 30) console.error(`  …另有 ${problems.length - 30} 处`);
  console.error("");
  process.exit(1);
}

console.log(`✓ 链接检查通过：${checked} 个站内链接全部可达${BASE ? `（base=${BASE}）` : ""}`);
