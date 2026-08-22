import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "handyinsight_session";
export const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

interface AuthConfig {
  username: string;
  password: string;
}

function loadAuthConfig(): AuthConfig | null {
  const username = process.env.AUTH_USERNAME?.trim();
  const password = process.env.AUTH_PASSWORD;
  if (!username || !password) {
    return null;
  }
  return { username, password };
}

function safeEqual(value: string, expected: string): boolean {
  const valueHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(valueHash, expectedHash);
}

function signSession(config: AuthConfig, expiresAt: number): string {
  const key = createHash("sha256")
    .update(`handyinsight\0${config.username}\0${config.password}`)
    .digest();
  return createHmac("sha256", key)
    .update(`${config.username}:${expiresAt}`)
    .digest("base64url");
}

export function isAuthConfigured(): boolean {
  return loadAuthConfig() !== null;
}

export function verifyCredentials(username: string, password: string): boolean {
  const config = loadAuthConfig();
  if (!config) {
    return false;
  }
  return (
    safeEqual(username, config.username) && safeEqual(password, config.password)
  );
}

export function createSessionToken(): string | null {
  const config = loadAuthConfig();
  if (!config) {
    return null;
  }
  const expiresAt = Math.floor(Date.now() / 1000) + AUTH_SESSION_MAX_AGE;
  return `${expiresAt}.${signSession(config, expiresAt)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
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
  return safeEqual(signature, signSession(config, expiresAt));
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
