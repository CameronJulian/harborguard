do $$
begin
  alter publication supabase_realtime add table public.mission_tracking;
exception
  when duplicate_object then null;
end $$;
