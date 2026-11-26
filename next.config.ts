import type { NextConfig } from "next";

const isApkBuild = process.env.NEXT_PUBLIC_OFFLINE_APK === "true";

const nextConfig: NextConfig = {
  ...(isApkBuild && {
    output: "export",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
