import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * 分享图用的字体。
 *
 * 字体是随仓库提交的**中文子集**，构建期从本地读取，**不做任何网络请求**
 * （模板原实现依赖 Astro 的 Google Fonts 抓取，会在构建时随机失败，见 verify.md）。
 *
 * 覆盖范围由 scripts/build-og-font.mjs 生成，正确性由 scripts/check-og-font.mjs
 * 在构建期校验——因为渲染器对缺失字形是**静默留空白**，不检查就会无声降级。
 *
 * 为什么只注册一个字重：子集只含 wght=400。把同一份数据同时登记为 400 与 700，
 * 是为了让 `fontWeight: bold` 有明确落点，而不是依赖渲染器的合成加粗。
 */
export const OG_FONT_FAMILY = "OG Sans";

const FONT_PATH = join(process.cwd(), "src/assets/fonts/og-subset.ttf");

let cache: Buffer | null = null;

async function loadData(): Promise<Buffer> {
  if (cache === null) {
    cache = await readFile(FONT_PATH);
  }
  return cache;
}

export type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

export async function getOgFonts(): Promise<OgFont[]> {
  const data = await loadData();
  return [
    { name: OG_FONT_FAMILY, data, weight: 400, style: "normal" },
    { name: OG_FONT_FAMILY, data, weight: 700, style: "normal" },
  ];
}
