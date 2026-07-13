import { absoluteUrl } from "@/lib/site";

// Only public, indexable pages belong in the sitemap. The dashboard and the
// AI tools are login-gated (and marked noindex), and the auth pages are noindex,
// so they are intentionally excluded.
export default function sitemap() {
  const lastModified = new Date("2026-07-09T00:00:00.000Z");

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
