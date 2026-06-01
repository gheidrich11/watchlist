import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Watchlist",
    short_name: "Watchlist",
    description: "Track movies and shows you want to watch.",
    display: "standalone",
    start_url: "/",
    // #09090b is Tailwind zinc-950 — the app's intentional dark background, not pure black (#000000)
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
