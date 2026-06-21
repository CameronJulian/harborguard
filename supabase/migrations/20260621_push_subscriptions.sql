create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own_org" on public.push_subscriptions;
create policy "push_subscriptions_select_own_org"
on public.push_subscriptions
for select
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

drop policy if exists "push_subscriptions_insert_own_org" on public.push_subscriptions;
create policy "push_subscriptions_insert_own_org"
on public.push_subscriptions
for insert
with check (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

drop policy if exists "push_subscriptions_update_own_org" on public.push_subscriptions;
create policy "push_subscriptions_update_own_org"
on public.push_subscriptions
for update
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
)
with check (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

create index if not exists push_subscriptions_org_idx
on public.push_subscriptions(organization_id);

create index if not exists push_subscriptions_active_idx
on public.push_subscriptions(is_active);

