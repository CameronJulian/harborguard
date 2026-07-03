do $$
begin
  alter publication supabase_realtime add table public.mission_messages;
exception
  when duplicate_object then null;
end $$;
