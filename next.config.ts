import type { NextConfig } from "next";

// MySQL 时间与应用时间统一按 Asia/Shanghai 处理
process.env.TZ = "Asia/Shanghai";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
