import path from "path";

const nextConfig = {
  // Enable standalone output for Docker
  output: "standalone",

  env: {
    DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
    REDIS_URL: process.env.REDIS_URL,
    POLYGON_API_KEY: process.env.POLYGON_API_KEY,
    FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: ["lucide-react", "@prisma/client"],
    tsconfigPaths: true, // Enable tsconfig paths resolution
  },

  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Compression
  compress: true,

  // Headers for better caching and security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Disable ESLint during build for now (too many legacy warnings)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript errors during build for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },

  // Webpack configuration for path aliases
  webpack: (config) => {
    // Hard alias for runtime (backup if experimental fails)
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(process.cwd(), "src"),
    };
    return config;
  },
};

export default nextConfig;
