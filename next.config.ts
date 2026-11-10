import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/tanks", destination: "/tanks/index.html" }];
  },
};

export default nextConfig;
