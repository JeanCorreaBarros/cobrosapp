import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { optimizePackageImports: ["lucide-react"] },
  async headers() {
    return [
      {
        // La Content-Security-Policy se define en middleware.ts porque
        // necesita un nonce distinto por request; aquí van las cabeceras
        // que no dependen de eso.
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
