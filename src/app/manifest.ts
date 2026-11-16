import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Goal Master",
    short_name: "Goal Master",
    description: "Tenir son objectif de candidatures, à deux.",
    start_url: "/",
    display: "standalone",
    background_color: "#16132a",
    theme_color: "#16132a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
