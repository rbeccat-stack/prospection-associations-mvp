import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/apercu/**": ["./prototypes/mobile/index.html", "./prototypes/mobile/styles.css", "./prototypes/mobile/app.js"],
  },
};

export default nextConfig;
