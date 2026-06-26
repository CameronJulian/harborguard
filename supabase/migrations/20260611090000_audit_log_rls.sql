drop policy if exists "authenticated_can_read_audit_logs"
on public.audit_logs;

create policy "users_can_read_own_organization_audit_logs"
on public.audit_logs
for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);
