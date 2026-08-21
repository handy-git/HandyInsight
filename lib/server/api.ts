import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  friendlyMysqlError,
  MysqlNotConfiguredError,
  PluginUnavailableError,
} from "@/lib/server/mysql";

/** 统一错误响应：不返回 SQL、密码、数据库地址或服务端路径。 */
export function apiError(error: unknown): NextResponse {
  if (error instanceof MysqlNotConfiguredError) {
    return NextResponse.json(
      { ok: false, message: "MySQL 尚未配置，请先完成连接配置" },
      { status: 409 },
    );
  }
  if (error instanceof PluginUnavailableError) {
    return NextResponse.json(
      { ok: false, message: "数据库中未检测到该插件的数据表，此功能未启用" },
      { status: 404 },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { ok: false, message: "请求参数不合法" },
      { status: 400 },
    );
  }
  const code = (error as NodeJS.ErrnoException & { code?: string })?.code;
  if (typeof code === "string" && /^(ER_|ECONN|ETIME)/.test(code)) {
    return NextResponse.json(
      { ok: false, message: friendlyMysqlError(error) },
      { status: 502 },
    );
  }
  return NextResponse.json(
    { ok: false, message: "服务器内部错误，请稍后重试" },
    { status: 500 },
  );
}

export function searchParamsObject(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}
