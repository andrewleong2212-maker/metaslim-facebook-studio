# Database Schema

## 1. 约定

- 主键使用 UUID；时间使用 `timestamptz`，业务显示时区为 `Asia/Kuala_Lumpur`。
- 业务表包含 `workspace_id`、`created_at`、`updated_at`；需要软删除的表含 `deleted_at`。
- 关键状态使用数据库 enum/check constraint，状态迁移由服务端执行。
- 所有 workspace 数据启用 RLS，默认拒绝；service role 仅限受控服务端任务。
- 版本、审批、审计、门禁运行记录采用 append-only 设计。

## 2. 身份与配置

### `profiles`

`id`(auth user id), `display_name`, `email`, `locale`, `timezone`, `created_at`, `updated_at`

### `workspaces`

`id`, `name`, `slug`, `default_timezone`, `monthly_budget_cents`, `budget_currency`, `status`, timestamps

### `workspace_members`

`id`, `workspace_id`, `user_id`, `role`(admin/researcher/writer/reviewer/producer/viewer), `status`, `joined_at`, unique(workspace_id,user_id)

### `brand_profiles`

`id`, `workspace_id`, `product_code`(固定 metaslim_ai), `name`(固定 MetaSlim AI), `voice_rules_json`, `approved_claims_json`, `prohibited_claims_json`, `default_disclaimer`, `default_cta`, `active_version`, timestamps。每个 workspace 只能有一条 active MetaSlim AI 配置，不支持多品牌选择。

### `language_policies`

`id`, `workspace_id`, `output_locale`(固定 zh-MY), `chinese_script`(default simplified), `research_source_locales`(en-MY/ms-MY), `colloquial_rules_json`, `glossary_json`, `prohibited_terms_json`, `version`, `effective_at`, timestamps。English/BM 只标记研究来源，不是输出选项。

### `locations`

`id`, `workspace_id` nullable for system locations, `country_code`(固定 MY), `admin_area`, `city`, `market_label`, `timezone`(Asia/Kuala_Lumpur), `level`, `is_active`, unique scope fields

## 3. 趋势与证据

### `trend_candidates`

`id`, `workspace_id`, `title`, `summary`, `location_id`, `window_start`, `window_end`, `status`(draft/needs_evidence/in_review/verified/rejected/expired), `created_by`, `verified_at`, timestamps

### `sources`

`id`, `workspace_id`, `source_type`(facebook_url/google_trends/manual/news/other), `provider`, `canonical_url`, `title`, `publisher`, `terms_notes`, `default_ttl_hours`, `created_by`, timestamps

### `evidence_items`

`id`, `workspace_id`, `trend_id`, `source_id`, `location_id`, `external_ref`, `source_url`, `observed_value_json`, `human_summary`, `snapshot_storage_path` nullable, `collected_at`, `expires_at`, `status`(unverified/in_review/accepted/rejected/expired), `content_hash`, `created_by`, timestamps

不得把未知或推测的趋势数值写成真实 observed value。保存第三方快照前必须确认权限。

### `evidence_reviews`

`id`, `workspace_id`, `evidence_id`, `reviewer_id`, `decision`(accept/reject/needs_more_info), `credibility_rating`, `location_relevance`, `notes`, `reviewed_at`

### `facebook_urls`

`id`, `workspace_id`, `canonical_url`, `facebook_object_type`, `page_or_profile_label`, `external_object_id` nullable, `location_id`, `access_status`(unknown/accessible/inaccessible/removed/restricted), `last_checked_at`, `notes`, `content_hash`, `created_by`, timestamps, unique(workspace_id,canonical_url)

### `research_prompt_templates`

`id`, `workspace_id`, `target_tool`(codex/claude), `name`, `template_text`, `required_output_schema_json`, `version`, `is_active`, `created_by`, timestamps。Prompt 必须要求来源 URL、日期、Malaysia 地区、有效期建议与未验证事项。

### `research_prompt_runs`

`id`, `workspace_id`, `facebook_url_id`, `template_id`, `rendered_prompt`, `status`(generated/copied/result_received/reviewed), `result_text` nullable, `created_by`, timestamps。系统不直接调用 Codex/Claude；人工贴回的结果保持 unverified，直到建立 evidence review。

### `trend_evidence_links`

`id`, `workspace_id`, `trend_id`, `evidence_id`, `relationship`, `is_primary`, unique(trend_id,evidence_id)

## 4. 内容、版本与门禁

### `content_briefs`

`id`, `workspace_id`, `trend_id`, `brand_profile_id`, `location_id`, `objective`, `audience_json`, `output_locale`(固定 zh-MY), `channel`, `cta`, `aida_constraints_json`, `aida_mindset_version`, `requested_content_days`, `sufficiency_status`, `status`, `created_by`, timestamps

### `content_sufficiency_checks`

`id`, `workspace_id`, `brief_id`, `requested_content_days`, `valid_evidence_count`, `distinct_angle_count`, `status`(passed/failed/review_required), `missing_requirements_json`, `checked_at`, `ruleset_version`。当请求 30 天内容而检查未通过时，不得创建 AI generation version。

### `content_items`

`id`, `workspace_id`, `brief_id`, `title`, `status`(draft/in_review/approved/production/archived), `current_version_id` nullable, `created_by`, timestamps

### `content_versions`

`id`, `workspace_id`, `content_item_id`, `version_number`, `parent_version_id`, `origin`(manual/ai/restored), `attention`, `interest`, `desire`, `action`, `rendered_text`, `language_metadata_json`, `source_snapshot_json`, `prompt_template_version` nullable, `model` nullable, `model_parameters_json` nullable, `created_by`, `created_at`, unique(content_item_id,version_number)

### `version_evidence`

`id`, `workspace_id`, `content_version_id`, `evidence_id`, `evidence_status_at_use`, `evidence_expires_at`, `claim_mapping_json`, unique(content_version_id,evidence_id)

### `gate_runs`

`id`, `workspace_id`, `content_version_id`, `gate_type`(quality/duplicate/compliance), `ruleset_version`, `status`(running/passed/failed/review_required/error), `score` nullable, `summary`, `started_at`, `completed_at`, `correlation_id`

只有 quality、duplicate、compliance 均通过且 Human Approval 为 approved 的版本可标记 `is_final=true` 或交付用户。

### `gate_findings`

`id`, `workspace_id`, `gate_run_id`, `rule_code`, `severity`, `message`, `content_path`, `evidence_json`, `suggestion`, `created_at`

### `duplicate_matches`

`id`, `workspace_id`, `gate_run_id`, `matched_content_version_id`, `match_type`(exact/near/semantic), `similarity`, `details_json`, `created_at`

### `approval_requests`

`id`, `workspace_id`, `content_version_id`, `requested_by`, `status`(pending/approved/rejected/changes_requested/invalidated), `requested_at`, `resolved_at`

### `approval_decisions`

`id`, `workspace_id`, `approval_request_id`, `reviewer_id`, `decision`, `reason`, `gate_snapshot_json`, `created_at`

### `policy_rulesets`

`id`, `workspace_id` nullable, `type`, `name`, `version`, `rules_json`, `source_links_json`, `effective_at`, `review_due_at`, `status`, timestamps

## 5. Production Board

### `production_cards`

`id`, `workspace_id`, `content_version_id`, `approval_request_id`, `status`(approved/scheduled/in_production/blocked/published/cancelled), `assignee_id`, `due_at`, `scheduled_for`, `published_at`, `published_url`, `block_reason`, `priority`, timestamps

Constraint：引用的 approval 必须为 approved，且对应同一 content version。

### `production_assets`

`id`, `workspace_id`, `production_card_id`, `asset_type`, `storage_path`, `source_url`, `status`, `rights_notes`, `created_by`, timestamps

## 6. 成本、错误与审计

### `usage_budgets`

`id`, `workspace_id`, `scope_type`(workspace/user/feature), `scope_id` nullable, `period_start`, `period_end`, `soft_limit_cents`, `hard_limit_cents`, `currency`, `status`, timestamps

### `provider_usage`

`id`, `workspace_id`, `user_id`, `provider`, `operation`, `model`, `request_id`, `idempotency_key`, `input_units`, `output_units`, `estimated_cost_cents`, `actual_cost_cents`, `currency`, `status`(reserved/succeeded/failed/adjusted), `correlation_id`, timestamps

### `error_events`

`id`, `workspace_id` nullable, `user_id` nullable, `service`, `operation`, `severity`, `error_code`, `safe_message`, `redacted_context_json`, `correlation_id`, `retry_count`, `status`, `occurred_at`, `resolved_at`

### `audit_events`

`id`, `workspace_id`, `actor_id` nullable, `action`, `entity_type`, `entity_id`, `before_hash`, `after_hash`, `metadata_json`, `ip_hash` nullable, `correlation_id`, `created_at`

### `background_jobs`

`id`, `workspace_id` nullable, `job_type`, `payload_json`, `status`, `attempts`, `run_after`, `locked_at`, `last_error_code`, `correlation_id`, timestamps

## 7. 主要约束与索引

- `evidence_items(expires_at,status)`：Source Expiry 扫描。
- `trend_candidates(workspace_id,location_id,status,window_end)`：Trend Explorer。
- `facebook_urls(workspace_id,canonical_url)`：URL 去重。
- `content_versions(content_item_id,version_number desc)`：Version History。
- `gate_runs(content_version_id,gate_type,completed_at desc)`：最新门禁。
- `production_cards(workspace_id,status,due_at)`：Production Board。
- `provider_usage(workspace_id,created_at,provider)`：Cost Control。
- `error_events(correlation_id)` 与 `audit_events(correlation_id)`：端到端追踪。

## 8. RLS 原则

- 用户只能读取其 active membership 所属 workspace 数据。
- Writer 不可写审批决定；Reviewer 不可修改历史版本；Producer 不可绕过 approval constraint。
- Admin 也不能更新 append-only 的 audit、approval decision 和旧版本，只能新增记录。
- 后台 service role 操作必须带明确 workspace 与 job identity，并写 audit event。
- Storage path 包含 workspace id，Storage policies 与数据库 membership 同步。
