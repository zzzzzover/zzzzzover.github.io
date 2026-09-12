/**
 * 分享图字体的**字符范围定义**——生成脚本与构建期校验脚本共用这一份，
 * 保证两者永远扫同一批字符（否则会出现"生成时覆盖了、校验时却报缺"的假警报）。
 *
 * 为什么只扫 frontmatter 与站点配置，不扫正文：
 * 分享卡片只渲染 文章标题 / 作者 / 站点标题 / 站点描述 / 域名，
 * 正文从来不出现在图片里。扫正文会把正文中的 emoji 也拉进范围，
 * 而 CJK 字体根本不含 emoji，造成无意义的失败。
 *
 * 依据：实测模板 `src/pages/posts/[...slug]/index.png.ts` 只引用
 * `props.data.title`、`props.data.author`、`config.site.title`。
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

export const CONTENT_DIR = "src/content";
export const CONFIG_FILES = ["astro-paper.config.ts"];
const CONTENT_EXTENSIONS = new Set([".md", ".mdx"]);

/** 提取 Markdown 的 frontmatter 区块（首个 --- 与下一个 --- 之间） */
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return m ? m[1] : "";
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (CONTENT_EXTENSIONS.has(extname(p))) out.push(p);
  }
  return out;
}

/**
 * 收集所有会进入分享卡片的字符。
 * @param {string} root 仓库根目录
 * @returns {{codepoints: Set<number>, sources: {file: string, count: number}[], fileCount: number}}
 */
export function collectScopedChars(root) {
  const sources = [];
  const codepoints = new Set();
  const files = [
    ...CONFIG_FILES.map(f => join(root, f)),
    ...walk(join(root, CONTENT_DIR)),
  ].filter(existsSync);

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const text = CONTENT_EXTENSIONS.has(extname(file)) ? frontmatter(raw) : raw;
    const before = codepoints.size;
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp > 0x1f) codepoints.add(cp);
    }
    sources.push({ file: file.slice(root.length + 1), count: codepoints.size - before });
  }
  return { codepoints, sources, fileCount: files.length };
}

/** 把码点集合压缩为连续区间，便于清单文件保持小体积 */
export function toRanges(sortedCodepoints) {
  const ranges = [];
  for (const cp of sortedCodepoints) {
    const last = ranges[ranges.length - 1];
    if (last && cp === last[1] + 1) last[1] = cp;
    else ranges.push([cp, cp]);
  }
  return ranges;
}

/** 把区间展开回码点集合 */
export function fromRanges(ranges) {
  const set = new Set();
  for (const [a, b] of ranges) for (let c = a; c <= b; c++) set.add(c);
  return set;
}

/** 把码点渲染成人能读的形式，用于报错信息 */
export function describeCodepoint(cp) {
  const ch = String.fromCodePoint(cp);
  return `${ch}（U+${cp.toString(16).toUpperCase().padStart(4, "0")}）`;
}
