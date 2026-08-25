-- ============================================================
-- HSPP persisted-evidence cryptographic identity immutability
--
-- Purpose:
-- - make the verification-sensitive identity of an existing
--   hspp_evidence row database-immutable;
-- - preserve the existing mutable assessment-state boundary;
-- - close the post-positive read -> Q14x TOCTOU window without
--   duplicating canonical SHA-256 verification logic in Q14x.
--
-- This migration does NOT:
-- - rewrite existing evidence;
-- - change trust/eligibility/assessment state;
-- - persist Q14v;
-- - cease membership;
-- - return evidence to Reservoir;
-- - reconstruct H2;
-- - activate any cron or route.
-- ============================================================

begin;


create or replace function
  public.guard_hspp_evidence_integrity_identity_immutable()
returns trigger
language plpgsql
set search_path = public
as $function$
begin

  if
    new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.protocol_version is distinct from old.protocol_version
    or new.canonicalization_version is distinct from old.canonicalization_version
    or new.source_class is distinct from old.source_class
    or new.source_provider is distinct from old.source_provider
    or new.source_stream is distinct from old.source_stream
    or new.source_message_id is distinct from old.source_message_id
    or new.observed_at is distinct from old.observed_at
    or new.payload_schema_version is distinct from old.payload_schema_version
    or new.normalized_payload is distinct from old.normalized_payload
    or new.integrity_algorithm is distinct from old.integrity_algorithm
    or new.integrity_fingerprint is distinct from old.integrity_fingerprint
    or new.parent_evidence_id is distinct from old.parent_evidence_id
    or new.parent_integrity_fingerprint is distinct from old.parent_integrity_fingerprint
    or new.derivation_type is distinct from old.derivation_type
    or new.derivation_version is distinct from old.derivation_version
  then
    raise exception
      'HSPP evidence cryptographic identity is immutable after persistence';
  end if;

  return new;
end;
$function$;


drop trigger
  if exists hspp_evidence_integrity_identity_immutable
on public.hspp_evidence;


create trigger
  hspp_evidence_integrity_identity_immutable
before update of
  id,
  organization_id,
  protocol_version,
  canonicalization_version,
  source_class,
  source_provider,
  source_stream,
  source_message_id,
  observed_at,
  payload_schema_version,
  normalized_payload,
  integrity_algorithm,
  integrity_fingerprint,
  parent_evidence_id,
  parent_integrity_fingerprint,
  derivation_type,
  derivation_version
on public.hspp_evidence
for each row
execute function
  public.guard_hspp_evidence_integrity_identity_immutable();


comment on function
  public.guard_hspp_evidence_integrity_identity_immutable()
is
  'Guards the persisted HSPP evidence fields that determine cryptographic verification identity. Assessment state remains mutable through its existing controlled writers.';


comment on trigger
  hspp_evidence_integrity_identity_immutable
on public.hspp_evidence
is
  'Rejects mutation of persisted HSPP evidence cryptographic identity while allowing the existing assessment-state columns to remain mutable.';


commit;
