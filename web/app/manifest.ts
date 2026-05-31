import { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jump Logs",
    short_name: "Jump Logs",
    description: "The modern skydiving logbook — track every jump, gear, currency and certification.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/app-icon-1024.png", sizes: "1024x1024", type: "image/png" },
    ],
  }
}
