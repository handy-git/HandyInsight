import type { NextConfig } from "next";

// MySQL 时间与应用时间统一按 Asia/Shanghai 处理
process.env.TZ = "Asia/Shanghai";

const nextConfig: NextConfig = {
  // minimessage-js 的 browser 字段指向 UMD 构建（无 ESM 导出），
  // 强制走 ESM 构建以兼容 Turbopack
  turbopack: {
    resolveAlias: {
      "minimessage-js": "minimessage-js/dist/minimessage.esm.js",
    },
  },
};

export default nextConfig;
