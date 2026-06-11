begin;

create or replace function public.create_workspace(workspace_name text, workspace_slug text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if length(trim(workspace_name)) < 2 or workspace_slug !~ '^[a-z0-9-]{3,50}$' then raise exception 'Invalid workspace details'; end if;
  insert into public.workspaces(name,slug,created_by) values(trim(workspace_name),workspace_slug,(select auth.uid())) returning id into new_id;
  insert into public.workspace_members(workspace_id,user_id,role) values(new_id,(select auth.uid()),'admin');
  insert into public.brand_profile(workspace_id,updated_by) values(new_id,(select auth.uid()));
  insert into public.workspace_settings(workspace_id,updated_by) values(new_id,(select auth.uid()));
  return new_id;
end;
$$;
revoke all on function public.create_workspace(text,text) from public, anon;
grant execute on function public.create_workspace(text,text) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.brand_profile enable row level security;
alter table public.facebook_url_library enable row level security;
alter table public.facebook_sources enable row level security;
alter table public.facebook_posts enable row level security;
alter table public.trend_keywords enable row level security;
alter table public.trend_snapshots enable row level security;
alter table public.trend_opportunities enable row level security;
alter table public.trend_evidence enable row level security;
alter table public.evidence_reviews enable row level security;
alter table public.content_materials enable row level security;
alter table public.content_ideas enable row level security;
alter table public.scripts enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_approvals enable row level security;
alter table public.published_content enable row level security;
alter table public.performance_metrics enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.system_errors enable row level security;
alter table public.audit_logs enable row level security;
alter table public.workspace_settings enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy workspaces_select_member on public.workspaces for select to authenticated using (private.is_workspace_member(id));
create policy workspaces_update_admin on public.workspaces for update to authenticated using (private.has_workspace_role(id,array['admin']::public.workspace_role[])) with check (private.has_workspace_role(id,array['admin']::public.workspace_role[]));

create policy workspace_members_select_member on public.workspace_members for select to authenticated using (private.is_workspace_member(workspace_id));
create policy workspace_members_insert_admin on public.workspace_members for insert to authenticated with check (private.has_workspace_role(workspace_id,array['admin']::public.workspace_role[]));
create policy workspace_members_update_admin on public.workspace_members for update to authenticated using (private.has_workspace_role(workspace_id,array['admin']::public.workspace_role[])) with check (private.has_workspace_role(workspace_id,array['admin']::public.workspace_role[]));
create policy workspace_members_delete_admin on public.workspace_members for delete to authenticated using (private.has_workspace_role(workspace_id,array['admin']::public.workspace_role[]) and user_id <> (select auth.uid()));

do $$ declare t text; begin
  foreach t in array array['brand_profile','facebook_url_library','facebook_sources','facebook_posts','trend_keywords','trend_snapshots','trend_opportunities','trend_evidence','evidence_reviews','content_materials','content_ideas','scripts','content_versions','content_approvals','published_content','performance_metrics','ai_usage_logs','system_errors','audit_logs','workspace_settings']
  loop execute format('create policy %I on public.%I for select to authenticated using (private.is_workspace_member(workspace_id))', t || '_select_member', t); end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['facebook_url_library','facebook_sources','facebook_posts','trend_keywords','trend_snapshots','trend_opportunities','trend_evidence','content_materials','content_ideas','scripts','content_versions','published_content','performance_metrics']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_workspace_role(workspace_id,array[''admin'',''editor'']::public.workspace_role[]))', t || '_insert_editor', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_workspace_role(workspace_id,array[''admin'',''editor'']::public.workspace_role[])) with check (private.has_workspace_role(workspace_id,array[''admin'',''editor'']::public.workspace_role[]))', t || '_update_editor', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_workspace_role(workspace_id,array[''admin'']::public.workspace_role[]))', t || '_delete_admin', t);
  end loop;
end $$;

create policy evidence_reviews_insert_reviewer on public.evidence_reviews for insert to authenticated with check (private.has_workspace_role(workspace_id,array['admin','reviewer']::public.workspace_role[]));
create policy content_approvals_insert_reviewer on public.content_approvals for insert to authenticated with check (private.has_workspace_role(workspace_id,array['admin','reviewer']::public.workspace_role[]));

create or replace function public.review_evidence(
  target_workspace uuid,
  target_evidence uuid,
  target_decision public.review_decision,
  target_credibility smallint,
  target_location_relevance smallint,
  target_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare review_id uuid; next_status public.evidence_status;
begin
  if not private.has_workspace_role(target_workspace, array['admin','reviewer']::public.workspace_role[]) then
    raise exception 'Only reviewer or admin can review evidence';
  end if;
  if target_credibility not between 1 and 5 or target_location_relevance not between 1 and 5 or length(trim(target_notes)) = 0 then
    raise exception 'Invalid evidence review';
  end if;
  if not exists (select 1 from public.trend_evidence where id = target_evidence and workspace_id = target_workspace) then
    raise exception 'Evidence not found';
  end if;
  insert into public.evidence_reviews(workspace_id,evidence_id,reviewer_id,decision,credibility_rating,location_relevance,notes)
  values(target_workspace,target_evidence,(select auth.uid()),target_decision,target_credibility,target_location_relevance,trim(target_notes))
  returning id into review_id;
  next_status := case target_decision when 'verified' then 'verified'::public.evidence_status when 'rejected' then 'rejected'::public.evidence_status else 'in_review'::public.evidence_status end;
  update public.trend_evidence set status = next_status where id = target_evidence and workspace_id = target_workspace;
  return review_id;
end;
$$;
revoke all on function public.review_evidence(uuid,uuid,public.review_decision,smallint,smallint,text) from public, anon;
grant execute on function public.review_evidence(uuid,uuid,public.review_decision,smallint,smallint,text) to authenticated;

create policy brand_profile_insert_admin on public.brand_profile for insert to authenticated with check (private.has_workspace_role(workspace_id,array['admin']::public.workspace_role[]));
create policy brand_profile_update_admin on public.brand_profile for update to authenticated using (private.has_workspace_role(workspace_id,array['admin']::public.workspace_role[])) with check (private.has_workspace_role(workspace_id,array['admin']::public.workspace_role[]));
create policy workspace_settings_insert_admin on public.workspace_settings for insert to authenticated with check (private.has_workspace_role(workspace_id,array['admin']::public.workspace_role[]));
create policy workspace_settings_update_admin on public.workspace_settings for update to authenticated using (private.has_workspace_role(workspace_id,array['admin']::public.workspace_role[])) with check (private.has_workspace_role(workspace_id,array['admin']::public.workspace_role[]));

create policy ai_usage_insert_member on public.ai_usage_logs for insert to authenticated with check (private.has_workspace_role(workspace_id,array['admin','editor','reviewer']::public.workspace_role[]) and user_id = (select auth.uid()));
create policy system_errors_insert_member on public.system_errors for insert to authenticated with check (private.is_workspace_member(workspace_id) and (user_id is null or user_id = (select auth.uid())));
create policy audit_logs_insert_member on public.audit_logs for insert to authenticated with check (private.is_workspace_member(workspace_id) and (actor_id is null or actor_id = (select auth.uid())));

create view public.current_verified_trends with (security_invoker = true) as
select o.*, count(e.id) as valid_evidence_count
from public.trend_opportunities o
join public.trend_evidence e on e.opportunity_id = o.id
where o.status = 'verified'
  and o.expires_at > now()
  and o.freshness_status <> 'expired'
  and e.status = 'verified'
  and e.expires_at > now()
  and e.freshness_status <> 'expired'
group by o.id;
grant select on public.current_verified_trends to authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.audit_logs from anon;
revoke update, delete on public.audit_logs, public.content_versions, public.content_approvals, public.evidence_reviews from authenticated;
grant select, insert on public.audit_logs, public.content_versions, public.content_approvals, public.evidence_reviews to authenticated;

commit;
