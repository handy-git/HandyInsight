import { z } from "zod";

export const mysqlConfigSchema = z.object({
  host: z.string().trim().min(1, "请填写主机地址"),
  port: z.coerce
    .number("端口必须是数字")
    .int("端口必须是整数")
    .min(1, "端口范围 1-65535")
    .max(65535, "端口范围 1-65535")
    .default(3306),
  database: z.string().trim().min(1, "请填写数据库名"),
  user: z.string().trim().min(1, "请填写用户名"),
  password: z.string().default(""),
  ssl: z.boolean().default(false),
});

export type MysqlConfig = z.infer<typeof mysqlConfigSchema>;
