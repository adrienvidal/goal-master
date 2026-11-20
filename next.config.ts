import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // /widget : en-tête posé par src/middleware.ts (il dépend de la page qui affiche l'encart).
      // La page qui crée la clé ne s'affiche jamais dans un cadre.
      { source: "/relier", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }] },
    ];
  },
};

export default nextConfig;
