alter table public.telematics_message_receipts
add column if not exists processing_status text not null default 'processed';

alter table public.telematics_message_receipts
add column if not exists claimed_at timestamptz null;

alter table public.telematics_message_receipts
add column if not exists processed_at timestamptz null;

alter table public.telematics_message_receipts
add column if not exists last_failure_at timestamptz null;

alter table public.telematics_message_receipts
add column if not exists last_failure_message text null;

alter table public.telematics_message_receipts
add column if not exists attempt_count integer not null default 1;

alter table public.telematics_message_receipts
drop constraint if exists
  telematics_message_receipts_processing_status_check;

alter table public.telematics_message_receipts
add constraint
  telematics_message_receipts_processing_status_check
check (
  processing_status in (
    'processing',
    'processed',
    'failed'
  )
);

alter table public.telematics_message_receipts
drop constraint if exists
  telematics_message_receipts_attempt_count_check;

alter table public.telematics_message_receipts
add constraint
  telematics_message_receipts_attempt_count_check
check (
  attempt_count >= 1
);

update public.telematics_message_receipts
set
  processed_at = coalesce(
    processed_at,
    received_at
  )
where
  processing_status = 'processed'
  and processed_at is null;

create index if not exists
  telematics_message_receipts_processing_status_idx
on public.telematics_message_receipts (
  organization_id,
  provider,
  stream,
  processing_status,
  received_at desc
);
