import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/account/",
          "/api/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/email-confirmed",
        ],
      },
    ],
    sitemap: "https://jumplogs.com/sitemap.xml",
    host: "https://jumplogs.com",
  }
}
