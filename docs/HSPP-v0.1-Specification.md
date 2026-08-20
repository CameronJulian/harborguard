# HarborGuard Safety Provenance Protocol (HSPP) v0.1

**Status:** Draft
**Protocol:** HarborGuard Safety Provenance Protocol
**Short name:** HSPP
**Version:** 0.1
**Layer:** HarborGuard application/data layer
**Initial reference implementation:** Traccar telemetry
**Date:** 2026-08-20

---

## 1. Purpose

The HarborGuard Safety Provenance Protocol (HSPP) defines how safety-relevant evidence is identified, integrity-protected, traced, validated, classified, and authorized for downstream use inside HarborGuard.

HSPP is intended to create a consistent evidence contract across HarborGuard data sources and processing stages so that safety-relevant observations can retain verifiable provenance and integrity from ingestion through Crowd Intelligence and eventual machine-learning use.

HSPP is designed to support long-term development of HarborGuard route-risk models using trustworthy, reproducible, and auditable evidence.

---

## 2. Problem Statement

HarborGuard receives safety-relevant information from multiple sources, including:

- road users;
- vehicle telemetry;
- Traccar;
- HERE;
- TomTom;
- Open-Meteo;
- municipal and public-authority intelligence;
- HarborGuard-generated operational evidence;
- future sensors and providers.

HarborGuard already contains mechanisms for provider identity, observation timestamps, receipts, idempotency, validation, provider confidence, corroboration, Crowd Intelligence processing, privacy separation, deterministic replay, ML dataset manifests, SHA-256 dataset fingerprints, immutable training runs, shadow evidence, and model lifecycle provenance.

HSPP defines a common protocol contract connecting these mechanisms without replacing them.

---

## 3. Non-Goals

HSPP does not replace TCP, UDP, IP, HTTP, HTTPS, TLS, QUIC, Traccar, HERE, TomTom, Open-Meteo, or existing HarborGuard provider adapters.

HSPP does not invent new cryptographic algorithms.

HSPP does not claim that cryptographic integrity proves that a physical-world event is true.

HSPP does not automatically authorize evidence for ML training or production Route Safety scoring.

HSPP does not bypass HarborGuard privacy boundaries.

---

## 4. Core Concepts

### 4.1 Integrity

Question: Has the canonical evidence changed after HarborGuard sealed it?

Integrity does not establish physical-world truth.

### 4.2 Provenance

Question: Where did this evidence originate, and what transformations occurred?

### 4.3 Validity

Question: Is the observation structurally and physically plausible?

Examples include valid coordinates, valid timestamps, acceptable GPS movement, supported schemas, and duplicate detection.

### 4.4 Corroboration

Question: Do independent observations support the same real-world claim?

### 4.5 Trust

Question: How much confidence should HarborGuard place in the evidence?

### 4.6 Eligibility

Question: What downstream HarborGuard systems may use this evidence?

Integrity, provenance, validity, trust, corroboration, and eligibility MUST NOT be treated as equivalent concepts.

---

## 5. HSPP Evidence Envelope v0.1

The initial logical evidence envelope contains:

```text
protocol_version
evidence_id

source_class
source_provider
source_message_id

observed_at
received_at

payload_schema_version
normalized_payload

integrity_algorithm
integrity_fingerprint

validation_state
trust_state

operational_eligible
crowd_eligible
training_eligible
validation_eligible

created_at
```

---

## 6. Evidence Identity

Each HSPP evidence item MUST have a stable HarborGuard evidence identifier.

The evidence identifier MUST uniquely identify one HSPP evidence item and MUST NOT be silently reused for unrelated evidence.

External provider identifiers MUST remain separate from the HarborGuard evidence identifier.

Example:

```text
evidence_id = HarborGuard-generated identity
source_provider = traccar
source_message_id = provider position identity
```

---

## 7. Source Provenance

HSPP MUST preserve enough source information to determine where evidence originated.

Initial fields:

```text
source_class
source_provider
source_message_id
```

Example source classes:

```text
telematics
traffic
weather
municipal
road_user
operator
derived
```

---

## 8. Time Semantics

HSPP MUST distinguish observed_at from received_at.

observed_at represents when the source says the observation occurred.

received_at represents when HarborGuard received or created the evidence.

These timestamps MUST NOT be silently substituted for one another.

---

## 9. Canonicalization

HSPP integrity fingerprints MUST be produced from a deterministic canonical representation.

The v0.1 canonical evidence input is conceptually:

```text
protocol_version
canonicalization_version
source_class
source_provider
source_stream
source_message_id
observed_at
payload_schema_version
normalized_payload
```


The HarborGuard-generated `evidence_id` is intentionally excluded from the integrity fingerprint.

The fingerprint identifies the canonical evidence content and source provenance rather than an arbitrary database identity.

`received_at` is also excluded from the fingerprint so deterministic evidence received more than once does not acquire a different content fingerprint solely because HarborGuard observed it at a different ingestion time.

The exact canonicalization algorithm MUST be versioned.

Initial canonicalization identifier:

```text
hspp-canonical-json-v1
```

---

## 10. Integrity Fingerprint

HSPP v0.1 uses SHA-256 as its initial integrity algorithm.

Conceptually:

```text
canonical_evidence = canonicalize(evidence)

integrity_fingerprint = SHA256(canonical_evidence)
```

The fingerprint identifies the exact canonical evidence representation.

The fingerprint MUST NOT be interpreted as proof that the underlying physical-world observation is true.

---

## 11. Integrity States

```text
RECEIVED
IDENTIFIED
VALIDATED
INTEGRITY_SEALED
```

RECEIVED means HarborGuard received the observation.

IDENTIFIED means the required evidence and source identities have been established.

VALIDATED means the applicable structural validation passed.

INTEGRITY_SEALED means HarborGuard generated and persisted the canonical evidence fingerprint.

Future protocol versions may define SOURCE_SIGNED, DEVICE_ATTESTED, or CHAIN_VERIFIED states.

---

## 12. Trust States

Trust is independent from integrity.

```text
UNASSESSED
PLAUSIBLE
CORROBORATED
VERIFIED
```

PLAUSIBLE means the evidence passed the applicable plausibility policy.

CORROBORATED means independent supporting evidence exists under the applicable HarborGuard policy.

VERIFIED means an applicable HarborGuard verification policy accepts the evidence.

VERIFIED does not mean mathematical proof of physical-world truth.

---

## 13. Eligibility

HSPP defines independent downstream-use eligibility.

```text
operational_eligible
crowd_eligible
training_eligible
validation_eligible
```

Successful ingestion MUST NOT automatically make evidence training eligible.

Example:

```text
integrity_state = INTEGRITY_SEALED
trust_state = PLAUSIBLE
operational_eligible = true
crowd_eligible = true
training_eligible = false
validation_eligible = false
```

---

## 14. Crowd Intelligence Privacy Boundary

HSPP MUST preserve the existing HarborGuard Crowd Intelligence privacy boundary.

Private operational evidence may contain organization, vehicle, trip, user, driver, or provider-device identities where required.

Those private identities MUST NOT automatically enter shared Crowd Intelligence evidence.

HSPP SHOULD eventually provide privacy-preserving integrity lineage between private evidence and anonymous Crowd evidence.

---

## 15. Transformation Lineage

HSPP SHOULD identify meaningful transformations applied to evidence.

Conceptual example:

```text
traccar_position_v1
  -> traccar_normalization_v1
  -> vehicle_location_validation_v1
  -> crowd_privacy_transform_v1
```

Formal transformation-chain persistence is deferred beyond the initial v0.1 reference implementation.

---

## 16. Corroboration

HSPP MUST distinguish independent-source corroboration from repeated observations by the same source.

For example, HERE plus TomTom may represent independent corroboration, while repeated HERE refreshes do not necessarily represent independent corroboration.

HSPP does not replace existing HarborGuard provider confidence, confirmation, or freshness mechanisms.

---

## 17. ML Training Boundary

HSPP evidence MUST NOT automatically enter machine-learning training datasets.

Training eligibility SHOULD depend on an explicit versioned policy.

Conceptual lifecycle:

```text
HSPP evidence
  -> validation
  -> trust assessment
  -> journey and outcome association
  -> training eligibility
  -> training examples
  -> dataset manifest
  -> dataset fingerprint
  -> training run
  -> model
```

---

## 18. First Reference Implementation

The first HSPP reference implementation SHOULD use Traccar telemetry only.

```text
Traccar position
  -> existing normalization
  -> HSPP evidence creation
  -> canonicalization
  -> SHA-256 fingerprint
  -> existing telematics receipt lifecycle
  -> existing vehicle resolution
  -> existing location processing
```

The first implementation MUST NOT modify production Route Safety scoring.

The first implementation MUST NOT enable Crowd-derived production scoring.

The first implementation MUST NOT automatically alter ML training eligibility.

---

## 19. Compatibility

HSPP SHOULD reuse rather than duplicate existing HarborGuard mechanisms including:

- telematics message receipts;
- traffic collection receipts;
- provider reconciliation;
- Crowd pipeline receipts;
- Crowd aggregation integrity;
- replay and recovery;
- route-risk dataset manifests;
- immutable training runs;
- route-risk model lifecycle;
- shadow evidence cycles.

---

## 20. Initial Threat Model

HSPP v0.1 is intended to improve detection or control of:

- accidental evidence mutation;
- duplicate processing;
- ambiguous source identity;
- lost provenance;
- malformed timestamps;
- invalid coordinates;
- unsupported schema versions;
- untracked transformations;
- unsafe ML dataset inclusion.

HSPP v0.1 does not yet guarantee protection against compromised providers, compromised endpoint devices, sensor deception, or sophisticated cryptographic attacks.

---

## 21. Future Capabilities

Possible future capabilities include:

```text
source_signature
device_signature
previous_evidence_hash
journey_hash_chain
journey_merkle_root
hardware_attestation
key_rotation
provider_certificate_identity
privacy_preserving_provenance
dataset_to_source_evidence_proofs
```

These are roadmap concepts and MUST NOT be treated as implemented functionality.

---

## 22. Versioning

Every HSPP evidence item MUST identify its protocol version.

Initial protocol version:

```text
0.1
```

Breaking evidence-contract changes require a new protocol version.

Canonicalization rules MUST also be independently versioned.

---

## 23. Governing Design Principle

Preserve enough evidence identity, integrity, provenance, validation state, trust state, privacy context, and downstream eligibility to make HarborGuard safety evidence auditable and reproducible without confusing cryptographic integrity with physical-world truth.

---

## 24. Next Engineering Step

Before implementing persistence, perform a focused insertion-point audit of:

```text
lib/fleet/processVehicleLocationUpdate.ts
vehicle_locations database schema
telematics message receipt schema and RPCs
vehicle location archive manifests
relevant tests
```

The goal is to determine where HSPP evidence should be created and persisted without duplicating existing HarborGuard data.

No production scoring changes are authorized by this specification.

---

## 25. Current Status

HSPP v0.1 is currently a design specification.

It is not yet a deployed protocol, Internet standard, industry standard, patent determination, or production security guarantee.

The next milestone is the focused implementation-boundary audit followed by a single Traccar reference implementation.
