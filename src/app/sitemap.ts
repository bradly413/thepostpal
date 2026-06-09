import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { VERTICALS } from "@/lib/verticals";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticPaths = [
    "/",
    "/pricing",
    "/privacy",
    "/terms",
    "/tools/what-to-post",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const verticalEntries: MetadataRoute.Sitemap = VERTICALS.map((vertical) => ({
    url: `${SITE_URL}/for/${vertical.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...verticalEntries];
}
