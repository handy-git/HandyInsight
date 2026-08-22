"use client";

import { useActionState } from "react";
import {
  ArrowRightIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { login, type LoginState } from "@/app/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const INITIAL_STATE: LoginState = { status: "idle" };

interface LoginFormProps {
  configured: boolean;
  redirectTo: string;
}

export function LoginForm({ configured, redirectTo }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, INITIAL_STATE);
  const hasError = state.status === "error";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>登录控制台</CardTitle>
        <CardDescription>
          输入服务端配置的凭据以继续访问分析面板。
        </CardDescription>
        <CardAction>
          <LockKeyholeIcon className="size-5 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <CardContent>
          <FieldGroup>
            <Field
              data-disabled={!configured || undefined}
              data-invalid={hasError || undefined}
            >
              <FieldLabel htmlFor="username">账号</FieldLabel>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                disabled={!configured || pending}
                aria-invalid={hasError}
                maxLength={128}
                required
              />
            </Field>
            <Field
              data-disabled={!configured || undefined}
              data-invalid={hasError || undefined}
            >
              <FieldLabel htmlFor="password">密码</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                disabled={!configured || pending}
                aria-invalid={hasError}
                maxLength={512}
                required
              />
              <FieldDescription>
                凭据只在当前服务器验证，不会发送给第三方。
              </FieldDescription>
            </Field>
            {hasError ? (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertTitle>无法登录</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-5 flex-col gap-3">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!configured || pending}
          >
            {pending ? (
              <>
                <Spinner data-icon="inline-start" />
                正在验证
              </>
            ) : (
              <>
                进入分析面板
                <ArrowRightIcon data-icon="inline-end" />
              </>
            )}
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-3.5" />
            安全会话将在 7 天后失效
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
