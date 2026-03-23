import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from Microsoft profile photos (used by Entra/NextAuth)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.microsoft.com',
      },
      {
        protocol: 'https',
        hostname: '*.microsoftonline.com',
      },
    ],
  },
};

export default nextConfig;
