/**
 * Minecraft 玩家头像（mc-heads.net）。
 *
 * - 按 UUID 查询正版皮肤；查不到（离线服等）自动回退默认头像，不裂图
 * - 浏览器直接请求第三方服务，只暴露 UUID，不涉及任何凭据
 */
export function playerAvatarUrl(uuidOrName: string, size = 64): string {
  return `https://mc-heads.net/avatar/${encodeURIComponent(uuidOrName)}/${size}`;
}
