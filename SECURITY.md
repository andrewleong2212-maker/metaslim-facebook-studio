# Security

## 安全边界

- 浏览器只可取得 `NEXT_PUBLIC_SUPABASE_URL`，以及 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 或 legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- `SUPABASE_SERVICE_ROLE_KEY` 只能由带 `server-only` 的模块读取，不可进入 Client Component、localStorage、日志或 Git。
- 所有写入由 Next.js Server Actions 接收，并先经过 Zod 验证；数据库 RLS 与 trigger 是最终授权边界。
- 未配置 Supabase 时，应用显示设置提示并保持 UI 可预览，不建立假 API response。

## Auth 与授权

- Supabase Auth session 使用 `@supabase/ssr` Cookie；Middleware 刷新 session 并保护除 `/login`、`/auth/callback` 外的页面。
- 注册后由 Auth trigger 建立 `profiles`。
- 第一个已认证用户通过 `create_workspace` RPC 成为 admin。
- 角色固定为 admin/editor/reviewer/viewer，权限以 active `workspace_members` 为准。
- 所有 23 张表启用 RLS。跨 workspace、inactive member 与未认证请求默认拒绝。

## 工作流保护

- Evidence 只能经 `review_evidence()` 由 reviewer/admin 人工审核；AI 或系统无权自行 Verified。
- Expired Evidence 不能 Verified，也不会进入 `current_verified_trends`。
- Script Approval 绑定准确 Version。High Risk、Quality 未通过或 Compliance 未通过均由数据库拒绝。
- 新 Version 会令 Script 回到 `needs_review`，旧 Approval 不适用于新 Version。
- 恢复旧 Version 是 append-only 新增，不覆盖历史。
- 未批准内容不能进入 Filming，未 Ready 内容不能 Published。
- 重要表的变更由数据库 trigger 写入 append-only Audit Log。

## Secret 与日志

- `.env.example` 只含空白占位符。真实 `.env*` 必须保持未追踪，并在 Netlify 使用 server environment variables。
- Error logger 会递归移除 Authorization、Cookie、Password、Token、API Key、Secret 与 service role 字段，并遮盖错误字符串中的 Bearer/token 值。
- `system_errors` 另有数据库 CHECK，拒绝含敏感关键词的 `redacted_context`。
- 不记录完整 request header、session、prompt、第三方正文或个人资料。
- 用户错误响应不得返回 SQL、stack trace、内部 URL 或 Secret 细节。

## URL 与第三方资料

- Facebook URL 使用标准 URL parser，只接受明确的 Facebook host，统一 HTTPS 与 canonical host，并移除非必要 tracking parameters。
- STEP 3 不抓取 URL、不跟随 redirect、不调用 Facebook API，因此不会声称得到 Organic Trending 数据。
- 所有研究资料仍是 unverified，直到真人提供来源、Malaysia 地区、日期、有效期并完成审核。

## Cost Control

- Workspace settings 保存单次、每日、每月 request/cost hard limits。
- `reserve_ai_usage()` 在未来任何 AI request 前进行数据库内检查和 reservation，默认 `ai_enabled=false`。
- STEP 3 不连接 OpenAI，因此当前不会产生 provider 成本。

## 上线前必须完成

1. 在独立测试 Supabase 项目执行 Migration。
2. 运行跨 workspace、四角色、inactive member、append-only 与 workflow bypass 的数据库 integration tests。
3. 配置 Auth redirect allowlist、邮件验证、密码策略，admin/reviewer 建议启用 MFA。
4. 在 Netlify 区分 preview/production secrets，并确认 service role 不进入构建产物。
5. 安排 `refresh_source_expiry()` 的受认证 server cron，并记录 Audit/Error。
6. 做 secret scan、dependency audit、CSP/CSRF/SSRF/XSS 与权限提升测试。

本地 unit tests 不等同于远端 RLS 验证。远端 Migration 尚未执行时，不可声称数据库保护已经在 Supabase Project 生效。
