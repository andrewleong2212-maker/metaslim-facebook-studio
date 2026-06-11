-- One-time, idempotent MetaSlim AI admin bootstrap.
-- Run manually in the Supabase SQL Editor after replacing the two constants
-- below with the verified Auth user UUID and email when required.
-- This script creates no trend, case-study, performance, lead, or sales data.

begin;

do $$
declare
  bootstrap_user_id constant uuid := 'b0f110d8-4dfb-478d-ae23-61c98ee5d7f2';
  bootstrap_email constant text := 'andrewleong2212@gmail.com';
  metaslim_workspace_id uuid;
  auth_email text;
begin
  select lower(email)
    into auth_email
  from auth.users
  where id = bootstrap_user_id;

  if auth_email is null then
    raise exception 'Auth user % does not exist', bootstrap_user_id;
  end if;

  if auth_email <> lower(bootstrap_email) then
    raise exception 'Auth user UUID and email do not match';
  end if;

  insert into public.profiles (
    id,
    display_name,
    email,
    locale,
    timezone
  )
  values (
    bootstrap_user_id,
    'Andrew Leong',
    bootstrap_email,
    'zh-MY',
    'Asia/Kuala_Lumpur'
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      email = excluded.email,
      locale = excluded.locale,
      timezone = excluded.timezone,
      updated_at = now();

  insert into public.workspaces (
    name,
    slug,
    country_code,
    timezone,
    status,
    created_by
  )
  values (
    'MetaSlim AI',
    'metaslim-ai',
    'MY',
    'Asia/Kuala_Lumpur',
    'active',
    bootstrap_user_id
  )
  on conflict (slug) do update
  set name = excluded.name,
      country_code = excluded.country_code,
      timezone = excluded.timezone,
      status = excluded.status,
      updated_at = now()
  returning id into metaslim_workspace_id;

  insert into public.brand_profile (
    workspace_id,
    product_code,
    name,
    voice_rules,
    updated_by
  )
  values (
    metaslim_workspace_id,
    'metaslim_ai',
    'MetaSlim AI',
    jsonb_build_object(
      'industry', 'Slimming and Weight Management',
      'market', 'Malaysia',
      'language_style', 'Malaysian Conversational Chinese'
    ),
    bootstrap_user_id
  )
  on conflict (workspace_id) do update
  set product_code = excluded.product_code,
      name = excluded.name,
      voice_rules = coalesce(public.brand_profile.voice_rules, '{}'::jsonb)
        || excluded.voice_rules,
      updated_by = excluded.updated_by,
      updated_at = now();

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status
  )
  values (
    metaslim_workspace_id,
    bootstrap_user_id,
    'admin',
    'active'
  )
  on conflict (workspace_id, user_id) do update
  set role = excluded.role,
      status = excluded.status,
      updated_at = now();

  insert into public.workspace_settings (
    workspace_id,
    output_locale,
    ai_enabled,
    facebook_enabled,
    google_trends_enabled,
    updated_by
  )
  values (
    metaslim_workspace_id,
    'zh-MY',
    false,
    false,
    false,
    bootstrap_user_id
  )
  on conflict (workspace_id) do update
  set output_locale = excluded.output_locale,
      updated_by = excluded.updated_by,
      updated_at = now();
end
$$;

commit;

-- Verification query (read-only):
-- select
--   u.id as auth_user_id,
--   u.email,
--   p.locale,
--   w.id as workspace_id,
--   w.name as workspace_name,
--   w.slug,
--   w.country_code,
--   wm.role,
--   wm.status,
--   bp.name as brand_name,
--   bp.voice_rules,
--   ws.output_locale
-- from auth.users u
-- join public.profiles p on p.id = u.id
-- join public.workspace_members wm on wm.user_id = u.id
-- join public.workspaces w on w.id = wm.workspace_id
-- join public.brand_profile bp on bp.workspace_id = w.id
-- join public.workspace_settings ws on ws.workspace_id = w.id
-- where u.id = 'b0f110d8-4dfb-478d-ae23-61c98ee5d7f2'
--   and w.slug = 'metaslim-ai';
