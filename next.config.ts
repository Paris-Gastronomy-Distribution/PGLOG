import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aucune mention de la plateforme dans les en-têtes HTTP.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // En production, l'administration ne peut pas être affichée dans une
        // iframe (clickjacking). En développement on l'autorise pour pouvoir
        // tester les écrans à différentes tailles.
        source: "/admin/:path*",
        headers: [
          ...(process.env.NODE_ENV === "production" ? [{ key: "X-Frame-Options", value: "DENY" }] : []),
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
