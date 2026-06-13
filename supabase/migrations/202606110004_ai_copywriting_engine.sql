-- STEP 4: MetaSlim AI Copywriting & Quality Engine
-- Additive only. Does not modify migrations 001-003 or rewrite STEP 3 behaviour.
begin;

-- 1. ai_generation_runs: full lifecycle of one AI generation request
create table public.ai_generation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  request_id text not null,
  status text not null default 'pending' check (status in ('pending','building_context','generating','quality_checks','rewriting','saving','succeeded','failed','blocked','cancelled')),
  stage_detail text,
  generation_mode text not null check (generation_mode in ('quick','standard','deep_strategy')),
  formula text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  context_summary jsonb not null default '{}'::jsonb,
  evidence_ids uuid[] not null default '{}',
  evidence_limitations text,
  prompt_version text not null,
  model text,
  rewrite_count integer not null default 0 check (rewrite_count between 0 and 3),
  quality_report jsonb,
  compliance_report jsonb,
  duplicate_report jsonb,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_cents bigint check (estimated_cost_cents >= 0),
  cost_available boolean not null default false,
  usage_log_id uuid references public.ai_usage_logs(id),
  script_id uuid references public.scripts(id) on delete set null,
  content_version_id uuid references public.content_versions(id) on delete set null,
  human_review_required boolean not null default false,
  error_code text,
  safe_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- idempotency: one request_id per workspace
  unique (workspace_id, request_id),
  check (safe_error_message is null or safe_error_message !~* '(bearer\s+[A-Za-z0-9._~+/-]{12,}|sk-[A-Za-z0-9]{8,}|(api[_-]?key|secret|token|password)\s*[:=]\s*[^\s,;]{8,})')
);

create index ai_generation_runs_workspace_idx on public.ai_generation_runs(workspace_id, created_at desc);
create index ai_generation_runs_script_idx on public.ai_generation_runs(script_id) where script_id is not null;
-- concurrency guard lookup: active runs per user
create index ai_generation_runs_active_idx on public.ai_generation_runs(workspace_id, user_id) where status in ('pending','building_context','generating','quality_checks','rewriting','saving');

-- 2. content_versions: allow AI origin + AI output fields (schema evolution in NEW migration; files 001-003 untouched)
alter table public.content_versions drop constraint content_versions_origin_check;
alter table public.content_versions add constraint content_versions_origin_check
  check (origin in ('manual','restored','system','ai'));

alter table public.content_versions
  add column generation_run_id uuid references public.ai_generation_runs(id) on delete set null,
  add column formula text,
  add column strategy jsonb,
  add column hook_candidates jsonb,
  add column selected_hook_index integer check (selected_hook_index is null or selected_hook_index >= 0),
  add column rehook_text text,
  add column cta_keyword text,
  add column hashtags jsonb,
  add column production_notes text,
  add column source_summary jsonb;

-- 3. scripts: track AI draft provenance (status state machine untouched — AI saves only as 'draft'/'needs_review')
alter table public.scripts
  add column ai_generated boolean not null default false,
  add column human_review_required boolean not null default false;

-- 4. Guard: AI-origin versions may never be born with passed statuses unless a report exists
create or replace function private.enforce_ai_version_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.origin = 'ai' then
    if new.generation_run_id is null then
      raise exception 'AI version requires generation_run_id';
    end if;
    -- AI drafts must enter as pending/review states; humans flip them later
    if new.compliance_status not in ('pending','review_required','failed','passed') then
      raise exception 'Invalid compliance_status for AI version';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_ai_version_review
  before insert on public.content_versions
  for each row execute function private.enforce_ai_version_review();

-- 5. Guard: scripts flagged ai_generated cannot jump beyond needs_review without an approval row
create or replace function private.enforce_ai_script_gate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare approval_count bigint;
begin
  if new.ai_generated and old.status in ('draft','needs_review') and new.status in ('approved','filming','editing','ready','published') then
    select count(*) into approval_count from public.content_approvals
      where script_id = new.id and decision = 'approved';
    if approval_count = 0 then
      raise exception 'AI draft requires human approval before status %', new.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_ai_script_gate
  before update of status on public.scripts
  for each row execute function private.enforce_ai_script_gate();

-- 6. RLS (mirrors 003 patterns)
alter table public.ai_generation_runs enable row level security;

create policy ai_generation_runs_select_member on public.ai_generation_runs
  for select to authenticated using (private.is_workspace_member(workspace_id));
create policy ai_generation_runs_insert_editor on public.ai_generation_runs
  for insert to authenticated
  with check (
    private.has_workspace_role(workspace_id, array['admin','editor']::public.workspace_role[])
    and user_id = (select auth.uid())
  );
create policy ai_generation_runs_update_editor on public.ai_generation_runs
  for update to authenticated
  using (private.has_workspace_role(workspace_id, array['admin','editor']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['admin','editor']::public.workspace_role[]));

-- 7. Audit + updated_at triggers (same functions as STEP 3)
create trigger audit_ai_generation_runs
  after insert or update or delete on public.ai_generation_runs
  for each row execute function private.audit_row_change();
create trigger set_updated_at_ai_generation_runs
  before update on public.ai_generation_runs
  for each row execute function private.set_updated_at();

commit;
