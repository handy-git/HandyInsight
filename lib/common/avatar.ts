/**
 * Minecraft 玩家头像（mc-heads.net）。
 *
 * 统一按玩家名称查询：离线服的 UUID 在 Mojang 不存在，按 UUID 无法取到皮肤；
 * 按名称可命中同名正版账户的皮肤，查不到时服务自动回退默认头像，不裂图。
 * 浏览器直接请求第三方服务，只暴露玩家名，不涉及任何凭据。
 */
export function playerAvatarUrl(playerName: string, size = 64): string {
  return `https://mc-heads.net/avatar/${encodeURIComponent(playerName)}/${size}`;
}
