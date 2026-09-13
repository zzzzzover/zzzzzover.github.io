#!/usr/bin/env node
/**
 * 生成分享图用的中文子集字体与字符覆盖清单。
 *
 * 开发期工具：**不进构建流程、不上服务器**。产物提交进仓库，构建期只读产物。
 * 决策与实测依据见 specs/001-portfolio-blog/research.md D8。
 *
 * 三个必须遵守的约束（实测得出，改动前请先读 D8）：
 *   1. satori 不读 .ttc 集合，必须用单一字体文件
 *   2. satori 不读可变字体（parseFvarAxis 崩溃），必须带 variationAxes 做静态实例化
 *   3. 缺字是静默失败，因此必须同时产出覆盖清单供构建期检查
 *
 * 用法：node scripts/build-og-font.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";
import * as fontkit from "fontkit";
import { collectScopedChars, toCoverage, describeCodepoint } from "./lib/og-font-scope.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_FONT = join(ROOT, ".cache/fonts/NotoSansSC[wght].ttf");
const SOURCE_FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf";
const OUT_DIR = join(ROOT, "src/assets/fonts");
const OUT_FONT = join(OUT_DIR, "og-subset.ttf");
const OUT_MANIFEST = join(OUT_DIR, "og-subset.coverage.json");

/**
 * 恒定覆盖范围：即使当前内容用不到也预先包含，
 * 目的是让日常写作（新标题、新标点）几乎不会触发重新生成。
 *
 * ⚠️ 这里**不能**用「CJK 区块的前 N 个码位」来近似「常用汉字」。
 * CJK 统一表意文字区块按部首/笔画排序，不是按频率排序：
 * U+4E00–U+59B7 这个区间根本不含「我」「你」「他」等最常用的字。
 * 本项目初期就是这样写错的，被构建期覆盖检查抓了出来（见 research.md D8）。
 * 因此改用《通用规范汉字表》一级字表（3500 字），见 COMMON_HANZI_FILE。
 */
const FIXED_RANGES = [
  [0x20, 0x7e], // ASCII 可见字符
  [0x2000, 0x206f], // 常用标点
  [0x3000, 0x303f], // CJK 符号与标点
  [0xff00, 0xffef], // 全角字符
];
const COMMON_HANZI_FILE = join(ROOT, "scripts/data/common-hanzi-3500.txt");

const rel = p => p.slice(ROOT.length + 1);

async function loadSourceFont() {
  mkdirSync(dirname(SOURCE_FONT), { recursive: true });
  if (!existsSync(SOURCE_FONT)) {
    console.log("源字体不存在，开始下载（开发期一次性，缓存在 .cache/）：");
    console.log(`  ${SOURCE_FONT_URL}`);
    const res = await fetch(SOURCE_FONT_URL);
    if (!res.ok) throw new Error(`下载源字体失败：HTTP ${res.status}`);
    writeFileSync(SOURCE_FONT, Buffer.from(await res.arrayBuffer()));
  }
  const buf = readFileSync(SOURCE_FONT);
  const sig = buf.subarray(0, 4).toString("hex");
  if (sig !== "00010000") {
    throw new Error(`源字体签名异常：${sig}（应为 00010000，即可变字体 TTF）`);
  }
  return buf;
}

async function main() {
  const source = await loadSourceFont();
  console.log(`源字体：${(source.length / 1048576).toFixed(1)} MB`);

  // 1. 汇总需要覆盖的码位：固定标点范围 ∪ 常用汉字表 ∪ 会进入分享卡片的内容字符
  const { codepoints: scoped, sources, fileCount } = collectScopedChars(ROOT);
  const all = new Set();
  for (const [a, b] of FIXED_RANGES) for (let c = a; c <= b; c++) all.add(c);

  // 内容里实际用到的字符必须进入子集。常用汉字表只是「提前量」——它让新增文章
  // 通常不必重跑字体生成；但它不构成保证（如「耦」不在 3500 一级字表内）。
  // 少了这一句，超出字表的内容字符会直到 check-og-font.mjs 才暴露，而不是被自动覆盖。
  let scopedAdded = 0;
  for (const cp of scoped) {
    if (!all.has(cp)) {
      all.add(cp);
      scopedAdded++;
    }
  }

  const commonHanzi = readFileSync(COMMON_HANZI_FILE, "utf8");
  let hanziCount = 0;
  for (const ch of commonHanzi) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x4e00 && cp <= 0x9fff) {
      all.add(cp);
      hanziCount++;
    }
  }

  console.log(`扫描 ${fileCount} 个文件的 frontmatter 与站点配置，得到 ${scoped.size} 个内容字符`);
  for (const s of sources) console.log(`  ${s.file}  +${s.count}`);
  console.log(`常用汉字表 ${hanziCount} 字 + 固定标点范围 + 内容独有 ${scopedAdded} 字，合计需覆盖 ${all.size} 个码位`);

  // 2. 子集化。variationAxes 是关键：不做这一步输出仍是可变字体，satori 会崩
  const subset = await subsetFont(source, String.fromCodePoint(...[...all].sort((a, b) => a - b)), {
    targetFormat: "truetype",
    variationAxes: { wght: 400 },
  });
  const outSig = subset.subarray(0, 4).toString("hex");
  if (outSig !== "00010000") throw new Error(`子集产物签名异常：${outSig}`);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FONT, subset);
  console.log(`✓ ${rel(OUT_FONT)}  ${(subset.length / 1024).toFixed(0)} KB`);

  // 3. 从**实际产物**回读字符集生成清单，而不是从输入文本推导——
  //    这样清单与字体文件不可能漂移
  const covered = [...fontkit.create(subset).characterSet].sort((a, b) => a - b);
  const coverage = toCoverage(covered);
  const manifest = {
    _comment:
      "由 scripts/build-og-font.mjs 生成。此清单从实际字体文件回读，供构建期 scripts/check-og-font.mjs 使用。不要手工编辑。",
    font: "og-subset.ttf",
    glyphCount: covered.length,
    _coverageFormat: "bmp 为 U+0000–U+FFFF 的位图（base64）；astral 为 BMP 之外的码位",
    bmp: coverage.bmp,
    astral: coverage.astral,
  };
  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  writeFileSync(OUT_MANIFEST, manifestText);
  console.log(
    `✓ ${rel(OUT_MANIFEST)}  ${covered.length} 个码位 / ${(manifestText.length / 1024).toFixed(1)} KB`,
  );

  // 4. 自检：会进入分享卡片的字符必须全部被覆盖
  const coveredSet = new Set(covered);
  const missing = [...scoped].filter(cp => !coveredSet.has(cp));
  if (missing.length) {
    throw new Error(
      `自检失败：${missing.length} 个会进入分享卡片的字符未被字体覆盖：\n  ` +
        missing.slice(0, 20).map(describeCodepoint).join(" ") +
        "\n  （emoji 之类不在 CJK 字体中的字符，请不要放进标题或描述）",
    );
  }
  console.log(`✓ 自检通过：全部 ${scoped.size} 个内容字符均已被字体覆盖`);
}

main().catch(err => {
  console.error(`\n生成失败：${err.message}`);
  process.exit(1);
});
