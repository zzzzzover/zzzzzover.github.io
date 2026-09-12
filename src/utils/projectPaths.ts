import { getRelativeLocaleUrl } from "astro:i18n";
import config from "@/config";

/**
 * projects 是扁平集合（不支持子目录），因此 `id` 本身就是 slug。
 * 与 posts 不同：posts 允许子目录，需要把路径段拼进地址。
 */
function getProjectSlug(id: string): string {
  const parts = id.split("/");
  return String(parts[parts.length - 1]);
}

/** 详情页的路由参数（不含 base 与 locale），供 getStaticPaths 使用 */
export function getProjectParam(id: string): string {
  return getProjectSlug(id);
}

/** 详情页的可导航 URL，例如 /projects/bili-dynamics/ */
export function getProjectUrl(
  id: string,
  locale: string | undefined = config.site.lang,
): string {
  return getRelativeLocaleUrl(locale, `projects/${getProjectSlug(id)}`);
}
