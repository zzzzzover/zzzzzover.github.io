import type { APIRoute } from "astro";
import satori from "satori";
import sharp from "sharp";
import { getOgFonts, OG_FONT_FAMILY } from "@/utils/ogFont";
import config from "@/config";

/**
 * 站点默认分享卡片（无独立封面的页面共用这一张）。
 *
 * 字体来自仓库内的中文子集，构建期从本地读取，**无网络请求**。
 * 逐篇文章的卡片在 src/pages/posts/[...slug]/index.png.ts。
 */
export const GET: APIRoute = async () => {
  const fonts = await getOgFonts();

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          background: "#fdfdfd",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "80px",
          fontFamily: OG_FONT_FAMILY,
          textAlign: "center",
          color: "#282728",
        },
        children: [
          {
            type: "p",
            props: {
              style: { fontSize: 72, fontWeight: "bold", margin: 0 },
              children: config.site.title,
            },
          },
          {
            type: "p",
            props: {
              style: { fontSize: 30, marginTop: 28, color: "#5a5a5a" },
              children: config.site.description,
            },
          },
          {
            type: "p",
            props: {
              style: { fontSize: 26, marginTop: 56, color: "#006cac" },
              children: new URL(config.site.url).hostname,
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, embedFont: true, fonts },
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
