import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Unsplash for the seed data + any https host so the admin can paste image URLs.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
