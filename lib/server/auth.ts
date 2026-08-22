import { getRuntimeEnv } from "@/lib/server/runtime-env";

export const AUTH_COOKIE_NAME = "handyinsight_session";
export const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

interface AuthConfig {
  username: string;
  password: string;
}

const textEncoder = new TextEncoder();

function loadAuthConfig(): AuthConfig | null {
  const env = getRuntimeEnv();
  const username = env.AUTH_USERNAME?.trim();
  const password = env.AUTH_PASSWORD;
  if (!username || !password) {
    return null;
  }
  return { username, password };
}

async function sha256(value: string): Promise<ArrayBuffer> {
  return globalThis.crypto.subtle.digest("SHA-256", textEncoder.encode(value));
}

function equalBytes(value: ArrayBuffer, expected: ArrayBuffer): boolean {
  const valueBytes = new Uint8Array(value);
  const expectedBytes = new Uint8Array(expected);
  if (valueBytes.length !== expectedBytes.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < valueBytes.length; index += 1) {
    difference |= valueBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

function base64Url(value: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(value)) {
    binary += String.fromCharCode(byte);
  }
  return globalThis
    .btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

async function safeEqual(value: string, expected: string): Promise<boolean> {
  const [valueHash, expectedHash] = await Promise.all([
    sha256(value),
    sha256(expected),
  ]);
  return equalBytes(valueHash, expectedHash);
}

async function signSession(
  config: AuthConfig,
  expiresAt: number,
): Promise<string> {
  // Web Crypto 同时兼容本地 Node.js 与 EdgeOne 的 Proxy 运行面。
  const keyBytes = await sha256(
    `handyinsight\0${config.username}\0${config.password}`,
  );
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(`${config.username}:${expiresAt}`),
  );
  return base64Url(signature);
}

export function isAuthConfigured(): boolean {
  return loadAuthConfig() !== null;
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const config = loadAuthConfig();
  if (!config) {
    return false;
  }
  const [usernameMatches, passwordMatches] = await Promise.all([
    safeEqual(username, config.username),
    safeEqual(password, config.password),
  ]);
  return usernameMatches && passwordMatches;
}

export async function createSessionToken(): Promise<string | null> {
  const config = loadAuthConfig();
  if (!config) {
    return null;
  }
  const expiresAt = Math.floor(Date.now() / 1000) + AUTH_SESSION_MAX_AGE;
  return `${expiresAt}.${await signSession(config, expiresAt)}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  const config = loadAuthConfig();
  if (!config || !token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }
  const [expiresRaw, signature] = parts;
  const expiresAt = Number(expiresRaw);
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }
  return safeEqual(signature, await signSession(config, expiresAt));
}

export function normalizeRedirectPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/";
  }
  try {
    const url = new URL(value, "http://handyinsight.local");
    if (url.origin !== "http://handyinsight.local") {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
