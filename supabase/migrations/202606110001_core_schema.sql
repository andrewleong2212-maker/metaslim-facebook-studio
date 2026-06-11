begin;

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.workspace_role as enum ('admin', 'editor', 'reviewer', 'viewer');
create type public.record_status as enum ('active', 'archived');
create type public.evidence_status as enum ('unverified', 'in_review', 'verified', 'rejected', 'expired');
create type public.freshness_status as enum ('fresh', 'expiring', 'expired');
create type public.risk_level as enum ('low', 'medium', 'high');
create type public.script_status as enum ('draft', 'needs_review', 'approved', 'filming', 'editing', 'ready', 'published', 'archived');
create type public.approval_decision as enum ('approved', 'rejected', 'changes_requested');
create type public.review_decision as enum ('verified', 'rejected', 'needs_more_evidence');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  locale text not null default 'zh-MY',
  timezone text not null default 'Asia/Kuala_Lumpur',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'MetaSlim AI',
  slug text not null unique,
  country_code text not null default 'MY' check (country_code = 'MY'),
  timezone text not null default 'Asia/Kuala_Lumpur',
  status public.record_status not null default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.brand_profile (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  product_code text not null default 'metaslim_ai' check (product_code = 'metaslim_ai'),
  name text not null default 'MetaSlim AI' check (name = 'MetaSlim AI'),
  voice_rules jsonb not null default '{}'::jsonb,
  approved_claims jsonb not null default '[]'::jsonb,
  prohibited_claims jsonb not null default '[]'::jsonb,
  default_disclaimer text,
  default_cta text,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facebook_url_library (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  original_url text not null,
  normalized_url text not null,
  url_type text not null check (url_type in ('page', 'post', 'video', 'reel', 'ad_library', 'other')),
  title text,
  malaysia_region text,
  notes text,
  access_status text not null default 'unknown' check (access_status in ('unknown', 'accessible', 'inaccessible', 'removed', 'restricted')),
  last_checked_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, normalized_url)
);

create table public.facebook_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  facebook_url_id uuid references public.facebook_url_library(id) on delete set null,
  source_name text not null,
  source_language text not null default 'zh-MY' check (source_language in ('zh-MY', 'en-MY', 'ms-MY')),
  source_summary text,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  freshness_status public.freshness_status not null default 'fresh',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > observed_at)
);

create table public.facebook_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid not null references public.facebook_sources(id) on delete cascade,
  facebook_url_id uuid references public.facebook_url_library(id) on delete set null,
  post_type text not null check (post_type in ('post', 'video', 'reel', 'ad', 'unknown')),
  manual_copy text,
  manual_cta text,
  observed_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trend_keywords (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  keyword text not null,
  source_language text not null check (source_language in ('zh-MY', 'en-MY', 'ms-MY')),
  malaysia_region text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.trend_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  keyword_id uuid references public.trend_keywords(id) on delete cascade,
  source_type text not null,
  source_url text,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  malaysia_region text not null,
  raw_metadata jsonb not null default '{}'::jsonb,
  freshness_status public.freshness_status not null default 'fresh',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (expires_at > observed_at)
);

create table public.trend_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  summary text,
  malaysia_region text not null,
  lead_intent text not null default 'unknown' check (lead_intent in ('unknown', 'low', 'medium', 'high')),
  trend_score numeric(5,2) check (trend_score between 0 and 100),
  status public.evidence_status not null default 'unverified',
  expires_at timestamptz not null,
  freshness_status public.freshness_status not null default 'fresh',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trend_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid references public.trend_opportunities(id) on delete cascade,
  source_id uuid references public.facebook_sources(id) on delete set null,
  snapshot_id uuid references public.trend_snapshots(id) on delete set null,
  source_url text not null,
  human_summary text not null,
  malaysia_region text not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  status public.evidence_status not null default 'unverified',
  freshness_status public.freshness_status not null default 'fresh',
  created_by uuid not null references auth.users(id),
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > observed_at),
  check ((status = 'verified' and verified_by is not null and verified_at is not null) or status <> 'verified')
);

create table public.evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  evidence_id uuid not null references public.trend_evidence(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision public.review_decision not null,
  credibility_rating smallint not null check (credibility_rating between 1 and 5),
  location_relevance smallint not null check (location_relevance between 1 and 5),
  notes text not null,
  reviewed_at timestamptz not null default now()
);

create table public.content_materials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  material_type text not null check (material_type in ('pain_point','customer_question','customer_objection','customer_quote','case_study','educational_point','product_usp','trust_element','cta','trend','visual_hook','motion_hook')),
  title text not null,
  content text not null,
  source_url text,
  evidence_id uuid references public.trend_evidence(id) on delete set null,
  risk_level public.risk_level not null default 'low',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid references public.trend_opportunities(id) on delete set null,
  title text not null,
  angle text not null,
  aida_mindset text not null default 'evidence_first',
  status text not null default 'draft' check (status in ('draft','selected','archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_idea_id uuid references public.content_ideas(id) on delete set null,
  title text not null,
  status public.script_status not null default 'draft',
  risk_level public.risk_level not null default 'low',
  current_version_id uuid,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  version_number integer not null,
  parent_version_id uuid references public.content_versions(id),
  origin text not null default 'manual' check (origin in ('manual','restored','system')),
  script_hook text,
  visual_hook text,
  motion_hook text,
  first_second_text text,
  attention text,
  interest text,
  desire text,
  action text,
  full_script text not null,
  caption text,
  headline text,
  cover_text text,
  cta text,
  risk_level public.risk_level not null default 'low',
  compliance_status text not null default 'pending' check (compliance_status in ('pending','passed','failed','review_required')),
  quality_status text not null default 'pending' check (quality_status in ('pending','passed','failed','review_required')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (script_id, version_number)
);

alter table public.scripts add constraint scripts_current_version_fk foreign key (current_version_id) references public.content_versions(id);

create table public.content_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  content_version_id uuid not null references public.content_versions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision public.approval_decision not null,
  reason text not null,
  decided_at timestamptz not null default now(),
  unique (content_version_id, reviewer_id, decided_at)
);

create table public.published_content (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  script_id uuid not null references public.scripts(id),
  content_version_id uuid not null references public.content_versions(id),
  platform text not null default 'facebook',
  published_url text not null,
  published_at timestamptz not null,
  published_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.performance_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  published_content_id uuid not null references public.published_content(id) on delete cascade,
  metric_date date not null,
  reach bigint check (reach >= 0),
  three_second_views bigint check (three_second_views >= 0),
  average_watch_time_seconds numeric(12,2) check (average_watch_time_seconds >= 0),
  completion_rate numeric(6,3) check (completion_rate between 0 and 100),
  messenger bigint check (messenger >= 0),
  whatsapp bigint check (whatsapp >= 0),
  leads bigint check (leads >= 0),
  sales bigint check (sales >= 0),
  ad_spend_cents bigint check (ad_spend_cents >= 0),
  source text not null default 'manual',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (published_content_id, metric_date)
);

create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id),
  provider text not null,
  operation text not null,
  request_id text,
  request_count integer not null default 1 check (request_count > 0),
  input_units integer not null default 0 check (input_units >= 0),
  output_units integer not null default 0 check (output_units >= 0),
  estimated_cost_cents bigint not null default 0 check (estimated_cost_cents >= 0),
  actual_cost_cents bigint not null default 0 check (actual_cost_cents >= 0),
  status text not null check (status in ('reserved','succeeded','failed','adjusted','blocked')),
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.system_errors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id),
  service text not null,
  operation text not null,
  severity text not null check (severity in ('info','warning','error','critical')),
  error_code text not null,
  safe_message text not null,
  redacted_context jsonb not null default '{}'::jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (safe_message !~* '(bearer\s+[A-Za-z0-9._~+/-]{12,}|eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}|(api[_-]?key|secret|token|password)\s*[:=]\s*[^\s,;]{8,})'),
  check (redacted_context::text !~* '(authorization|bearer|service_role|api[_-]?key|secret|token)')
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  daily_request_limit integer not null default 0 check (daily_request_limit >= 0),
  monthly_request_limit integer not null default 0 check (monthly_request_limit >= 0),
  per_request_cost_limit_cents bigint not null default 0 check (per_request_cost_limit_cents >= 0),
  daily_cost_limit_cents bigint not null default 0 check (daily_cost_limit_cents >= 0),
  monthly_cost_limit_cents bigint not null default 0 check (monthly_cost_limit_cents >= 0),
  trend_expiry_days integer not null default 7 check (trend_expiry_days between 1 and 365),
  output_locale text not null default 'zh-MY' check (output_locale = 'zh-MY'),
  ai_enabled boolean not null default false,
  facebook_enabled boolean not null default false,
  google_trends_enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspace_members_user_idx on public.workspace_members(user_id, workspace_id) where status = 'active';
create unique index trend_keywords_unique_idx on public.trend_keywords(workspace_id, lower(keyword), malaysia_region);
create index facebook_url_library_workspace_idx on public.facebook_url_library(workspace_id, created_at desc);
create index trend_evidence_expiry_idx on public.trend_evidence(workspace_id, expires_at, status);
create index trend_opportunities_expiry_idx on public.trend_opportunities(workspace_id, expires_at, status);
create index content_versions_script_idx on public.content_versions(script_id, version_number desc);
create index content_approvals_script_idx on public.content_approvals(script_id, decided_at desc);
create index ai_usage_daily_idx on public.ai_usage_logs(workspace_id, created_at);
create index system_errors_correlation_idx on public.system_errors(correlation_id);
create index audit_logs_entity_idx on public.audit_logs(workspace_id, entity_type, entity_id, created_at desc);

commit;
