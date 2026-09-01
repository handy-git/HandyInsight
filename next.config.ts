import type { NextConfig } from "next";

// MySQL 时间与应用时间统一按 Asia/Shanghai 处理
process.env.TZ = "Asia/Shanghai";

const nextConfig: NextConfig = {
  // 输出 standalone 目录（含精简 node_modules + server.js），
  // 供 Docker 多阶段构建的 runner 阶段使用，大幅减小镜像体积
  output: "standalone",
  // minimessage-js 的 browser 字段指向 UMD 构建（无 ESM 导出），
  // 强制走 ESM 构建以兼容 Turbopack
  turbopack: {
    resolveAlias: {
      "minimessage-js": "minimessage-js/dist/minimessage.esm.js",
    },
  },
};

export default nextConfig;
