import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Watchlist",
    short_name: "Watchlist",
    display: "standalone",
    start_url: "/",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
