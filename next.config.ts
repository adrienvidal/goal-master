import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // L'encart s'affiche dans job-finder, qui tourne sur la machine du joueur (cadrage encart-job-finder).
      { source: "/widget", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors http://localhost:* http://127.0.0.1:*" }] },
      // La page qui crée la clé ne s'affiche jamais dans un cadre.
      { source: "/relier", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }] },
    ];
  },
};

export default nextConfig;
