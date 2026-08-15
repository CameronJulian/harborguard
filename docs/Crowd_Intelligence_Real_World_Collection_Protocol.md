# Crowd Intelligence Real-World Collection Protocol

## Purpose

This runbook defines the repeatable real-world journey collection procedure for HarborGuard Crowd Intelligence.

Its purpose is to collect legitimate journey evidence through HarborGuard's normal trip and location lifecycle, verify that the completed journey reaches the privacy-separated Crowd Intelligence pipeline, and distinguish collection-quality outcomes from pipeline failures.

This protocol does not introduce a new Crowd processing path. It uses the existing HarborGuard journey lifecycle, anonymous Crowd exposure pipeline, pipeline receipts, replay/recovery helpers, aggregation integrity monitoring, and retention controls.

This protocol does not enable Crowd-derived production Route Safety scoring, change statistical sufficiency thresholds, change retention duration policy, or change normal vehicle-trip lifecycle behavior.

## 1. Operational principles

A valid collection run must use HarborGuard's normal production-style journey path.

Do not:

- fabricate production GPS coordinates;
- write directly to `crowd_segment_traversals`;
- write directly to `crowd_segment_exposure_stats`;
- write directly to `crowd_journey_pipeline_receipts`;
- manually mark Crowd processing as successful;
- modify trip timestamps solely to make a journey eligible;
- bypass normal trip completion;
- treat a skipped journey as automatically equivalent to a pipeline failure.

The Crowd Intelligence layer must remain a derived, privacy-separated learning layer above legitimate trip and location evidence.

## 2. Preconditions

Before beginning a collection run, verify:

1. HarborGuard is running against the intended environment.
2. The operator is authenticated through the normal HarborGuard application.
3. A legitimate HarborGuard vehicle and journey are available.
4. The vehicle/journey can be tracked through the normal mobile tracker or driver tracking flow.
5. Device location services are enabled.
6. Browser location permission is granted.
7. GPS readings are physically plausible.
8. The trip has not already been completed.
9. Crowd Intelligence operational health is not reporting an active infrastructure failure that would invalidate the run.
10. The objective is evidence collection, not route-risk score tuning.

If any prerequisite cannot be satisfied, do not fabricate replacement production evidence.

## 3. Journey start

Start the journey through HarborGuard's normal journey lifecycle.

Confirm that:

- the trip becomes active;
- `actual_departure` is populated by normal application behavior;
- the trip is not already `delivered`;
- location collection begins through the normal tracker path.

Do not manually populate `actual_departure` unless a separately approved recovery procedure explicitly requires it.

## 4. Real-world GPS collection

Perform the journey using real device location evidence.

During the collection run:

- keep location permission enabled;
- keep the HarborGuard tracking flow active;
- physically move through the journey;
- allow multiple location observations to be recorded;
- avoid testing with a stationary device when the purpose is traversal evidence;
- avoid repeatedly submitting identical coordinates;
- avoid coordinates outside valid latitude/longitude ranges;
- do not use synthetic coordinate scripts against production.

A Crowd journey requires usable trip-linked location evidence. At least two valid location observations are necessary for a meaningful movement segment, but collect more than the minimum whenever possible.

Location-quality filtering may reject inaccurate, duplicate, implausible, or otherwise unusable observations.

## 5. Journey completion

Complete the journey through HarborGuard's normal completion control.

Confirm that:

- trip status becomes `delivered`;
- `actual_arrival` is populated;
- `actual_arrival` is later than or equal to `actual_departure`;
- no direct Crowd-table mutation was performed.

The Crowd pipeline must observe the completed trip through the existing completed-trip lifecycle.

## 6. Expected Crowd processing outcomes

### accepted

The journey produced valid anonymous traversal evidence.

Expected behavior:

- a pipeline receipt exists;
- anonymous traversal evidence may be created;
- relevant aggregate buckets are refreshed;
- aggregation integrity remains healthy.

### skipped

A skipped result is not automatically a system failure.

Legitimate skip reasons can include:

- `trip_not_delivered`;
- `invalid_trip_time_order`;
- `insufficient_location_points`.

For a real-world collection run, `insufficient_location_points` usually indicates collection-quality failure rather than Crowd pipeline infrastructure failure.

### failed

A failed receipt or replay result indicates Crowd processing encountered an error that prevented deterministic completion.

This requires investigation before the collection run can be considered successful.

## 7. Post-journey verification

After completing the journey, inspect the existing Crowd Intelligence operational health surface.

Verify:

- the journey receipt was recorded;
- the processing outcome is visible;
- accepted/skipped/failed counts are plausible;
- no new Crowd pipeline failure is reported;
- aggregate freshness is healthy;
- missing aggregate bucket count is zero;
- orphan aggregate bucket count is zero;
- traversal-count mismatch count is zero;
- anonymous-journey mismatch count is zero;
- sample-count mismatch count is zero;
- overall Crowd aggregation integrity remains healthy.

## 8. Privacy verification

The shared Crowd layer must remain privacy-separated.

Do not place the following into Crowd evidence or ordinary Crowd collection records:

- raw trip IDs in Crowd evidence;
- vehicle IDs in Crowd evidence;
- organization IDs in Crowd evidence;
- user IDs in Crowd evidence;
- driver IDs in Crowd evidence;
- unnecessary raw coordinates;
- anonymous `trip_token` values.

Raw journey and location data remain in their normal private HarborGuard source tables.

## 9. Replay and recovery

If the trip completed normally but the Crowd receipt is missing, failed, or requires deterministic recovery, use the existing replay path rather than manually repairing Crowd tables.

For a single journey, use:

`reprocessCrowdJourney(...)`

For a historical range, use:

`reprocessCrowdJourneyHistory(...)`

Replay must not:

- change trip lifecycle state;
- create duplicate traversal evidence;
- multiply aggregate evidence;
- expose raw Crowd identity.

A repeated replay should remain idempotent.

## 10. Collection-run acceptance criteria

Record **PASS - ACCEPTED** when:

- a legitimate journey was used;
- the trip obtained a real `actual_departure`;
- real GPS observations were collected;
- the trip completed normally as `delivered`;
- `actual_arrival` was populated;
- the Crowd outcome is `accepted`;
- no Crowd processing failure is present;
- aggregate integrity remains healthy;
- no privacy boundary was bypassed.

Record **PASS - SKIPPED / COLLECTION QUALITY** when:

- the normal journey lifecycle completed correctly;
- the Crowd pipeline produced a deterministic `skipped` result;
- the reason is understood and consistent with evidence quality;
- aggregation integrity remains healthy;
- there is no infrastructure failure.

Record **FAIL - PIPELINE** when:

- Crowd processing reports a failed outcome;
- receipt persistence fails;
- replay cannot converge;
- aggregate integrity becomes unhealthy;
- duplicate evidence is produced;
- normal trip lifecycle data must be manually altered to make Crowd processing succeed.

## 11. Minimum collection-run record

Record only operationally necessary metadata:

- collection date/time;
- environment;
- operator/test label;
- GPS permission available;
- trip reached active state;
- `actual_departure` present;
- trip reached `delivered`;
- `actual_arrival` present;
- approximate usable-location count if known;
- Crowd receipt outcome;
- skip reason if applicable;
- traversal-row delta;
- aggregate-row delta;
- final integrity status;
- whether replay was required;
- final PASS/FAIL classification.

Do not include anonymous Crowd tokens or unnecessary raw identifiers.

## 12. Repeated collection guidance

One successful journey is useful for validating the pipeline, but it does not establish statistical reliability.

Future real-world collection should deliberately accumulate variation across:

- different routes;
- different road segments;
- different times of day;
- different days;
- different vehicles where operationally appropriate;
- different traffic conditions;
- different journey lengths.

This does not establish statistical reliability and must not be interpreted as permission to enable production Crowd-derived Route Safety weighting.

## 13. Retention boundary

This protocol does not define the legal or business retention duration for Crowd Intelligence evidence.

The existing Crowd retention primitive accepts an explicit cutoff and must be invoked only according to an approved retention policy.

Collection operators must not invent a retention duration during a field run.

## 14. Stop conditions

Stop the collection run if:

- GPS permission is unavailable;
- location evidence is obviously invalid;
- the wrong vehicle or trip is active;
- the trip cannot enter the normal lifecycle;
- the operator would need to fabricate coordinates;
- the operator would need to manually edit Crowd storage;
- Crowd integrity is already unhealthy before the run;
- an unrelated production incident makes continued field testing inappropriate.

## 15. Completion checklist

- [ ] Legitimate journey used.
- [ ] Normal HarborGuard trip lifecycle used.
- [ ] GPS permission available.
- [ ] Real movement observations collected.
- [ ] `actual_departure` present.
- [ ] Trip completed as `delivered`.
- [ ] `actual_arrival` present.
- [ ] Crowd receipt present.
- [ ] Receipt outcome classified.
- [ ] Skip reason reviewed if applicable.
- [ ] No failed Crowd processing remains unresolved.
- [ ] Traversal/aggregate effects reviewed.
- [ ] Crowd aggregation integrity healthy.
- [ ] No direct Crowd-table repair performed.
- [ ] Privacy boundary preserved.
- [ ] Replay used only if required.
- [ ] Final run classification recorded.

## 16. Scope boundary

C-1D10 establishes the operational real-world collection protocol only.

It does not:

- add a new telemetry ingestion path;
- add a new Crowd processing implementation;
- add a new database schema;
- change Crowd aggregation;
- change retention policy;
- change Route Safety scoring;
- enable Crowd-derived production scoring;
- alter statistical sufficiency requirements;
- replace existing replay or recovery primitives.
