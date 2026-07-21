import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated app surfaces — never useful in search results.
      disallow: ["/dashboard", "/onboarding", "/sign-in", "/editor", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
