# Database Schema

## 实现基线

数据库定义位于 `supabase/migrations/`。主键使用 UUID，时间使用 `timestamptz`，业务时区为 `Asia/Kuala_Lumpur`。除 `profiles` 外，所有业务数据均以 `workspace_id` 隔离并启用 RLS。

## 表格清单

| 表格 | 主要用途与字段 |
| --- | --- |
| `profiles` | Auth 用户资料：`id`, `display_name`, `email`, `locale`, `timezone` |
| `workspaces` | 固定 Malaysia workspace：`name`, `slug`, `country_code`, `timezone`, `created_by` |
| `workspace_members` | `workspace_id`, `user_id`, `role`, `status`; role 为 admin/editor/reviewer/viewer |
| `brand_profile` | 固定 MetaSlim AI 品牌、语气、允许/禁止 claims |
| `facebook_url_library` | 原始/标准化 URL、类型、备注、访问状态；workspace 内 URL 唯一 |
| `facebook_sources` | Facebook 来源元数据、观察时间、`expires_at`, freshness |
| `facebook_posts` | 经授权整理的 post 元数据与人工内容，不代表全马趋势 API |
| `trend_keywords` | 趋势研究关键词与来源语言 |
| `trend_snapshots` | 指定时间、Malaysia 地区与来源的观察快照、有效期 |
| `trend_opportunities` | 人工整理的趋势机会、地区、意图、分数、状态、有效期 |
| `trend_evidence` | 真实来源 URL、人工摘要、地区、观察日期、`expires_at`, verification/freshness |
| `evidence_reviews` | append-only 人工审核、可信度、地区相关性与理由 |
| `content_materials` | 12 类内容资料、来源、风险级别 |
| `content_ideas` | 内容角度、AIDA mindset、关联趋势 |
| `scripts` | Script 主记录、production status、当前版本、风险 |
| `content_versions` | append-only AIDA 与完整脚本版本、Quality/Compliance 状态、恢复来源 |
| `content_approvals` | append-only Human Approval 决定与理由 |
| `published_content` | 已发布 URL、时间、操作者与准确版本 |
| `performance_metrics` | 人工或获准来源的 Facebook 表现指标，不预填假数字 |
| `ai_usage_logs` | 每次请求预留/实际使用量与成本；AI 目前禁用 |
| `system_errors` | 脱敏错误、服务、操作、代码、correlation id |
| `audit_logs` | 重要表的 insert/update/delete 前后记录，append-only |
| `workspace_settings` | 日/月/单次请求与成本上限、趋势有效期、integration kill switches |

## 数据库规则

- `facebook_url_library(workspace_id, normalized_url)` 唯一，应用服务器先做 Facebook host 验证、canonicalization 与 tracking parameter 清理。
- Evidence/Source/Snapshot 必须有 `expires_at`；触发器计算 fresh/expiring/expired，`refresh_source_expiry()` 只允许 service role 调用。
- `review_evidence()` 只允许 reviewer/admin，经同一事务写入人工 review 后才更新 Evidence 状态；过期证据不能 Verified。
- `current_verified_trends` 只返回未过期、有人审 Verified evidence 的趋势。
- 新 `content_versions` 自动取得连续版本号并更新 Script 当前版本；恢复旧版本会插入 `origin=restored` 的新记录。
- Version、Approval、Evidence Review 与 Audit 禁止 update/delete。
- Script Approved 需要 reviewer/admin、非 High Risk、Quality=`passed`、Compliance=`passed`。
- 未 Approved 的当前版本不能进入 Filming；只有 Ready Script 可以写入 `published_content` 或进入 Published。
- `reserve_ai_usage()` 在任何未来 provider request 前原子检查单次、每日、每月请求与成本上限；默认 `ai_enabled=false`。

## RLS 摘要

- `profiles` 仅本人读取/更新。
- Workspace 与所有业务表 SELECT 需要 active membership。
- admin/editor 可写研究、内容、Script 与 production 数据；删除限制为 admin。
- reviewer/admin 可新增 Evidence Review 与 Content Approval。
- 仅 admin 可修改品牌、成员与 workspace settings。
- viewer 为只读。
- service role 不用于一般 CRUD，只用于受控服务器错误记录及 expiry maintenance。

## Migration

- `202606110001_core_schema.sql`：enum、23 张表、constraints、indexes。
- `202606110002_workflow_controls.sql`：Auth profile、freshness、approval、version、production、cost、audit triggers/functions。
- `202606110003_rls_policies.sql`：RLS、workspace bootstrap、manual evidence review RPC、grants 与 verified trend view。

`supabase/seed.sql` 不含业务数据，避免假趋势与假案例。
