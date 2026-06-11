begin;

create or replace function private.current_user_role(target_workspace uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = target_workspace
    and wm.user_id = (select auth.uid())
    and wm.status = 'active'
  limit 1
$$;

create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.status = 'active'
  )
$$;

create or replace function private.has_workspace_role(target_workspace uuid, allowed_roles public.workspace_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(private.current_user_role(target_workspace) = any(allowed_roles), false)
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_user_role(uuid) to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.has_workspace_role(uuid, public.workspace_role[]) to authenticated;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.set_freshness_status()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.freshness_status := case
    when new.expires_at <= now() then 'expired'::public.freshness_status
    when new.expires_at <= now() + interval '3 days' then 'expiring'::public.freshness_status
    else 'fresh'::public.freshness_status
  end;
  if tg_table_name = 'trend_evidence' and new.freshness_status = 'expired' then
    new.status := 'expired'::public.evidence_status;
  end if;
  return new;
end;
$$;

create trigger facebook_sources_freshness before insert or update of expires_at on public.facebook_sources for each row execute function private.set_freshness_status();
create trigger trend_snapshots_freshness before insert or update of expires_at on public.trend_snapshots for each row execute function private.set_freshness_status();
create trigger trend_opportunities_freshness before insert or update of expires_at on public.trend_opportunities for each row execute function private.set_freshness_status();
create trigger trend_evidence_freshness before insert or update of expires_at on public.trend_evidence for each row execute function private.set_freshness_status();

create or replace function public.refresh_source_expiry()
returns table(table_name text, affected_rows bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare c bigint;
begin
  update public.facebook_sources set freshness_status = case when expires_at <= now() then 'expired'::public.freshness_status when expires_at <= now() + interval '3 days' then 'expiring'::public.freshness_status else 'fresh'::public.freshness_status end;
  get diagnostics c = row_count; return query select 'facebook_sources'::text, c;
  update public.trend_snapshots set freshness_status = case when expires_at <= now() then 'expired'::public.freshness_status when expires_at <= now() + interval '3 days' then 'expiring'::public.freshness_status else 'fresh'::public.freshness_status end;
  get diagnostics c = row_count; return query select 'trend_snapshots'::text, c;
  update public.trend_opportunities set freshness_status = case when expires_at <= now() then 'expired'::public.freshness_status when expires_at <= now() + interval '3 days' then 'expiring'::public.freshness_status else 'fresh'::public.freshness_status end, status = case when expires_at <= now() then 'expired'::public.evidence_status else status end;
  get diagnostics c = row_count; return query select 'trend_opportunities'::text, c;
  update public.trend_evidence set freshness_status = case when expires_at <= now() then 'expired'::public.freshness_status when expires_at <= now() + interval '3 days' then 'expiring'::public.freshness_status else 'fresh'::public.freshness_status end, status = case when expires_at <= now() then 'expired'::public.evidence_status else status end;
  get diagnostics c = row_count; return query select 'trend_evidence'::text, c;
end;
$$;
revoke all on function public.refresh_source_expiry() from public, anon, authenticated;
grant execute on function public.refresh_source_expiry() to service_role;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.enforce_evidence_verification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'verified' and old.status is distinct from new.status then
    if not private.has_workspace_role(new.workspace_id, array['admin','reviewer']::public.workspace_role[]) then
      raise exception 'Only reviewer or admin can verify evidence';
    end if;
    if new.expires_at <= now() then raise exception 'Expired evidence cannot be verified'; end if;
    if not exists (select 1 from public.evidence_reviews r where r.evidence_id = new.id and r.reviewer_id = (select auth.uid()) and r.decision = 'verified') then
      raise exception 'A manual evidence review is required before verification';
    end if;
    new.verified_by := (select auth.uid());
    new.verified_at := now();
  end if;
  return new;
end;
$$;
create trigger enforce_evidence_verification before update of status on public.trend_evidence for each row execute function private.enforce_evidence_verification();

create or replace function private.enforce_evidence_review_role()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not private.has_workspace_role(new.workspace_id, array['admin','reviewer']::public.workspace_role[]) then
    raise exception 'Only reviewer or admin can review evidence';
  end if;
  new.reviewer_id := (select auth.uid());
  return new;
end;
$$;
create trigger enforce_evidence_review_role before insert on public.evidence_reviews for each row execute function private.enforce_evidence_review_role();

create or replace function private.assign_version_number()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.script_id::text, 0));
  select coalesce(max(version_number), 0) + 1 into new.version_number from public.content_versions where script_id = new.script_id;
  if new.origin = 'restored' and new.parent_version_id is null then raise exception 'Restored versions require parent_version_id'; end if;
  return new;
end;
$$;
create trigger assign_version_number before insert on public.content_versions for each row execute function private.assign_version_number();

create or replace function private.after_content_version_insert()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.scripts set current_version_id = new.id, updated_by = new.created_by, updated_at = now(), status = 'needs_review' where id = new.script_id;
  return new;
end;
$$;
create trigger after_content_version_insert after insert on public.content_versions for each row execute function private.after_content_version_insert();

create or replace function private.prevent_version_mutation()
returns trigger language plpgsql as $$ begin raise exception 'Content versions are append-only'; end; $$;
create trigger prevent_content_version_update before update or delete on public.content_versions for each row execute function private.prevent_version_mutation();
create trigger prevent_approval_update before update or delete on public.content_approvals for each row execute function private.prevent_version_mutation();
create trigger prevent_evidence_review_update before update or delete on public.evidence_reviews for each row execute function private.prevent_version_mutation();
create trigger prevent_audit_update before update or delete on public.audit_logs for each row execute function private.prevent_version_mutation();

create or replace function private.enforce_script_approval()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.content_versions%rowtype;
begin
  if not private.has_workspace_role(new.workspace_id, array['admin','reviewer']::public.workspace_role[]) then raise exception 'Only reviewer or admin can approve scripts'; end if;
  new.reviewer_id := (select auth.uid());
  select * into v from public.content_versions where id = new.content_version_id and script_id = new.script_id;
  if not found then raise exception 'Approval version does not belong to script'; end if;
  if new.decision = 'approved' then
    if v.risk_level = 'high' then raise exception 'High risk content cannot be approved'; end if;
    if v.compliance_status <> 'passed' or v.quality_status <> 'passed' then raise exception 'Quality and compliance checks must pass before approval'; end if;
  end if;
  return new;
end;
$$;
create trigger enforce_script_approval before insert on public.content_approvals for each row execute function private.enforce_script_approval();

create or replace function private.apply_script_approval()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.decision = 'approved' then update public.scripts set status = 'approved', current_version_id = new.content_version_id, updated_at = now() where id = new.script_id;
  elsif new.decision = 'changes_requested' then update public.scripts set status = 'needs_review', updated_at = now() where id = new.script_id;
  end if;
  return new;
end;
$$;
create trigger apply_script_approval after insert on public.content_approvals for each row execute function private.apply_script_approval();

create or replace function private.enforce_script_transition()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'filming' and old.status is distinct from new.status then
    if not exists (select 1 from public.content_approvals a where a.script_id = new.id and a.content_version_id = new.current_version_id and a.decision = 'approved') then raise exception 'Unapproved content cannot enter filming'; end if;
  end if;
  if new.status = 'published' and old.status <> 'ready' then raise exception 'Only ready content can be published'; end if;
  return new;
end;
$$;
create trigger enforce_script_transition before update of status on public.scripts for each row execute function private.enforce_script_transition();

create or replace function private.enforce_published_content()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.scripts%rowtype;
begin
  select * into s from public.scripts where id = new.script_id;
  if s.status <> 'ready' then raise exception 'Only ready content can be published'; end if;
  if s.current_version_id <> new.content_version_id then raise exception 'Only the current ready version can be published'; end if;
  if not exists (select 1 from public.content_approvals a where a.content_version_id = new.content_version_id and a.decision = 'approved') then raise exception 'Published content requires human approval'; end if;
  return new;
end;
$$;
create trigger enforce_published_content before insert on public.published_content for each row execute function private.enforce_published_content();

create or replace function public.reserve_ai_usage(
  target_workspace uuid, target_operation text, target_estimated_cost_cents bigint, target_provider text default 'disabled'
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare settings public.workspace_settings%rowtype; daily_requests bigint; monthly_requests bigint; daily_cost bigint; monthly_cost bigint; result_id uuid;
begin
  if not private.has_workspace_role(target_workspace, array['admin','editor','reviewer']::public.workspace_role[]) then raise exception 'Not authorized'; end if;
  select * into settings from public.workspace_settings where workspace_id = target_workspace for update;
  if not found or not settings.ai_enabled then raise exception 'AI provider is disabled'; end if;
  select coalesce(sum(request_count),0), coalesce(sum(case when status = 'reserved' then estimated_cost_cents else actual_cost_cents end),0) into daily_requests, daily_cost from public.ai_usage_logs where workspace_id = target_workspace and created_at >= date_trunc('day', now());
  select coalesce(sum(request_count),0), coalesce(sum(case when status = 'reserved' then estimated_cost_cents else actual_cost_cents end),0) into monthly_requests, monthly_cost from public.ai_usage_logs where workspace_id = target_workspace and created_at >= date_trunc('month', now());
  if settings.per_request_cost_limit_cents > 0 and target_estimated_cost_cents > settings.per_request_cost_limit_cents then raise exception 'Per-request cost limit exceeded'; end if;
  if settings.daily_request_limit > 0 and daily_requests + 1 > settings.daily_request_limit then raise exception 'Daily request limit exceeded'; end if;
  if settings.monthly_request_limit > 0 and monthly_requests + 1 > settings.monthly_request_limit then raise exception 'Monthly request limit exceeded'; end if;
  if settings.daily_cost_limit_cents > 0 and daily_cost + target_estimated_cost_cents > settings.daily_cost_limit_cents then raise exception 'Daily cost limit exceeded'; end if;
  if settings.monthly_cost_limit_cents > 0 and monthly_cost + target_estimated_cost_cents > settings.monthly_cost_limit_cents then raise exception 'Monthly cost limit exceeded'; end if;
  insert into public.ai_usage_logs(workspace_id,user_id,provider,operation,estimated_cost_cents,status) values(target_workspace,(select auth.uid()),target_provider,target_operation,target_estimated_cost_cents,'reserved') returning id into result_id;
  return result_id;
end;
$$;
grant execute on function public.reserve_ai_usage(uuid,text,bigint,text) to authenticated;

create or replace function private.audit_row_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare ws uuid; entity uuid; before_json jsonb; after_json jsonb;
begin
  before_json := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  after_json := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  ws := case when tg_table_name = 'workspaces' then coalesce((after_json->>'id')::uuid, (before_json->>'id')::uuid) else coalesce((after_json->>'workspace_id')::uuid, (before_json->>'workspace_id')::uuid) end;
  entity := coalesce((after_json->>'id')::uuid, (before_json->>'id')::uuid);
  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, before_data, after_data)
  values(ws, (select auth.uid()), lower(tg_op), tg_table_name, entity, before_json - array['redacted_context'], after_json - array['redacted_context']);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['workspaces','workspace_members','brand_profile','facebook_url_library','facebook_sources','facebook_posts','trend_keywords','trend_snapshots','trend_opportunities','trend_evidence','evidence_reviews','content_materials','content_ideas','scripts','content_versions','content_approvals','published_content','performance_metrics','ai_usage_logs','system_errors','workspace_settings']
  loop execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function private.audit_row_change()', t, t); end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['profiles','workspaces','workspace_members','brand_profile','facebook_url_library','facebook_sources','facebook_posts','trend_opportunities','trend_evidence','content_materials','content_ideas','scripts','workspace_settings']
  loop execute format('create trigger set_updated_at_%I before update on public.%I for each row execute function private.set_updated_at()', t, t); end loop;
end $$;

commit;
