"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_MAX_AGE,
  createSessionToken,
  isAuthConfigured,
  normalizeRedirectPath,
  verifyCredentials,
} from "@/lib/server/auth";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(512),
  redirectTo: z.string().optional(),
});

export interface LoginState {
  status: "idle" | "error";
  message?: string;
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isAuthConfigured()) {
    return {
      status: "error",
      message: "服务端尚未配置登录账号和密码。",
    };
  }

  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });
  if (
    !parsed.success ||
    !verifyCredentials(parsed.data.username, parsed.data.password)
  ) {
    return { status: "error", message: "账号或密码错误，请重新输入。" };
  }

  const token = createSessionToken();
  if (!token) {
    return { status: "error", message: "登录配置不可用，请检查环境变量。" };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: AUTH_SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(normalizeRedirectPath(parsed.data.redirectTo));
}
