# MetaSlim AI Facebook Trend & Content Studio

MetaSlim AI 是固定面向 Malaysia 市场的 Facebook 趋势证据与内容生产工作台。默认内容语言为马来西亚口语华文；English 与 Bahasa Melayu 只用于研究辅助。系统不声称拥有全马 Facebook Organic Trending API，也不会以假趋势、假案例或假数字填充界面。

## 当前进度

- STEP 1：产品规格与架构完成。
- STEP 2：Next.js App Router、TypeScript、Tailwind、10 个响应式页面与 UI 骨架完成。
- STEP 3：Supabase schema、Auth、RLS、Server Actions、真实 CRUD、Human Approval、Version History、Source Expiry、Manual Evidence Review、Facebook URL Library、Cost Control、Error Log 与 Audit Log 已在本地代码实现。
- 尚未把 Migration 执行到远端 Supabase，也未连接 OpenAI、Facebook API 或 Google Trends。

## 本地运行

```bash
npm install
npm run dev
```

需要的 Supabase 环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` 只能放在本地未追踪环境文件、Netlify server secret 或其他服务器 secret store。浏览器只使用 URL 与 anon key，数据边界由 RLS 保证。

## 执行 Migration

本仓库没有自动连接任何远端项目。确认项目 ref 后，由项目管理员手动执行：

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migration 顺序：

1. `202606110001_core_schema.sql`
2. `202606110002_workflow_controls.sql`
3. `202606110003_rls_policies.sql`

`supabase/seed.sql` 有意保持空白，不会写入假趋势、Facebook 数据、案例或表现数字。完成 Migration 后，在 Supabase Auth 建立第一个用户并登录；应用会通过 `create_workspace` RPC 建立 MetaSlim AI workspace、admin membership、brand profile 与 settings。

## 验证

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

远端 RLS、Auth 邮件流程与数据库触发器需要在 Migration 实际推送后另行做 integration test。本阶段不会假装这些远端测试已执行。

## 安全与产品原则

1. 所有业务表启用 RLS，用户只可访问自己的 active workspace。
2. 角色固定为 `admin`、`editor`、`reviewer`、`viewer`。
3. Evidence 只能由 reviewer/admin 人工审核；系统不能自行标记 Verified。
4. Script 只有 reviewer/admin 可批准；High Risk 或未通过 Quality/Compliance 的版本不能 Approved。
5. 未批准版本不能进入 Filming，未 Ready 内容不能 Published。
6. Version、Approval、Evidence Review 与 Audit 均为 append-only。
7. 趋势证据必须包含真实 URL、Malaysia 地区、观察日期与 `expires_at`。
8. AI 目前禁用；没有任何假 API response。

详细设计见 [PRODUCT_SPEC.md](PRODUCT_SPEC.md)、[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)、[ARCHITECTURE.md](ARCHITECTURE.md)、[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) 与 [SECURITY.md](SECURITY.md)。
