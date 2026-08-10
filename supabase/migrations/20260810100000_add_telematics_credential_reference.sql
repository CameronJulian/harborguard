alter table public.telematics_integrations
add column if not exists credential_reference text null;

alter table public.telematics_integrations
drop constraint if exists telematics_integrations_credential_reference_not_blank;

alter table public.telematics_integrations
add constraint telematics_integrations_credential_reference_not_blank
check (
  credential_reference is null
  or length(trim(credential_reference)) > 0
);

comment on column public.telematics_integrations.credential_reference is
'Non-secret reference identifying where a provider credential is resolved. This column must never contain an API token, password, secret key, or other credential value.';
