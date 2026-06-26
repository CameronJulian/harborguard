drop policy if exists "admins_can_view_organizations" on public.organizations;
drop policy if exists "admins_can_update_organizations" on public.organizations;
drop policy if exists "admins_can_create_organizations" on public.organizations;

create policy "platform_admins_can_view_organizations"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'super_admin')
  )
);

create policy "platform_admins_can_update_organizations"
on public.organizations
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'super_admin')
  )
);

create policy "platform_admins_can_create_organizations"
on public.organizations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'super_admin')
  )
);
