import { defineAstroPaperConfig } from "./src/types/config";

/**
 * 站主配置。字段语义见 specs/001-portfolio-blog/contracts/content-schema.md 第 4 节。
 *
 * ⚠️ 标有【待填】的值需要站主提供真实信息，否则站点会带着占位内容上线。
 */
export default defineAstroPaperConfig({
  site: {
    // 【待填】域名购买并解析后替换，必须以 / 结尾。
    // 支持用 SITE_URL 覆盖，便于同一份代码部署到不同托管（见 deploy/README.md）。
    url: process.env.SITE_URL || "https://example.com/",
    // 【待填】站点名称
    title: "站点名称待填",
    // 【待填】站点描述，会出现在分享卡片上
    description: "站点描述待填。",
    // 【待填】站主姓名或稳定使用的标识
    author: "站主待填",
    // 【待填】可选：个人主页
    // profile: "https://example.com",
    ogImage: "default-og.jpg",
    // 站点仅提供中文，不做双语（FR-035）
    lang: "zh",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 8,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    // 动态分享图保留，字体来自仓库内的中文子集（research.md D8）
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    // 暂未接入远程仓库，关闭「编辑此页」入口
    editPost: { enabled: false },
    search: "pagefind",
  },
  // 【待填】公开联系方式与公开技术账号；至少 1 项，MUST NOT 含手机号（FR-036）
  socials: [
    { name: "github", url: "https://github.com/username" },
    { name: "mail", url: "mailto:you@example.com" },
  ],
  // 已完成精简：模板默认的 whatsapp / facebook / x / telegram / pinterest
  // 对中文读者基本无用，只保留邮件。
  // 待 T034 增补「复制链接」，以及微信（需新增图标资源，模板未提供）。
  shareLinks: [{ name: "mail", url: "mailto:?subject=See%20this%20post&body=" }],
});
