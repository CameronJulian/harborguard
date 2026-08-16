# HarborGuard Engineering Master

**Document purpose:** Single source of truth for continuing HarborGuard development in a new ChatGPT conversation, with another developer, or after a long interruption.

**Project owner:** Cameron Julian Hendrick
**Repository:** `C:\Users\cameron\harborguard`
**Primary branch:** `main`
**Current active development branch:** `feature/road-risk-layer-controls`
**Latest verified feature commit:** `5e32b8a`
**Last updated:** 2026-07-28
**Current status:** Live weather intelligence is integrated into Route Safety prediction and displayed in the Command Center. The latest verified feature is complete and pushed.

---

# 1. How to use this document

When starting a new ChatGPT conversation:

1. Upload this file.
2. Say: **â€œUse this HarborGuard Engineering Master as the source of truth. Audit the current codebase before proposing changes. Continue from the Current Status and Next Recommended Work sections.â€**
3. Upload any newer audit files, migration files, screenshots, or logs relevant to the next task.
4. Do not assume this document is perfectly current if code has changed since the last update. Re-audit the repository before implementation.

This document is a project-state snapshot, not a replacement for Git, Supabase migrations, production logs, or source-code review.

---

# 2. Product vision

HarborGuard is a safety-focused fleet, route-intelligence, and operational command platform.

Its long-term purpose is broader than fleet tracking. The target vision is a crowd-sourced route-safety network that learns from journeys and operational events, including:

- collisions;
- smash-and-grab and crime hotspots;
- roadblocks;
- protests;
- traffic-light outages;
- dangerous road conditions;
- dashcam observations;
- traffic flow;
- verified user reports;
- fleet and vehicle movement history.

The platform should use accumulated intelligence to warn drivers, assist dispatchers, rank route risk, recommend safer routes, and create a defensible dataset that becomes more valuable as more users contribute.

A key motivation is that conventional navigation systems may optimize primarily for time and distance while sending drivers through dangerous areas. HarborGuard aims to make safety a first-class routing concern.

---

# 3. Core development principles

All future HarborGuard development must follow this sequence:

1. Audit the existing implementation.
2. Inspect the exact code, API route, database schema, migrations, UI, and integration points.
3. Identify one precise gap.
4. Make one focused change.
5. Avoid unrelated edits.
6. Verify the change.
7. Run the production build.
8. Commit the focused change.
9. Push the branch.
10. Test end to end.
11. Merge only after validation.
12. Update this master document.

Do not add a feature merely because it appears missing in a screenshot or conversation. Confirm whether it already exists in the repository.

---

# 4. Technology stack

## Application

- Next.js 16.2.7
- React
- TypeScript
- Turbopack
- App Router
- Server API routes under `app/api`

## Backend and data

- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime where applicable
- Row Level Security
- PostgreSQL functions/RPCs
- SQL migrations under `supabase/migrations`

## Hosting and infrastructure

- Vercel planned/used for deployment
- Supabase hosted project
- Supabase project region: West EU (Ireland), `eu-west-1`
- Current Supabase compute observed: Nano / Free tier
- Local development on Windows PowerShell

## Optional and external services

- Google Routes API
- OpenRouteService
- HERE
- TomTom
- Upstash Redis for rate limiting
- Sentry
- Ollama local vision models
- Samsara planned for dashcam/media integration
- Push notifications
- Resend or equivalent for reports/email where configured

---

# 5. Repository and local environment

## Local repository

```text
C:\Users\cameron\harborguard
```

## Common commands

```powershell
npm run dev
npm run build
git status
git diff
git add <file>
git commit -m "<message>"
git push origin <branch>
```

## Current Git state at this snapshot

The feature branch `feature/use-road-risk-segments` was successfully merged into `main`.

Latest verified main commit:

```text
c278e9d
Use aggregated road risk segments in route prediction
```

Previous related commit:

```text
93a7cee
Aggregate verified route safety intelligence
```

---

# 6. High-level application areas

The project includes the following major user-facing pages and operational areas.

## Main pages

- `/`
- `/dashboard`
- `/command-center`
- `/fleet`
- `/fleet/vehicles`
- `/trips`
- `/analytics`
- `/admin`
- `/admin/organizations`
- `/admin/audit-logs`
- `/admin/invitations`
- `/mobile-tracker`
- `/mobile-dispatcher`
- `/driver`
- `/incidents`
- `/incidents/[id]`
- `/route-replay`
- `/route-safety`
- `/risk-dashboard`
- `/road-intelligence`
- `/geofences`
- `/vehicle-alerts`
- `/pricing`
- `/billing`
- `/batches`
- `/report-admin`
- `/report-history`
- `/report-settings`
- `/fleet-time-machine`
- `/onboarding`

The build completed successfully with 118 generated routes/pages during the most recent validation.

---

# 7. Important API areas

The codebase includes a large API surface. Key groups include:

## Fleet

- `/api/fleet/live`
- `/api/fleet/vehicles`
- `/api/fleet/vehicles/[id]`
- `/api/fleet/trips`
- `/api/fleet/replay`
- `/api/fleet/update-location`
- `/api/fleet/start-trip`
- `/api/fleet/panic`
- `/api/fleet/alerts`
- `/api/fleet/acknowledge-alert`
- `/api/fleet/resolve-alert`
- `/api/fleet/notify-alert`
- `/api/fleet/predict-threats`
- `/api/fleet/predict-eta`
- `/api/fleet/optimization`
- `/api/fleet/time-machine`
- `/api/fleet/digital-twin`
- `/api/fleet/health`
- `/api/fleet/assign-route`
- `/api/fleet/route-assignments`
- `/api/fleet/operations-summary`
- `/api/fleet/operations-timeline`

## Route safety and intelligence

- `/api/route-safety/active`
- `/api/route-safety/nearby`
- `/api/route-safety/report`
- `/api/route-safety/verify`
- `/api/route-safety/predict`
- `/api/route-safety/reroute`
- `/api/route-safety/escalate`
- `/api/route-safety/import-csv`
- `/api/route-safety/ingest/here`
- `/api/route-safety/ingest/tomtom`
- `/api/road-incidents`
- `/api/traffic-intelligence`

## Command center

- `/api/command-center/accident-detection`
- `/api/command-center/anpr`
- `/api/command-center/assistant`
- `/api/command-center/automation`
- `/api/command-center/cctv`
- `/api/command-center/computer-vision`
- `/api/command-center/correlations`
- `/api/command-center/dashcam`
- `/api/command-center/escalations`
- `/api/command-center/insurance`
- `/api/command-center/mission-queue`
- `/api/command-center/notifications`
- `/api/command-center/notifications/read`
- `/api/command-center/notifications/resolve`
- `/api/command-center/predictive-incidents`
- `/api/command-center/prescriptive-response`
- `/api/command-center/traffic-flow`
- `/api/command-center/vision-events/review`

## Dispatch and missions

- `/api/dispatch/assignment`
- `/api/dispatch/missions`
- `/api/dispatch/missions/[id]`
- `/api/dispatch/missions/[id]/evidence`
- `/api/dispatch/missions/[id]/messages`
- `/api/dispatch/missions/[id]/notes`
- `/api/dispatch/missions/[id]/timeline`
- `/api/dispatch/missions/[id]/tracking`
- `/api/dispatch/tracking`
- `/api/dispatcher/recommendations`

## Incidents and operations

- `/api/incidents/command`
- `/api/incidents/investigation`
- `/api/incidents/resolve`
- `/api/operations/autonomous`
- `/api/operations/story`

## Reports

- `/api/reports/run`
- `/api/reports/send`
- `/api/reports/scheduled`
- `/api/reports/cron`
- `/api/reports/retry`
- `/api/reports/retry-one`
- `/api/reports/toggle-subscription`

## Other

- `/api/geofences`
- `/api/mobile/missions`
- `/api/onboarding/complete`
- `/api/organization-invitations`
- `/api/push/subscribe`
- `/api/push/send`
- `/api/push/test`
- `/api/weather/current`
- `/api/copilot`
- `/api/ai/shift-summary`
- `/api/billing/professional`
- `/api/payfast/notify`
- `/api/batches`

---

# 8. Database areas

Known and heavily used tables include:

- `organizations`
- `profiles`
- `vehicles`
- `vehicle_locations`
- `vehicle_stops`
- `vehicle_alerts`
- `vehicle_trips`
- `trips`
- `route_assignments`
- `route_safety_alerts`
- `route_intelligence`
- `road_risk_segments`
- `road_risk_segment_events`
- `route_safety_escalation_logs`
- `incidents`
- `geofences`
- `drivers`
- `vision_events`
- `dispatch_missions`
- `mission_tracking`
- `organization_invitations`
- `push_subscriptions`
- report-related tables
- audit and notification tables

This list must be refreshed by inspecting the current Supabase schema and migrations before any database-wide documentation is treated as complete.

---

# 9. Authentication and organization model

Server-side organization authorization is centralized in:

```text
lib/server-auth.ts
```

The helper `requireOrganization()`:

1. Reads the bearer token or `sb-access-token` cookie.
2. Creates a Supabase client with the bearer token.
3. Validates the user using `supabase.auth.getUser(accessToken)`.
4. Reads the user's `profiles` record.
5. Requires `organization_id`.
6. Loads organization subscription details.
7. Requires either an active subscription or an unexpired trial.
8. Returns `supabase`, `user`, `profile`, `organizationId`, `organization`, and `role`.

A stale browser access token previously caused `401 Unauthorized` during testing. Deleting the stale `sb-access-token` and `sb-refresh-token` cookies, reloading, and signing in again fixed the issue.

---

# 10. Security controls already implemented

Known security and access-control improvements include:

- organization-scoped API access through `requireOrganization`;
- role and permission checks;
- RLS policies;
- Zod input validation in selected APIs;
- rate limiting in sensitive endpoints;
- production disabling of `/api/push/test`;
- subscription access checks;
- organization filtering on database queries;
- restricted administrative routes;
- server-side Supabase authentication.

Security must continue to be audited route by route. Do not assume every older API route has equal coverage.

---

# 11. Completed core features

## Authentication and tenancy

- Supabase authentication
- Organization membership
- Role-based access
- Organization-scoped queries
- Subscription/trial checks
- Organization invitations
- Onboarding flows

## Fleet management

- Vehicle records
- Vehicle types
- Vehicle list and detail APIs
- Live vehicle tracking
- Vehicle location updates
- Trip creation and history
- Vehicle alerts
- Fleet health
- Fleet optimization
- Time-machine and replay capabilities
- Route assignments
- Operations summaries and timelines

## Mobile and driver operations

- Mobile tracker
- Driver-oriented pages
- Panic/emergency workflow
- Mission access
- Location updates
- Route acknowledgement
- Push subscriptions

## Command center

- Executive dashboard
- Dashcam workflow
- CCTV/ANPR modules
- Computer vision
- Accident detection
- Traffic-flow intelligence
- Predictive incidents
- Prescriptive response
- Escalation management
- Mission queue
- Notifications
- Correlations
- Insurance-related workflow
- AI assistant/copilot areas

## Incident management

- Incident creation and tracking
- Incident detail pages
- Investigation
- Resolution
- Evidence and command actions
- Mission linkage
- Escalation logs

## Route safety

- Active route alerts
- Nearby alerts
- User reports
- Verification
- Import from CSV
- External provider ingestion routes
- Prediction
- Rerouting
- Escalation
- Driver warnings
- Route-risk scoring

## Reporting and administration

- Scheduled reports
- Manual report runs
- Sending
- Retry handling
- Report settings and history
- Organization administration
- Audit logs
- Billing/pricing pages
- Batches

## Weather

- Weather subsystem restored
- Weather provider abstraction
- Open-Meteo provider integration
- `/api/weather/current`
- Route Safety prediction weather enrichment
- Non-fatal weather error handling
- Live Route Weather panel in the Command Center
- Weather risk score, level, and explanations displayed to dispatchers

## Geofences

- Geofence CRUD/API area
- RLS for organization-aware access
- Admin read capabilities where designed

---

# 12. Vision and dashcam status

## Local vision

Development hardware:

- Intel Core i7-12700H
- 32 GB RAM
- NVIDIA GeForce RTX 3060 Laptop GPU

Ollama:

- Version observed: 0.31.2
- Models pulled: `qwen2.5vl:3b`, `gemma3:4b`

The local flow is intended to request or receive a still image, submit it to the local model, detect hazards or road conditions, store findings, and feed reviewed/verified intelligence into route safety.

## Samsara integration plan

Planned media workflow:

1. HarborGuard requests a still image.
2. Samsara returns a retrieval ID.
3. HarborGuard polls retrieval status.
4. Samsara returns an expiring image URL.
5. HarborGuard sends the image to the configured vision provider.
6. HarborGuard stores/reviews resulting detections.

Planned environment values:

```text
DASHCAM_PROVIDER=samsara
SAMSARA_API_BASE_URL=https://api.samsara.com
```

Required scopes discussed:

- Read Vehicles
- Read Media Retrieval
- Create Media Retrieval

Samsara production/sandbox access was still in progress at the time of this snapshot.

---

# 13. Most recent completed milestone: aggregated road-risk prediction

## Objective

Change route prediction so that it consumes aggregated road-risk segments instead of relying only on raw historical route intelligence.

## Relevant database objects

Verified to exist in Supabase:

- `route_intelligence`
- `road_risk_segments`
- `road_risk_segment_events`
- `aggregate_road_risk_intelligence(...)`

## Aggregation behavior already implemented

The aggregation RPC was previously audited and found to include:

- spatial/grid segment keys;
- idempotency;
- advisory locking;
- duplicate protection;
- event ledger storage;
- weighted risk scoring;
- verification counts;
- per-event-type counters;
- capped risk scores.

## API change

File:

```text
app/api/route-safety/predict/route.ts
```

The endpoint now:

1. Loads active `route_safety_alerts`.
2. Loads verified `route_intelligence`.
3. Loads organization-scoped `road_risk_segments`.
4. Converts segments into the common threat model.
5. Chooses aggregated segments when available.
6. Falls back to raw intelligence if no segments exist.
7. Uses the precomputed segment `risk_score`.
8. Avoids double-counting aggregated and raw historical intelligence.

## Validation evidence

A row in `road_risk_segments` was verified with:

```text
id: bfc70435-25b6-4e60-ae3d-81f9bbc7dfce
risk_score: 32
verification_count: 2
collision_count: 1
other_event_count: 1
latitude: -33.9461394784918
longitude: 18.5873675859438
```

The authenticated request to `POST /api/route-safety/predict` returned HTTP `200`.

The matching threat contained:

```text
id: bfc70435-25b6-4e60-ae3d-81f9bbc7dfce
source: road_risk_segments
score: 32
severity: low
type: accident
title: Aggregated road-risk segment
verificationCount: 2
freshness: fresh
isLikelyOnRoute: true
radiusMeters: 150
```

This proved the complete flow:

```text
Verified event
  -> route_intelligence
  -> aggregate_road_risk_intelligence()
  -> road_risk_segments
  -> /api/route-safety/predict
  -> driver warning and risk score
```

## Git history for this milestone

```text
93a7cee
Aggregate verified route safety intelligence

c278e9d
Use aggregated road risk segments in route prediction
```

The feature branch was merged into `main` using a fast-forward merge and pushed successfully.

---

# 14. Supabase incident observed during testing

During validation, Supabase temporarily returned:

```text
Connection terminated due to connection timeout
```

Affected areas included SQL Editor, Table Editor, Schema Visualizer, and HarborGuard fetches.

The Infrastructure page showed:

```text
89% of Disk IO Budget consumed
```

The project was restarted and service later recovered.

Important conclusions:

- The project had not expired.
- The issue affected both Studio and application connectivity.
- The Free/Nano instance may experience resource pressure.
- The Disk I/O budget warning should be monitored.

Recommended future production readiness work:

- inspect slow queries;
- add or review indexes;
- review high-frequency polling;
- reduce unnecessary writes;
- optimize dashboards that issue many parallel requests;
- review logs and Supabase Advisors;
- move to paid compute before real customer production use.

---

# 15. Known issues and technical debt

## Code formatting

The latest route-prediction change compiled and passed production build, but the inserted code had inconsistent indentation in the diff. It should be formatted with the project's formatter in a future cleanup-only commit if not already corrected.

## Prediction behavior

The API can produce a total route risk score of 100 because multiple threats are summed and capped. Future work should review threat overlap, duplicate physical hazards, decay, confidence, and spatial de-duplication.

## Aggregated segment model

Potential refinements:

- weighted dominant type;
- multi-type segment metadata;
- explainability fields;
- source breakdown;
- user reputation weighting;
- time decay;
- verification quality;
- event expiry and recovery.

## Database/resource pressure

Supabase Nano/Free resource constraints may cause timeouts. This is not suitable for live customer production without load testing and an upgrade plan.

## External providers

- TomTom traffic endpoints previously returned `403` on the available plan.
- HERE trial/payment access remained limited.
- Samsara access was still pending.
- Vision provider may still use mock/local mode depending on `.env.local`.

## UI/dashboard

The dashboard showed chart sizing warnings:

```text
The width(-1) and height(-1) of chart should be greater than 0
```

The dashboard also showed an installation prompt warning related to `beforeinstallprompt`.

---

# 16. Current progress summary

## Fully completed and verified

- Core Next.js/Supabase application structure
- Authentication
- Organization scoping
- Major fleet APIs
- Vehicle and trip management
- Live tracking
- Route replay
- Alerting
- Incident workflows
- Geofences
- Command center
- Vision-event review structure
- Route-safety reporting and verification
- Road-intelligence persistence
- Aggregation RPC
- Aggregated road-risk segments
- Prediction consuming aggregated segments
- Production build
- Git commit
- Feature branch push
- End-to-end validation
- Merge into `main`
- Push to `origin/main`

## Partially complete or provider-dependent

- Samsara media retrieval
- Fully productionized dashcam pipeline
- External traffic-provider ingestion
- Live production route rerouting using all aggregated intelligence
- Production billing/subscriptions
- Production monitoring and scaling
- Public launch readiness
- Full mobile deployment
- Customer onboarding and support operations
- Formal privacy/security/compliance package

## Current exact position

HarborGuard now has a working backend foundation where verified road events are aggregated into persistent road-risk segments and those segments influence route predictions.

The next work should build on this foundation instead of reworking it.

---

# 17. Recommended next roadmap items

The next item must still be selected after a fresh audit.

## Option 1: Aggregated risk visualization

Display `road_risk_segments` on the route-safety or road-intelligence map.

Expected user value:

- shows where risk has accumulated;
- proves crowd intelligence visually;
- helps operators understand why a route is classified as risky;
- provides an immediate UI result from the completed backend milestone.

Audit targets:

- route-safety page;
- map component;
- existing alert markers;
- road-intelligence page;
- nearby/active APIs;
- whether segment data already appears in any UI.

## Option 2: Rerouting using aggregated segments

Audit `/api/route-safety/reroute` and ensure it actively avoids high-risk aggregated segments rather than relying only on individual alerts.

## Option 3: Segment lifecycle and decay

Introduce controlled risk decay and event ageing.

## Option 4: Performance stabilization

Before significant new load:

- review Supabase query performance;
- identify high-write tables;
- inspect missing indexes;
- review polling;
- inspect parallel dashboard requests;
- resolve Disk I/O consumption.

## Recommended immediate next feature

Start with an audit of aggregated risk visualization on the map, unless performance analysis reveals an urgent production issue.

---

# 18. Suggested roadmap phases

## Phase A: Core platform foundation

Status: substantially complete

- organizations;
- users and roles;
- fleet;
- tracking;
- trips;
- alerts;
- incidents;
- command center;
- reports;
- geofences;
- route safety;
- road intelligence.

## Phase B: Safety intelligence network

Status: in progress

- verified reports;
- route intelligence;
- aggregation;
- segment scoring;
- prediction consumption;
- map visualization;
- risk decay;
- reputation/confidence weighting;
- reroute avoidance.

## Phase C: Vision and automated sensing

Status: partially complete

- local vision;
- vision events;
- review workflow;
- dashcam provider integration;
- Samsara retrieval;
- automated hazard creation;
- model confidence and evidence.

## Phase D: Production readiness

Status: not complete

- performance/load testing;
- paid infrastructure;
- monitoring;
- alerting;
- backup/restore;
- operational support;
- legal/privacy;
- security review;
- billing;
- customer onboarding;
- SLA and incident response.

## Phase E: Launch and scale

Status: future

- pilot customers;
- mobile packaging;
- customer dashboards;
- external safety-data partnerships;
- API product;
- regional expansion;
- data-network effects.

---

# 19. Files and audits created during development

Known generated audit/state files include:

- `Crowd-Intelligence-Audit.txt`
- `Crowd-Intelligence-Audit-Clean.txt`
- `Dashcam-Vision-Location-Audit.txt`
- `Road-Risk-Aggregation-Design-Audit.txt`
- `Road-Risk-Review-Integration-Audit.txt`
- `Road-Segment-Risk-Aggregation-Audit.txt`
- `Route-Intelligence-API.txt`
- `Route-Intelligence-Audit.txt`
- `Route-Intelligence-Database.txt`
- `Route-Intelligence-Writer-Reader-Audit.txt`
- `Route-Safety-Predict-Full-Audit.txt`
- `Vehicle-Selector-Audit.txt`
- `Vision-Event-Location-Audit.txt`
- `Vision-Events-Usage.txt`
- `Vision-Review-Full-Audit.txt`
- `VisionRequestAudit.txt`
- `Weather-System-Audit.txt`
- `HarborGuard-Architecture-Report.md`
- `HarborGuard-Architecture-Data.json`
- `HarborGuard-Tree.txt`
- `HarborGuard-FullFileList.txt`
- `HarborGuard-Inventory.csv`

Many of these were intentionally left untracked. They are useful for analysis but should not be committed automatically.

Backup files with `.bak` extensions also exist and should not be added to Git unless deliberately required.

---

# 20. Important migrations observed

Known migration files include:

- `20260606000000_baseline_schema.sql`
- `20260630145900_current_user_org_id.sql`
- `20260719150000_vision_event_location.sql`
- `20260719220000_add_vehicle_type.sql`
- `20260719230000_dispatch_rules.sql`
- `20260721161000_add_road_risk_aggregation_rpc.sql`

Important note:

At one stage several migration files appeared as untracked in the working tree even though related database objects existed in Supabase. Before repository cleanup, audit which migrations are intentionally part of source control and which were created locally but never committed.

Do not delete or commit them blindly.

---

# 21. Environment and provider notes

Potential environment values used across HarborGuard include:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_ROUTES_API_KEY
TOMTOM_API_KEY
HERE_API_KEY
OPENROUTESERVICE_API_KEY
VISION_PROVIDER
DASHCAM_PROVIDER
SAMSARA_API_BASE_URL
SAMSARA_API_TOKEN
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
SENTRY_*
```

Never place secrets in this master document.

When sharing logs or screenshots, redact service-role keys, bearer tokens, access tokens, refresh tokens, API keys, passwords, and private URLs where necessary.

---

# 22. Continuation prompt for a new ChatGPT chat

Copy and paste the following after uploading this file:

> You are continuing development of HarborGuard. Treat the uploaded HarborGuard Engineering Master as the current project-state snapshot, but do not assume it is perfectly current. Before proposing or implementing any feature, audit the actual repository, API routes, database migrations/schema, and UI. Follow this sequence: audit, identify one precise gap, make one focused change, verify it, run the production build, commit, push, test end to end, merge only after validation, and update the master document.
>
> The most recent completed milestone is commit `c278e9d`, which makes `/api/route-safety/predict` consume organization-scoped `road_risk_segments`. The feature was validated end to end using aggregated segment ID `bfc70435-25b6-4e60-ae3d-81f9bbc7dfce`, which returned `source: road_risk_segments`, `score: 32`, `verificationCount: 2`, and `type: accident`. It was merged into `main` and pushed.
>
> Start by checking the Current Progress Summary, Known Issues, and Recommended Next Roadmap Items. Do not start coding until the current repository state and exact insertion point have been verified.

---

# 23. Update procedure

After every completed milestone, append or revise:

1. Last updated date
2. Current main commit
3. Completed feature
4. Files changed
5. Database changes
6. Test evidence
7. Build result
8. Branch and merge status
9. Known issues
10. Next recommended step

Suggested Git commit for documentation updates:

```text
Update HarborGuard engineering master
```

Keep the file outside the repository if it contains internal notes not intended for Git. Alternatively, add a sanitized version under:

```text
docs/HarborGuard_Engineering_Master.md
```

---

# 24. Final project-state statement

HarborGuard is no longer only a basic fleet-tracking prototype. It has developed into a broad operational platform with fleet management, command-center functionality, incident handling, AI/vision groundwork, reporting, route safety, verified crowd intelligence, persistent road-risk aggregation, and route prediction that consumes aggregated risk.

The project is not yet production-ready for real customers at scale. The largest remaining areas are provider integration, performance hardening, map-level visualization, risk lifecycle management, safer-route avoidance, mobile readiness, legal/security preparation, and production operations.

The current engineering state is stable enough to continue without starting from scratch, provided every new session begins with a repository audit and this document is updated after each verified milestone.


---

# 25. Latest verified milestone: live weather intelligence

**Date:** 2026-07-28
**Branch:** `feature/road-risk-layer-controls`
**Commit:** `5e32b8a`
**Commit message:** `feat(route-safety): integrate and display live weather intelligence`
**Status:** Complete, verified, committed, and pushed.

## Audit performed

- Audited the existing weather provider abstraction.
- Audited `app/api/route-safety/predict/route.ts`.
- Audited `app/command-center/hooks/useCommandCenterRouteSafety.ts`.
- Audited `app/command-center/sections/CommandCenterRouteSafetySection.tsx`.
- Confirmed no existing reusable Command Center weather display.

## Precise gap identified

The Route Safety prediction response did not expose live weather, and the Command Center did not display route-weather intelligence.

## Backend implementation

- Integrated the existing weather provider into `/api/route-safety/predict`.
- Added normalized `weather` data to the response.
- Added non-fatal `weatherError` handling.
- Weather currently remains supplementary and does not change the total route-risk score.

## Frontend implementation

- Added the Live Route Weather panel to `CommandCenterRouteSafetySection.tsx`.
- Displays provider, temperature, wind, gusts, precipitation, visibility, weather-risk score, weather-risk level, and reasons.
- Displays a weather-unavailable message when weather retrieval fails.

## Validation evidence

- `POST /api/route-safety/predict` returned HTTP 200.
- Provider: `openmeteo`.
- Temperature: `12.2 C`.
- Wind: `4.1 km/h`.
- Gusts: `11.9 km/h`.
- Precipitation: `0 mm`.
- Visibility: `45.6 km`.
- Weather risk: `LOW (0/100)`.
- `weatherError` returned `null`.
- The Command Center rendered the weather panel successfully.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- The production build generated 119 routes/pages.

## Files changed

- `app/api/route-safety/predict/route.ts`
- `app/command-center/sections/CommandCenterRouteSafetySection.tsx`

## HarborGuard Definition of Done

Every work item must follow this sequence:

1. Audit the existing implementation.
2. Identify one precise gap.
3. Make one focused change.
4. Verify the change.
5. Run `npx tsc --noEmit`.
6. Run `npm run build`.
7. Review the Git diff.
8. Commit the focused change.
9. Push the branch.
10. Update this engineering master document.
11. Commit and push the documentation update before starting the next audit.

## Next step

Perform a fresh audit before selecting or implementing another HarborGuard feature. Do not assume weather-aware scoring, rerouting, map visualization, or another candidate item is the correct next task until the repository and exact insertion point have been inspected.
---

# 26. Latest verified milestone: traffic-aware composite route risk

**Date:** 2026-07-29
**Branch:** `main`
**Commit:** `1a9cabc`
**Commit message:** `Integrate traffic intelligence into route safety prediction`
**Status:** Complete, verified, committed, and pushed.

## Audit performed

- Audited the existing traffic-intelligence engine in `lib/traffic/intelligence.ts`.
- Verified the required function signature and organization-scoped parameters.
- Verified the available traffic summary fields:
  - `summary.riskScore`
  - `summary.riskLevel`
- Audited the existing scoring block in `app/api/route-safety/predict/route.ts`.
- Audited the existing `/api/route-safety/predict` response structure before inserting new fields.

## Precise gap identified

The existing traffic-intelligence engine was available elsewhere in HarborGuard, but route-safety prediction did not load it, include it in composite route-risk scoring, or expose it in the prediction response.

## Backend implementation

- Imported and called `buildTrafficIntelligence`.
- Used the midpoint between the route origin and destination as the traffic lookup location.
- Used a 10,000 metre traffic-intelligence search radius.
- Added non-fatal traffic lookup error handling through `trafficError`.
- Added `trafficRiskScore` and `trafficRiskLevel`.
- Added a traffic contribution capped at 20 points:
  - `Math.min(20, Math.round(trafficRiskScore * 0.2))`
- Updated the composite route-risk score to include:
  - threat risk
  - weather contribution
  - traffic contribution
- Exposed the following fields from `/api/route-safety/predict`:
  - `trafficRiskScore`
  - `trafficRiskLevel`
  - `trafficContribution`
  - `traffic`
  - `trafficError`

## Failure behaviour

- A traffic-intelligence lookup failure does not fail the route prediction request.
- Failed or unavailable traffic intelligence falls back to:
  - traffic risk score `0`
  - traffic risk level `LOW`
  - traffic contribution `0`
- The lookup failure is logged and returned through `trafficError`.

## Validation evidence

- `npx tsc --noEmit` passed with no errors.
- `npm run build` passed.
- Next.js compiled successfully.
- TypeScript completed successfully during the production build.
- All 119 static pages were generated.
- `/api/route-safety/predict` was included successfully in the production route output.
- `git diff --check` returned no whitespace errors.
- Only `app/api/route-safety/predict/route.ts` was included in the implementation commit.
- Commit `1a9cabc` was pushed successfully to `main`.

## Files changed

- `app/api/route-safety/predict/route.ts`

## Next step

Commit and push this engineering-document update separately. Afterward, perform a fresh audit of the frontend route-safety data flow and existing Command Center components before deciding whether traffic intelligence needs a new UI panel, additional route-level visualization, or another focused roadmap item.

# 27. Latest verified milestone:
traffic risk displayed in Route Safety breakdown

## Feature completed

The Command Center Route Safety breakdown now displays the traffic risk data already returned by the route-safety prediction API.

## Audit performed

The existing Route Safety frontend flow was inspected before making changes.

The audit confirmed:

- `useCommandCenterRouteSafety.ts` already stores the full prediction response.
- The traffic fields were already available in `routePrediction`.
- No hook, API, database, or backend changes were required.
- The only precise gap was the missing traffic information in the Composite Risk Breakdown UI.

## Focused implementation

Updated:

- `app/command-center/sections/CommandCenterRouteSafetySection.tsx`

Added the following rows:

- Traffic risk
- Traffic level
- Traffic contribution

The existing UI layout and styling were preserved.

## Verification

The change was verified with:

- `git diff` reviewed
- `git diff --check` passed
- `npx tsc --noEmit` passed
- `npm run build` passed
- 119 static pages generated successfully

## Implementation commit

- Commit: `57ed1d7`
- Message: `Display traffic risk in route safety breakdown`

## Result

Operators can now see the traffic portion of the composite route-risk score directly in the Command Center Route Safety panel.
## 2026-07-29

### Completed

- Integrated live weather intelligence into Fleet ETA prediction.
- ETA now considers:
  - Traffic delay
  - Incident delay
  - Weather delay
- Added weather intelligence to the Fleet ETA API response.
- Added weather risk score and weather risk level to ETA prediction.
- Production build completed successfully.
- TypeScript validation (
px tsc --noEmit) passed successfully.
- Production build (
pm run build) passed successfully.
- Git commit: 81cf5d5 - feat: integrate weather risk into ETA prediction


## 2026-07-29

### Completed

- Added fleet-wide weather intelligence to the Fleet Operations Summary API.
- Operations Summary now includes:
  - Average fleet weather risk score
  - Weather risk distribution (Low / Medium / High / Critical)
  - Vehicles with weather intelligence available
  - Vehicles at elevated weather risk
  - Vehicles at severe weather risk
  - Weather lookup warnings for failed providers
- Reused the existing HarborGuard weather provider for fleet-wide intelligence.
- Verified compatibility with the existing organization-based data model.
- Confirmed ehicle_locations.organization_id is present and consistent with the existing architecture.
- TypeScript validation (
px tsc --noEmit) passed successfully.
- Production build (
pm run build) passed successfully.
- Git commit: 1772a8 - feat: add fleet weather intelligence to operations summary


---

# [2026-07-29 19:55] Fleet Health Weather Intelligence - COMPLETE

## Status
Completed

## Summary
Integrated the existing Open-Meteo weather provider into the Fleet Health API.

## Changes Implemented
- Added weather intelligence provider import.
- Added latitude and longitude support from live vehicle locations.
- Implemented live Open-Meteo weather lookup.
- Added Fleet Health weather penalty calculation.
- Integrated weather penalty into the Fleet Health score.
- Added weather intelligence to the Fleet Health API response.
- Added graceful fallback handling when no valid vehicle location exists.

## Verification
- TypeScript validation passed (
px tsc --noEmit)
- Production build passed (
pm run build)
- Runtime API verification passed
- Fleet Health API returned live Open-Meteo weather data
- Verified:
  - weatherPenalty
  - weatherIntelligence
  - provider
  - riskScore
  - riskLevel
  - temperature
  - weatherWarning

## Git
Commit: c6af2ac

## Result
Fleet Health is now fully integrated with HarborGuard's weather intelligence platform and is consistent with the existing weather integrations used by Route Safety, ETA prediction, Operations Summary, and the Weather Provider framework.


---

# 2026-07-30 - Crowd Intelligence Architecture Audit (Completed)

## Objective
Audit the existing Crowd Intelligence, Route Safety, and Road Risk architecture before implementing any new functionality.

## Files Audited
- app/api/road-incidents/route.ts
- app/api/route-safety/report/route.ts
- app/api/route-safety/verify/route.ts
- app/api/route-safety/active/route.ts
- app/api/route-safety/nearby/route.ts
- app/api/route-safety/predict/route.ts
- Route Safety aggregation migrations
- Road Risk aggregation RPC
- Route Intelligence schema

## Findings

### Road Incidents
- Confirmed as the operational incident subsystem.
- Supports GET, POST and PATCH operations.
- Used by Command Center, Fleet Intelligence, AI dashboards and operational workflows.
- Does not directly feed the Road Risk aggregation pipeline.

### Route Safety
- Manual reports are stored in route_safety_alerts.
- Active and Nearby endpoints return active alerts.
- Route prediction consumes active alerts together with historical intelligence.

### Verification Pipeline
Verified Route Safety alerts follow this architecture:

route_safety_alerts
â†’ route_intelligence
â†’ aggregate_road_risk_intelligence()
â†’ road_risk_segment_events
â†’ road_risk_segments

This is the confirmed production aggregation pipeline.

### Historical Intelligence
route_intelligence stores verified historical events.

road_risk_segments stores long-term aggregated road risk used by routing and prediction.

### Architectural Conclusion
HarborGuard already contains a complete Crowd Intelligence architecture.

No duplicate reporting API is required.

road_incidents and route_safety_alerts are separate subsystems with different responsibilities.

## Outcome
Audit completed successfully.

No code changes made.

Next development work should focus on implementing roadmap features rather than rebuilding existing Crowd Intelligence functionality.



---

# External Provider Ingestion Automation (Completed)

**Completed:** 2026-07-30 09:45

## Summary

Implemented automated external traffic provider ingestion with centralized cron scheduling.

## Completed Work

- ✅ Created /api/route-safety/cron/providers.
- ✅ Added CRON_SECRET authentication.
- ✅ Integrated HERE Traffic ingestion.
- ✅ Added duplicate detection before database inserts.
- ✅ Restricted ingestion to a single configured organization using TRAFFIC_IMPORT_ORGANIZATION_ID.
- ✅ Added automated Vercel cron schedule (every 30 minutes).
- ✅ Verified production build succeeds.
- ✅ Verified TypeScript compilation succeeds.
- ✅ Verified HERE ingestion imports only new incidents.
- ✅ Verified duplicate detection skips existing incidents.
- ✅ Cleaned up accidental multi-organization HERE imports.

## Current Status

- HERE Provider: ✅ Operational
- Automated Cron: ✅ Operational
- Duplicate Detection: ✅ Verified
- Organization Isolation: ✅ Verified
- TomTom Provider: ⏳ Awaiting TOMTOM_API_KEY

## Next Planned Work

1. Configure TomTom API key.
2. Verify TomTom scheduled ingestion.
3. Continue HarborGuard roadmap with AI Dispatch Recommendations.


---

## 2026-07-30 - Cross-Provider Incident Correlation and Merging

**Status:** Completed

### Summary

Implemented cross-provider incident correlation between HERE Traffic and TomTom Traffic so that the same real-world incident is merged instead of creating duplicate alerts.

### Completed

- Added cross-provider duplicate detection.
- Merged matching HERE and TomTom incidents into a single alert.
- Added provider confirmation tracking.
- Added provider confidence scoring.
- Added provider confirmation timestamp tracking.
- Updated merged incident expiry handling.
- Prevented duplicate confirmations from the same provider.
- Added merged duplicate reporting to provider import statistics.
- Added imported, skippedDuplicates, and mergedDuplicates to the provider cron response.

### Database

Migration:

- 20260730091256_add_cross_provider_confirmation.sql

Added fields:

- provider_sources
- provider_confirmation_count
- provider_confidence
- last_provider_confirmation_at

### Validation

- TypeScript compilation passed: npx tsc --noEmit
- Production build passed: npm run build
- Production build generated 119 of 119 static pages.
- Feature commit: 2c372b1 - Merge correlated traffic incidents across providers
- Changes pushed successfully to GitHub.

### Result

HarborGuard now treats HERE and TomTom as corroborating traffic intelligence sources. Matching incidents are merged into one verified alert, and confidence increases when multiple providers confirm the same event.
---

# Engineering Progress Update
**Date:** 2026-07-30

## Completed Feature: HERE Route Risk Scoring
**Commit:** 9c6f0f1

### Summary
- Added road risk scoring for every HERE route alternative.
- Reused the shared calculateDistanceMeters() helper.
- Evaluated decoded HERE route geometry against
oad_risk_segments.
- Added:
  - safetyScore
  - riskScore
  - totalRiskScore
  - highestRiskScore
  - matchedRiskSegmentCount
  - matchedRiskSegmentIds
  - riskVerificationCount
- Verified with:
  - TypeScript ✔
  - Production Build ✔
- Committed and pushed to GitHub.

---

## Completed Feature: Route Ranking
**Commit:** 916288d

### Summary
- Added
ankRoutesBySafety().
- Ranked routes by:
  1. Safety Score
  2. Duration
  3. Original HERE order
- Added:
  - rank
  - isRecommended
  - recommendedRoute
- Updated recommendation messages to describe the selected route.
- Verified with:
  - TypeScript ✔
  - Production Build ✔
- Committed and pushed to GitHub.

---

## Current Routing Pipeline

HERE Routing API
→ Decode HERE Geometry
→ Compare Against road_risk_segments
→ Calculate Route Safety Metrics
→ Rank Route Alternatives
→ Select Recommended Route
→ Return Ranked Routes + Recommendation

### Current Status
✅ Road risk scoring complete

✅ Route ranking complete

✅ Recommendation generation complete

### Next Recommended Milestone
Implement configurable routing profiles:

- Safest
- Fastest
- Balanced
- Emergency Response

This will allow HarborGuard to recommend routes differently depending on fleet type and operational requirements.


---

# Engineering Progress Update
**Date:** 2026-07-30

## Completed Milestone: Road Risk Segments Taxonomy v2 Schema

**Feature commit:** `9de7fec`
**Branch:** `feature/expanded-incident-taxonomy`

### Summary

Expanded `public.road_risk_segments` so aggregated road-risk intelligence can preserve the expanded incident taxonomy instead of collapsing new provider event types into legacy counters.

### Database migration

Added:

```text
supabase/migrations/20260730133331_expand_road_risk_segments_v2.sql
```

Added these non-negative integer counters with `NOT NULL DEFAULT 0`:

- `road_closure_count`
- `roadworks_count`
- `congestion_count`
- `lane_closure_count`
- `weather_hazard_count`
- `flooding_count`
- `vehicle_breakdown_count`
- `road_hazard_count`
- `protest_count`

Each counter has a guarded PostgreSQL CHECK constraint, a minimum value of zero, and a database column comment.

Constraint creation is guarded through `pg_constraint` checks inside a PostgreSQL `DO` block.

### Migration result

The migration was successfully applied to the linked Supabase project.

### Verification

- `npx supabase db push` completed successfully
- all nine fields appeared in generated Row, Insert, and Update definitions
- `npx tsc --noEmit` passed
- `npm run build` passed
- production build generated 119 static pages
- `git diff --cached --check` passed
- commit and push completed

### Repository state after completion

`9de7fec Expand road risk segments schema for taxonomy v2`

The branch was synchronized with `origin/feature/expanded-incident-taxonomy` and the working tree was clean.

### Architecture status

The database schema can now store separate aggregate counts for the expanded provider and community incident taxonomy.

This schema migration does not yet make the aggregation process populate the new counters.

### Next precise task

Audit `aggregate_road_risk_intelligence()` and identify:

1. the current event-type-to-counter mapping
2. the INSERT column list
3. the UPSERT or UPDATE assignments
4. the risk-score calculation
5. every API and UI consumer that assumes only the legacy counters

Then make one focused migration that updates the aggregation RPC to populate the Road Risk Segments v2 counters without changing unrelated behavior.

---

# Engineering Update � 30 July 2026

## Road Risk Segments Taxonomy v2 - Aggregation Complete

### Summary
Completed the implementation of the Road Risk Segments Taxonomy v2 aggregation layer by replacing the ggregate_road_risk_intelligence() PostgreSQL function with a taxonomy-aware implementation.

### Changes Completed
- Expanded aggregation logic to support the new Road Risk taxonomy.
- Added aggregation support for all new incident categories.
- Preserved backwards compatibility with the existing RPC signature.
- Updated normalization and aggregation logic for taxonomy v2.
- Successfully applied the migration to the linked Supabase project.

### Validation
- Supabase migration applied successfully.
- TypeScript compilation completed without errors.
- Production build completed successfully.
- Repository verified clean after commit.

### Git History
- 9de7fec � Expand road risk segments schema for taxonomy v2
- 059c768 � Document road risk segments taxonomy v2 schema
- cf3afb7 � Update road risk aggregation for taxonomy v2

### Status
? Completed

### Next Audit
Audit all API routes and UI components that consume Road Risk Segment data to ensure the new taxonomy fields are surfaced throughout:
- /api/route-safety/nearby
- /api/route-safety/segments
- /api/route-safety/predict
- Risk Dashboard
- Road Intelligence
- Command Center map overlays

Taxonomy v2 road risk segment UI milestone completed.

- Expanded road risk segment aggregation for Taxonomy v2.
- Exposed the nine Taxonomy v2 counters through the segments API.
- Added the nine Taxonomy v2 counters to the RoadRiskSegment UI type.
- Added popup rows for:
  - Road closures
  - Roadworks
  - Congestion
  - Lane closures
  - Weather hazards
  - Flooding
  - Vehicle breakdowns
  - Road hazards
  - Protests
- TypeScript validation passed.
- Next.js production build passed with 119 routes.
- Main UI commit: 736c569.
## HERE Provider Taxonomy v2 Normalization — 2026-07-31 09:08

- Audited pp/api/route-safety/cron/providers/route.ts.
- Updated HERE collision-related incidents to emit collision instead of the legacy ccident value.
- Left
oadblock unchanged because it remains a supported category.
- TypeScript validation passed.
- Next.js production build passed.


---

# Engineering Progress Update
Date: 2026-07-31 10:41

## Route Safety Intelligence Platform

Completed a full architecture audit of the complete Route Safety Intelligence pipeline.

### Taxonomy Version 2

Completed migration from legacy **accident** taxonomy to canonical **collision** taxonomy.

Updated components include:

- HERE provider normalization
- HERE ingest pipeline
- TomTom ingest pipeline
- Route prediction engine
- Reroute engine
- Fleet Risk Heat Map
- Road Risk Segment API
- Road Risk popup UI

The application now consistently stores and processes collision events under the canonical taxonomy.

---

## Road Risk Aggregation

Completed a complete audit of the aggregation architecture.

Verified:

- road_risk_segments is the canonical risk store.
- aggregate_road_risk_intelligence() is the authoritative aggregation function.
- Stored risk scores are consumed rather than recalculated.
- Prediction engine layers live intelligence over stored segment risk.

No duplicate aggregation logic was identified.

---

## Verification Pipeline

Verified complete event-driven aggregation workflow.

Confirmed:

Route Safety Verification

route_safety_alert
    ?
route_intelligence
    ?
aggregate_road_risk_intelligence()
    ?
road_risk_segments

Vision Event Review

vision_event
    ?
route_intelligence
    ?
aggregate_road_risk_intelligence()
    ?
road_risk_segments

No missing aggregation paths were found.

---

## Prediction Engine

Verified:

- Weather weighting
- Traffic weighting
- Intelligence weighting
- Verification weighting
- Freshness weighting
- Threat classification
- Automatic escalation
- Automatic rerouting

Prediction engine correctly layers intelligence over stored road risk.

---

## Route Safety APIs

Audited:

- nearby
- predict
- reroute
- verify
- report
- HERE ingestion
- TomTom ingestion
- provider cron
- road risk segment APIs

Confirmed architecture consistency.

---

## Fleet Risk

Updated Fleet Risk Heat Map to support canonical taxonomy while maintaining backward compatibility.

Supported values:

- collision
- accident (legacy compatibility)

---

## Architecture Validation

Completed repository-wide audit.

Confirmed:

? No orphaned aggregation logic.

? No duplicate risk score calculations.

? No missing aggregation RPC calls.

? Route intelligence pipeline verified.

? Road risk architecture validated.

---

## Current Status

Route Safety Intelligence Platform

Status:
Production Ready

Architecture:
Verified

Aggregation:
Verified

Prediction Engine:
Verified

Taxonomy:
Version 2 Complete

Outstanding Defects:
None identified during current audit.

---

Next Recommended Engineering Focus

- Autonomous AI Operations enhancements
- Dispatch optimisation
- Command Center improvements
- Predictive analytics
- Fleet intelligence expansion

## Provider ingestion validation — 2026-07-31

- Validated `/api/route-safety/cron/providers` locally.
- HERE ingestion succeeded:
  - Raw: 67
  - Imported: 17
  - Duplicates skipped: 50
- TomTom ingestion succeeded:
  - Raw: 303
  - Imported: 137
  - Duplicates skipped: 166
- Total imported: 154
- Failed providers: 0
- Added improved TomTom ingestion error logging for future diagnostics.
- Cross-provider merges during this run: 0.


## 2026-07-31 – Cross-provider Road Event Matching

Status: Completed

Changes
- Improved HERE traffic event classification for:
  - congestion
  - road closures
  - roadworks
- Added semantic cross-provider compatibility matching between HERE and TomTom.
- Replaced strict type equality with conservative compatibility checks.
- Retained 250 m merge radius to avoid false positives.

Verification
- TypeScript: Passed
- Production build: Passed
- Cross-provider cron:
  - Before: mergedDuplicates = 0
  - After: mergedDuplicates = 3
- Temporary diagnostics removed after successful validation.

Git
Commit: f8e199f
Message: Improve cross-provider road event matching

## 2026-07-31 – Expanded External Provider Incident Taxonomy & Cross-Provider Matching

### Objective
Improve HarborGuard's external road incident ingestion by expanding HERE and TomTom incident classification, increasing semantic compatibility between providers, and improving duplicate correlation.

### Audit
- Audited the existing provider ingestion pipeline.
- Reviewed HERE incident normalization.
- Reviewed TomTom incident normalization.
- Reviewed cross-provider duplicate detection.
- Reviewed merge logic and compatibility rules before making changes.

### Implementation

#### HERE Provider
- Expanded incident normalization to recognise additional HERE event categories.
- Improved mapping of provider-specific event types into HarborGuard's internal taxonomy.
- Increased classification consistency for road closures, roadworks, congestion and related incidents.

#### TomTom Provider
- Updated normalization to prioritise event descriptions before icon category fallbacks.
- Added support for additional traffic conditions including:
  - Stationary traffic
  - Queuing traffic
  - Slow traffic
  - Roadworks
  - Road closures
- Improved provider-specific taxonomy mapping.

#### Cross-Provider Correlation
- Expanded semantic compatibility matching between HERE and TomTom incidents.
- Improved duplicate merge logic using compatibility rules together with spatial proximity.
- Reduced duplicate alert creation across providers.

### Runtime Verification

Cron endpoint:



Result:

- Success: ✅
- Organizations processed: 1
- Provider runs: 2
- Failed providers: 0

Provider statistics:

| Provider | Raw | Imported | Skipped | Merged |
|----------|----:|---------:|--------:|-------:|
| HERE | 70 | 8 | 61 | 1 |
| TomTom | 393 | 202 | 191 | 0 |

Overall:

- Imported incidents: 210
- Skipped duplicates: 252
- Cross-provider merges: 1
- Failed providers: 0

### Verification

Completed successfully:

- ✅ Audit completed
- ✅ TypeScript verification (`npx tsc --noEmit`)
- ✅ Production build (`npm run build`)
- ✅ Runtime verification completed
- ✅ Provider ingestion verified
- ✅ Cross-provider merge verified

### Git

Commit:

b781408

Message:

Enhance provider event normalization and matching

Status:

Completed and pushed to GitHub.

---

# 2026-07-31 – Provider Correlation & Route Safety Performance Improvements

## Status
✅ Completed

## Objective

Improve cross-provider incident correlation between HERE and TomTom while reducing unnecessary duplicate processing and improving provider cron performance.

---

## Completed Work

### 1. Provider Road Metadata

Added provider road metadata support.

New metadata stored per provider alert:

- road_name
- road_from
- road_to
- provider_geometry

Database migration completed successfully.

---

### 2. Geometry-Aware Correlation

Replaced simple representative-point matching with full geometry comparison.

Implemented:

- extractGeometryCoordinates()
- getMinimumGeometryDistanceMeters()

The correlation engine now:

- extracts every coordinate from HERE geometries
- extracts every coordinate from TomTom geometries
- calculates the minimum distance between both geometries
- uses that minimum distance during duplicate detection

This significantly improves matching accuracy on long road segments.

---

### 3. Improved Duplicate Detection

Cross-provider duplicate matching now evaluates:

- compatible incident taxonomy
- identical normalized road name
- full geometry distance
- fallback coordinate distance

Duplicate merge logic now prefers:

1. Road name match
2. Geometry overlap
3. Coordinate proximity

instead of only representative-point distance.

---

### 4. Removed Legacy Geometry Helper

Removed:

getRepresentativeCoordinate()

The helper became obsolete after introducing full geometry distance calculations.

---

### 5. Database Index

Added migration:

supabase/migrations/20260731154159_add_route_safety_alert_indexes.sql

New index:

route_safety_alerts_org_status_idx

Columns:

- organization_id
- status

This improves provider ingestion queries.

---

### 6. Ignore Expired Alerts During Correlation

Updated provider correlation query:

Before

.eq("organization_id", organizationId)
.eq("status", "active")

After

.eq("organization_id", organizationId)
.eq("status", "active")
.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

Expired incidents are no longer loaded into the duplicate-correlation engine.

This reduces unnecessary geometry comparisons and improves cron performance.

---

## Verification

Completed successfully:

- git diff --check
- TypeScript compilation
- Production build
- Git commits
- GitHub push

Production build completed successfully with all 119 routes generated.

---

## Provider Cron Validation

Result after optimisation:

Organizations processed:
- 1

Providers:
- HERE
- TomTom

Results

HERE

- Raw incidents: 67
- Imported: 40
- Skipped duplicates: 27
- Merged duplicates: 0

TomTom

- Raw incidents: 379
- Imported: 346
- Skipped duplicates: 7
- Merged duplicates: 26

Overall

- Imported: 386
- Skipped duplicates: 34
- Cross-provider merges: 26
- Failed providers: 0

Cron execution completed successfully.

---

## Commits

Load provider geometry for duplicate correlation

Add geometry-aware provider incident correlation

Add provider geometry coordinate extraction

Add provider geometry distance helper

Use full geometry distance for provider correlation

Remove unused representative geometry helper

Add route safety alert organization status index

Exclude expired alerts from provider correlation

---

## Next Planned Audit

Investigate remaining duplicate TomTom congestion incidents.

Focus areas:

- repeated provider IDs
- provider geometry similarity
- congestion corridor aggregation
- lane-level duplication
- configurable merge thresholds
- database indexes for spatial performance
- optional PostGIS optimisation

Goal:

Reduce remaining duplicate congestion alerts while preserving legitimate independent traffic events.


### Milestone: Provider Corridor Rendering (Completed)

Status: ✅ Completed

Objective
- Render HERE and TomTom provider geometry as road corridors instead of only point markers.

Implementation
- Added support for decoding provider_geometry.
- Added rendering of GeoJSON LineString geometry.
- Added rendering of HERE link geometry.
- Display provider corridors as Leaflet polylines.
- Preserved existing incident markers as fallback.
- Popup now displays corridor point count when geometry is available.

Verification
- TypeScript validation passed.
- Production build successful.
- Corridor rendering committed and pushed.

Commit
4bfc00f - Render provider incident corridors on command center map

---
# Engineering Progress Update - 31 July 2026

## Feature

### Geometry-Aware Threat Score Weighting

## Status

Completed and pushed to GitHub.

## Objective

Improve route-threat prediction quality by reducing the influence of incidents that are geographically distant from the external provider's actual road geometry, while preserving the full impact of incidents directly on or close to the travelled corridor.

## Problem

The prediction engine previously applied intelligence weighting to nearby incidents without sufficiently reducing the contribution of incidents located away from the provider's actual road corridor.

This allowed an incident several hundred metres away from the travelled road to contribute almost the same threat score as an incident directly affecting the selected route.

The result could be inflated route-risk scores and unnecessary driver warnings.

## Solution Implemented

Added the helper:

```text
providerGeometryScoreMultiplier(distanceMetersValue)
```

The following geometry-distance weighting is now applied:

| Distance from provider geometry | Multiplier |
| --- | ---: |
| 0-50 m | 1.00 |
| 51-150 m | 0.90 |
| 151-300 m | 0.75 |
| 301-500 m | 0.60 |
| 501-1000 m | 0.40 |
| More than 1000 m | 0.25 |

The prediction pipeline now:

1. Calculates the original intelligence-weighted score.
2. Stores that value as `unweightedScore`.
3. Calculates the provider geometry multiplier.
4. Produces the final threat score:

```text
finalScore =
round(unweightedScore * geometryScoreMultiplier)
```

## Additional Diagnostics

The Route Safety prediction response now exposes:

- `effectiveRouteDistance`
- `unweightedScore`
- `geometryScoreMultiplier`

These fields improve troubleshooting and make the final threat score more explainable.

## Expected Behaviour

Threats directly on the provider route retain their full intelligence score.

Threats further from the travelled corridor are progressively discounted.

Alerts without provider geometry continue using the previous point-distance behaviour for backward compatibility.

## Verification

Completed successfully:

- Repository and insertion-point audit
- Focused implementation
- Git diff review
- `git diff --check`
- UTF-8 encoding verification
- `npx tsc --noEmit`
- Production build
- Git commit
- Git push

## Result

- No TypeScript errors
- No source-file whitespace errors
- Production build successful
- Branch synchronized with GitHub

## Commit

```text
fde8aeb - Weight route threats by provider geometry distance
```

---

# Engineering Progress Update - 31 July 2026

## Feature

### Automatic Expired Route Safety Alert Transition

## Status

Completed and pushed to GitHub.

## Objective

Complete the first focused phase of the Road Intelligence Event Lifecycle by ensuring expired Route Safety alerts no longer remain incorrectly marked as active in the database.

## Problem

Route Safety queries already excluded expired alerts by requiring:

```text
status = active
and
expires_at is null or expires_at is in the future
```

However, when an alert passed its `expires_at` timestamp, it remained stored with:

```text
status = active
```

The alert disappeared from active queries but its persisted lifecycle state was inaccurate.

This created a difference between operational behaviour and database state.

## Audit Findings

The lifecycle audit confirmed:

- Active and nearby APIs filtered expired alerts from responses.
- No existing job transitioned expired alerts to another status.
- The provider cron already ran as the central scheduled Route Safety maintenance process.
- Historical `route_intelligence` records and `road_risk_segments` should remain preserved.
- No new table or separate cron was required for the first lifecycle improvement.

## Solution Implemented

Extended the existing provider cron:

```text
/api/route-safety/cron/providers
```

Before importing fresh HERE and TomTom incidents, the cron now updates alerts matching all of the following:

```text
organization_id = current organization
status = active
expires_at < current timestamp
```

Those records are transitioned to:

```text
status = expired
```

Alerts with `expires_at = null` remain active because no expiry time has been defined.

## Diagnostics

The provider cron response now includes:

```text
expiredAlertsTransitioned
```

This reports how many alerts were moved from `active` to `expired` during the cron execution.

## Historical Preservation

The implementation does not delete or reduce:

- `route_intelligence`
- `road_risk_segments`
- `road_risk_segment_events`
- verification history
- provider correlation history

Expired live alerts therefore stop participating in current operations while their verified historical value remains available for long-term risk learning.

## Verification

Completed successfully:

- Lifecycle architecture audit
- Exact insertion-point review
- Backup created before modification
- Focused source-file diff review
- `git diff --check` passed for the source file
- UTF-8 without BOM verified
- `npx tsc --noEmit` passed
- Production build passed
- 119 of 119 static pages generated
- Focused source commit created
- Commit pushed to GitHub

## Commit

```text
98e54cb - Transition expired route safety alerts
```

## Expected Behaviour

Before:

```text
expires_at passed
status remained active
alert excluded only through query filtering
```

After:

```text
expires_at passed
provider cron runs
status changes to expired
alert lifecycle state becomes accurate
```

## Engineering Impact

This is the first implemented Road Intelligence lifecycle transition.

It improves:

- database-state accuracy
- operational explainability
- lifecycle reporting
- future archival readiness
- future provider confidence management

It also reuses the existing scheduled provider process instead of introducing a parallel maintenance system.

## Next Candidate Audit

### Provider Disappearance and Confidence Decay

The next lifecycle audit should determine how HarborGuard should react when an external provider stops reporting an incident before or without an explicit expiry timestamp.

Potential areas:

- Track whether each provider still reports the event.
- Record a last-seen timestamp per provider.
- Reduce provider confidence after missed ingestion cycles.
- Resolve incidents confirmed as cleared.
- Distinguish `expired`, `resolved`, and `archived`.
- Preserve lifecycle history for analytics.
- Avoid changing historical road-risk aggregation incorrectly.

No confidence-decay or automatic-resolution implementation should begin until the existing provider identifiers, confirmation metadata, and ingestion-cycle behaviour have been audited.


Open HarborGuard_Engineering_Master.md, go to the very bottom, and add this exact section:

---

# Engineering Progress Update - 1 August 2026

## Feature Audit

### Live Traffic-Aware Route Safety Scoring

## Status

Audit completed.

No production code changes were made during this audit.

## Objective

Determine whether HarborGuard already consumes live HERE Traffic Flow data and identify the safest insertion point for allowing congestion conditions to influence Route Safety predictions.

## Audit Findings

The audit confirmed that HarborGuard already has a live HERE Traffic Flow integration.

The HERE traffic provider calls:

```text
https://data.traffic.hereapi.com/v7/flow

using the configured HERE_API_KEY.

The provider returns live traffic information including:

current speed
free-flow speed
HERE confidence
jam factor
road segment information

HarborGuard currently derives:

congestion percentage from current speed versus free-flow speed
estimated delay minutes from congestion
traffic risk level
traffic recommendations
Existing Traffic Intelligence Usage

The Route Safety prediction endpoint already calls:

buildTrafficIntelligence(...)

for the midpoint between the route origin and destination.

The returned traffic intelligence currently contributes to the final route risk through:

trafficRiskScore
trafficRiskLevel
trafficContribution

The existing traffic contribution is calculated as:

trafficContribution =
min(20, round(trafficRiskScore * 0.2))

The overall route risk is calculated as:

riskScore =
threatRiskScore +
weatherContribution +
trafficContribution

This confirms that live traffic already affects the final route risk score.

Per-Threat Scoring Audit

Each route threat currently passes through the following scoring pipeline:

Base severity and incident-type weighting
Confidence weighting
Verification weighting
Recency weighting
Provider geometry-distance weighting
Final per-threat score

The current per-threat score is calculated as:

score =
round(
  unweightedScore *
  geometryScoreMultiplier
)

The resulting threat scores are then combined into:

threatRiskScore
Precise Insertion Point Identified

The audit identified the exact future insertion point inside:

app/api/route-safety/predict/route.ts

The relevant scoring block is located immediately after:

geometryScoreMultiplier

and before:

const score = Math.min(...)

A future traffic multiplier could therefore be applied using a structure such as:

score =
round(
  unweightedScore *
  geometryScoreMultiplier *
  trafficCongestionMultiplier
)

No multiplier was implemented during this audit.

Important Engineering Finding

The initial roadmap assumed that HERE Traffic Flow still needed to be integrated.

The audit disproved that assumption.

HarborGuard already has:

live HERE Traffic Flow
current and free-flow speeds
congestion calculation
jam factor
traffic risk scoring
Command Center traffic flow display
traffic-aware fleet health
traffic-aware ETA prediction
traffic contribution to Route Safety risk

The actual remaining opportunity is improving how traffic conditions influence individual route threats.

Recommended Next Focused Implementation
Congestion-Aware Threat Score Diagnostics

Before allowing traffic to modify threat scores, the safest next implementation should expose read-only diagnostics.

Potential fields:

averageCongestion
trafficCongestionMultiplier
scoreBeforeTrafficWeighting
scoreAfterTrafficWeighting

The first version should preferably calculate and expose the proposed multiplier without changing the production score.

This would allow real route tests to confirm whether the weighting is reasonable before it affects warnings, escalations, or automatic rerouting.

Validation Completed

Completed during the audit:

HERE Traffic Flow reference audit
Traffic Intelligence service audit
HERE provider implementation review
Route Safety prediction scoring audit
Exact insertion-point identification
Confirmation that no database migration is required
Confirmation that no new traffic provider integration is required
Confirmation that no production source code was changed
Result

The Traffic Flow integration roadmap item is already substantially complete.

The next genuine gap is not provider integration, but safe and explainable use of congestion within individual threat scoring.

Next Candidate Milestone
Diagnostic-Only Congestion Multiplier

Proposed first step:

derive a small multiplier from live average congestion
expose the multiplier in the prediction response
expose the proposed traffic-weighted threat score
leave the current production threat score unchanged
validate against real routes before enabling the weighting

This preserves the audit-first approach and prevents traffic conditions from unintentionally inflating automated escalations or rerouting decisions.


This entry accurately reflects the audit: traffic is already loaded and added to overall route risk, while the individual threat score is currently based on intelligence weighting and provider geometry only. :contentReference[oaicite:0]{index=0}

After saving the file, verify only the document changed:

```powershell
git diff --stat -- .\HarborGuard_Engineering_Master.md
git diff --check -- .\HarborGuard_Engineering_Master.md
Get-Content .\HarborGuard_Engineering_Master.md -Tail 220

Do not commit it until you have reviewed the tail and confirmed the entry appears only once.


### Balanced Traffic Risk Diagnostics (Completed)

Status: ✅ Complete

Summary
- Added a diagnostic balanced traffic risk scoring algorithm.
- Preserved the production traffic risk score.
- Added diagnostic outputs for comparison.

New diagnostics
- diagnosticBalancedRiskScore
- diagnosticBalancedRiskLevel
- diagnosticCongestionContribution
- diagnosticIncidentContribution
- diagnosticCriticalContribution

Validation
- TypeScript: Passed
- Production build: Passed
- Runtime API validation: Passed

Example runtime
Production score: 100
Balanced diagnostic score: 72

Contribution breakdown
- Congestion: 47
- Incidents: 12
- Critical incidents: 13

Git
Commit: 1030d94
Message: Add balanced traffic risk diagnostics
---

# 2026-08-01 – Provider-Quality Traffic Risk Diagnostics

## Status

✅ Completed and pushed to GitHub.

## Objective

Enhance the diagnostic balanced traffic-risk calculation by incorporating
existing provider confidence and cross-provider confirmation metadata,
without changing HarborGuard's production traffic score.

## Implementation

Updated:

- lib/traffic/intelligence.ts

Added the following provider fields to the traffic incident query:

- provider_confidence
- provider_confirmation_count

Added diagnostic provider-quality calculations:

- confidence weight
- confirmation weight
- combined provider weight
- average provider weight
- weighted incident count
- weighted critical incident count
- provider-weighted balanced risk score
- provider-weighted balanced risk level

## Weighting Behaviour

Provider confidence is normalized from 0 to 1.

Provider confirmation weighting starts at 0.8 and increases for additional
provider confirmations, capped at 1.2.

The combined weight is calculated from:

provider confidence weight × provider confirmation weight

## Runtime Validation

Observed values:

- Production risk score: 100
- Balanced diagnostic score: 85
- Average provider weight: 0.648
- Weighted incident count: 27.2
- Weighted critical incident count: 17.49
- Provider-weighted balanced risk score: 79
- Provider-weighted balanced risk level: high

The production risk score remained unchanged.

## Verification

- git diff --check: Passed
- TypeScript noEmit: Passed
- Next.js production build: Passed
- Static routes generated: 119 of 119
- Local runtime API request: Passed

## Git

- Commit: 7ebe14d
- Message: Add provider-quality traffic risk diagnostics
- Branch: feature/expanded-incident-taxonomy
---

# 2026-08-01 - Provider Freshness Traffic Diagnostics

## Status

Completed and pushed to GitHub.

## Objective

Extend provider-quality traffic diagnostics by reducing the influence of
older provider observations using the existing provider_last_seen metadata.

Production traffic scoring remained unchanged.

## Implementation

Updated:

- lib/traffic/intelligence.ts

Added provider_last_seen to the traffic incident query.

Added diagnostic freshness calculations:

- freshest provider observation timestamp
- provider age in hours
- freshness weight
- average freshness weight
- stale provider incident count

Freshness weighting:

- 0 to 24 hours: 1.00
- 24 to 48 hours: 0.85
- 48 to 72 hours: 0.65
- 72 to 120 hours: 0.40
- Older than 120 hours: 0.20
- Missing provider timestamp: 0.60

The combined diagnostic provider weight now includes:

provider confidence weight
x provider confirmation weight
x provider freshness weight

## Runtime Validation

Observed values:

- Production risk score: 100
- Average provider weight: 0.64
- Average freshness weight: 0.985
- Stale provider incidents: 3
- Weighted incident count: 26.89
- Weighted critical incident count: 16.64
- Provider-weighted balanced score: 78
- Provider-weighted balanced level: high

The previous provider-weighted score was 79. Freshness weighting reduced it
to 78 because only three scoped provider incidents were stale.

## Verification

- git diff --check: Passed
- TypeScript noEmit: Passed
- Next.js production build: Passed
- Static routes generated: 119 of 119
- Local runtime API request: Passed
- Production score unchanged: Confirmed

## Git

- Commit: 5403abe
- Message: Add provider freshness traffic diagnostics
- Branch: feature/expanded-incident-taxonomy
---

# 2026-08-01 - Shared Route Incident Weights

## Status

Completed and pushed to GitHub.

## Objective

Create one reusable source of truth for route incident severity and type
weights without changing production scoring behaviour.

## Implementation

Created:

- lib/route-safety/incidentWeights.ts

Updated:

- app/api/route-safety/predict/route.ts

Moved the existing severity and type weight functions into the shared helper:

- routeIncidentSeverityWeight()
- routeIncidentTypeWeight()

The prediction route now imports and uses the shared helper instead of
maintaining local duplicate functions.

No weight values were changed.

## Runtime Validation

Observed values after the refactor:

- Threat risk score: 100
- Traffic risk score: 100
- Overall risk score: 100
- Overall risk level: CRITICAL

Example threat scores remained populated:

- smash_grab_hotspot / critical: 48
- roadblock / low: 45
- roadblock / high: 36
- road_closure / critical: 23 after geometry weighting

## Verification

- git diff --check: Passed
- TypeScript noEmit: Passed
- Next.js production build: Passed
- Static routes generated: 119 of 119
- Local runtime API request: Passed
- Production scoring unchanged: Confirmed

## Git

- Commit: e9161f1
- Message: Extract shared route incident weights
- Branch: feature/expanded-incident-taxonomy


### 2026-08-02 – Harsh Braking Telemetry Detection

Status: Completed

Implemented:
- Added harsh braking telemetry detection to fleet update-location endpoint.
- Uses previous telemetry sample to calculate:
  - speed reduction
  - elapsed time
  - deceleration (m/s²)
- Added configurable thresholds:
  - Minimum previous speed
  - Minimum speed drop
  - Minimum/maximum sample interval
  - Minimum deceleration
- Added 10-minute cooldown to prevent duplicate alerts.
- Creates medium severity `harsh_braking` vehicle alerts.
- Stores:
  - intelligence_score
  - behavioral_risk
  - intelligence_narrative
- Detection is telemetry-based only and is not treated as a verified road incident.

Verification:
- TypeScript: Passed
- Production build: Passed
- End-to-end API testing: Passed
- Alert successfully written to vehicle_alerts.

## 2026-08-02 — GPS Anomaly Telemetry Intelligence

Status: ✅ Completed

Completed:
- Added gps_anomaly vehicle alert type.
- Added Supabase migration updating vehicle_alerts constraint.
- Detects impossible GPS jumps using calculated speed validation.
- Rejects invalid telemetry before location persistence.
- Creates high-severity GPS anomaly intelligence alerts.
- Adds intelligence score of 60.
- Records previous/rejected coordinates in narrative.
- Ten-minute duplicate suppression implemented.
- Manual location updates excluded.
- TypeScript verification passed.
- Production build passed.
- Runtime validation passed.
- Changes committed and pushed.

Commit:
463dab2 — Alert on rejected GPS anomalies

## 2026-08-02 – Sustained Speeding Telemetry

Status: Completed

Summary
- Replaced single-sample speeding detection with sustained speeding detection.
- Requires three consecutive speeding telemetry samples.
- Requires at least 30 seconds of sustained speeding.
- Uses a 90 second telemetry lookback.
- Continues to use the existing 10 minute duplicate-alert cooldown.

Implementation
- Added:
  - SPEEDING_MIN_DURATION_SECONDS
  - SPEEDING_MIN_CONSECUTIVE_SAMPLES
  - SPEEDING_LOOKBACK_SECONDS
- Queries recent vehicle_locations.
- Stops evaluation when a non-speeding sample is encountered.
- Creates a speeding alert only when duration and consecutive sample thresholds are met.

Validation
- TypeScript: PASS
- Production build: PASS
- Single speeding sample: PASS (no alert)
- Sustained speeding: PASS (one alert created)
- Reset by slower speed: PASS (no false alert)

Commit
300a8b9 Require sustained speeding telemetry

## 2026-08-02 – Live HERE Traffic Flow Route-Prediction Verification

Status: Completed

Summary
- Verified live HERE Traffic Flow end to end through the route-safety prediction API.
- Confirmed HERE flow corridors are consumed by the current production traffic score.
- Confirmed five-point route-corridor traffic sampling is enabled and operational.
- Confirmed the route-composite-v1 model remains diagnostic and is not yet production-applied.

Runtime evidence
- Route: Ottery area to Bishop Lavis area.
- Distance: 14,981 metres.
- Live HERE flow corridors: 20.
- Midpoint average congestion: 77.
- Midpoint average delay: 19 minutes.
- Route sample count: 5.
- Successful route samples: 5.
- Failed route samples: 0.
- Route average congestion: 49.
- Route maximum congestion: 53.
- Route P75 congestion: 52.
- Route average delay: 12 minutes.
- Production traffic score: 100 / critical.
- Experimental composite score: 60 / medium.
- Experimental productionApplied: false.
- Congestion reduction versus midpoint: 36.4%.

Conclusion
- Live HERE traffic is successfully consumed by route prediction.
- Route-wide sampling produced a materially different result from midpoint-only scoring.
- More route evaluations are required before production promotion.


## 2026-08-02 – Route Traffic Model Validation Harness

Status: Completed

Summary
- Added a reusable PowerShell validation harness for comparing the current production traffic model with route-composite-v1.
- Added six fixed Cape Town validation routes.
- Calls the existing /api/route-safety/predict endpoint without vehicle or trip assignment.
- Produces timestamped CSV and JSON validation reports.
- Keeps the experimental traffic model in diagnostic mode.

Validation routes
- Ottery to Bishop Lavis
- Bellville to Cape Town CBD
- Cape Town Airport to Somerset West
- Parow to Mitchells Plain
- Durbanville to Century City
- Goodwood to Khayelitsha

Runtime validation
- Successful routes: 6
- Failed routes: 0
- Failed traffic samples: 0 across all routes
- Production traffic score: 100 / critical for all six routes
- Experimental scores ranged from 42 to 61
- Experimental levels ranged from low to medium
- Experimental model produced route-specific differentiation
- productionApplied remained false

Implementation
- Script: scripts/traffic-model-validation.ps1
- Supports configurable API base URL
- Supports configurable delay between route tests
- Safely validates bearer-token format
- Anchors output paths to the repository
- Records production and experimental traffic metrics
- Exports complete run evidence as JSON and CSV

Commit
06cd24c Add traffic model validation harness

Conclusion
- The validation harness is operational and repeatable.
- More runs at different times and traffic conditions are required before promoting route-composite-v1 to production.


# HarborGuard Progress — August 2026

## Completed

### Engineering Progress Update – 03 August 2026
**Feature:** Provider Lifecycle Reconciliation & Provider Confidence Refresh

#### Objective
Improve the Route Safety provider ingestion pipeline so that provider metadata remains consistent throughout repeated HERE and TomTom imports while automatically reconciling stale provider observations.

#### Changes Implemented

- Added provider lifecycle reconciliation using `provider_last_seen`.
- Automatically expires alerts when every provider observation becomes stale.
- Removes only stale providers while preserving active provider confirmations.
- Preserves multi-provider alerts whenever at least one provider remains active.
- Added partial stale-provider reconciliation metrics to cron responses.
- Added provider lifecycle statistics:
  - `staleProviderObservations`
  - `alertsWithStaleProviders`
  - `alertsWithAllProvidersStale`
  - `allProvidersStaleAlertsTransitioned`
  - `partiallyReconciledAlerts`
  - `partiallyStaleProvidersRemoved`
- Updated same-provider refresh logic so repeated observations now reset:
  - `provider_sources`
  - `provider_confirmation_count`
  - `provider_confidence`
  - `provider_last_seen`
  - `last_provider_confirmation_at`
- Normalized provider incident mapping:
  - HERE "collision" → `accident`
  - TomTom incident type `1` → `accident`
- Eliminated database constraint violations caused by obsolete `collision` values.

#### Validation

Completed successfully:

- TypeScript verification (`npx tsc --noEmit`)
- Production build (`npm run build`)
- Provider cron execution
- HERE ingestion
- TomTom ingestion
- Duplicate detection
- Cross-provider reconciliation
- Same-provider refresh
- Provider confidence refresh
- Provider lifecycle reconciliation

#### Runtime Validation

Final cron execution completed successfully.

Results included:

- Provider Runs: 2
- Failed Providers: 0
- HERE refreshes completed successfully.
- TomTom imports completed successfully.
- Cross-provider duplicate merging operational.
- Partial stale-provider reconciliation operational.
- Automatic stale-provider expiration operational.

#### Database Validation

Verified:

- No remaining provider type constraint violations.
- All active single-provider HERE alerts have provider confidence of 70.
- All active single-provider TomTom alerts have provider confidence of 75.
- Legacy HERE records with empty `provider_last_seen` values were repaired.
- Verification query returned zero remaining confidence mismatches.

#### Outcome

The provider ingestion pipeline now maintains consistent provider confidence, provider confirmation counts, provider source lists, and provider lifecycle metadata across repeated imports while automatically reconciling stale provider observations without removing valid provider confirmations.

#### Git History

Commit:
- `c71f0e2` — Normalize provider collisions as accidents
- `fd6aa27` — Refresh provider confidence on same-provider updates

Store coordinates on harsh braking alerts

Added latitude and longitude columns to vehicle_alerts.
Added latitude, longitude, and coordinate-pair validation constraints.
Updated app/api/fleet/update-location/route.ts to persist telemetry coordinates with harsh braking alerts.
Regenerated and corrected Supabase TypeScript types.
Verified with tsc --noEmit.
Verified with a successful production build.
Committed as 2ea0c6a.

## 2026-08-03 – Harsh-Braking Multi-Vehicle Corroboration Helper

Status: Completed

Summary
- Added a reusable, read-only helper for evaluating nearby harsh-braking telemetry.
- The helper queries recent harsh-braking alerts within the same organization.
- It filters out alerts without vehicle IDs, coordinates, or timestamps.
- It calculates Haversine distance from the current event.
- It counts distinct vehicles within a configurable radius and time window.
- It does not create, update, or delete route-safety or fleet records.

Implementation
- File: lib/fleet/harshBrakingCorroboration.ts
- Default time window: 15 minutes
- Default radius: 150 metres
- Default threshold: 2 distinct vehicles
- Returns nearby alert evidence, distinct vehicle IDs, other vehicle IDs, and threshold status.

Validation
- Read-only safety checks passed.
- TypeScript validation passed with npx tsc --noEmit.
- Next.js production build completed successfully.
- Static routes generated successfully: 119/119.

Commit
- 7e556bf Add harsh braking corroboration helper

Next step
- Integrate the helper into the harsh-braking insertion flow in diagnostic mode.
- Do not create route_safety_alerts automatically until runtime evidence confirms the corroboration behaviour.

Added temporary harsh-braking corroboration diagnostics.
Diagnostics execute only after a successful vehicle_alerts insert.
Diagnostics are read-only and do not modify route_safety_alerts.
Logged fields include:
thresholdMet
distinctVehicleCount
distinctVehicleIds
otherVehicleIds
nearbyAlertCount
radiusMeters
timeWindowMinutes
windowStartedAt
windowEndedAt
TypeScript verification passed.
Production build passed.e

### Harsh-Braking Corroboration Clock-Skew Fix

- Runtime testing confirmed that a valid harsh-braking alert was inserted successfully, but the corroboration helper initially returned zero nearby alerts.
- The inserted `vehicle_alerts.created_at` timestamp was approximately 191 ms later than the helper's `windowEndedAt` value.
- Root cause: application and database clock/timestamp skew caused the newly inserted alert to fall just outside the query upper boundary.
- Added `DEFAULT_FUTURE_TOLERANCE_SECONDS = 5` in `lib/fleet/harshBrakingCorroboration.ts`.
- The helper now extends the upper corroboration boundary by five seconds before applying the `created_at <= windowEndedAt` filter.
- TypeScript verification passed with `npx tsc --noEmit`.
- Production build passed with `npm run build`.
- Code committed and pushed as `c2735c9 Allow clock skew in harsh braking corroboration`.
- Runtime verification result: pending confirmation that the diagnostic returns `nearbyAlertCount: 1` and `distinctVehicleCount: 1`.

## Engineering Progress Update – 04 August 2026

### Feature
Harsh Braking Multi-Vehicle Corroboration Validation

### Objective
Validate that harsh braking telemetry from multiple independent fleet vehicles can be automatically corroborated before being considered a verified road intelligence event.

### Work Completed

#### Diagnostic Logging
Added temporary diagnostic logging after harsh braking alert creation within:


### Shared Route-Safety Alert Type Extraction

- Audited the HERE and TomTom provider ingestion pipeline before extracting shared route-safety logic.
- Confirmed that the existing `AlertRow` type was used by:
  - the HERE incident mapper;
  - the TomTom incident mapper;
  - the route-safety alert insertion and duplicate-matching logic.
- Created `lib/route-safety/types.ts`.
- Added the shared exported type `RouteSafetyAlertRow`.
- Removed the duplicated local `AlertRow` definition from:
  - `app/api/route-safety/cron/providers/route.ts`
- Updated the provider ingestion pipeline to import and use `RouteSafetyAlertRow`.
- Verified successfully with:
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Code committed and pushed as:
  - `6734cb0 Extract shared route safety alert type`
- This is the first preparation step for extracting the existing route-safety insert, duplicate matching, confidence, and lifecycle logic into a reusable shared helper.

## Engineering Progress Update – 04 August 2026

### Shared Route Safety Alert Upsert Helper

Completed extraction of the provider alert insertion and duplicate-correlation
logic into a reusable helper.

Changes:
- Created lib/route-safety/upsertRouteSafetyAlerts.ts
- Moved insertNewProviderAlerts() into the shared helper
- Moved duplicate detection helpers into the shared helper
- Provider cron now imports the helper instead of containing duplicate logic
- No behavioural changes intended

Verification:
- npx tsc --noEmit ✔
- npm run build ✔
- Git diff reviewed

### HERE Route-Safety Provider Importer Extraction

- Audited the existing HERE provider ingestion flow and its exact dependencies.
- Confirmed the HERE importer depended on:
  - `mapHereSeverity`
  - `mapHereType`
  - `getHereLatLng`
  - `getIntelligenceSourceConfiguration`
  - the shared `insertNewProviderAlerts` helper
- Created:
  - `lib/route-safety/providers/importHereIncidents.ts`
- Moved the HERE-specific severity mapping, type mapping, coordinate extraction, API request, incident normalization, and provider result handling into the new module.
- Injected the existing intelligence-source configuration loader rather than duplicating registry access logic.
- Updated the provider cron to call the shared HERE importer.
- Removed the obsolete local HERE helper functions and importer from the cron route.
- Left the TomTom importer unchanged.
- Verified successfully with:
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.

extracted the shared TomTom provider importer,
removed duplicate implementation from the cron route,
validated with git diff,
TypeScript passed,
production build passed,
shared provider architecture now used for both HERE and TomTom.

the extraction of getIntelligenceSourceConfiguration
removal of duplicate configuration-loading logic
both provider importers now depending on the shared loader
successful TypeScript verification
successful production build
the Turbopack development issue and its resolution by moving _audit-output outside the project and ignoring it
the fact that the provider ingestion pipeline is now further modularized and easier to reuse

### Shared Route-Safety Provider Result Type

- Audited the remaining provider cron structure and confirmed that `ProviderResult` was the only local shared provider type still duplicated.
- Created:
  - `lib/route-safety/providers/types.ts`
- Moved `ProviderResult` into the shared provider types module.
- Updated:
  - provider cron route
  - HERE importer
  - TomTom importer
- Removed the TomTom importer’s type dependency on the HERE importer.
- No runtime behavior changed.
- Verified successfully with:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.

completion of the provider reconciliation extraction,
the new reconcileProviderObservations.ts shared module,
validation (tsc + production build),
remaining work.

### Provider Observation Reconciliation Extraction

- Audited the stale-provider reconciliation block in the route-safety provider cron endpoint.
- Confirmed the block was an isolated business-logic unit inside the per-organization provider loop.
- Created:
  - `lib/route-safety/providers/reconcileProviderObservations.ts`
- Extracted provider-observation reconciliation responsibilities:
  - stale provider observation detection
  - partial provider removal
  - provider confidence recalculation
  - source reassignment when the primary provider becomes stale
  - fully stale alert expiration
- The shared module returns six reconciliation metrics:
  - `staleProviderObservations`
  - `alertsWithStaleProviders`
  - `alertsWithAllProvidersStale`
  - `allProvidersStaleAlertsTransitioned`
  - `partiallyReconciledAlerts`
  - `partiallyStaleProvidersRemoved`
- Updated the provider cron route to call the shared reconciliation module and accumulate its returned metrics.
- Removed the duplicated inline reconciliation implementation from the route.
- Verified successfully with:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.

Extracted expireRouteSafetyAlerts.ts
✅ Simplified runProviderImportCycle.ts
✅ Passed git diff --check
✅ Passed npx tsc --noEmit
✅ Passed a full production next build
✅ Committed and pushed the implementation (f9ef6dd)


You have now successfully extracted:

✅ Shared configuration loader
✅ HERE importer
✅ TomTom importer
✅ Shared provider types
✅ Provider reconciliation
✅ Alert expiry helper
✅ Provider summary builder
✅ Organization provider import helper

…and every step has been committed, pushed, and validated with tsc and a production build.

87904ca — Extract provider import cycle result builder
Only the intended two files were included.
The staged diff was clean.
The new builder owns both the cycle result type and final result construction.
runProviderImportCycle.ts is now reduced to orchestration plus one builder cal

### Provider Import Cycle Result Builder Extraction

- Created:
  - `lib/route-safety/providers/buildProviderImportCycleResult.ts`
- Moved `ProviderImportCycleResult` into the result-builder module.
- Moved final provider-summary aggregation and cycle response construction out of `runProviderImportCycle.ts`.
- Updated `runProviderImportCycle.ts` to return one `buildProviderImportCycleResult(...)` call.
- Preserved:
  - provider result totals
  - provider failure count
  - generated timestamp
  - organization count
  - expiration and reconciliation metrics
  - response shape
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.

### Telemetry Observation Builder

- Created:
  - `lib/route-safety/createTelemetryObservation.ts`
- Added a pure builder that converts harsh-braking corroboration results into a normalized telemetry observation.
- Added validation for:
  - organization ID
  - source vehicle ID
  - latitude
  - longitude
  - occurrence timestamp
- Preserved corroboration evidence including:
  - threshold status
  - distinct vehicle count and IDs
  - nearby alert count
  - radius
  - time window
- The helper performs no database writes.
- The existing fleet location route and corroboration helper were not changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.

### Rapid Acceleration Coordinate Storage

- Updated `app/api/fleet/update-location/route.ts`.
- Rapid-acceleration `vehicle_alerts` now store:
  - `latitude`
  - `longitude`
- No corroboration logic was added.
- No telemetry observation was created.
- No Route Safety database write was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.

### Harsh Cornering Coordinate Storage

- Updated `app/api/fleet/update-location/route.ts`.
- Harsh-cornering `vehicle_alerts` now store:
  - `latitude`
  - `longitude`
- No corroboration logic was added.
- No telemetry observation was created.
- No Route Safety database write was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.

Added latitude and longitude to the speeding vehicle_alerts insert.
Passed npx tsc --noEmit.
Passed a full production npm run build.
Staged only the intended change.
Committed it as "Store speeding alert coordinates".
Pushed it to feature/expanded-incident-taxonomy.

### Rapid Acceleration Alert Handler Extraction

- Created `lib/fleet/createRapidAccelerationAlert.ts`.
- Extracted the rapid-acceleration alert lifecycle from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - cooldown lookup
  - alert message construction
  - intelligence narrative construction
  - `vehicle_alerts` insertion
  - latitude and longitude persistence
  - structured creation, cooldown-skip, and error results
- The update-location route now delegates to `createRapidAccelerationAlert(...)`.
- Candidate detection remains in the route.
- No Route Safety write or telemetry-observation call was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.

### Speeding Alert Handler Extraction

- Created `lib/fleet/createSpeedingAlert.ts`.
- Extracted the speeding alert lifecycle from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - cooldown lookup
  - message construction
  - intelligence narrative construction
  - `vehicle_alerts` insertion
  - latitude and longitude persistence
  - structured creation, cooldown-skip, and error results
- The update-location route now delegates to `createSpeedingAlert(...)`.
- Speeding candidate detection remains in the route.
- No Route Safety write or telemetry-observation call was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.

### GPS Anomaly Alert Handler Extraction

- Created `lib/fleet/createGpsAnomalyAlert.ts`.
- Extracted the GPS anomaly alert lifecycle from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - cooldown lookup
  - alert message construction
  - intelligence narrative construction
  - `vehicle_alerts` insertion
  - structured creation, cooldown-skip, and error results
- The update-location route now delegates to `createGpsAnomalyAlert(...)`.
- GPS spike detection remains in the route.
- GPS spike responses remain unchanged.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.

### Harsh Braking Alert Handler Extraction

- Created `lib/fleet/createHarshBrakingAlert.ts`.
- Extracted the harsh-braking alert lifecycle from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - cooldown lookup
  - message and intelligence narrative construction
  - `vehicle_alerts` insertion
  - latitude and longitude persistence
  - harsh-braking corroboration
  - telemetry-observation creation
  - corroboration diagnostic logging
  - structured creation, cooldown-skip, telemetry-observation, and error results
- The update-location route now delegates to `createHarshBrakingAlert(...)`.
- Harsh-braking candidate detection remains in the route.
- No direct Route Safety write or `NextResponse` handling was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
### Active Trip Transition Helper Extraction

- Created `lib/fleet/updateActiveTripFromLocation.ts`.
- Extracted active-trip transition logic from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - scheduled-trip departure transitions
  - default transition to `en_route_to_port`
  - requested trip-status transitions
  - `actual_departure` persistence
  - `actual_arrival` persistence for delivered trips
  - organization-scoped `vehicle_trips` updates
  - structured previous-status, next-status, and update results
- The update-location route now delegates to `updateActiveTripFromLocation(...)`.
- Active-trip lookup and `activeTripId` resolution remain in the route.
- Vehicle-stop lifecycle handling remains unchanged.
- No `NextResponse`, vehicle-alert, or Route Safety behavior was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
### Vehicle Stop Lifecycle Helper Extraction

- Created `lib/fleet/updateVehicleStopLifecycle.ts`.
- Extracted the vehicle-stop lifecycle from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - recent slow-location lookup
  - minimum slow-point threshold evaluation
  - open-stop lookup
  - stop creation
  - stop completion
  - stop-duration calculation
  - organization-scoped `vehicle_stops` inserts and updates
  - structured started, ended, open-stop, and duration results
- The update-location route now delegates to `updateVehicleStopLifecycle(...)`.
- Stop thresholds remain configured in the route and are passed into the helper.
- Risk detection remains in the route and runs after stop lifecycle handling.
- No `NextResponse`, vehicle-alert, or Route Safety behavior was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
### Sustained Speeding Detector Extraction

- Created `lib/fleet/detectSustainedSpeedingCandidate.ts`.
- Extracted sustained-speeding candidate detection from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - recent `vehicle_locations` history lookup
  - configurable speeding lookback handling
  - consecutive speeding-sample evaluation
  - minimum sample-count evaluation
  - minimum sustained-duration evaluation
  - historical speed parsing
  - candidate rounding and construction
  - null results for non-qualifying samples and lookup failures
- The update-location route now delegates to `detectSustainedSpeedingCandidate(...)`.
- The manual-source exclusion remains in the route.
- Speeding alert creation remains delegated to `createSpeedingAlert(...)`.
- No `NextResponse`, `vehicle_alerts`, or Route Safety behavior was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
### Harsh Braking Candidate Detector Extraction

- Created `lib/fleet/detectHarshBrakingCandidate.ts`.
- Extracted harsh-braking candidate detection from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - speed-drop calculation
  - deceleration calculation
  - telemetry-source validation
  - speed and interval validation
  - configurable harsh-braking threshold evaluation
  - candidate rounding and construction
  - null results for non-qualifying telemetry samples
- The update-location route now delegates to `detectHarshBrakingCandidate(...)`.
- Previous-speed parsing remains in the route because rapid-acceleration detection also uses it.
- Harsh-braking alert creation remains delegated to `createHarshBrakingAlert(...)`.
- No database, `NextResponse`, vehicle-alert, or Route Safety behavior was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
### Rapid Acceleration Candidate Detector Extraction

- Created `lib/fleet/detectRapidAccelerationCandidate.ts`.
- Extracted rapid-acceleration candidate detection from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - speed-increase calculation
  - acceleration calculation
  - telemetry-source validation
  - speed and interval validation
  - configurable rapid-acceleration threshold evaluation
  - candidate rounding and construction
  - null results for non-qualifying telemetry samples
- The update-location route now delegates to `detectRapidAccelerationCandidate(...)`.
- Previous-speed parsing remains in the route because multiple detectors reuse it.
- Rapid-acceleration alert creation remains delegated to `createRapidAccelerationAlert(...)`.
- No database, `NextResponse`, vehicle-alert, or Route Safety behavior was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.


### GPS Movement Evaluation Extraction

- Created `lib/fleet/evaluateGpsMovement.ts`.
- Extracted GPS movement evaluation from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - calculated speed computation
  - minimum movement (GPS jitter) evaluation
  - maximum speed (GPS spike) evaluation
  - accepted/jitter/gps_spike decision generation
- The update-location route now delegates to `evaluateGpsMovement(...)`.
- GPS anomaly alert creation remains delegated to `createGpsAnomalyAlert(...)`.
- Sustained-speeding detection continues after GPS movement evaluation.
- No database writes, `NextResponse` changes, vehicle-alert creation, or Route Safety behavior were introduced by the helper.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
### Heading Delta Calculation Extraction

- Created `lib/fleet/calculateHeadingDelta.ts`.
- Extracted heading-delta calculation from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - finite-heading validation
  - previous-heading normalization
  - current-heading normalization
  - raw angular-difference calculation
  - shortest-arc heading-delta calculation
  - null results for invalid heading inputs
- The update-location route now delegates to `calculateHeadingDelta(...)`.
- Harsh-cornering candidate detection continues to consume the calculated heading delta.
- GPS movement evaluation remains delegated to `evaluateGpsMovement(...)`.
- No database, `NextResponse`, vehicle-alert, or Route Safety behavior was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
### Shared Distance Utility Extraction

- Created `lib/geo/getDistanceMeters.ts`.
- Extracted the Haversine distance calculation from `app/api/fleet/update-location/route.ts`.
- The shared helper now owns:
  - geographic coordinate typing
  - Earth-radius configuration
  - latitude and longitude conversion to radians
  - Haversine-value calculation
  - distance-in-meters calculation
- The update-location route now imports and delegates to `getDistanceMeters(...)`.
- The route call now uses the shared `{ latitude, longitude }` coordinate shape.
- Other existing distance implementations were intentionally left unchanged for separate follow-up migrations.
- No database, `NextResponse`, vehicle-alert, or Route Safety behavior was introduced.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
### Harsh Braking Distance Utility Migration

- Migrated `lib/fleet/harshBrakingCorroboration.ts` to the shared `lib/geo/getDistanceMeters.ts` utility.
- Removed the file-local Haversine distance implementation.
- Preserved the existing `{ latitude, longitude }` distance-call shape.
- Preserved `requirePositiveNumber(...)` and all corroboration validation behavior.
- Harsh-braking corroboration query, radius filtering, distinct-vehicle evaluation, and result construction remain unchanged.
- No database, alert-lifecycle, telemetry-observation, or Route Safety behavior was changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
### Fleet Risk Detection Distance Utility Migration

- Migrated `lib/fleet/risk-detection.ts` to the shared `lib/geo/getDistanceMeters.ts` utility.
- Removed the file-local Haversine distance implementation.
- Converted the geofence distance call from four numeric arguments to the shared `{ latitude, longitude }` coordinate shape.
- Preserved geofence radius evaluation and breach detection behavior.
- Preserved `notifyAlert(...)`, alert creation, incident correlation, driver-fatigue logic, long-stop logic, and all database behavior.
- No Route Safety or telemetry-observation behavior was changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
### Fleet Threat Prediction Distance Utility Migration

- Migrated `app/api/fleet/predict-threats/route.ts` to the shared `lib/geo/getDistanceMeters.ts` utility.
- Removed the file-local Haversine distance implementation.
- Converted both existing distance calls from four numeric arguments to the shared `{ latitude, longitude }` coordinate shape.
- Preserved geofence proximity calculations and predicted geofence-risk behavior.
- Preserved road-incident proximity detection and `nearIncident` behavior.
- Preserved threat-probability calculation, premium-access enforcement, rate limiting, database queries, and response construction.
- No database, alert-lifecycle, telemetry-observation, or Route Safety behavior was changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Implementation commit: `f766d1f` (`Use shared distance utility for fleet threat prediction`).
### Mobile Tracker Distance Utility Migration

- Migrated `app/mobile-tracker/page.tsx` to the shared `lib/geo/getDistanceMeters.ts` utility.
- Removed the file-local Haversine distance implementation.
- Preserved `"use client";` as the first module statement.
- Adapted the mobile tracker's `{ lat, lng }` points to the shared `{ latitude, longitude }` coordinate shape at the call site.
- Preserved `lastSentRef.current.time` and speed-sanity calculations.
- Preserved GPS accuracy filtering, jitter filtering, anti-teleport filtering, location submission, and crowd-report behavior.
- No API, database, Route Safety, alert-lifecycle, or telemetry-observation behavior was changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Implementation commit: `2422b85` (`Use shared distance utility for mobile tracking`).
### Update Location Input Parsing Extraction

- Created `lib/fleet/parseUpdateLocationInput.ts`.
- Extracted update-location request normalization and validation from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - `UpdateLocationBody`
  - update-location status and source types
  - fleet telemetry number coercion via `parseFleetTelemetryNumber(...)`
  - vehicle ID normalization
  - trip ID normalization
  - latitude and longitude parsing
  - speed and heading parsing with zero defaults
  - source defaulting to `mobile`
  - requested-status extraction
  - required vehicle ID validation
  - finite-coordinate validation
  - latitude-range validation
  - longitude-range validation
  - structured success and validation-error results
- The update-location route now delegates to `parseUpdateLocationInput(...)`.
- HTTP `400` response construction remains in the route.
- Historical telemetry parsing now reuses `parseFleetTelemetryNumber(...)`.
- Sustained-speeding detection continues receiving the parser through its existing `parseNumber` callback property.
- No database, alert-lifecycle, Route Safety, or telemetry-observation behavior was changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Implementation commit: `f20e934` (`Extract update location input parsing`).
### Update Location Vehicle Lookup Extraction

- Created `lib/fleet/getVehicleForLocationUpdate.ts`.
- Extracted the organization-scoped vehicle lookup from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - `vehicles` table lookup
  - vehicle ID filtering
  - organization ID filtering
  - selection of `id`, `is_active`, `nickname`, `registration_number`, and `organization_id`
  - single-row lookup result handling
  - structured vehicle and error return values
- The update-location route now delegates to `getVehicleForLocationUpdate(...)`.
- HTTP `404` response construction remains in the route.
- Existing vehicle-not-found error messaging remains unchanged.
- No location persistence, telemetry detection, alert lifecycle, active-trip, Route Safety, or risk-detection behavior was changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Implementation commit: `2f918b3` (`Extract update location vehicle lookup`).
### Latest Vehicle Location Lookup Extraction

- Created `lib/fleet/getLatestVehicleLocation.ts`.
- Extracted the organization-scoped latest vehicle-location lookup from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - `vehicle_locations` table lookup
  - selection of `latitude`, `longitude`, `speed_kmh`, `heading`, and `recorded_at`
  - vehicle ID filtering
  - organization ID filtering
  - newest-first `recorded_at` ordering
  - single-row limiting
  - nullable latest-location result handling via `maybeSingle()`
- The update-location route now delegates to `getLatestVehicleLocation(...)`.
- Existing downstream `lastPoint` telemetry analysis remains in the route.
- Historical latitude, longitude, heading, and speed parsing behavior remains unchanged.
- No location persistence, telemetry detection, alert lifecycle, active-trip, Route Safety, stop-lifecycle, or risk-detection behavior was changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Implementation commit: `d5c0433` (`Extract latest vehicle location lookup`).
### Vehicle Location Persistence Extraction

- Created `lib/fleet/createVehicleLocation.ts`.
- Extracted vehicle-location persistence from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - `vehicle_locations` table insertion
  - organization ID persistence
  - vehicle ID persistence
  - trip ID persistence
  - latitude and longitude persistence
  - speed and heading persistence
  - recorded-at persistence
  - location-source persistence
  - structured database-error return handling
- The update-location route now delegates to `createVehicleLocation(...)`.
- HTTP `500` response construction remains in the route.
- Existing location-persistence error messaging remains unchanged.
- No latest-location lookup, telemetry detection, alert lifecycle, active-trip, Route Safety, stop-lifecycle, or risk-detection behavior was changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Implementation commit: `b7bf9c3` (`Extract vehicle location persistence`).
### Active Vehicle Trip Lookup Extraction

- Created `lib/fleet/getActiveVehicleTrip.ts`.
- Extracted the organization-scoped active vehicle-trip lookup from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - `vehicle_trips` table lookup
  - selection of `id` and `status`
  - vehicle ID filtering
  - organization ID filtering
  - active-status filtering for `scheduled`, `en_route_to_port`, `collecting`, `en_route_to_fishery`, and `emergency`
  - newest-first `created_at` ordering
  - single-row limiting
  - nullable active-trip result handling via `maybeSingle()`
- The update-location route now delegates to `getActiveVehicleTrip(...)`.
- Existing `activeTripId` fallback behavior remains in the route.
- Harsh-braking, rapid-acceleration, harsh-cornering, and speeding alert creation remain unchanged.
- Active-trip mutation remains delegated to `updateActiveTripFromLocation(...)`.
- No location persistence, telemetry detection, Route Safety, stop-lifecycle, or risk-detection behavior was changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Implementation commit: `3d9e91c` (`Extract active vehicle trip lookup`).
### Location Behavior Alert Orchestration Extraction

- Created `lib/fleet/createLocationBehaviorAlerts.ts`.
- Extracted location-derived driving-behavior alert orchestration from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - active-trip and request-trip ID resolution for behavior alerts
  - harsh-braking alert dispatch
  - rapid-acceleration alert dispatch
  - harsh-cornering alert dispatch
  - speeding alert dispatch
  - conditional alert creation based on candidate availability
- The update-location route now delegates behavior-alert dispatch to `createLocationBehaviorAlerts(...)`.
- `activeTripId` calculation remains in the route because downstream active-trip update and risk-detection behavior also consume it.
- Existing alert helpers remain responsible for their individual alert lifecycle and persistence behavior.
- Active-trip mutation remains delegated to `updateActiveTripFromLocation(...)`.
- Vehicle-stop lifecycle remains delegated to `updateVehicleStopLifecycle(...)`.
- Risk detection remains delegated to `detectFleetRisks(...)`.
- No HTTP response, raw database, Route Safety, telemetry-detection, or stop-lifecycle behavior was introduced into the orchestration helper.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Implementation commit: `3a89078` (`Extract location behavior alert orchestration`).

### Post-Location Update Lifecycle Extraction

- Created `lib/fleet/runPostLocationUpdateLifecycle.ts`.
- Extracted post-location-update lifecycle orchestration from `app/api/fleet/update-location/route.ts`.
- The helper now owns:
  - location-derived driving-behavior alert orchestration
  - active-trip update orchestration
  - vehicle-stop lifecycle orchestration
  - automatic fleet-risk detection
  - existing best-effort risk-detection error handling
- The update-location route now delegates the post-location lifecycle to `runPostLocationUpdateLifecycle(...)`.
- `activeTripId` calculation remains in the route because it is also returned in the successful HTTP response.
- Existing behavior-alert creation remains delegated to `createLocationBehaviorAlerts(...)`.
- Existing active-trip mutation remains delegated to `updateActiveTripFromLocation(...)`.
- Existing vehicle-stop lifecycle remains delegated to `updateVehicleStopLifecycle(...)`.
- Existing risk detection remains delegated to `detectFleetRisks(...)`.
- Automatic risk-detection failures remain non-fatal and continue to be logged without failing the location update.
- No HTTP response construction, raw database access, location persistence, active-trip lookup, telemetry detection, or Route Safety behavior was moved into the lifecycle helper.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Implementation commit: `c1a2264` (`Extract post location update lifecycle`).

### Vehicle Location Telemetry Analysis Extraction

- Created `lib/fleet/analyzeVehicleLocationTelemetry.ts`.
- Extracted location-derived telemetry analysis from `app/api/fleet/update-location/route.ts`.
- The helper now owns the telemetry-analysis stage used by the update-location route while preserving the existing detection behavior and thresholds.
- The update-location route continues to own HTTP request/response handling and delegates the extracted telemetry analysis to `analyzeVehicleLocationTelemetry(...)`.
- Existing vehicle lookup remains delegated to `getVehicleForLocationUpdate(...)`.
- Existing latest-location lookup remains delegated to `getLatestVehicleLocation(...)`.
- Existing vehicle-location persistence remains delegated to `createVehicleLocation(...)`.
- Existing active-trip lookup remains delegated to `getActiveVehicleTrip(...)`.
- Existing post-location lifecycle remains delegated to `runPostLocationUpdateLifecycle(...)`.
- No raw database access was reintroduced into the update-location route.
- No location persistence, active-trip lookup, post-location lifecycle, Route Safety, stop-lifecycle, or risk-detection behavior was changed.
- Follow-up cleanup removed surplus blank lines between the final import and route constants without changing runtime behavior.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
- Production build completed successfully with 119 routes.
- Implementation commit: `7267fde`.
- Cleanup commit: `e74e5b7` (`Clean up update location imports`).
### Duplicate Route Threat Consolidation

- Updated `app/api/route-safety/predict/route.ts`.
- Added prediction-boundary duplicate threat consolidation without changing provider ingestion or database persistence.
- Route-threat candidates now preserve alert latitude and longitude for duplicate-distance evaluation.
- Candidate route threats are sorted by descending threat score before consolidation.
- Same-type route threats within 250 metres are treated as duplicates at the prediction boundary.
- The highest-scoring representative is retained when a duplicate is consolidated.
- Threats with different types or greater than 250 metres of separation remain independently eligible for route-risk scoring.
- Existing `threatRiskScore` aggregation continues to operate on the final consolidated `routeThreats`.
- No database schema, provider-ingestion, provider-correlation, alert persistence, authentication, or unrelated Route Safety behavior was changed.
- Validation completed:
  - `git diff --check`
  - `npx tsc --noEmit`
  - `npm run build`
  - authenticated local `/api/route-safety/predict` runtime request
- Production build completed successfully with 119 routes.
- Live prediction validation:
  - request completed successfully
  - returned 5 route threats
  - returned threats preserved latitude and longitude
  - minimum separation between the five same-type live threats was 1095.9 metres
  - all five therefore correctly remained independent under the 250-metre consolidation threshold
- Controlled in-memory duplicate validation:
  - same-type synthetic duplicate separation: 55.6 metres
  - candidate count: 2
  - consolidated count: 1
  - highest-scoring representative retained: 85
  - naive duplicate-inflated score: 100
  - consolidated score: 85
  - `DuplicatePrevented: True`
- The controlled positive duplicate case reproduced the implemented consolidation rule in memory and did not insert synthetic alerts into Supabase.
- Implementation commit: `684517e` (`Consolidate duplicate route threats`).

### Shared Historical Road-Risk Recency Weighting

- Completed audit of historical road-risk ageing across HERE route ranking and `/api/route-safety/predict`.
- Confirmed `road_risk_segments.risk_score` remains persistent historical evidence and is not database-decayed.
- Confirmed HERE route ranking already applied runtime recency weighting to historical road-risk segments.
- Identified a consistency gap where `/api/route-safety/predict` used the persisted aggregated risk score without applying equivalent historical recency weighting.
- Added `lib/routing/roadRiskRecency.ts` as the shared historical road-risk recency helper.
- Preserved the existing validated recency bands:
  - 0-7 days: `1.25`
  - 8-30 days: `1.10`
  - 31-90 days: `1.00`
  - 91-180 days: `0.85`
  - older than 180 days: `0.70`
  - invalid or missing timestamps: `1.00`
- Refactored `lib/routing/hereRouting.ts` to use the shared helper without changing its existing recency behavior.
- Updated `app/api/route-safety/predict/route.ts` so aggregated `road_risk_segments` risk is multiplied by the shared historical recency weight before geometry weighting and `threatRiskScore` aggregation.
- Added `historicalRecencyWeight` to returned threat diagnostics for validation and observability.
- Live provider-alert scoring and `applyIntelligenceWeighting()` behavior were not changed.
- No database schema, migration, persisted event counts, provider lifecycle, provider ingestion, or stored `road_risk_segments.risk_score` values were changed.
- Validation completed:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `119/119` static pages successfully.
- Implementation commit: `b14931a` (`Apply shared historical road risk recency weighting`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Roadmap status:
  - persistent historical evidence retention: implemented
  - runtime historical recency weighting: implemented consistently across HERE routing and Route Safety prediction
  - database-level destructive risk decay: intentionally not introduced
- Next step: resume the audit-first roadmap review and identify the next precise incomplete HarborGuard intelligence milestone.

### Driver Trip Completion Lifecycle

- Audited the existing HarborGuard vehicle trip lifecycle before implementation.
- Confirmed `vehicle_trips` already supports lifecycle timestamps including `actual_departure` and `actual_arrival`.
- Confirmed `lib/fleet/updateActiveTripFromLocation.ts` already:
  - transitions scheduled trips into active route states,
  - records `actual_departure`,
  - accepts the `delivered` lifecycle status,
  - records `actual_arrival` when a trip becomes delivered.
- Confirmed `/api/fleet/update-location` already routes requested trip status through the existing post-location lifecycle.
- Identified the precise gap in `app/driver/page.tsx`:
  - the Driver `Stop Trip` action previously cleared only local client state,
  - it did not persist the final delivered lifecycle transition.
- Updated `sendLocation()` so lifecycle status can be supplied while retaining `en_route_to_port` as the default behavior.
- Updated `sendLocation()` to return explicit success or failure status.
- Updated Driver trip completion so:
  - an active trip is required,
  - current latitude and longitude are required,
  - the final known driver location is sent through `/api/fleet/update-location`,
  - the final lifecycle status is `delivered`,
  - local `tripId` is cleared only after the server-side completion succeeds,
  - location sharing is stopped only after successful completion,
  - failed completion attempts preserve the active local trip state.
- No new completion API was introduced because HarborGuard already had the required server-side lifecycle infrastructure.
- No database schema or migration changes were required.
- Validation completed:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `119/119` static pages successfully.
- Implementation commit: `d116d9e` (`Persist driver trip completion lifecycle`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Outcome-learning significance:
  - completed trips can now produce a trustworthy `delivered` lifecycle boundary,
  - successful trip completion can persist `actual_arrival`,
  - this creates a reliable future boundary for comparing predicted route risk with actual trip outcomes.
- Next step: resume the audit-first Outcome Learning roadmap and identify how route prediction context should be durably linked to completed trips.

### Trip-Linked Route Prediction Snapshots

- Continued the audit-first Outcome Learning roadmap after completing the Driver Trip Completion Lifecycle.
- Audited existing prediction persistence before introducing new schema.
- Confirmed `traffic_model_evaluations` is a diagnostic experimental traffic-model evaluation store rather than HarborGuard's canonical production route-prediction history.
- Confirmed normal Route Safety predictions were not otherwise durably persisted.
- Confirmed `/api/route-safety/predict` already receives:
  - authenticated organization context,
  - authenticated user context,
  - optional vehicle ID,
  - optional active trip ID,
  - route origin and destination,
  - finalized production risk scores and levels.
- Added migration `20260807170000_create_route_prediction_snapshots.sql`.
- Added immutable `route_prediction_snapshots` persistence with:
  - organization linkage,
  - user linkage,
  - vehicle linkage,
  - vehicle-trip linkage,
  - route origin and destination,
  - overall risk score and level,
  - threat risk score and level,
  - weather risk score,
  - traffic risk score and level,
  - compact diagnostic metadata,
  - creation timestamp.
- Added organization-scoped authenticated RLS policies for select and insert.
- Added organization, trip and vehicle timestamp indexes for future Outcome Learning queries.
- Route prediction snapshots are currently persisted only when a `tripId` exists so stored predictions can later be evaluated against actual trip outcomes.
- Added ownership validation before snapshot persistence:
  - supplied trip ID must belong to the authenticated organization,
  - when a vehicle ID is supplied, the trip must also belong to that vehicle.
- Snapshot logging is best-effort:
  - snapshot failures are logged,
  - a persistence failure does not cause a valid route-safety prediction request to fail.
- Existing `traffic_model_evaluations` behavior was preserved.
- Existing Route Safety scoring behavior was not changed.
- No UI changes were required.
- Validation completed:
  - `git diff --cached --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `119/119` static pages successfully.
- Implementation commit: `d690e27` (`Persist trip-linked route prediction snapshots`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Outcome Learning foundation now has:
  - a trustworthy trip-completion boundary,
  - durable trip-linked production prediction snapshots,
  - existing trip-linked locations, alerts and telemetry available for later actual-outcome evaluation.
- Next step: audit how completed-trip actual outcomes should be derived and persisted so HarborGuard can compare predicted route risk with what actually happened.

### Trip Lifecycle Persistence Validation

- Continued the audit-first Outcome Learning implementation after establishing durable trip-linked route prediction snapshots.
- Audited `lib/fleet/updateActiveTripFromLocation.ts` before wiring completed-trip outcome persistence.
- Confirmed the helper returns:
  - `updated`,
  - `previousStatus`,
  - `nextStatus`.
- Confirmed this result is the correct lifecycle contract for identifying a genuine transition to `delivered`.
- Identified a persistence reliability gap:
  - Supabase trip updates were awaited,
  - but update errors were not checked before the helper returned `updated: true`.
- Updated both trip lifecycle write paths to capture and validate Supabase update errors.
- Scheduled-trip transition now throws when the underlying `vehicle_trips` update fails.
- Active-trip status transition now throws when the underlying `vehicle_trips` update fails.
- This prevents HarborGuard from reporting a successful lifecycle transition when the database did not persist it.
- The `delivered` transition therefore becomes a trustworthy trigger for subsequent completed-trip Outcome Learning persistence.
- No schema changes were included in this prerequisite commit.
- The pending Outcome Learning files remain separate from this work item:
  - `lib/fleet/createCompletedTripOutcome.ts`
  - `supabase/migrations/20260807183000_create_route_prediction_outcomes.sql`
- Validation completed:
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `119/119` static pages successfully.
  - `git diff --check` passed.
- Implementation commit: `bbaf74a` (`Validate trip lifecycle update persistence`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical.
- Next step: resume the focused Outcome Learning implementation by wiring completed-trip outcome creation only to a successfully persisted transition from a non-delivered trip state to `delivered`.

### Completed Trip Prediction Outcomes

- Continued the audit-first Outcome Learning roadmap after validating trip lifecycle persistence.
- Audited the completed-trip lifecycle, vehicle alert persistence, trip timestamps, route prediction snapshots and exact insertion point before implementing outcome capture.
- Confirmed completed-trip observation windows are defined by:
  - `vehicle_trips.actual_departure`,
  - `vehicle_trips.actual_arrival`.
- Confirmed current trip-linked `vehicle_alerts` provide durable evidence for:
  - panic,
  - route safety threats,
  - harsh braking,
  - harsh cornering,
  - rapid acceleration,
  - speeding,
  - GPS anomalies,
  - long stops,
  - suspicious stops.
- Added migration `20260807183000_create_route_prediction_outcomes.sql`.
- Added `route_prediction_outcomes` as the durable actual-outcome side of Outcome Learning.
- Each outcome is linked to:
  - organization,
  - vehicle,
  - completed vehicle trip.
- Enforced one outcome record per trip with a unique `trip_id` constraint.
- Added persisted outcome fields for:
  - completion timestamp,
  - adverse-event occurrence,
  - highest alert severity,
  - total alert count,
  - panic count,
  - route safety threat count,
  - harsh braking count,
  - harsh cornering count,
  - rapid acceleration count,
  - speeding count,
  - GPS anomaly count,
  - long stop count,
  - suspicious stop count,
  - outcome metadata.
- Added organization-scoped authenticated RLS policies for select and insert.
- Added organization and vehicle completion-time indexes.
- Added `lib/fleet/createCompletedTripOutcome.ts`.
- Completed-trip outcome creation:
  - validates organization ownership,
  - validates vehicle ownership,
  - requires trip status `delivered`,
  - requires persisted `actual_departure`,
  - requires persisted `actual_arrival`,
  - uses the persisted `actual_arrival` as the authoritative `completed_at`,
  - limits observed evidence to alerts linked to the same trip,
  - restricts evidence to the actual trip observation window,
  - derives the highest observed severity,
  - derives per-alert-type counts,
  - records whether an adverse event occurred.
- Outcome creation is idempotent:
  - existing outcomes are detected before insert,
  - database unique-constraint races are handled through PostgreSQL error code `23505`.
- Updated `lib/fleet/runPostLocationUpdateLifecycle.ts`.
- The lifecycle now captures the result of `updateActiveTripFromLocation()`.
- Completed-trip outcome creation runs only when:
  - the active trip ID exists,
  - the trip lifecycle update actually persisted,
  - the previous status was not `delivered`,
  - the next status is `delivered`.
- Repeated location updates after delivery do not create duplicate outcomes.
- Route prediction snapshots and completed-trip outcomes are independently linked by `trip_id`, allowing prediction-versus-outcome evaluation without inventing an arbitrary single prediction-selection rule.
- Existing Route Safety scoring behavior was not changed.
- Existing vehicle alert detection behavior was not changed.
- No UI changes were required.
- Validation completed:
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `119/119` static pages successfully.
  - `git diff --check` passed.
  - `git diff --cached --check` passed.
- Implementation commit: `e8bfb89` (`Capture completed trip prediction outcomes`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical.
- Outcome Learning now has both sides of the evaluation pair:
  - durable trip-linked route predictions,
  - durable completed-trip observed outcomes.
- Next step: audit how HarborGuard should evaluate prediction accuracy and calibration by comparing `route_prediction_snapshots` against `route_prediction_outcomes` for the same completed trip.

### Completed Trip Prediction Evaluation

- Continued the audit-first Outcome Learning roadmap after completing durable trip-linked predictions and completed-trip observed outcomes.
- Audited existing HarborGuard evaluation infrastructure before adding new evaluation storage.
- Confirmed `traffic_model_evaluations` is specifically designed for production-versus-experimental traffic-model diagnostics and was not reused for completed-trip Route Safety Outcome Learning.
- Confirmed Outcome Learning cardinality is:
  - one completed vehicle trip,
  - potentially multiple trip-linked route prediction snapshots,
  - one completed-trip observed outcome,
  - one v1 completed-trip prediction evaluation.
- Defined the v1 snapshot-selection rule as:
  - same organization,
  - same vehicle,
  - same trip,
  - prediction created at or before trip completion,
  - latest eligible prediction by `created_at desc`.
- Confirmed production Route Safety overall risk levels use:
  - LOW: 0-34,
  - MEDIUM: 35-59,
  - HIGH: 60-79,
  - CRITICAL: 80-100.
- Reused the existing production LOW-to-MEDIUM boundary as the v1 binary prediction threshold:
  - `overall_risk_score >= 35` means predicted adverse event,
  - `overall_risk_score < 35` means predicted no adverse event.
- Reused `route_prediction_outcomes.adverse_event_occurred` as the completed-trip observed ground-truth label.
- Added migration `20260807190000_create_route_prediction_evaluations.sql`.
- Added `route_prediction_evaluations` as the durable completed-trip prediction evaluation store.
- Each evaluation persists:
  - organization,
  - vehicle,
  - trip,
  - selected prediction snapshot,
  - completed-trip outcome,
  - prediction timestamp,
  - outcome completion timestamp,
  - predicted overall risk score,
  - predicted overall risk level,
  - prediction-positive threshold,
  - predicted adverse-event boolean,
  - observed adverse-event boolean,
  - deterministic classification,
  - evaluation metadata.
- Supported deterministic classifications:
  - `true_positive`,
  - `false_positive`,
  - `false_negative`,
  - `true_negative`.
- Enforced one evaluation per trip with a unique `trip_id` constraint.
- Added a database check constraint limiting classification values to the supported four-way evaluation vocabulary.
- Added foreign keys to:
  - `route_prediction_snapshots`,
  - `route_prediction_outcomes`,
  - `vehicle_trips`,
  - `vehicles`,
  - `organizations`.
- Added authenticated organization-scoped RLS policies for select and insert.
- Added organization and vehicle evaluation indexes.
- Added `lib/fleet/evaluateCompletedTripPrediction.ts`.
- Evaluation helper behavior:
  - checks for an existing evaluation before processing,
  - verifies the completed outcome belongs to the organization, vehicle and trip,
  - selects the latest eligible prediction snapshot for the same organization, vehicle and trip,
  - excludes prediction snapshots created after trip completion,
  - skips safely when no completed outcome exists,
  - skips safely when no eligible prediction snapshot exists,
  - clamps the persisted overall risk score to 0-100,
  - derives the predicted adverse-event label from the existing threshold of 35,
  - derives the observed label from the completed-trip outcome,
  - calculates TP / FP / FN / TN deterministically,
  - handles PostgreSQL unique-conflict error code `23505` idempotently.
- Updated `lib/fleet/runPostLocationUpdateLifecycle.ts`.
- Prediction evaluation runs only after:
  - a real transition into `delivered`,
  - completed-trip outcome persistence.
- Prediction evaluation is intentionally non-fatal:
  - evaluation failures are logged,
  - failure does not invalidate the already-persisted trip completion or completed-trip outcome,
  - remaining post-location lifecycle work continues.
- Existing Route Safety scoring behavior was not changed.
- Existing completed-trip outcome capture behavior was not changed.
- Existing traffic-model experimental evaluation behavior was not changed.
- No UI changes were required.
- Validation completed:
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `119/119` static pages successfully.
  - `git diff --check` passed.
  - `git diff --cached --check` passed.
- Implementation commit: `2bc2b84` (`Evaluate completed trip predictions`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical.
- Outcome Learning now has the complete v1 prediction-evaluation chain:
  - trip-linked route prediction snapshots,
  - completed-trip observed outcomes,
  - deterministic completed-trip prediction evaluations.
- Next step: audit how HarborGuard should aggregate completed prediction evaluations into calibration and accuracy metrics such as confusion-matrix counts, precision, recall, false-positive rate and false-negative rate before adding any reporting or model-adjustment logic.

### Route Prediction Performance Aggregation

- Continued the audit-first Outcome Learning roadmap after establishing deterministic completed-trip prediction evaluations.
- Audited existing HarborGuard aggregation, analytics and reporting patterns before adding prediction-performance logic.
- Confirmed no existing Route Safety confusion-matrix, precision, recall, false-positive-rate or false-negative-rate implementation existed.
- Confirmed `route_prediction_evaluations` already contains the durable primitives required for aggregate performance analysis:
  - `true_positive`,
  - `false_positive`,
  - `false_negative`,
  - `true_negative`.
- Confirmed no additional persistence table was required for v1 aggregate metrics.
- Added `lib/fleet/calculateRoutePredictionPerformance.ts`.
- Added a pure deterministic aggregation helper that accepts completed-trip evaluation classifications and calculates:
  - total evaluation count,
  - true positives,
  - false positives,
  - false negatives,
  - true negatives,
  - accuracy,
  - precision,
  - recall,
  - false-positive rate,
  - false-negative rate.
- Accuracy is calculated as:
  - `(TP + TN) / total evaluations`.
- Precision is calculated as:
  - `TP / (TP + FP)`.
- Recall is calculated as:
  - `TP / (TP + FN)`.
- False-positive rate is calculated as:
  - `FP / (FP + TN)`.
- False-negative rate is calculated as:
  - `FN / (FN + TP)`.
- Metrics with a zero denominator return `null` rather than `0`.
- This preserves the distinction between:
  - a measured zero rate,
  - a mathematically undefined metric due to insufficient observations.
- The helper is intentionally pure:
  - no Supabase access,
  - no organization lookup,
  - no authentication logic,
  - no API route,
  - no UI coupling,
  - no additional database schema.
- This establishes one canonical prediction-performance calculation implementation before any transport or presentation layer is added.
- Existing Route Safety scoring behavior was not changed.
- Existing completed-trip prediction evaluation behavior was not changed.
- Existing database schema was not changed.
- No UI changes were required.
- Validation completed:
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `119/119` static pages successfully.
  - `git diff --check` passed.
  - `git diff --cached --check` passed.
- Implementation commit: `843739f` (`Calculate route prediction performance`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical.
- Outcome Learning now has:
  - trip-linked route prediction snapshots,
  - completed-trip observed outcomes,
  - deterministic completed-trip prediction evaluations,
  - canonical aggregate performance calculations.
- Next step: audit the smallest organization-scoped reader/API boundary for exposing aggregate route prediction performance without introducing redundant persistence or premature UI/model-adjustment logic.

### Route Prediction Performance API

- Continued the audit-first Outcome Learning roadmap after adding canonical aggregate prediction-performance calculations.
- Audited existing authentication, fleet API, analytics and service-layer patterns before exposing prediction-performance metrics.
- Confirmed `requireOrganization()` is the canonical authenticated server boundary for organization-scoped fleet APIs.
- Confirmed no existing reader/API exposed `route_prediction_evaluations`.
- Confirmed no additional persistence table was required.
- Added `GET /api/fleet/route-prediction-performance`.
- Added `app/api/fleet/route-prediction-performance/route.ts`.
- The endpoint:
  - authenticates through `requireOrganization()`,
  - resolves the current organization,
  - reads only the `classification` field from `route_prediction_evaluations`,
  - explicitly filters by `organization_id`,
  - passes the evaluation rows through `calculateRoutePredictionPerformance()`,
  - returns `{ success: true, performance }`.
- The endpoint intentionally does not duplicate metric calculations.
- The endpoint intentionally does not add:
  - new database schema,
  - stored aggregate rows,
  - date-range filtering,
  - vehicle filtering,
  - service-layer wrappers,
  - analytics UI,
  - model-adjustment logic.
- Existing Route Safety scoring behavior was not changed.
- Existing prediction snapshot behavior was not changed.
- Existing completed-trip outcome behavior was not changed.
- Existing completed-trip evaluation behavior was not changed.
- Existing aggregate calculation behavior was not changed.
- Validation completed:
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `120/120` static pages successfully.
  - `/api/fleet/route-prediction-performance` was registered as a dynamic route.
  - `git diff --check` passed.
  - `git diff --cached --check` passed.
- Initial implementation commit: `3ff46a1` (`Expose route prediction performance`).
- Follow-up encoding normalization commit: `4a80882` (`Normalize route prediction performance encoding`).
- The route source was normalized to UTF-8 without BOM.
- Local and remote branch hashes were verified identical after the normalization commit.
- Outcome Learning now exposes organization-scoped aggregate prediction performance through an authenticated API boundary.
- Next step: audit whether HarborGuard should add time-window and vehicle-scoped performance slicing before introducing analytics UI or model-calibration behavior.

### Filtered Route Prediction Performance

- Continued the audit-first Outcome Learning roadmap after exposing authenticated organization-scoped aggregate route prediction performance.
- Audited the existing evaluation schema, performance API, calculator and fleet query-filter patterns before modifying the API.
- Confirmed no schema change was required.
- Confirmed `route_prediction_evaluations` already contains:
  - `vehicle_id`,
  - `outcome_completed_at`,
  - organization scoping,
  - existing indexes supporting organization and vehicle evaluation access.
- Updated `GET /api/fleet/route-prediction-performance`.
- Added optional query parameters:
  - `vehicleId`,
  - `start`,
  - `end`.
- Organization scoping remains mandatory for all performance queries.
- Optional vehicle filtering applies:
  - `.eq("vehicle_id", vehicleId)`.
- Optional time-window filtering uses the completed-trip outcome timestamp:
  - `.gte("outcome_completed_at", start)`,
  - `.lte("outcome_completed_at", end)`.
- `outcome_completed_at` was deliberately selected rather than generic evaluation `created_at` because the performance window represents completed-trip outcomes.
- When no optional filters are provided, the endpoint preserves the existing organization-wide behavior.
- The canonical `calculateRoutePredictionPerformance()` helper was not changed.
- No additional persistence table was added.
- No analytics UI was added.
- No service-layer wrapper was added.
- No model-adjustment behavior was introduced.
- Existing Route Safety scoring behavior was not changed.
- Existing completed-trip outcome behavior was not changed.
- Existing evaluation classification behavior was not changed.
- Validation completed:
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `120/120` static pages successfully.
  - `/api/fleet/route-prediction-performance` remained registered as a dynamic route.
  - `git diff --check` passed.
  - `git diff --cached --check` passed.
- Implementation commit: `8ce791e` (`Filter route prediction performance`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical.
- Outcome Learning now supports:
  - organization-wide aggregate performance,
  - vehicle-scoped aggregate performance,
  - completed-outcome time-window performance slicing.
- Next step: audit whether the current filtering contract requires input validation/default windows and whether the next smallest value is a service/UI consumer or calibration analysis.

### Route Prediction Performance Filter Validation

- Continued the audit-first Outcome Learning roadmap after adding vehicle-scoped and completed-outcome time-window performance filtering.
- Audited existing HarborGuard request-validation patterns before modifying the performance API.
- Confirmed fleet APIs commonly return HTTP `400` for malformed or missing client input.
- Confirmed no reusable UUID validation helper currently exists in the audited code paths.
- Confirmed existing date parsing precedent uses `new Date(value)` with `Number.isNaN(parsed.getTime())`.
- Updated `GET /api/fleet/route-prediction-performance`.
- Added validation for optional `start` and `end` query parameters.
- Invalid `start` values now return:
  - HTTP `400`,
  - `Invalid start date.`
- Invalid `end` values now return:
  - HTTP `400`,
  - `Invalid end date.`
- Inverted ranges where `start > end` now return:
  - HTTP `400`,
  - `start must be earlier than or equal to end.`
- Valid date inputs are normalized with `toISOString()` before being applied to the Supabase query.
- Existing organization scoping remains unchanged.
- Existing optional `vehicleId` filtering remains unchanged.
- No default performance time window was introduced.
- Omitting `start` and `end` continues to preserve organization-wide historical performance behavior.
- No UUID validation was added for `vehicleId` because organization scoping already prevents cross-organization access and an unknown vehicle ID safely yields no matching evaluations.
- No schema changes were required.
- No calculation-helper changes were required.
- No UI changes were required.
- No model-calibration behavior was introduced.
- Validation completed:
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `120/120` static pages successfully.
  - `/api/fleet/route-prediction-performance` remained registered as a dynamic route.
  - `git diff --check` passed.
  - `git diff --cached --check` passed.
- Implementation commit: `d816d49` (`Validate route prediction performance filters`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical.
- Outcome Learning performance queries now have deterministic handling for malformed and inverted time-window inputs.
- Next step: audit the smallest useful consumer for prediction-performance metrics before introducing any model-adjustment logic.

### Route Prediction Performance Analytics Consumer

- Continued the audit-first Outcome Learning roadmap after validating filtered performance inputs.
- Audited existing Analytics, Risk Dashboard, Command Center and Fleet consumer patterns before adding the first prediction-performance UI.
- Confirmed Analytics is the smallest appropriate consumer because it already:
  - represents historical performance,
  - owns an existing selected reporting period,
  - uses responsive KPI/card patterns,
  - avoids mixing model evaluation into live operational surfaces.
- Confirmed Risk Dashboard and Command Center are primarily live/predictive operational surfaces and were intentionally not modified.
- Confirmed Fleet is primarily a live vehicle/map surface and was intentionally not modified.
- Updated `app/analytics/page.tsx`.
- Added authenticated prediction-performance retrieval through `fetchWithAuth()`.
- Added typed client contracts matching the existing performance API:
  - total evaluations,
  - true positives,
  - false positives,
  - false negatives,
  - true negatives,
  - accuracy,
  - precision,
  - recall,
  - false-positive rate,
  - false-negative rate.
- Added a dedicated `loadRoutePredictionPerformance()` client loader.
- The loader calls:
  - `GET /api/fleet/route-prediction-performance`.
- The existing Analytics `startDate` and `endDate` controls are reused.
- Reporting-period boundaries preserve the page's existing inclusive-day semantics:
  - selected start day begins at `00:00:00`,
  - selected end day ends at `23:59:59.999`,
  - both boundaries are converted to ISO timestamps before being sent to the API.
- Prediction-performance data automatically reloads whenever the selected reporting period changes.
- Added loading, error and zero-evaluation states.
- Added a `Route Prediction Performance` Analytics section.
- The first consumer displays:
  - evaluation count,
  - accuracy,
  - precision,
  - recall,
  - true positives,
  - false positives,
  - false negatives,
  - true negatives.
- Undefined ratio metrics remain visually distinct from measured zero values:
  - canonical `null` ratios render as `-`,
  - they are not converted to `0%`.
- The existing API calculator was not changed.
- The performance API was not changed.
- Existing Analytics batch and incident queries were not refactored.
- Existing Analytics reporting/export behavior was not changed.
- No vehicle selector was added.
- No polling was added.
- No additional persistence was added.
- No model-adjustment or calibration behavior was introduced.
- Existing Analytics file encoding was deliberately preserved rather than normalized as collateral work.
- Validation completed:
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `120/120` static pages successfully.
  - `/analytics` remained registered as a static page.
  - `/api/fleet/route-prediction-performance` remained registered as a dynamic route.
  - `git diff --check` passed.
  - `git diff --cached --check` passed.
- Implementation commit: `170f477` (`Show route prediction performance in analytics`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical.
- Outcome Learning now has its first end-user analytics consumer synchronized to the selected reporting period.
- Next step: audit the smallest useful calibration-analysis layer before changing any route-risk scoring weights or thresholds.

### Route Prediction Threshold Analysis

- Continued the audit-first Outcome Learning roadmap after adding the first Analytics performance consumer.
- Audited the existing completed-trip evaluation schema, route-risk scoring references, performance calculator, testing conventions and production prediction threshold before implementing calibration analysis.
- Confirmed completed-trip evaluations already persist the historical inputs required for threshold analysis:
  - `predicted_risk_score`,
  - `prediction_positive_threshold`,
  - `predicted_adverse_event`,
  - `observed_adverse_event`,
  - `classification`.
- Confirmed the current production route-prediction positive threshold remains `35`.
- Confirmed no reusable completed-route threshold-analysis helper previously existed.
- Confirmed no repository test framework or existing unit-test convention is currently configured.
- Added `lib/fleet/analyzeRoutePredictionThresholds.ts`.
- Added a pure analysis contract accepting:
  - predicted risk score,
  - observed adverse-event outcome.
- Added deterministic threshold evaluation across every integer threshold from `0` through `100`, inclusive.
- For each candidate threshold, the helper derives:
  - true positive,
  - false positive,
  - false negative,
  - true negative classifications.
- The helper reuses `calculateRoutePredictionPerformance()` for:
  - total evaluations,
  - accuracy,
  - precision,
  - recall,
  - false-positive rate,
  - false-negative rate.
- Metric formulas were not duplicated.
- The helper intentionally does not:
  - select a preferred threshold,
  - rank thresholds,
  - recommend a production threshold,
  - update the production threshold,
  - modify route-risk scoring,
  - write database rows,
  - expose an API,
  - modify Analytics UI,
  - perform automatic model tuning.
- Existing `PREDICTION_POSITIVE_THRESHOLD = 35` in `evaluateCompletedTripPrediction.ts` was verified unchanged after implementation.
- Existing route prediction persistence was not changed.
- Existing completed-trip evaluation behavior was not changed.
- Existing performance API behavior was not changed.
- Existing Analytics behavior was not changed.
- Validation completed:
  - `npx tsc --noEmit` passed.
  - `npm run build` passed.
  - Next.js production build generated all `120/120` static pages successfully.
  - `git diff --check` passed.
  - `git diff --cached --check` passed.
- Implementation commit: `ae3de45` (`Analyze route prediction thresholds`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical.
- Outcome Learning can now perform analysis-only historical threshold sweeps without modifying production scoring behavior.
- Next step: audit the smallest authenticated organization-scoped read boundary for supplying historical `predicted_risk_score` and `observed_adverse_event` evaluation rows to the threshold-analysis helper without selecting or applying a production threshold.

### Route Prediction Threshold Analysis API

- Continued the audit-first Outcome Learning roadmap after implementing the pure historical threshold-analysis helper.
- Audited the existing performance API, server authentication boundary, route-prediction evaluation schema and existing evaluation readers before exposing threshold analysis.
- Added authenticated read-only endpoint:
  - `GET /api/fleet/route-prediction-threshold-analysis`.
- The endpoint authenticates through `requireOrganization()`.
- All evaluation reads are explicitly scoped to the authenticated `organization_id`.
- Existing Supabase row-level security provides an additional organization-isolation boundary.
- The endpoint reads only the historical fields required for calibration analysis:
  - `predicted_risk_score`,
  - `observed_adverse_event`.
- Database rows are mapped into the existing `RoutePredictionThresholdEvaluation` helper contract.
- The endpoint delegates threshold calculation to `analyzeRoutePredictionThresholds()`.
- Analysis covers every integer threshold from `0` through `100`, inclusive.
- The endpoint supports the same optional slicing contract as route-prediction performance:
  - `vehicleId`,
  - `start`,
  - `end`.
- Time-window filtering is applied to `outcome_completed_at`.
- Invalid `start` values return HTTP `400`.
- Invalid `end` values return HTTP `400`.
- Inverted ranges where `start > end` return HTTP `400`.
- Valid dates are normalized to ISO timestamps before querying.
- The endpoint is read-only.
- No evaluation rows are modified.
- No new persistence was introduced.
- No threshold recommendation or ranking was introduced.
- No automatic threshold selection was introduced.
- No route-risk scoring weights were changed.
- No production model-adjustment behavior was introduced.
- Existing `PREDICTION_POSITIVE_THRESHOLD = 35` was explicitly verified unchanged after implementation.
- Existing performance API behavior was not changed.
- Existing Analytics behavior was not changed.
- Validation completed:
  - `npx tsc --noEmit` passed.
  - `npm run build` passed.
  - Next.js production build generated all `121/121` static pages successfully.
  - `/api/fleet/route-prediction-threshold-analysis` was registered as a dynamic route.
  - `git diff --check` passed.
  - `git diff --cached --check` passed.
- Implementation commit: `91f3b6d` (`Expose route prediction threshold analysis`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical.
- Outcome Learning now exposes authenticated organization-scoped historical threshold-analysis evidence without changing the live production threshold.
- Next step: audit the smallest useful consumer for threshold-analysis evidence before introducing any threshold recommendation or production calibration behavior.

### Route Prediction Threshold Analysis Analytics Consumer

- Continued the audit-first Outcome Learning roadmap after exposing the authenticated threshold-analysis API.
- Audited the existing Analytics performance consumer, chart patterns, threshold-analysis endpoint and production threshold before adding the first threshold-analysis UI.
- Confirmed Analytics is the appropriate consumer because it already:
  - represents historical performance,
  - owns the selected reporting period,
  - uses Recharts,
  - already displays route-prediction performance.
- Updated `app/analytics/page.tsx`.
- Added typed client contracts for route-prediction threshold analysis.
- Added dedicated loading, error and analysis state.
- Added authenticated retrieval through `fetchWithAuth()`.
- Added client request to:
  - `GET /api/fleet/route-prediction-threshold-analysis`.
- The threshold-analysis request reuses the existing Analytics reporting period.
- Selected start dates are sent from local day start at `00:00:00`.
- Selected end dates are sent through `23:59:59.999`.
- Both boundaries are normalized to ISO timestamps before being sent to the API.
- Threshold analysis reloads automatically when the selected Analytics date range changes.
- Added historical chart data for:
  - threshold,
  - precision,
  - recall.
- Precision and recall are converted to percentage display values.
- Canonical `null` precision/recall values remain `null` in chart data and are not converted to `0`.
- Added `Route Prediction Threshold Analysis` section directly after the existing route-prediction performance section.
- Added a read-only Recharts line chart across thresholds `0` through `100`.
- The chart displays:
  - Precision,
  - Recall.
- The current live production threshold is clearly labeled:
  - `35`.
- Tooltip labeling identifies threshold `35` as the current production threshold.
- The UI explicitly states that threshold analysis is analysis-only.
- No preferred threshold is calculated.
- No threshold ranking is calculated.
- No "optimal" threshold is displayed.
- No automatic calibration behavior was introduced.
- No mutation endpoint was introduced.
- No threshold-analysis API changes were required.
- No threshold-analysis helper changes were required.
- No database changes were required.
- Existing `PREDICTION_POSITIVE_THRESHOLD = 35` was explicitly verified unchanged.
- Validation completed:
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `121/121` static pages successfully.
  - `/analytics` remained registered as a static page.
  - `/api/fleet/route-prediction-threshold-analysis` remained registered as a dynamic route.
  - `git diff --check` passed.
  - `git diff --cached --check` passed.
- Implementation commit: `f8f8e3b` (`Show route prediction threshold analysis`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical.
- Outcome Learning now exposes historical precision/recall behavior across candidate thresholds directly in Analytics while keeping production classification fixed at `35`.
- Next step: audit whether the next smallest value is comparison guidance around the current threshold or a statistically safer minimum-sample / confidence layer before introducing any threshold recommendation.

### Route Prediction Threshold Evidence Guidance

- Continued the audit-first Outcome Learning roadmap after adding the first threshold-analysis Analytics consumer.
- Audited HarborGuard for existing model-evaluation sample-size, statistical-confidence, minimum-observation and evidence-sufficiency conventions before introducing any threshold recommendation.
- Confirmed there is no existing HarborGuard statistical sample-sufficiency convention that can be safely reused for route-prediction calibration.
- Confirmed existing uses of confidence elsewhere in HarborGuard relate to operational/provider/model confidence and are not statistical confidence intervals for completed-trip prediction evaluation.
- Confirmed existing minimum-sample rules in telemetry detection are operational detection thresholds and should not be reused as statistical evidence standards.
- Deliberately did not introduce an arbitrary minimum evaluation count such as 10, 20, 30 or 100.
- Deliberately did not label historical threshold evidence as statistically sufficient or insufficient.
- Deliberately did not add confidence intervals.
- Deliberately did not add a preferred, recommended or optimal threshold.
- Updated `app/analytics/page.tsx`.
- Added `routePredictionThresholdEvaluationCount`.
- The evidence count is derived from the existing threshold-analysis payload:
  - `routePredictionThresholdAnalysis[0]?.performance.totalEvaluations ?? 0`.
- No API change was required because every threshold-analysis result already carries the same completed evaluation count.
- No threshold-analysis helper change was required.
- No database change was required.
- Added an Analytics badge displaying the number of completed evaluations underlying the threshold curves.
- The existing production threshold badge remains visible alongside the evidence count.
- Added interpretation guidance explaining that:
  - the chart is based on the displayed number of completed route-prediction evaluations in the selected period,
  - smaller evaluation sets provide more limited evidence,
  - smaller evaluation sets should therefore be interpreted cautiously.
- The guidance does not define a hard minimum-sample cutoff.
- The existing analysis-only statement remains in place.
- HarborGuard still does not automatically recommend or apply a production threshold from the threshold-analysis chart.
- Existing `PREDICTION_POSITIVE_THRESHOLD = 35` was explicitly verified unchanged.
- Existing route-prediction performance behavior was not changed.
- Existing threshold-analysis API behavior was not changed.
- Existing threshold-analysis helper behavior was not changed.
- Existing completed-trip evaluation behavior was not changed.
- Validation completed:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `121/121` static pages successfully.
  - `/analytics` remained registered as a static page.
  - `/api/fleet/route-prediction-performance` remained registered as a dynamic route.
  - `/api/fleet/route-prediction-threshold-analysis` remained registered as a dynamic route.
  - `git diff --cached --check` passed.
- Implementation commit: `68a58e3` (`Show threshold analysis evidence count`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `68a58e3442891e8ac405e709af8848fa646ec24e`.
- Outcome Learning threshold analysis now exposes both the precision/recall tradeoff and the amount of completed-trip evidence underlying that analysis without overstating statistical certainty.
- Next step: audit the smallest safe comparison layer around the current production threshold of `35`—for example, showing how nearby candidate thresholds compare—without selecting or applying a recommended threshold.

### Route Prediction Threshold Comparison

- Continued the audit-first Outcome Learning roadmap after adding threshold-analysis evidence-count guidance.
- Audited the existing threshold-analysis helper, API, Analytics consumer, comparison patterns and production-threshold references before implementing comparison UI.
- Confirmed the existing threshold-analysis payload already contains performance for every integer threshold from `0` through `100`.
- Confirmed no new API, database or threshold-analysis helper was required.
- Updated `app/analytics/page.tsx`.
- Added read-only derived comparison data for thresholds:
  - `30`,
  - `35`,
  - `40`.
- Comparison data is derived directly from the existing `routePredictionThresholdAnalysis` array.
- Threshold `35` remains the current production reference.
- Threshold `30` and threshold `40` are shown only as nearby historical comparison points.
- Added three comparison cards beneath the existing threshold-analysis chart.
- Each comparison card displays:
  - threshold,
  - precision,
  - recall.
- Threshold `35` is visually marked as `Production`.
- Nullable precision and recall values remain represented as unavailable rather than being converted to zero.
- No threshold is labeled better, preferred, safer, recommended or optimal.
- No ranking algorithm was introduced.
- No score combining precision and recall was introduced.
- No automatic calibration behavior was introduced.
- No mutation behavior was introduced.
- Existing evidence-count guidance remains in place.
- Existing analysis-only guidance remains in place.
- Existing `PREDICTION_POSITIVE_THRESHOLD = 35` was explicitly verified unchanged.
- Existing route-prediction threshold-analysis API was not modified.
- Existing route-prediction threshold-analysis helper was not modified.
- Existing completed-trip evaluation behavior was not modified.
- Validation completed:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `121/121` static pages successfully.
  - `/analytics` remained registered as a static page.
  - `/api/fleet/route-prediction-performance` remained registered as a dynamic route.
  - `/api/fleet/route-prediction-threshold-analysis` remained registered as a dynamic route.
  - `git diff --cached --check` passed.
- Implementation commit: `5a7185b` (`Compare route prediction thresholds`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `5a7185b975e59861251be77942ca9774284432ce`.
- Outcome Learning now allows operators to compare nearby candidate thresholds around the live threshold of `35` without turning historical evidence into an automatic recommendation.
- Next step: audit whether the next smallest safe value is explicit delta-to-production guidance for the nearby comparisons or whether Outcome Learning should pause recommendation work until more completed-trip evidence exists.

### Route Prediction Threshold Delta Guidance

- Continued the audit-first Outcome Learning roadmap after adding the read-only `30 / 35 / 40` threshold comparison.
- Audited the existing comparison cards, evidence guidance, performance metric shape and repository delta/change presentation patterns before adding any comparative guidance.
- Confirmed HarborGuard does not have an established statistical or percentage-point comparison convention that must be reused here.
- Confirmed the existing threshold comparison already provides a safe production reference at threshold `35`.
- Updated `app/analytics/page.tsx`.
- Added `routePredictionProductionThreshold`.
- The production comparison reference is derived from the existing `routePredictionThresholdComparison` array by selecting threshold `35`.
- No API change was required.
- No database change was required.
- No threshold-analysis helper change was required.
- No completed-trip evaluation change was required.
- Added neutral precision deltas against the production threshold.
- Added neutral recall deltas against the production threshold.
- Deltas are calculated in percentage points:
  - `(candidate metric - production metric) * 100`.
- Deltas are displayed using `pp` rather than relative percentage change.
- Positive deltas receive a `+` prefix.
- Negative deltas retain the normal negative sign.
- The production threshold card does not display a meaningless `0.0 pp` delta.
- Delta output is suppressed when either the candidate or production metric is unavailable.
- Existing nullable metric behavior remains unchanged.
- Delta text is descriptive only and uses the label:
  - `vs production`.
- No green/red interpretation was introduced.
- No directional arrows implying good/bad were introduced.
- No `better`, `worse`, `recommended`, `optimal` or `best threshold` language was introduced.
- No threshold ranking was introduced.
- No combined score was introduced.
- No automatic calibration behavior was introduced.
- No threshold mutation behavior was introduced.
- Existing evidence-count guidance remains in place.
- Existing small-sample caution remains in place.
- Existing analysis-only guidance remains in place.
- Existing `PREDICTION_POSITIVE_THRESHOLD = 35` was explicitly verified unchanged.
- Validation completed:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `121/121` static pages successfully.
  - `/analytics` remained registered as a static page.
  - `/api/fleet/route-prediction-performance` remained registered as a dynamic route.
  - `/api/fleet/route-prediction-threshold-analysis` remained registered as a dynamic route.
  - `git diff --cached --check` passed.
- Implementation commit: `f58bb3b` (`Show route prediction threshold deltas`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `f58bb3bd3e838491c3294812e6711fbe4727b336`.
- Outcome Learning now shows how nearby historical candidate thresholds differ from the live production threshold in precision and recall without interpreting those deltas as recommendations.
- Next step: pause automatic threshold recommendation work and audit whether the next smallest safe value is richer historical evidence collection, longer-window/vehicle-specific calibration review, or another Outcome Learning consumer that uses the existing evaluation data without changing production threshold behavior.

### Route Prediction Vehicle Outcome Filtering

- Continued the audit-first Outcome Learning roadmap after adding neutral threshold delta guidance.
- Audited the existing Analytics reporting controls, vehicle data, route-prediction performance consumer and route-prediction threshold-analysis consumer before adding vehicle-level historical filtering.
- Confirmed the existing route-prediction analytics APIs already support a `vehicleId` filter, so no API change was required.
- Updated `app/analytics/page.tsx`.
- Added a vehicle selector to the existing Analytics reporting controls.
- The selector supports:
  - `All vehicles`,
  - individual vehicles from the existing fleet vehicle data.
- Added `routePredictionVehicleId` client state for the selected historical vehicle scope.
- The selected vehicle is passed as `vehicleId` to:
  - `GET /api/fleet/route-prediction-performance`,
  - `GET /api/fleet/route-prediction-threshold-analysis`.
- Both route-prediction analytics requests automatically reload when the selected vehicle changes.
- Existing date-range filtering remains in place and combines with the selected vehicle scope.
- Selecting `All vehicles` preserves the existing fleet-wide historical behavior.
- Vehicle filtering is read-only analytics behavior.
- No production prediction behavior was changed.
- No completed-trip evaluation behavior was changed.
- No route-prediction performance API behavior was changed.
- No route-prediction threshold-analysis API behavior was changed.
- No database change was required.
- No automatic calibration behavior was introduced.
- No threshold recommendation behavior was introduced.
- No threshold mutation behavior was introduced.
- Existing `PREDICTION_POSITIVE_THRESHOLD = 35` was explicitly verified unchanged.
- Validation completed:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `121/121` static pages successfully.
  - `/analytics` remained registered as a static page.
  - `/api/fleet/route-prediction-performance` remained registered as a dynamic route.
  - `/api/fleet/route-prediction-threshold-analysis` remained registered as a dynamic route.
  - `git diff --cached --check` passed before the implementation commit.
- Implementation commit: `9a641ac` (`Filter route prediction outcomes by vehicle`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `9a641ac9e2d76da6db0a218fb0887e64ac168ba4`.
- Outcome Learning can now review completed route-prediction performance and threshold behavior for an individual vehicle while retaining the existing fleet-wide view and keeping the live production threshold fixed at `35`.
- Next step: audit whether the next smallest safe Outcome Learning improvement is a longer historical calibration window, vehicle-to-fleet comparison guidance, or another evidence consumer that improves interpretation without automatically changing production prediction behavior.

### Route Prediction Vehicle-to-Fleet Performance Benchmark

- Continued the audit-first Outcome Learning roadmap after adding vehicle-level route-prediction outcome filtering.
- Audited the existing route-prediction performance panel, vehicle filtering behavior, performance metric shape and fleet-wide analytics behavior before adding comparison guidance.
- Confirmed the existing `GET /api/fleet/route-prediction-performance` endpoint already supports both fleet-wide and vehicle-filtered historical performance, so no API change was required.
- Updated `app/analytics/page.tsx`.
- Added a read-only fleet benchmark when an individual vehicle is selected in Analytics.
- The selected vehicle performance continues to use the existing vehicle-filtered route-prediction performance request.
- Added a separate fleet-wide route-prediction performance request for the same selected reporting period.
- The fleet benchmark deliberately omits `vehicleId`, preserving organization-wide fleet scope.
- Vehicle and fleet performance are therefore compared over the same date range.
- Selecting `All vehicles` preserves the existing fleet-wide performance presentation and does not show a redundant vehicle-versus-fleet comparison.
- Added vehicle-to-fleet comparison guidance for:
  - evaluation count,
  - accuracy,
  - precision,
  - recall.
- Accuracy, precision and recall comparisons are expressed as neutral percentage-point deltas against fleet performance.
- Percentage-point deltas are calculated as:
  - `(vehicle metric - fleet metric) * 100`.
- Positive deltas receive a `+` prefix.
- Negative deltas retain the normal negative sign.
- Nullable metrics remain unavailable when either side of the comparison does not provide the required metric.
- Evaluation counts are shown for both the selected vehicle and fleet benchmark so operators can see the amount of completed-trip evidence underlying each scope.
- Comparison language is descriptive only.
- No green/red good-or-bad interpretation was introduced.
- No vehicle ranking was introduced.
- No fleet ranking was introduced.
- No preferred, recommended or optimal threshold behavior was introduced.
- No automatic calibration behavior was introduced.
- No threshold mutation behavior was introduced.
- No production prediction behavior was changed.
- No completed-trip evaluation behavior was changed.
- No route-prediction performance API behavior was changed.
- No database change was required.
- Existing `PREDICTION_POSITIVE_THRESHOLD = 35` was explicitly verified unchanged.
- Validation completed:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `121/121` static pages successfully.
  - `/analytics` remained registered as a static page.
  - `/api/fleet/route-prediction-performance` remained registered as a dynamic route.
  - `/api/fleet/route-prediction-threshold-analysis` remained registered as a dynamic route.
  - `git diff --cached --check` passed before the implementation commit.
- Implementation commit: `ef3808a` (`Compare vehicle route prediction performance with fleet`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `ef3808ada9d87f9630c1d67ab6c94255236c6a88`.
- Outcome Learning can now compare an individual vehicle's completed route-prediction performance with fleet-wide performance over the same reporting period while keeping the comparison read-only and the live production threshold fixed at `35`.
- Next step: audit the smallest safe next Outcome Learning improvement using the existing historical evidence, with particular attention to longer-window calibration evidence or another interpretation layer that does not automatically change production prediction behavior.

### Route Prediction Historical Window Presets

- Continued the audit-first Outcome Learning roadmap after adding the vehicle-to-fleet route-prediction performance benchmark.
- Audited the existing Analytics reporting controls, date-range state, vehicle filtering, route-prediction performance consumer and threshold-analysis consumer before adding longer historical review controls.
- Updated `app/analytics/page.tsx`.
- Added read-only historical window presets for:
  - `30 days`,
  - `90 days`,
  - `180 days`.
- Added `applyHistoricalWindow(days)` to update the existing Analytics `startDate` and `endDate` state.
- Selecting a historical window sets the reporting end date to the current date and moves the reporting start date backward by the selected number of days.
- The presets reuse the existing reporting date-range state rather than introducing a separate calibration data path.
- Existing route-prediction analytics consumers therefore continue to use the selected reporting period through their existing date filtering.
- Existing manual start-date and end-date controls remain available.
- Existing vehicle filtering remains available and can be combined with the selected historical reporting window.
- The historical-window controls are evidence-review controls only.
- No production prediction behavior was changed.
- No completed-trip evaluation behavior was changed.
- No route-prediction performance API behavior was changed.
- No route-prediction threshold-analysis API behavior was changed.
- No database change was required.
- No automatic calibration behavior was introduced.
- No automatic threshold recommendation behavior was introduced.
- No threshold mutation behavior was introduced.
- Existing `PREDICTION_POSITIVE_THRESHOLD = 35` was explicitly verified unchanged.
- Validation completed before the implementation commit:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `121/121` static pages successfully.
  - `/analytics` remained registered as a static page.
  - `/api/fleet/route-prediction-performance` remained registered as a dynamic route.
  - `/api/fleet/route-prediction-threshold-analysis` remained registered as a dynamic route.
  - `git diff --cached --check` passed before the implementation commit.
- Implementation commit: `f0b3cc4` (`Add route prediction historical window presets`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `f0b3cc45c8673946615cd543b1cccbc2e6452cd9`.
- Outcome Learning can now quickly review route-prediction evidence over 30-day, 90-day and 180-day historical windows while retaining manual date selection, vehicle-level filtering and fleet-wide comparison behavior.
- The historical windows remain descriptive evidence scopes and do not imply that any window is statistically sufficient for calibration or that any candidate threshold should replace the live threshold of `35`.
- Next step: audit the evidence now available across historical windows and vehicle/fleet scopes to identify the smallest safe interpretation improvement, without introducing automatic calibration, threshold recommendation or production-threshold mutation.

## Outcome Learning — Historical Scope Interpretation Guidance

- Audited the existing route-prediction Outcome Learning analytics after historical window presets and vehicle-level filtering were available.
- Confirmed both route-prediction performance and threshold-analysis evidence already follow the selected reporting period and vehicle scope.
- Identified one interpretation gap: the threshold-analysis description did not explicitly explain that changing the reporting period or vehicle changes the historical evidence set being reviewed.
- Updated `app/analytics/page.tsx` so the Route Prediction Threshold Analysis description now states that:
  - historical precision and recall apply to the selected reporting period and vehicle scope;
  - changing either scope changes the historical evidence being reviewed;
  - differences between views are descriptive;
  - differences between views do not imply that the production threshold should change.
- No API, database, scoring, prediction, threshold-analysis helper, or production classification behavior was changed.
- Existing analysis-only guidance remains in place and HarborGuard still does not automatically recommend or apply a production threshold.
- Existing production `PREDICTION_POSITIVE_THRESHOLD = 35` remained unchanged.
- Validation completed:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `121/121` static pages successfully.
  - `/analytics` remained registered as a static page.
  - `/api/fleet/route-prediction-performance` remained registered as a dynamic route.
  - `/api/fleet/route-prediction-threshold-analysis` remained registered as a dynamic route.
  - `git diff --cached --check` passed before the implementation commit.
- Implementation commit: `cd24ecf` (`Clarify route prediction outcome scope`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `cd24ecf415cb6bf52b21b41aa1131d7f3b3db3c1`.
- Outcome Learning now makes the relationship between historical evidence scope and displayed threshold metrics explicit without introducing automated calibration or changing live prediction behavior.
- Next step: audit whether another small, evidence-backed Outcome Learning interpretation gap remains. If no precise gap is found, close this Outcome Learning improvement sequence rather than adding redundant analytics or automatic threshold-selection behavior.
## Outcome Learning - Route Prediction Improvement Sequence Closure

- Completed an audit-only review after adding historical scope interpretation guidance.
- Audited the existing route-prediction performance consumer, threshold-analysis consumer, reporting-period behavior, vehicle filtering, vehicle-to-fleet comparison behavior, threshold-analysis API, performance API, threshold-analysis helper and live production threshold.
- Confirmed route-prediction performance and threshold analysis continue to use the selected reporting period and optional vehicle scope.
- Confirmed both analytics APIs remain organization-scoped and read-only.
- Confirmed threshold analysis remains retrospective historical analysis and does not mutate production prediction behavior.
- Confirmed the existing UI explicitly explains that changing reporting period or vehicle scope changes the historical evidence being reviewed and that differences between views are descriptive.
- Confirmed existing Outcome Learning capabilities already provide:
  - completed-trip route-prediction performance;
  - historical threshold analysis;
  - evidence-count and small-sample interpretation guidance;
  - nearby `30 / 35 / 40` threshold comparison;
  - neutral precision and recall deltas against production threshold `35`;
  - vehicle-level historical filtering;
  - vehicle-to-fleet performance comparison;
  - `30 / 90 / 180` day historical review presets;
  - explicit historical reporting-period and vehicle-scope interpretation guidance.
- No additional precise, evidence-backed interpretation gap was identified during this audit.
- No implementation change was made.
- No API change was made.
- No database change was made.
- No scoring or completed-trip evaluation change was made.
- No automatic calibration, threshold recommendation or threshold mutation behavior was introduced.
- Existing production `PREDICTION_POSITIVE_THRESHOLD = 35` remains unchanged.
- This Outcome Learning route-prediction improvement sequence is therefore closed rather than extending it with redundant analytics or unsupported automatic threshold-selection behavior.
- Future route-prediction calibration work should be reopened only when additional completed-trip evidence or a concrete operator requirement identifies a new, specific gap.
- Next step: return to the broader HarborGuard engineering roadmap and audit the next highest-value incomplete capability using the standard audit-first workflow.

## 2026-08-07 - Configurable route safety profiles

- Completed a focused audit of HarborGuard safer-route behavior before implementation.
- Confirmed that safer rerouting using organization-scoped aggregated `road_risk_segments` already existed and did not need to be rebuilt.
- Confirmed that `calculateHereRoutes()` already requested HERE route alternatives, calculated route safety evidence, and ranked candidate routes.
- Identified the precise remaining gap as configurable route-ranking profiles rather than missing rerouting infrastructure.
- Added explicit routing profiles in `lib/routing/hereRouting.ts`:
  - `safest`
  - `fastest`
  - `balanced`
- Preserved `safest` as the default routing profile so all existing callers retain the previous production safety-first behavior unless they explicitly request another profile.
- `safest` preserves the existing ranking behavior:
  - higher route safety score first;
  - shorter duration as the tie-breaker.
- `fastest` ranks by route duration first and uses safety score as a tie-breaker.
- `balanced` uses a deterministic profile score weighted:
  - 70% route safety;
  - 30% relative duration.
- Added per-route `routingProfile`, `durationScore`, and `profileScore` evidence to make profile ranking explicit and inspectable.
- Added the selected `routingProfile` to the HERE routing result.
- Updated `/api/route-safety/reroute` to accept an optional `routingProfile`.
- The reroute API defaults omitted or unsupported profile values to `safest`.
- Existing Command Center, dispatch, and automatic critical-risk rerouting callers therefore remain safety-first without requiring caller changes.
- Emergency Response was intentionally not added during this change because its ranking requirements need separate evidence and operational definition.
- No Command Center routing-profile selector was added yet; this change establishes and validates the backend contract first.
- Validation completed before commit:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `121/121` static pages successfully.
  - `/api/route-safety/reroute` remained registered as a dynamic route.
  - `git diff --cached --check` passed before the implementation commit.
- Implementation commit: `0e410c1` (`Add configurable route safety profiles`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `0e410c12623eaddf610b2e6ee493f98a1824bf11`.
- HarborGuard now has an explicit backend route-ranking contract that can support operator-selectable route strategy without weakening the established safety-first default.
- Next step: audit the Command Center safer-route request and presentation path for the smallest safe UI change that allows an operator to choose `Safest`, `Fastest`, or `Balanced` while keeping automatic critical-risk rerouting fixed to the safest default.

## 2026-08-07 - Operator-selectable route safety profiles

- Completed a focused audit of the Command Center safer-route request and presentation path after the configurable route-safety profile backend contract was established.
- Confirmed the backend already supports explicit `safest`, `fastest`, and `balanced` routing profiles through `/api/route-safety/reroute`.
- Identified the precise remaining gap as operator profile selection in the Command Center rather than additional routing or ranking infrastructure.
- Added Command Center routing-profile state with `safest` as the initial/default operator selection.
- Added an operator-visible Route Strategy selector with:
  - `Safest`
  - `Balanced`
  - `Fastest`
- Propagated the selected routing profile through the existing Command Center operations and route-safety presentation path.
- Updated explicit operator safer-route requests so the selected routing profile is sent to `/api/route-safety/reroute`.
- Existing safer-route request behavior, route presentation and reroute result handling remain in place.
- The selector affects explicit operator-requested safer-route evaluation only.
- Automatic critical-risk prediction/rerouting behavior was intentionally left unchanged and continues to rely on the backend safety-first default rather than operator UI state.
- `app/api/route-safety/predict/route.ts` was explicitly verified untouched.
- No database schema change was required.
- No route-risk evidence calculation change was required.
- No HERE route-ranking algorithm change was required because the configurable profile contract was already implemented and validated separately.
- The implementation was limited to:
  - `app/command-center/hooks/useCommandCenterRouteSafety.ts`
  - `app/command-center/page.tsx`
  - `app/command-center/sections/CommandCenterOperationsPanelSection.tsx`
  - `app/command-center/sections/CommandCenterRouteSafetySection.tsx`
- Validation completed:
  - `git diff --check` passed.
  - `npx tsc --noEmit` passed with exit code `0`.
  - `npm run build` passed with exit code `0`.
  - Next.js production build generated all `121/121` static pages successfully.
  - `git diff --cached --check` passed before the implementation commit.
- Implementation commit: `0016d8f` (`Add operator routing profile selection`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `0016d8fa29502dfa9b07f7c4d4b960567de78a9b`.
- HarborGuard operators can now explicitly choose `Safest`, `Balanced`, or `Fastest` when requesting a safer route while existing callers and automatic critical-risk behavior retain the established safety-first default.
- Next step: audit the broader HarborGuard engineering roadmap for the next highest-value incomplete capability using the standard audit-first workflow rather than extending route-profile behavior without a specific operational requirement.
## 2026-08-08 - Recency-aware operational road-risk segments

- Completed an audit-first review of the broader HarborGuard engineering roadmap after closing the configurable route-profile sequence.
- Audited the canonical aggregated-risk visualization roadmap item before implementation.
- Confirmed aggregated `road_risk_segments` visualization was already substantially implemented and did not need to be rebuilt:
  - `/api/route-safety/segments` already exposed organization-scoped aggregated road-risk evidence;
  - `RoadRiskSegmentsLayer` already rendered geographic segment circles on the Command Center live fleet map;
  - operators already had road-risk visibility and minimum-risk controls;
  - segment popups already exposed detailed supporting incident, traffic, weather, verification and recency evidence.
- Audited segment lifecycle and decay behavior next.
- Confirmed persisted `road_risk_segments.risk_score` remains a cumulative historical aggregate and is not destructively decayed in storage.
- Confirmed HarborGuard already had a canonical shared runtime historical-recency model in `historicalRoadRiskRecencyWeight()`.
- Confirmed that shared recency model was already used by HERE route ranking and Route Safety prediction.
- Identified the precise remaining consistency gap: the operational road-risk segment API and Command Center map still filtered, ranked and styled segments using the raw persisted historical `risk_score`.
- Updated `app/api/route-safety/segments/route.ts` to:
  - preserve the raw persisted `risk_score`;
  - calculate `effective_risk_score` from the raw score and the existing shared `historicalRoadRiskRecencyWeight(segment.last_event_at)`;
  - clamp the effective score to the existing `0-100` operational range;
  - apply `minimumRisk` filtering to effective risk rather than raw historical risk;
  - sort returned segments by effective risk;
  - preserve the requested response `limit` after effective-risk filtering and sorting.
- No new decay formula was introduced.
- No persisted historical road-risk evidence was mutated or deleted.
- No database migration or scheduled decay job was added.
- Updated `components/command-center/RoadRiskSegmentsLayer.tsx` so:
  - map color uses `effective_risk_score`;
  - map stroke emphasis uses `effective_risk_score`;
  - the popup labels the operational value as `Effective risk`;
  - the popup separately exposes the underlying `Historical risk`.
- This keeps operator visualization aligned with HarborGuard's established runtime historical-recency semantics while preserving accumulated historical evidence for diagnostics and learning.
- Existing Route Safety prediction behavior was not changed.
- Existing HERE route-ranking behavior was not changed.
- Existing shared historical-recency bands were not changed.
- Validation completed before the implementation commit:
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed with exit code `0`;
  - `npm run build` passed with exit code `0`;
  - Next.js production build generated all `121/121` static pages successfully;
  - `/api/route-safety/segments` remained registered as a dynamic route;
  - only the intended segment API and Command Center road-risk layer were included in the implementation change;
  - `git diff --cached --check` passed before the implementation commit.
- Implementation commit: `74d03a8` (`Apply recency weighting to road risk segments`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `74d03a87a4029abddf040cd4843664ebbb0cf545`.
- Known scalability follow-up: effective-risk filtering currently requires the segment API to retrieve the organization's candidate segment set before applying runtime recency weighting, effective-risk filtering, sorting and the requested response limit in application memory. This preserves correct semantics but should be revisited if organization segment volume becomes large enough to require bounded/database-assisted candidate retrieval.
- Next step: return to the broader HarborGuard engineering roadmap and audit the next highest-value incomplete capability. Do not extend road-risk decay or mutate persisted historical segment scores without a specific operational or performance requirement.

## 2026-08-08 - CCTV realtime refresh-loop prevention

- Continued the broader HarborGuard roadmap using the audit-first workflow, with performance stabilization selected as the next investigation area rather than extending the recently completed route-risk work.
- Audited Command Center request and polling behavior before making any performance changes.
- Confirmed several Command Center intelligence modules are mounted together and independently refresh operational data.
- Narrowed the first performance-hardening candidate to CCTV monitoring rather than attempting a broad polling or state-management rewrite.
- Audited `components/command-center/CCTVMonitoring.tsx`, `/api/command-center/cctv`, CCTV persistence references and Supabase realtime references before implementation.
- Confirmed CCTV provider polling remains operationally necessary:
  - the CCTV GET endpoint calls the external CCTV/provider integration to obtain current camera snapshots;
  - external camera state can change without HarborGuard first receiving a database event;
  - the existing initial load and 30-second provider refresh therefore remain in place.
- Identified a separate amplification risk in the CCTV realtime path:
  - `CCTVMonitoring` called `GET /api/command-center/cctv`;
  - that GET could persist fresh CCTV snapshots into `cctv_events`;
  - the component also subscribed to `INSERT` events on `cctv_events`;
  - a matching realtime insert could therefore invoke `loadCCTV()` again, causing another GET and another potential insert.
- This formed a potential GET -> `cctv_events` INSERT -> realtime callback -> GET refresh loop if the table is published through Supabase Realtime.
- The repository migration audit did not establish that `cctv_events` is currently included in a Supabase realtime publication, so this work is recorded as prevention of an architectural amplification risk rather than proof of a production incident.
- Updated only `components/command-center/CCTVMonitoring.tsx`.
- Removed the component's direct Supabase dependency.
- Removed the `cctv-events-realtime` subscription and its channel cleanup.
- Preserved the existing immediate `loadCCTV()` call.
- Preserved the existing 30-second `setInterval(loadCCTV, 30000)` provider refresh.
- Preserved `clearInterval(interval)` cleanup when the component unmounts.
- Manual CCTV refresh behavior and the existing CCTV API contract were not changed.
- `/api/command-center/cctv` was not changed.
- CCTV provider integration behavior was not changed.
- CCTV persistence/schema behavior was not changed.
- No database migration was required.
- No broad Command Center polling rewrite was introduced.
- Validation completed before the implementation commit:
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed with exit code `0`;
  - `npm run build` passed with exit code `0`;
  - Next.js production build generated all `121/121` static pages successfully;
  - `/api/command-center/cctv` remained registered as a dynamic route;
  - only `components/command-center/CCTVMonitoring.tsx` was included in the implementation change;
  - `git diff --cached --check` passed before commit.
- Implementation commit: `9299d95` (`Prevent CCTV realtime refresh loop`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `9299d95082d2dcc626e8e30db1a6341010196dc9`.
- Performance principle established by this work: provider polling should not be removed merely because realtime infrastructure exists; polling and realtime must first be audited for authoritative data ownership and feedback paths.
- Next step: continue the performance-stabilization roadmap with another audit-first investigation of demonstrated request, query or write amplification. Select one precise bottleneck before changing code rather than performing a broad Command Center polling cleanup.

## 2026-08-08 - Dashcam realtime refresh-loop prevention

- Continued the performance-stabilization roadmap after the CCTV realtime refresh-loop prevention work.
- Ran a read-only ranking audit across recurring Command Center workloads before selecting another optimization target.
- Compared polling frequency, endpoint work, duplicate consumers, realtime overlap and write side effects rather than treating polling itself as a defect.
- Selected Dashcam monitoring as the strongest next amplification candidate.
- Audited `components/command-center/DashcamMonitoring.tsx`, `/api/command-center/dashcam`, the Dashcam provider layer, `dashcam_events`, `vision_events` and Supabase realtime/publication references before implementation.
- Confirmed the Dashcam component had three refresh mechanisms:
  - an immediate `loadDashcams()` call;
  - a 30-second `setInterval(loadDashcams, 30000)` provider refresh;
  - a `dashcam-events-realtime` Supabase subscription on `INSERT` events for `dashcam_events` whose callback invoked `loadDashcams()` again.
- Confirmed `GET /api/command-center/dashcam` is not a simple read-only endpoint:
  - it loads current Dashcam/provider state;
  - it runs the automatic vision-analysis path for eligible snapshots;
  - it checks persisted processing state;
  - it can query vehicle location;
  - it can insert new `vision_events`;
  - it inserts the current Dashcam snapshot batch into `dashcam_events`;
  - it then rereads persisted Dashcam and recent vision-event state for the response.
- This established a code-level amplification path of GET -> provider/database work -> `dashcam_events` INSERT -> realtime callback -> GET -> another potential `dashcam_events` INSERT.
- The repository migration audit showed explicit Supabase realtime publication configuration for other tables but did not establish that `dashcam_events` is currently included in a realtime publication.
- The work is therefore recorded as prevention of an architectural amplification risk rather than evidence that a production refresh loop was actively occurring.
- Confirmed provider polling remains operationally necessary:
  - `loadDashcams()` selects the configured mock, local or Samsara provider;
  - local/provider-backed modes obtain state outside the HarborGuard database;
  - database realtime events therefore cannot be assumed to represent authoritative external Dashcam freshness.
- Updated only `components/command-center/DashcamMonitoring.tsx`.
- Removed the component's direct Supabase import.
- Removed the `dashcam-events-realtime` subscription.
- Removed `supabase.removeChannel(channel)` cleanup associated with that subscription.
- Preserved the existing immediate `loadDashcams()` call.
- Preserved the existing `loadOpenIncidents()` initialization.
- Preserved the existing 30-second `setInterval(loadDashcams, 30000)` provider refresh.
- Preserved `clearInterval(interval)` cleanup when the component unmounts.
- Preserved the manual Dashcam refresh action.
- `/api/command-center/dashcam` was not changed.
- The Dashcam provider layer was not changed.
- Automatic vision-analysis behavior was not changed.
- `dashcam_events` and `vision_events` persistence behavior was not changed.
- No database migration was required.
- No broad Command Center polling rewrite was introduced.
- Validation completed before the implementation commit:
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed with exit code `0`;
  - `npm run build` passed with exit code `0`;
  - Next.js production build generated all `121/121` static pages successfully;
  - `/api/command-center/dashcam` remained registered as a dynamic route;
  - final `git diff --check` passed;
  - only `components/command-center/DashcamMonitoring.tsx` was included in the implementation change;
  - `git diff --cached --check` passed before commit.
- Implementation commit: `3a905b4` (`Prevent Dashcam realtime refresh loop`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `3a905b47b3b09bffb4bd8312bb37ff88982bf177`.
- Performance principle reinforced by this work: remove demonstrated feedback/amplification paths without discarding polling that remains necessary to obtain authoritative external provider state.
- Next step: continue performance stabilization with another read-only ranking audit of remaining recurring workloads and select one demonstrated request, query or write bottleneck before changing code.

## 2026-08-08 - Executive Operations Dashboard refresh coalescing

- Continued the audit-first performance-stabilization roadmap after the CCTV and Dashcam realtime refresh-loop prevention work.
- Ran a read-only repository-wide ranking audit of remaining recurring Command Center workloads before selecting another optimization target.
- Ranked candidates by recurring frequency, endpoint cost, duplicate consumers, write amplification and realtime overlap.
- Selected `components/command-center/ExecutiveOperationsDashboard.tsx` because it combined four realtime change sources with a 60-second polling fallback around the same dashboard refresh operation.
- Audited the dashboard component, its three API requests, their database behavior and indirect helper chains before changing code.
- Confirmed one `loadExecutiveDashboard()` execution performs three authenticated uncached GET requests in parallel:
  - `/api/fleet/health`;
  - `/api/dispatcher/recommendations`;
  - `/api/command-center/notifications`.
- Confirmed the dashboard subscribed to changes from four tables:
  - `vehicle_alerts`;
  - `vehicle_locations`;
  - `incidents`;
  - `command_center_notifications`.
- Confirmed each realtime event directly invoked the full `loadExecutiveDashboard()` request bundle.
- Confirmed the same loader also ran immediately on mount and every 60 seconds through the existing polling fallback.
- Audited `/api/fleet/health`, `/api/dispatcher/recommendations` and `/api/command-center/notifications` before implementation.
- Confirmed `/api/command-center/notifications` is read-only.
- Confirmed `/api/fleet/health` directly performs read operations and delegates traffic intelligence construction to `buildTrafficIntelligence()`.
- Confirmed `/api/dispatcher/recommendations` delegates recommendation construction to `buildDispatchCopilot()`.
- Audited `buildTrafficIntelligence()`, `buildDispatchCopilot()` and `buildFleetOptimization()` through their indirect call chain.
- Confirmed the audited request/helper chain does not write into `vehicle_alerts`, `vehicle_locations`, `incidents` or `command_center_notifications`.
- Therefore classified the issue as realtime/read amplification rather than a demonstrated write -> realtime -> write feedback loop.
- Updated only `components/command-center/ExecutiveOperationsDashboard.tsx`.
- Preserved the immediate initial dashboard load.
- Preserved all four existing Supabase realtime subscriptions.
- Preserved the existing 60-second polling fallback.
- Preserved the existing three dashboard API requests and their response/UI semantics.
- Added an in-flight guard so multiple dashboard refreshes cannot execute concurrently.
- Added a queued-refresh flag so refresh requests received while a load is active collapse into one subsequent refresh instead of being lost or multiplying concurrent request bundles.
- Added a 250 ms realtime debounce window so bursts across the four subscribed tables collapse into a single scheduled dashboard refresh.
- Routed the 60-second polling fallback through the same guarded dashboard loader.
- Added disposal protection so refresh work is not started after component unmount.
- Added cleanup for a pending realtime debounce timer.
- Preserved Supabase channel removal and interval cleanup.
- No API route was changed.
- No helper/service implementation was changed.
- No database migration was required.
- No realtime subscription was removed.
- No broad Command Center polling rewrite was introduced.
- Validation completed before the implementation commit:
  - exact effect boundaries and pre-change callback structure were verified before editing;
  - the existing UTF-8 BOM was preserved;
  - only `components/command-center/ExecutiveOperationsDashboard.tsx` changed;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - Next.js production build compiled successfully and generated all `121/121` static pages;
  - the implementation diff contained `55` insertions and `6` deletions;
  - staged diff validation passed before commit.
- Implementation commit: `6ebb9b3` (`Coalesce executive dashboard realtime refreshes`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `6ebb9b3045c73d36e358527764c2d4258cd1bc01`.
- Performance principle reinforced by this work: preserve realtime freshness and polling fallbacks when they serve distinct reliability purposes, while coalescing burst triggers before they multiply expensive aggregate reads.
- Next step: continue performance stabilization with another read-only ranking audit of the remaining recurring workloads and select one demonstrated bottleneck before changing code.

## 2026-08-08 - Risk Dashboard refresh coalescing

- Continued the audit-first performance-stabilization roadmap after the Executive Operations Dashboard refresh-coalescing work.
- Ran another read-only ranking audit of remaining recurring frontend workloads before selecting the next optimization target.
- Selected `app/risk-dashboard/page.tsx` as the next focused candidate rather than performing a broad application polling rewrite.
- Audited the Risk Dashboard refresh lifecycle, API usage, realtime subscriptions, polling behavior, visibility handling and exact effect boundaries before implementation.
- Confirmed the Risk Dashboard already combined multiple refresh triggers around the same dashboard data load.
- Confirmed the existing visible-page polling cadence remained operationally useful and should not be removed merely because realtime refresh paths exist.
- Identified the precise performance gap as overlapping and burst-triggered refresh work rather than the existence of the polling fallback itself.
- Updated only `app/risk-dashboard/page.tsx`.
- Preserved the existing initial Risk Dashboard load.
- Preserved the existing Supabase realtime behavior.
- Preserved the existing 15-second visible-page refresh cadence.
- Preserved the existing page-visibility behavior so recurring refresh work remains tied to the visible dashboard state.
- Added refresh coalescing so overlapping refresh triggers do not multiply concurrent dashboard request work.
- Added in-flight protection around Risk Dashboard loading.
- Added queued-refresh behavior so a refresh requested while work is active is collapsed into a subsequent refresh rather than spawning overlapping work or being silently discarded.
- Added short realtime refresh scheduling/coalescing so bursts of realtime activity collapse before invoking the dashboard loader repeatedly.
- Preserved cleanup behavior for timers/subscriptions associated with the page lifecycle.
- No API route was changed.
- No backend helper or service implementation was changed.
- No database schema or migration change was required.
- No realtime subscription was removed.
- No broad application polling rewrite was introduced.
- Validation completed before the implementation commit:
  - the exact Risk Dashboard effect boundaries and refresh paths were audited before editing;
  - only `app/risk-dashboard/page.tsx` was included in the implementation change;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build completed successfully;
  - the implementation diff contained `63` insertions and `12` deletions;
  - staged diff validation passed before commit.
- Implementation commit: `f9801df` (`Coalesce risk dashboard refreshes`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `f9801dfc188d20a799360294c287ac6b11790d2d`.
- Performance principle reinforced by this work: preserve useful operational freshness mechanisms while routing competing refresh triggers through one guarded, coalesced execution path instead of allowing polling and realtime activity to create overlapping request work.
- Next step: continue the audit-first performance-stabilization roadmap by ranking the remaining recurring workloads and selecting one demonstrated request, query or write bottleneck before making another focused change.

## 2026-08-08 - Route Safety alert polling coordination

- Continued the audit-first performance-stabilization roadmap after completing Risk Dashboard refresh coordination.
- Ran a read-only ranking audit of remaining recurring frontend workloads before selecting the next target.
- Selected `app/route-safety/page.tsx` because it retained a direct 10-second alert polling loop rather than the coordinated refresh behavior already introduced in higher-priority dashboard surfaces.
- Audited the Route Safety page, `/api/route-safety/nearby`, duplicate callers, database operations, query bounds, application-side distance processing and realtime coverage before implementation.
- Confirmed `/api/route-safety/nearby` is a read-only endpoint.
- Confirmed the nearby endpoint queries active, non-expired organization alerts and then performs distance filtering and result sorting in application code.
- Confirmed the Route Safety page requested browser geolocation and `/api/route-safety/nearby` immediately and every 10 seconds while mounted.
- Confirmed the existing polling loop had no page-visibility guard and no in-flight refresh coordination.
- Confirmed `loadSafetyAlerts()` previously returned before its callback-based `navigator.geolocation.getCurrentPosition()` and subsequent alert fetch completed, meaning simply awaiting the function would not have provided genuine concurrency protection.
- Kept the existing 10-second visible-page freshness cadence because location movement can change which alerts are nearby even when no database row changes.
- Did not replace polling with realtime because database-change notifications alone cannot represent changes caused by vehicle/device movement.
- Updated only `app/route-safety/page.tsx`.
- Converted the geolocation-backed alert loader into an awaitable lifecycle so completion now represents both location acquisition and the subsequent nearby-alert request.
- Added one coordinated automatic refresh path with in-flight protection.
- Added queued-refresh behavior so refresh requests arriving during active work collapse into a subsequent refresh rather than creating overlapping geolocation/request work.
- Added page-visibility awareness so automatic Route Safety polling does not repeatedly perform geolocation and nearby-alert requests while the page is hidden.
- Added a visibility-change refresh when the page becomes visible again.
- Preserved the existing 10-second polling cadence while the page is visible.
- Preserved timer and visibility-listener cleanup on component unmount.
- Preserved the existing manual alert creation flow.
- Preserved the existing HERE incident import flow.
- Preserved the existing alert verification flow.
- Left `/api/route-safety/nearby` unchanged.
- No API route was modified.
- No database schema or migration change was required.
- No realtime subscription was introduced or removed.
- Validation completed before commit:
  - only `app/route-safety/page.tsx` changed;
  - `git diff --check` passed;
  - mutating Route Safety actions remained present;
  - the coordinated refresh structure was verified directly in the source;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build generated all `121/121` static pages successfully;
  - final `git diff --check` passed;
  - staged diff validation passed before commit.
- Implementation commit: `ddef4a5` (`Coordinate Route Safety alert polling`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Performance principle reinforced by this work: recurring location-aware polling can remain operationally useful, but its complete asynchronous lifecycle must be awaitable and coordinated so hidden tabs and overlapping timer cycles do not multiply geolocation and backend request work.
- Next step: continue the audit-first performance-stabilization roadmap by ranking the remaining recurring workloads and selecting one demonstrated request, query or write bottleneck before making another focused change.

## 2026-08-08 - Incident Assignment Board refresh coordination

- Continued the audit-first performance-stabilization roadmap after Route Safety polling coordination.
- Ran a read-only ranking audit of the remaining timer-bearing frontend workloads before selecting another optimization target.
- Selected `components/command-center/IncidentAssignmentBoard.tsx` because it combined an immediate load, an `incidents` realtime subscription and a 60-second polling fallback around the same multi-query board refresh.
- Audited the complete component source, refresh lifecycle, table readers, Command Center composition, schema/index evidence and related history before implementation.
- Confirmed each `loadBoard()` execution:
  - calls `supabase.auth.getUser()`;
  - reads the current user's `organization_id` from `profiles`;
  - reads the latest 30 organization incidents;
  - reads organization profiles used for assignee names and dispatcher workload.
- Confirmed the incidents query is bounded to 30 rows.
- Confirmed the organization profiles query remains intentionally unbounded because the board uses the complete organization profile set to resolve assignment names and workload counts.
- Confirmed every realtime `incidents` change previously invoked `loadBoard()` immediately.
- Confirmed a separate 60-second interval independently invoked the same `loadBoard()` function.
- Confirmed the component had no realtime debounce, in-flight refresh guard, queued refresh behavior or page-visibility protection.
- Confirmed the board is mounted directly in the Command Center intelligence module section rather than behind the nearby deferred-mount boundary.
- Reviewed schema/index evidence and did not make a database index change because the current work item demonstrated duplicate refresh execution more directly than a proven query-plan bottleneck.
- Updated only `components/command-center/IncidentAssignmentBoard.tsx`.
- Preserved the existing initial board load.
- Preserved the existing `incidents` Supabase realtime subscription.
- Preserved the existing 60-second polling fallback.
- Preserved all existing authentication and Supabase query semantics.
- Added an in-flight guard so multiple board refreshes cannot execute concurrently.
- Added queued-refresh behavior so refresh requests received while a board load is active collapse into one subsequent refresh.
- Added a 250 ms realtime debounce window so bursts of incident changes collapse before invoking the multi-query board loader repeatedly.
- Added page-visibility awareness so automatic board refreshes do not continue while the document is hidden.
- Added a visibility-change refresh when the page becomes visible again.
- Preserved cleanup of the Supabase realtime channel and polling interval.
- Added cleanup for a pending realtime debounce timer and the visibility-change listener.
- No API route was changed.
- No Supabase query semantics were changed.
- No database schema or migration was changed.
- No realtime subscription was removed.
- Validation completed before commit:
  - the exact audited refresh effect was verified before replacement;
  - only `components/command-center/IncidentAssignmentBoard.tsx` changed;
  - `git diff --check` passed;
  - the authentication, organization-profile, incident and profile-list queries were verified unchanged;
  - refresh-coordination structure was verified directly in the source;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build generated all `121/121` static pages successfully;
  - final `git diff --check` passed;
  - staged diff validation passed before commit.
- Implementation commit: `5a41d17` (`Coordinate incident assignment refreshes`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote branch hashes were verified identical at `5a41d17d87ca56e4dc6ec38f577944953c796dc8`.
- Performance principle reinforced by this work: retain realtime freshness and polling reliability while routing competing refresh triggers through one guarded execution path and debouncing burst-driven database reloads.
- Next step: continue the audit-first performance-stabilization roadmap by ranking the remaining recurring workloads and selecting one demonstrated request, query or write bottleneck before making another focused change.

## 2026-08-08 - Dispatcher recommendation refresh coordination

- Continued the audit-first performance-stabilization roadmap after Incident Assignment Board refresh coordination.
- Ran a focused frontend audit of `components/command-center/DispatcherRecommendations.tsx` before making changes.
- Confirmed the component loads `/api/dispatcher/recommendations` immediately on mount, on every `vehicle_alerts` realtime event and independently every 60 seconds.
- Confirmed the recommendation request uses authenticated `GET` semantics with `cache: "no-store"`.
- Confirmed the component previously had no realtime debounce, in-flight request protection, queued-refresh behavior or page-visibility protection.
- Audited the `/api/dispatcher/recommendations` backend call chain before selecting the optimization.
- Confirmed the route delegates recommendation construction to the dispatch copilot rather than performing the workload directly in the route.
- Confirmed one dispatcher recommendation request performs a non-trivial backend workload including alert retrieval, fleet optimization and traffic-intelligence processing.
- Investigated whether the traffic-intelligence work inside dispatch copilot and fleet optimization could safely be deduplicated.
- Rejected that backend deduplication because the two traffic-intelligence calls are not guaranteed to represent the same geographic scope:
  - dispatch copilot can use the traffic-intelligence default center;
  - fleet optimization derives its traffic center from available fleet-location coordinates.
- Confirmed `buildFleetOptimization()` also has callers outside Dispatcher Recommendations, so changing its traffic semantics would broaden the work item beyond the demonstrated frontend bottleneck.
- Selected frontend refresh coordination as the smallest safe optimization.
- Updated only `components/command-center/DispatcherRecommendations.tsx`.
- Preserved the existing initial recommendation load.
- Preserved the existing `vehicle_alerts` Supabase realtime subscription.
- Preserved the existing 60-second polling fallback.
- Preserved the existing `/api/dispatcher/recommendations` GET request and `cache: "no-store"` semantics.
- Added an in-flight guard so recommendation refresh requests cannot execute concurrently within one component instance.
- Added queued-refresh behavior so refresh requests received while a recommendation request is active collapse into one subsequent refresh.
- Added a 250 ms realtime debounce window so bursts of `vehicle_alerts` changes collapse before launching the expensive recommendation request chain repeatedly.
- Added page-visibility awareness so automatic recommendation refreshes do not continue while the document is hidden.
- Added a visibility-change refresh when the page becomes visible again.
- Preserved cleanup of the Supabase realtime channel and 60-second polling interval.
- Added cleanup for a pending realtime debounce timer and the visibility-change listener.
- No API route was changed.
- No backend helper was changed.
- No database query semantics were changed.
- No database schema or migration was changed.
- No realtime subscription was removed.
- Validation completed before commit:
  - the audited original refresh effect was verified before replacement;
  - only `components/command-center/DispatcherRecommendations.tsx` changed;
  - `git diff --check` passed;
  - the authenticated recommendation API request was verified unchanged;
  - refresh-coordination structure was verified directly in source;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build generated all `121/121` static pages successfully;
  - final `git diff --check` passed;
  - final tracked scope contained only the target component;
  - staged diff validation passed before commit.
- Implementation commit: `13f73d0` (`Optimize dispatcher recommendation refresh coordination`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Performance principle reinforced by this work: when an expensive backend computation is intentionally triggered by both realtime events and polling, coordinate those triggers at the client boundary before changing backend semantics that serve distinct contexts.
- Next step: continue the audit-first performance-stabilization roadmap by ranking the remaining recurring frontend and backend workloads and selecting one demonstrated bottleneck before making another focused change.

## 2026-08-08 - AI Shift Summary refresh coordination

- Continued the audit-first performance-stabilization roadmap after Dispatcher Recommendations refresh coordination.
- Ran a repository-wide ranking audit of remaining recurring frontend workloads before selecting another target.
- Audited Incident Command Dashboard first and rejected it as the next optimization target because its automatic 30-second refresh performs one bounded organization-scoped incidents query limited to 10 rows.
- Selected AI Shift Summary after a focused frontend and backend audit demonstrated a higher recurring workload.
- Confirmed `components/command-center/AIShiftSummary.tsx` loads `/api/ai/shift-summary` immediately after mount and every 60 seconds.
- Confirmed the existing polling effect had no document-visibility awareness and no in-flight request protection.
- Confirmed the AI Shift Summary component is the only direct caller of `/api/ai/shift-summary`.
- Confirmed the component is mounted through the Command Center intelligence modules section behind deferred mounting.
- Audited `app/api/ai/shift-summary/route.ts` before implementation.
- Confirmed each shift-summary request performs five Supabase reads covering vehicles and recent operational activity from `vehicle_alerts`, `incidents`, `vehicle_trips`, and `command_center_notifications`.
- Confirmed the activity queries cover the preceding eight-hour shift window.
- Confirmed the endpoint does not currently make an external LLM request; the summary and recommendations are constructed deterministically from the retrieved operational data.
- Rejected adding realtime subscriptions in this work item because the summary depends on five separate data sources and doing so would materially broaden the change.
- Rejected API/query-semantic changes because the demonstrated gap was at the client refresh boundary.
- Selected client-side polling coordination as the smallest safe optimization.
- Updated only `components/command-center/AIShiftSummary.tsx`.
- Preserved the existing immediate initial load.
- Preserved the existing 60-second polling cadence while the document is visible.
- Preserved the existing authenticated `GET /api/ai/shift-summary` request and API contract.
- Added an in-flight request guard so AI Shift Summary refresh requests cannot overlap within one component instance.
- Added document-visibility awareness so routine 60-second refreshes do not execute while the page is hidden.
- Added a visibility-change refresh when the document becomes visible again.
- Added cleanup for the visibility-change event listener while preserving interval cleanup.
- No API route was changed.
- No database query was changed.
- No database schema or migration was changed.
- No realtime subscription was added or removed.
- No shift-summary calculation semantics were changed.
- Validation completed before commit:
  - only `components/command-center/AIShiftSummary.tsx` changed;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build generated all `121/121` static pages successfully;
  - the final diff was reviewed before staging;
  - only the target component was staged;
  - the tracked tree was clean after commit.
- Implementation commit: `c800fac` (`Coordinate AI shift summary refresh`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote implementation heads were verified identical at `c800fac80fdd7ac5fda164c75899093f61f556f5`.
- Performance principle reinforced by this work: when a periodically refreshed aggregate fans out into several backend reads, first prevent unnecessary hidden-tab and overlapping executions at the narrow client boundary before changing broader backend or realtime semantics.
- Next step: continue the audit-first performance-stabilization roadmap by ranking the remaining demonstrated recurring workloads and selecting one precise bottleneck before making another focused change.

## 2026-08-08 - Insurance Response Center refresh coordination

- Continued the audit-first performance-stabilization roadmap after AI Shift Summary refresh coordination.
- Ran a fresh repository-wide ranking audit of remaining recurring frontend workloads before selecting another target.
- Compared the remaining 30-second polling surfaces rather than automatically modifying the next timer found.
- Selected Insurance Response Center after the ranking audit identified its recurring `/api/command-center/insurance` workload as the stronger remaining candidate.
- Audited `components/command-center/InsuranceResponseCenter.tsx` and `app/api/command-center/insurance/route.ts` before implementation.
- Confirmed the client previously loaded immediately and then polled `/api/command-center/insurance` every 30 seconds for the component lifetime.
- Confirmed each insurance request performs two bounded Supabase reads: up to 10 unresolved `incidents` and up to 25 unresolved `vehicle_alerts`.
- Confirmed the route constructs insurance packages and summary information from those query results.
- Confirmed `incidents` and `vehicle_alerts` are the actual database dependencies of the current insurance response.
- Confirmed the current route does not directly query separate telemetry, dashcam, CCTV, ANPR, or vision-event tables for the displayed insurance package.
- Confirmed existing Command Center code already establishes Supabase Realtime precedent for both `incidents` and `vehicle_alerts`.
- Rejected API/query changes because both server-side reads are already bounded and the demonstrated gap was the unconditional client refresh loop.
- Rejected subscriptions to unrelated evidence tables because they are not direct dependencies of the current endpoint.
- Selected realtime invalidation plus a slower fallback refresh as the smallest safe optimization.
- Updated only `components/command-center/InsuranceResponseCenter.tsx`.
- Preserved the existing immediate initial load.
- Replaced unconditional 30-second polling with Supabase Realtime refresh triggers for `incidents` and `vehicle_alerts`.
- Added a 500 ms coalescing window so bursts of related realtime changes schedule one refresh rather than one request per event.
- Added an in-flight guard so insurance refresh requests cannot overlap.
- Added queued-refresh handling so a refresh signal arriving during an active request is serviced after that request completes.
- Added a 60-second fallback refresh to preserve eventual freshness if a realtime event is unavailable or missed.
- Added cleanup for the realtime channel, fallback interval, and pending refresh timeout.
- Preserved the existing authenticated `/api/command-center/insurance` API contract.
- No API route was changed.
- No database query was changed.
- No database schema or migration was changed.
- No insurance-package calculation or evidence semantics were changed.
- During the first implementation attempt, PowerShell `Set-Content` altered the file encoding and corrupted existing Unicode characters.
- The failed attempt was not committed.
- Restored `InsuranceResponseCenter.tsx` byte-for-byte from the pre-change safety copy before reapplying the implementation.
- Reapplied the focused change using explicit UTF-8 handling while preserving the file's original UTF-8 BOM and existing Unicode characters.
- Explicitly verified preservation of the existing middle-dot, checkmark, and multiplication-sign characters before validation.
- Validation completed before commit:
  - only `components/command-center/InsuranceResponseCenter.tsx` changed;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build generated all `121/121` static pages successfully;
  - post-build `git diff --check` passed;
  - the final diff was reviewed before staging;
  - only the target component was staged.
- Implementation commit: `42db00f` (`Coordinate insurance response refresh`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote implementation heads were verified identical at `42db00feebc45d66343a7290807ddc81980c1b60`.
- The tracked tree was clean after the implementation push.
- Performance principle reinforced by this work: when an aggregate endpoint has a small, known set of realtime-capable dependencies, prefer coalesced dependency-driven invalidation with a conservative fallback interval over frequent unconditional polling.
- Next step: continue the audit-first performance-stabilization roadmap by ranking the remaining demonstrated recurring workloads before selecting another focused change.

## 2026-08-08 - Incident Command Dashboard refresh coordination

- Continued the audit-first performance-stabilization roadmap after Insurance Response Center refresh coordination.
- Ran a fresh recurring-workload ranking audit from baseline `08bfaa0` before selecting another target.
- Re-evaluated Incident Command Dashboard rather than changing it automatically after earlier audits.
- Confirmed `components/command-center/IncidentCommandDashboard.tsx` still loaded incidents immediately and then polled `/api/incidents/command` every 30 seconds for the component lifetime.
- Confirmed the automatic incident-list refresh had no document-visibility awareness, in-flight guard, queued-refresh handling or realtime invalidation.
- Audited `app/api/incidents/command/route.ts` before implementation.
- Confirmed the recurring no-`incidentId` GET performs one bounded Supabase read from `incidents`.
- Confirmed the incident-list query is organization-scoped, excludes resolved incidents, orders newest-first and is limited to 10 rows.
- Confirmed the selected-incident action GET reads `incident_command_actions` separately and is driven by selected incident state rather than the automatic incident-list timer.
- Confirmed workflow creation and action updates use separate POST/PATCH semantics.
- Preserved those action-workflow semantics unchanged.
- Confirmed existing Command Center code already establishes Supabase Realtime precedent for the `incidents` table.
- Selected incident-list refresh coordination as the smallest safe optimization.
- Updated only `components/command-center/IncidentCommandDashboard.tsx`.
- Preserved the existing authenticated `GET /api/incidents/command` contract.
- Preserved the initial incident load.
- Preserved selected-incident action loading.
- Preserved the existing workflow POST behavior.
- Preserved the existing action PATCH behavior.
- Replaced unconditional 30-second incident polling with Supabase Realtime invalidation on `incidents`.
- Added a 250 ms realtime debounce window so bursts of incident changes collapse before launching another incident-list request.
- Added an in-flight guard so automatic incident-list refreshes cannot overlap.
- Added queued-refresh handling so a refresh signal received during an active request runs once afterward.
- Added document-visibility protection so automatic incident-list refreshes do not run while the page is hidden.
- Added a visibility-change refresh when the document becomes visible again.
- Added a 60-second fallback interval for eventual freshness.
- Added cleanup for the realtime channel, debounce timer, fallback interval and visibility-change listener.
- No API route was changed.
- No database query was changed.
- No database schema or migration was changed.
- No workflow action semantics were changed.
- Preserved the original UTF-8 BOM state of `IncidentCommandDashboard.tsx`.
- Validation completed before commit:
  - only `components/command-center/IncidentCommandDashboard.tsx` changed;
  - `git diff --check` passed;
  - action lifecycle checks passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build generated all `121/121` static pages successfully;
  - post-build `git diff --check` passed;
  - nothing was staged before final review;
  - staged diff validation passed before commit.
- Implementation commit: `388631a` (`Coordinate incident command refresh`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote implementation heads were verified identical at `388631a465d521b765f80b6a6e5b6db181c66b8f`.
- The tracked tree was clean after implementation push.
- Performance principle reinforced by this work: when a frequently polled list is already backed by a small bounded query and has a direct realtime dependency, optimize the client refresh lifecycle before changing server query semantics.
- Next step: continue the audit-first performance-stabilization roadmap with another ranking audit of the remaining recurring workloads.

## 2026-08-08 - Dashcam polling coordination

- Continued the audit-first performance-stabilization roadmap after Incident Command Dashboard refresh coordination.
- Ran a fresh repository-wide recurring-workload ranking audit from baseline `40e6705`.
- Re-evaluated remaining timer-based workloads rather than assuming every `setInterval` represented network polling.
- Excluded non-network timers such as local map interpolation, playback animation and request-abort timeouts from the performance candidate pool.
- Identified CCTV Monitoring and Dashcam Monitoring as the main remaining recurring network polling surfaces.
- Ran a focused comparison audit of `components/command-center/CCTVMonitoring.tsx`, `app/api/command-center/cctv/route.ts`, `components/command-center/DashcamMonitoring.tsx` and `app/api/command-center/dashcam/route.ts`.
- Selected Dashcam Monitoring as the higher-cost target because each automatic Dashcam GET may perform substantially more backend work than CCTV.
- Confirmed `components/command-center/DashcamMonitoring.tsx` loaded Dashcam monitoring immediately and then called `/api/command-center/dashcam` every 30 seconds.
- Confirmed the recurring Dashcam timer called only `loadDashcams()`; `loadOpenIncidents()` remained an initial-load operation.
- Confirmed the manual Refresh Cameras button also calls `loadDashcams()`.
- Audited `app/api/command-center/dashcam/route.ts` before implementation.
- Confirmed a Dashcam GET can load organization vehicles, resolve Dashcam provider state and inspect a current snapshot candidate.
- Confirmed automatic vision processing is capped at one candidate per refresh by `MAX_AUTO_ANALYSES_PER_REFRESH`.
- Confirmed the automatic vision path can check `dashcam_events` or `vision_events` for an already-analysed snapshot.
- Confirmed a new candidate may invoke `analyseFrame()`.
- Confirmed the analysis path can read the vehicle's latest location.
- Confirmed detected results may be inserted into `vision_events`.
- Confirmed the request persists current Dashcam rows into `dashcam_events`.
- Confirmed the request then reads up to 100 persisted Dashcam events and the latest eight vision events for the returned monitoring state.
- Rejected adding Dashcam realtime invalidation because the endpoint itself writes `dashcam_events` and potentially `vision_events`, which could recreate the self-triggering realtime refresh loop previously fixed by commit `3a905b4`.
- Rejected API and database changes because the demonstrated gap was unnecessary hidden-tab polling and possible overlapping client requests.
- Preserved the existing 30-second visible-tab refresh cadence.
- Preserved the existing initial Dashcam load.
- Preserved the existing initial open-incidents load.
- Preserved the existing manual Refresh Cameras behavior.
- Added an in-flight guard inside `loadDashcams()` so automatic, visibility-return and manual Dashcam requests cannot overlap.
- Added guard release in the existing `finally` block.
- Replaced the unconditional 30-second timer callback with a visibility-aware Dashcam refresh wrapper.
- Automatic Dashcam polling now skips requests while `document.visibilityState` is not `visible`.
- Added a `visibilitychange` listener so Dashcam monitoring refreshes when the document becomes visible again.
- Added cleanup for the visibility listener while preserving interval cleanup.
- No Dashcam realtime channel was introduced.
- No API route was changed.
- No database query was changed.
- No database schema or migration was changed.
- No automatic vision-analysis semantics were changed.
- No review workflow behavior was changed.
- Preserved `DashcamMonitoring.tsx` as UTF-8 without BOM.
- Two initial patch attempts failed because PowerShell matching was sensitive to the current source formatting and line endings.
- Neither failed attempt was committed.
- Restored `DashcamMonitoring.tsx` from the tracked `HEAD` source before the successful implementation.
- The final successful implementation normalized line endings only in memory, applied exact literal transformations, and wrote the file back as UTF-8 without BOM.
- Validation completed before commit:
  - only `components/command-center/DashcamMonitoring.tsx` changed;
  - implementation guards confirmed the in-flight and visibility protections;
  - the old `setInterval(loadDashcams, 30000)` callback was absent;
  - no Dashcam realtime channel was introduced;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build generated all `121/121` static pages successfully;
  - final post-build scope verification confirmed one tracked changed file and nothing staged before commit;
  - only the Dashcam component was staged;
  - staged diff validation passed.
- Implementation commit: `68d7e86` (`Coordinate dashcam polling`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote implementation heads were verified identical at `68d7e863a7bb500b9ae39f99c4164172b78f2ccd`.
- The tracked tree was clean after implementation push.
- Performance principle reinforced by this work: when a polling endpoint itself performs provider work, AI analysis and database writes, first prevent hidden-tab and overlapping executions without introducing write-triggered realtime invalidation that can recreate feedback loops.
- Next step: continue the audit-first performance-stabilization roadmap by evaluating CCTV Monitoring and the remaining recurring workloads from the new post-documentation baseline.

## 2026-08-08 - CCTV polling coordination

- Continued the audit-first performance-stabilization roadmap after Dashcam polling coordination.
- Ran a fresh recurring-workload ranking audit from baseline `40006cb`.
- Confirmed CCTV Monitoring remained the strongest uncoordinated recurring Command Center network workload after Dashcam was completed.
- Confirmed `components/command-center/CCTVMonitoring.tsx` loaded CCTV monitoring immediately and then called `/api/command-center/cctv` every 30 seconds.
- Confirmed the manual Refresh CCTV button also calls `loadCCTV()`.
- Confirmed the existing CCTV client had no in-flight guard and no visibility-aware automatic refresh behavior.
- Audited `app/api/command-center/cctv/route.ts` before implementation.
- Confirmed each CCTV GET reads up to 10 organization vehicles.
- Confirmed each CCTV GET loads CCTV provider state.
- Confirmed the endpoint persists generated CCTV rows into `cctv_events`.
- Confirmed the endpoint then reads up to 100 recent `cctv_events` for the returned monitoring state.
- Confirmed `/api/command-center/cctv` has one direct client caller: `CCTVMonitoring.tsx`.
- Rejected CCTV realtime invalidation because the endpoint itself writes `cctv_events`, which could recreate the realtime feedback loop previously fixed by commit `9299d95`.
- Rejected API and database changes because the demonstrated gap was unnecessary hidden-tab polling and possible overlapping client refreshes.
- Updated only `components/command-center/CCTVMonitoring.tsx`.
- Preserved the existing initial CCTV load.
- Preserved the existing manual Refresh CCTV behavior.
- Preserved the existing 30-second visible-tab refresh cadence.
- Added an in-flight guard inside `loadCCTV()` so automatic, visibility-return and manual CCTV requests cannot overlap.
- Added guard release in the existing `finally` block.
- Replaced the unconditional 30-second timer callback with a visibility-aware CCTV refresh wrapper.
- Automatic CCTV polling now skips requests while `document.visibilityState` is not `visible`.
- Added a `visibilitychange` listener so CCTV monitoring refreshes when the document becomes visible again.
- Added cleanup for the visibility listener while preserving interval cleanup.
- No CCTV realtime channel was introduced.
- No API route was changed.
- No database query was changed.
- No database schema or migration was changed.
- Preserved the original UTF-8 BOM state of `CCTVMonitoring.tsx`.
- Validation completed before commit:
  - only `components/command-center/CCTVMonitoring.tsx` changed;
  - implementation guards confirmed the in-flight and visibility protections;
  - the old `setInterval(loadCCTV, 30000)` callback was absent;
  - no CCTV realtime channel was introduced;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build generated all `121/121` static pages successfully;
  - final post-build scope verification confirmed one tracked changed file and nothing staged before commit;
  - only the CCTV component was staged;
  - staged diff validation passed.
- Implementation commit: `5d7d0c0` (`Coordinate CCTV polling`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote implementation heads were verified identical at `5d7d0c0c6dc307fb7f67e15763b47f761aa0f5d1`.
- The tracked tree was clean after implementation push.
- Performance principle reinforced by this work: when a polling endpoint writes the same domain data it exposes, hidden-tab suppression and overlap prevention are safer first-line optimizations than write-triggered realtime invalidation.
- Next step: continue the audit-first performance-stabilization roadmap with a fresh ranking audit from the post-CCTV documentation baseline.

## 2026-08-08 - Executive Operations visibility coordination

- Continued the audit-first performance-stabilization roadmap after CCTV polling coordination.
- Ran a fresh post-CCTV recurring-workload audit from baseline `10cac2c`.
- Confirmed most remaining timers were already coordinated, local-only playback/interpolation timers, provider timeouts or archived code.
- Identified Executive Operations Dashboard and Insurance Response Center as remaining visibility-coordination gaps.
- Ranked Executive Operations Dashboard first because each refresh fans out into three parallel API requests.
- Audited `components/command-center/ExecutiveOperationsDashboard.tsx` before implementation.
- Confirmed each Executive refresh requests `/api/fleet/health`, `/api/dispatcher/recommendations` and `/api/command-center/notifications` in parallel.
- Confirmed `/api/fleet/health` performs five parallel organization-scoped Supabase reads covering vehicles, vehicle locations, unresolved vehicle alerts, vehicle trips and incidents.
- Confirmed fleet health may also build traffic intelligence and load weather intelligence.
- Confirmed the existing Executive refresh lifecycle already had in-flight protection, queued refresh handling and 250 ms realtime coalescing.
- Confirmed existing realtime subscriptions cover `vehicle_alerts`, `vehicle_locations`, `incidents` and `command_center_notifications`.
- Confirmed the existing 60-second fallback refresh remained active while the browser document was hidden.
- Confirmed realtime-triggered refreshes also reached `runDashboardLoad()` without document-visibility protection.
- Selected visibility coordination as the smallest safe optimization.
- Updated only `components/command-center/ExecutiveOperationsDashboard.tsx`.
- Preserved the existing initial dashboard load.
- Preserved all four existing Supabase Realtime subscriptions.
- Preserved the existing 250 ms realtime coalescing delay.
- Preserved existing in-flight protection.
- Preserved existing queued-refresh behavior.
- Preserved the existing 60-second fallback cadence.
- Added a visibility guard to `runDashboardLoad()` so automatic refresh work exits before network requests while the document is hidden.
- Added a `visibilitychange` listener.
- Added an immediate dashboard refresh when the document becomes visible again.
- Added cleanup for the `visibilitychange` listener.
- Preserved the existing realtime channel cleanup and fallback interval cleanup.
- Did not abort a request already in progress when the document becomes hidden; subsequent refresh attempts are suppressed instead.
- No API route was changed.
- No database query was changed.
- No database schema or migration was changed.
- No realtime subscription dependency was changed.
- No dashboard metric semantics were changed.
- Preserved the existing UTF-8 BOM and CRLF source format of `ExecutiveOperationsDashboard.tsx`.
- Initial PowerShell multiline replacement attempts were rejected safely because exact source assumptions did not match.
- Those failed attempts were not committed.
- The successful implementation used unique audited insertion blocks and executed inside a terminating PowerShell script block so failed preconditions could not continue into later write steps.
- Validation completed before commit:
  - only `components/command-center/ExecutiveOperationsDashboard.tsx` changed;
  - unique insertion points were verified before writing;
  - the hidden-document guard was verified;
  - the visibility-return listener and cleanup were verified;
  - the existing plain `if (disposed) return;` guard remained on `scheduleRealtimeRefresh()`;
  - UTF-8 BOM and CRLF were preserved;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build generated all `121/121` static pages successfully;
  - final scope verification confirmed one tracked changed file and nothing staged before commit;
  - only the Executive Operations component was staged;
  - staged diff validation passed.
- Implementation commit: `eb83b38` (`Coordinate executive visibility refresh`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote implementation heads were verified identical at `eb83b3845eff44915bb61f1f21d0fed60dc91dcd`.
- The tracked tree was clean after implementation push.
- Performance principle reinforced by this work: for realtime dashboards that retain conservative fallback polling, place document-visibility protection at the shared refresh executor so both realtime and fallback paths avoid hidden-tab network fan-out while preserving one reconciliation refresh on return.
- Next step: continue the audit-first stabilization roadmap from the post-documentation baseline, with Insurance Response Center visibility coordination as the leading remaining candidate subject to fresh verification.

## 2026-08-08 - Insurance Response Center visibility coordination

- Continued the audit-first performance-stabilization roadmap after Executive Operations visibility coordination.
- Started from verified implementation baseline `3782842`.
- Re-audited `components/command-center/InsuranceResponseCenter.tsx` before documenting the completed change.
- Confirmed Insurance Response Center already had coordinated refresh behavior from the earlier insurance-response refresh work:
  - initial insurance load;
  - Supabase Realtime invalidation;
  - 250 ms realtime coalescing;
  - in-flight refresh protection;
  - queued refresh handling;
  - 60-second fallback polling.
- Confirmed the remaining gap was document visibility: both realtime-triggered and fallback refreshes could still reach the shared refresh executor while the browser document was hidden.
- Selected visibility coordination as the smallest safe performance optimization.
- Updated only `components/command-center/InsuranceResponseCenter.tsx`.
- Added a document-visibility guard to `runInsuranceRefresh()` so automatic refresh work exits before network requests while the document is hidden.
- Preserved the existing active/disposal guard.
- Preserved the existing initial insurance load.
- Preserved the existing Supabase Realtime subscriptions.
- Preserved the existing 250 ms realtime coalescing behavior.
- Preserved existing in-flight refresh protection.
- Preserved existing queued-refresh behavior.
- Preserved the existing 60-second fallback refresh cadence.
- Added a `visibilitychange` listener.
- Added an immediate insurance refresh when the document becomes visible again.
- Added cleanup for the `visibilitychange` listener.
- Preserved existing timeout, interval and Supabase channel cleanup.
- Did not abort an insurance request already in progress when the document becomes hidden; subsequent automatic refresh attempts are suppressed instead.
- No API route was changed.
- No database query was changed.
- No database schema or migration was changed.
- No realtime subscription dependency was changed.
- No insurance workflow or package semantics were changed.
- Validation completed before implementation commit:
  - only `components/command-center/InsuranceResponseCenter.tsx` changed;
  - the hidden-document guard was verified;
  - the visibility-return listener and cleanup were verified;
  - existing refresh coordination remained intact;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build completed successfully;
  - final scope verification confirmed one tracked changed file and nothing staged before commit;
  - only the Insurance Response Center component was staged;
  - staged diff validation passed.
- Implementation commit: `3782842` (`Coordinate insurance visibility refresh`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote implementation heads were verified identical at `3782842ea84d7dd7d7d0c2db95f06da81685526d`.
- The tracked tree was clean after implementation push.
- Performance principle reinforced by this work: when realtime invalidation and conservative fallback polling already share a coordinated refresh executor, visibility protection belongs at that shared boundary so hidden documents avoid both realtime-triggered and timer-triggered network work while one reconciliation refresh occurs on return.
- Next step: continue the audit-first performance-stabilization roadmap with a fresh ranking audit from the post-Insurance-visibility documentation baseline.

## 2026-08-08 - Shared realtime refresh visibility coordination

- Continued the audit-first performance-stabilization roadmap after Insurance Response Center visibility coordination.
- Started from verified implementation baseline `6cec48c`.
- Performed a fresh performance ranking audit before selecting another implementation target.
- Confirmed the previously coordinated explicit polling surfaces remained visibility-aware.
- Audited the shared `lib/realtime/useRealtimeRefresh.ts` lifecycle before implementation.
- Confirmed the shared hook was an active cross-cutting refresh primitive rather than dormant code.
- Confirmed multiple Command Center dashboards use the shared hook with configured fallback polling.
- Confirmed polling cadences included active 15-second, 30-second, 60-second and 5-minute refresh surfaces.
- Confirmed the shared `runRefresh()` executor was used by realtime invalidation, optional mount loading and configured fallback polling.
- Identified the precise remaining gap: the shared executor had no document-visibility guard, so hidden documents could continue automatic network refresh work across multiple dashboards.
- Selected shared-hook visibility coordination as the smallest safe cross-cutting performance optimization.
- Updated only `lib/realtime/useRealtimeRefresh.ts`.
- Added a document-visibility guard to `runRefresh()` so automatic shared-hook refresh work exits while the document is hidden.
- Preserved existing realtime subscriptions.
- Preserved the existing default 250 ms debounce behavior.
- Preserved all caller-configured polling intervals.
- Preserved optional `loadOnMount` behavior.
- Added a `visibilitychange` listener.
- Added one reconciliation refresh when the document becomes visible again.
- Added cleanup for the `visibilitychange` listener.
- Preserved existing debounce timeout cleanup.
- Preserved existing polling interval cleanup.
- Preserved existing realtime unsubscribe cleanup.
- Did not add in-flight or queued-refresh semantics as part of this change.
- Did not change any caller component.
- Did not change any API route.
- Did not change any database query.
- Did not change any database schema or migration.
- Did not change polling frequencies.
- Did not change realtime subscription dependencies.
- Manual component refresh actions remain outside this shared automatic-refresh visibility guard where callers invoke their load functions directly.
- Validation completed before implementation commit:
  - only `lib/realtime/useRealtimeRefresh.ts` changed;
  - the hidden-document guard was verified in the shared refresh executor;
  - the visibility-return listener and cleanup were verified;
  - the malformed cleanup-line formatting discovered during exact diff review was corrected before commit;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build compiled successfully;
  - all 121/121 static pages were generated successfully;
  - final scope verification confirmed one tracked changed file and nothing staged before commit;
  - only the shared realtime-refresh hook was staged;
  - staged diff validation passed.
- Implementation commit: `76742cb` (`Coordinate shared realtime refresh visibility`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote implementation heads were verified identical at `76742cb`.
- The tracked tree was clean after implementation push.
- Performance principle reinforced by this work: when realtime invalidation, mount loading and fallback polling converge on one shared automatic refresh executor, document visibility should be enforced at that shared boundary so all automatic callers inherit hidden-tab suppression without duplicating lifecycle logic across dashboards.
- This closes the identified shared-hook visibility gap discovered by the post-Insurance fresh ranking audit.
- Next step: perform one final read-only post-implementation ranking audit from the documented shared-hook baseline; if no remaining material recurring-network coordination gap ranks above diminishing returns, formally close the performance-stabilization sequence and move to the next HarborGuard roadmap area.

## 2026-08-08 - Performance stabilization sequence closure

- Completed the final audit-first performance ranking pass after shared realtime-refresh visibility coordination.
- Final audit baseline: `e210133` (`Document shared realtime visibility coordination`).
- Verified local and remote `feature/expanded-incident-taxonomy` heads matched before the audit.
- Verified the tracked tree and staging area were clean before and after the audit.
- Re-audited the final `lib/realtime/useRealtimeRefresh.ts` lifecycle.
- Confirmed the shared refresh executor now exits while `document.visibilityState !== "visible"`.
- Confirmed the shared hook performs one reconciliation refresh when the document becomes visible again.
- Confirmed visibility listener cleanup, debounce timeout cleanup, polling interval cleanup and realtime unsubscribe cleanup are all present.
- Re-audited explicit `setInterval` usage across application, component and realtime-library surfaces.
- Confirmed Fleet Time Machine's 50 ms interval is local playback-progress work rather than recurring network polling.
- Confirmed Route Replay's interval is local replay-playback progression rather than recurring network polling.
- Confirmed Risk Dashboard recurring network refresh is visibility coordinated.
- Confirmed Route Safety recurring network refresh is visibility coordinated.
- Confirmed AI Shift Summary recurring network refresh is visibility coordinated.
- Confirmed CCTV Monitoring recurring network refresh is visibility coordinated.
- Confirmed Dashcam Monitoring recurring network refresh is visibility coordinated.
- Confirmed Dispatcher Recommendations recurring/realtime refresh is visibility coordinated.
- Confirmed Executive Operations recurring/realtime refresh is visibility coordinated.
- Confirmed Incident Assignment recurring/realtime refresh remains part of the completed coordination set.
- Confirmed Incident Command recurring/realtime refresh is visibility coordinated.
- Confirmed Insurance Response Center recurring/realtime refresh is visibility coordinated.
- Confirmed shared `useRealtimeRefresh` polling callers now inherit hidden-document suppression centrally.
- Confirmed the shared-hook polling callers retain their existing 15-second, 30-second, 60-second and 5-minute fallback cadences.
- Confirmed no material recurring-network coordination gap remains that ranks above diminishing returns.
- No source file was changed during this final audit.
- No API route was changed.
- No database query was changed.
- No database schema or migration was changed.
- No polling frequency was changed.
- No realtime subscription dependency was changed.
- The final audit remained read-only.
- Existing untracked audit, backup and repair-temp artifacts were deliberately left outside tracked history.
- Performance-stabilization decision: formally close this sequence rather than continue optimizing local playback timers, isolated manual actions or already-coordinated automatic refresh paths.
- Stabilization principle established by the completed sequence: prefer realtime invalidation where appropriate, retain conservative fallback polling where operationally useful, coalesce bursty refresh triggers, protect expensive refresh executors from overlap, suppress automatic network work while documents are hidden, and reconcile once when visibility returns.
- Completed implementation/documentation milestones include coordinated refresh, polling and visibility work across the major Command Center and operational dashboard surfaces, culminating in shared `useRealtimeRefresh` visibility coordination.
- Next step: leave performance stabilization closed unless new measured evidence exposes a regression or material recurring-network hotspot, and continue with the next HarborGuard roadmap area using the same audit-first workflow.

## 2026-08-08 - Normalized vehicle-location processing extraction

- Continued the audit-first roadmap after formal closure of the performance-stabilization sequence.
- Started from verified baseline `6bdf571`.
- Re-audited the fleet telemetry and telematics architecture before selecting the next implementation target.
- Confirmed the older telemetry decision artifact proposing harsh-braking detection was stale because HarborGuard already contains harsh-braking, rapid-acceleration, harsh-cornering, sustained-speeding, GPS-anomaly and related post-location telemetry behavior.
- Confirmed the actual remaining roadmap gap is first-class external telematics ingestion rather than telemetry intelligence itself.
- Audited the external-provider insertion boundary before implementation.
- Confirmed `vehicles.tracker_device_id` already exists as the vehicle/device identity slot.
- Confirmed `vehicle_locations.source` already supports `hardware`, allowing an external telematics adapter to feed normalized hardware locations without an immediate schema migration.
- Confirmed `/api/fleet/update-location` remained user/session authenticated through `requireOrganization()` and therefore was not itself suitable as a machine-to-machine provider webhook boundary.
- Confirmed the route already delegated most processing behavior into reusable fleet helpers but still owned the complete normalized orchestration sequence.
- Selected extraction of normalized vehicle-location processing as the smallest safe prerequisite before adding any provider-specific machine-ingestion endpoint.
- Added `lib/fleet/processVehicleLocationUpdate.ts`.
- The new helper now owns the reusable normalized processing sequence:
  - organization-scoped vehicle lookup;
  - latest vehicle-location lookup;
  - telemetry analysis;
  - jitter rejection;
  - GPS-spike rejection;
  - normalized vehicle-location persistence;
  - active-trip lookup;
  - active-trip ID resolution;
  - post-location lifecycle orchestration;
  - successful normalized vehicle/location response construction.
- Moved the active telemetry and lifecycle thresholds that are consumed by this processing sequence out of the HTTP route and into the reusable helper.
- Removed stale route-local cooldown/intelligence constants whose effective ownership already resides in alert helpers.
- Updated `app/api/fleet/update-location/route.ts` so it now owns HTTP-specific responsibilities only:
  - organization/user authentication;
  - operator/admin/owner role enforcement;
  - request JSON parsing;
  - normalized input parsing and validation;
  - HTTP status selection;
  - `NextResponse` response construction;
  - top-level HTTP error translation.
- Preserved the existing update-location HTTP contract.
- Preserved 400 handling for invalid normalized input.
- Preserved 404 behavior for missing organization-scoped vehicles.
- Preserved 500 behavior for location-persistence failures.
- Preserved successful jitter and GPS-spike response semantics.
- Preserved the successful vehicle, location and active-trip response shape.
- Preserved the existing user/session authentication model for `/api/fleet/update-location`.
- Did not add a Samsara endpoint yet.
- Did not add machine authentication yet.
- Did not add a provider-specific database table.
- Did not add a new location source.
- Did not change telemetry thresholds.
- Did not change database schema or migrations.
- Did not change telemetry alert behavior.
- Did not change active-trip, completed-trip, stop-lifecycle or fleet-risk behavior.
- During validation, TypeScript initially exposed insufficient narrowing because jitter and GPS-spike outcomes shared one union member.
- Corrected the result type into separate literal discriminants for `jitter` and `gps_spike`.
- Removed the accidental UTF-8 BOM introduced by the initial PowerShell file write.
- Final validation completed before commit:
  - normalized processing no longer remains in the HTTP route;
  - both implementation files are UTF-8 without BOM;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build compiled successfully;
  - all 121/121 static pages were generated successfully;
  - exactly two implementation files were staged;
  - staged diff validation passed.
- Implementation commit: `f82c2bd` (`Extract normalized vehicle location processing`).
- Implementation pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote implementation heads were verified identical at `f82c2bd973bdd1fde1ee95af546dc7d71d159038`.
- The tracked tree was clean after implementation push.
- Architectural principle established by this extraction: provider-specific transport/authentication should terminate at a thin adapter, while normalized vehicle-location processing should run through one shared server-side pipeline so telemetry validation, persistence, alerting and trip/risk lifecycle behavior cannot diverge between mobile and external hardware sources.
- Next step: audit the smallest machine-authenticated Samsara vehicle-location ingestion adapter against this reusable processing boundary, using `tracker_device_id` for vehicle identity and normalized `hardware` locations rather than duplicating the update-location pipeline.

## 2026-08-08 - Organization-scoped telematics sync state

- Continued the external-telematics roadmap after extracting the reusable normalized vehicle-location processing boundary.
- Started from verified baseline `fea720d`.
- Audited the Samsara machine-ingestion boundary and current provider integration before implementation.
- Confirmed HarborGuard already has a Samsara provider client using `SAMSARA_API_TOKEN`, configurable `SAMSARA_API_BASE_URL`, bearer authentication, timeout handling and no-store requests.
- Confirmed HarborGuard already has machine-triggered cron patterns using `CRON_SECRET` and Supabase service-role access.
- Confirmed `vehicles.tracker_device_id` remains the existing external-device identity slot and no new vehicle/provider mapping table is required for the first Samsara GPS integration.
- Confirmed normalized external GPS locations can use the existing `hardware` vehicle-location source.
- Confirmed the reusable `processVehicleLocationUpdate()` boundary is the correct destination for provider-normalized locations so mobile and hardware ingestion do not duplicate telemetry, persistence, alerting, trip or risk lifecycle behavior.
- Confirmed Samsara telematics synchronization requires durable cursor/checkpoint state between feed runs.
- Audited existing schema and application code for cursor, checkpoint, sync-state, integration-state and provider-state storage.
- Confirmed there was no existing organization-scoped state store suitable for a per-tenant Samsara telematics feed cursor.
- Deliberately did not reuse the global `intelligence_sources` provider registry because its provider-health and fetch metadata are not an organization-scoped stream checkpoint contract.
- Added migration `supabase/migrations/20260808124500_create_telematics_sync_state.sql`.
- Added `public.telematics_sync_state` as the minimal durable provider-stream checkpoint primitive.
- The table is organization-scoped through a required `organization_id` foreign key to `public.organizations` with cascade deletion.
- Added required `provider` and `stream` identifiers.
- Added nullable `cursor` storage for provider feed continuation tokens.
- Added `last_successful_sync_at`.
- Added `last_failure_at`.
- Added `last_failure_message`.
- Added JSONB `metadata` for limited provider-stream state that does not warrant dedicated columns.
- Added `created_at` and `updated_at`.
- Added uniqueness across `(organization_id, provider, stream)` so each tenant has one durable checkpoint per provider stream.
- Added non-blank constraints for provider and stream.
- Added an `(organization_id, provider)` index.
- Enabled row-level security.
- Added authenticated own-organization SELECT visibility through `public.profiles.organization_id`.
- Did not add authenticated INSERT, UPDATE or DELETE policies because the intended writer is a machine-side service-role synchronization path.
- Did not modify `intelligence_sources`.
- Did not add a Samsara polling route yet.
- Did not add provider-specific GPS parsing yet.
- Did not change vehicle identity schema.
- Did not change normalized vehicle-location processing.
- Did not change telemetry thresholds or alert behavior.
- Did not modify existing tracked application files.
- Migration validation completed before commit:
  - the target table did not previously exist;
  - only the new migration was intentionally created;
  - the migration was UTF-8 without BOM;
  - migration diff validation passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build compiled successfully;
  - all 121/121 static pages were generated successfully.
- Migration commit: `96957c8` (`Add telematics sync state`).
- The commit contains exactly one file and 57 insertions.
- Migration pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `96957c8`.
- Architectural principle established: provider synchronization progress is tenant-specific operational state and should be stored separately from HarborGuard's global provider/intelligence registry.
- Next step: audit and implement the smallest Samsara GPS feed synchronizer and cron adapter using the organization-scoped telematics checkpoint, existing Samsara provider HTTP conventions, `tracker_device_id` vehicle resolution, normalized `hardware` input and `processVehicleLocationUpdate()`.

## 2026-08-08 - Vehicle telemetry event-time preservation

- Continued the external-telematics roadmap from verified baseline `aa602e7`.
- Audited the normalized vehicle-location processing boundary before implementing the Samsara GPS feed synchronizer.
- Confirmed provider GPS samples may arrive after their actual observation time and therefore must preserve provider event time rather than always using ingestion time.
- Confirmed `createVehicleLocation()` already accepts an explicit `recordedAt` timestamp.
- Confirmed `processVehicleLocationUpdate()` previously created its own `new Date().toISOString()` timestamp and used that value for telemetry analysis, persistence, trip lifecycle processing and its returned location.
- Confirmed telemetry interval calculations depend on the relationship between the current event time and the previous `vehicle_locations.recorded_at`.
- Identified event-time preservation as a prerequisite for safe delayed or historical hardware telemetry ingestion.
- Updated `lib/fleet/parseUpdateLocationInput.ts`.
- Added optional `recordedAt` to `UpdateLocationBody`.
- Added optional normalized `recordedAt` to `ParsedUpdateLocationInput`.
- When supplied, `recordedAt` must be a non-empty valid date-time string.
- Valid provider/client timestamps are normalized through `Date.toISOString()` before entering shared processing.
- Existing callers remain backward compatible because `recordedAt` is optional.
- Updated `lib/fleet/processVehicleLocationUpdate.ts`.
- The shared processor now resolves one canonical event timestamp as `recordedAt ?? new Date().toISOString()`.
- The resolved event timestamp is used for telemetry analysis.
- The resolved event timestamp is persisted as `vehicle_locations.recorded_at`.
- The resolved event timestamp is passed to trip and vehicle lifecycle processing.
- The resolved event timestamp is returned with the normalized persisted location.
- Existing mobile ingestion therefore retains current-time behavior when it omits `recordedAt`.
- Future hardware/provider ingestion can supply the actual provider observation time without duplicating the shared processing lifecycle.
- No Samsara-specific parsing was added in this prerequisite.
- No Samsara polling or cron route was added.
- No sync cursor behavior was changed.
- No telemetry thresholds were changed.
- No trip lifecycle rules were changed.
- No schema migration was required.
- Validation completed before commit:
  - exactly two tracked files were modified;
  - UTF-8 BOM checks passed;
  - `git diff --check` passed;
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build compiled successfully;
  - all 121/121 static pages were generated successfully.
- Implementation commit: `cc175d4` (`Preserve vehicle telemetry event time`).
- The implementation commit contains exactly two files with 43 insertions and 5 deletions.
- The implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `cc175d4`.
- Architectural principle established: normalized vehicle-location processing must distinguish event time from ingestion time so delayed provider telemetry preserves correct chronology and derived telemetry semantics.
- Next step: implement the smallest Samsara GPS feed synchronizer and machine-triggered cron adapter using the organization-scoped `telematics_sync_state` checkpoint, existing Samsara HTTP conventions, `tracker_device_id` vehicle resolution, normalized `hardware` source, provider event time and `processVehicleLocationUpdate()`.
## 2026-08-08 - Telematics message receipts and Traccar live-provider validation

- Continued the external-telematics roadmap from verified baseline `4f8bfb1`.
- Added migration `supabase/migrations/20260808134000_create_telematics_message_receipts.sql`.
- Added `public.telematics_message_receipts` as the provider-neutral idempotency ledger for externally ingested telematics messages.
- Each receipt is organization scoped through required `organization_id`.
- Each receipt records required `provider`, `stream` and `provider_message_id`.
- Added uniqueness across `(organization_id, provider, stream, provider_message_id)` so the same provider message cannot be processed twice for the same tenant and stream.
- Added `received_at` with a server-side default timestamp.
- Added JSONB `metadata` for limited provider-message context that does not warrant dedicated columns.
- Added non-blank constraints for provider, stream and provider message ID.
- Added an `(organization_id, provider, received_at desc)` index.
- Enabled row-level security.
- Added authenticated own-organization SELECT visibility through `public.profiles.organization_id`.
- Did not add authenticated INSERT, UPDATE or DELETE policies because the intended writer remains a machine-side service-role ingestion path.
- Did not change vehicle identity schema.
- Did not change normalized vehicle-location processing.
- Did not change telemetry thresholds, alert behavior, trip lifecycle behavior or fleet-risk behavior.
- Migration commit: `453a42d` (`Add telematics message receipts`).
- The migration commit contains exactly one file with 60 insertions.
- The migration was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote implementation heads were verified identical at `453a42d`.

### External-provider status

- Samsara remains part of HarborGuard's existing dashcam/media integration plan, but production/sandbox API access remains unavailable for the current fleet-telemetry implementation path.
- A Webfleet integration-partner application was submitted successfully.
- Webfleet API credentials remain pending, so live Webfleet API validation has not yet been performed.
- Traccar was selected as the immediately available development telematics provider so HarborGuard can continue live external-telemetry work without waiting for provider approval.
- A Traccar Demo 3 account was created successfully.
- A Traccar API token was generated successfully and remains secret; it was not committed to the repository and must only be supplied through local/server environment configuration.
- Registered Traccar test device `HarborGuard Test Vehicle 01`.
- Configured the Traccar Client device identifier to match the registered Traccar device.
- Configured Traccar Client to submit telemetry to the Demo 3 server.
- Confirmed Android location permission and precise-location access.
- Confirmed a live phone GPS sample was acquired and uploaded successfully to Traccar with HTTP response `200`.
- Confirmed the Traccar web application displayed `HarborGuard Test Vehicle 01` as online and plotted the transmitted live position.
- This establishes a working live development telemetry path from phone GPS -> Traccar Client -> Traccar server.

### Architecture decision

- Traccar does not replace HarborGuard's provider-neutral telematics architecture.
- Provider-specific transport, authentication and response parsing must terminate at a thin Traccar adapter.
- Traccar-normalized locations must reuse the existing `hardware` vehicle-location source.
- HarborGuard vehicle resolution should continue using the existing external-device identity contract rather than introducing a second vehicle identity model without evidence that one is required.
- Provider observation time must be preserved and passed into the existing normalized event-time path.
- Normalized Traccar telemetry must enter `processVehicleLocationUpdate()` so persistence, telemetry analysis, jitter rejection, GPS-spike rejection, alerts, trips, stop lifecycle and fleet-risk behavior remain shared with other ingestion paths.
- `telematics_sync_state` remains the organization/provider/stream synchronization-state primitive.
- `telematics_message_receipts` remains the organization/provider/stream/message idempotency primitive.
- Webfleet and future providers can later terminate at equivalent thin adapters and feed the same normalized processing boundary.

### Next step

- Audit the exact Traccar REST API contract and the current HarborGuard vehicle-resolution/server-authentication insertion points.
- Then implement the smallest credential-gated Traccar server-side adapter that reads authorized Traccar position data, maps it to the existing external vehicle identity, preserves provider event time, records idempotency state where appropriate and delegates normalized locations to `processVehicleLocationUpdate()`.
- Keep all Traccar credentials out of tracked source and Git history.
## 2026-08-08 - Traccar telematics provider client

- Continued the provider-neutral external-telematics roadmap from verified baseline `9f1321e`.
- Audited the existing HarborGuard provider, normalized-location and machine-authentication patterns before implementation.
- Confirmed `processVehicleLocationUpdate()` remains the shared destination for normalized telemetry.
- Confirmed `vehicles.tracker_device_id` remains the external-device identity slot.
- Confirmed normalized external telemetry continues to use the existing `hardware` source.
- Confirmed provider observation time must continue through the existing `recordedAt` path.
- Added `lib/telematics/providers/traccar.ts`.
- Added Traccar configuration through `TRACCAR_API_TOKEN`.
- Added configurable `TRACCAR_API_BASE_URL` with `https://demo3.traccar.org` as the development default.
- Added bearer-token authorization for Traccar API requests.
- Added `Accept: application/json`.
- Added `cache: "no-store"` for provider requests.
- Added a 10-second provider request timeout using `AbortController`.
- Added `loadTraccarDevices()` using `GET /api/devices`.
- Added `loadTraccarLatestPositions()` using `GET /api/positions`.
- Added typed Traccar device and position response shapes.
- Added normalization of Traccar position IDs into provider message IDs.
- Added normalization of Traccar device IDs into provider device IDs.
- Added latitude and longitude finite/range validation.
- Added Traccar speed conversion from knots to kilometers per hour using factor `1.852`.
- Added Traccar course normalization into HarborGuard heading.
- Added provider event-time preservation using Traccar `fixTime`, then `deviceTime`, then `serverTime` as fallback order.
- Invalid or absent provider timestamps now fail normalization rather than silently replacing event time with ingestion time.
- Did not add a polling or cron route yet.
- Did not write to `telematics_sync_state` yet.
- Did not write to `telematics_message_receipts` yet.
- Did not connect provider device IDs to HarborGuard vehicles yet.
- Did not call `processVehicleLocationUpdate()` yet.
- Did not modify any existing tracked application file.
- No database schema or migration was changed.
- No telemetry thresholds, alert behavior, trip lifecycle or fleet-risk behavior was changed.
- Validation completed before commit:
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build compiled successfully;
  - all 121/121 static pages were generated successfully;
  - only `lib/telematics/providers/traccar.ts` was staged;
  - staged diff validation passed.
- Implementation commit: `7824ec5` (`Add Traccar telematics provider client`).
- The implementation commit contains exactly one file with 225 insertions.
- The implementation was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `7824ec5`.
- Architectural principle reinforced: provider-specific API transport and normalization belong in a thin provider client, while HarborGuard vehicle identity, idempotency and normalized location processing remain separate shared concerns.
- Next step: audit and implement the smallest Traccar device-to-HarborGuard vehicle resolution boundary using the existing `tracker_device_id` contract before adding polling or live database writes.
## 2026-08-08 - Organization-scoped telematics device vehicle resolver

- Continued the provider-neutral external-telematics roadmap from verified baseline `9316497`.
- Audited the existing vehicle schema before implementation.
- Confirmed `vehicles.tracker_device_id` already exists as the external-device identity field.
- Confirmed `vehicles.organization_id` already provides the required tenant boundary.
- Confirmed no existing schema uniqueness constraint was found for `tracker_device_id` globally or together with `organization_id`.
- Chose not to introduce a new database uniqueness migration in this work item.
- Added `lib/telematics/resolveVehicleForProviderDevice.ts`.
- Added `resolveVehicleForProviderDevice()` as the shared provider-device-to-HarborGuard-vehicle resolution boundary.
- The resolver requires explicit `organizationId` and `providerDeviceId`.
- Provider device IDs are trimmed before lookup.
- Blank provider device IDs fail closed as `vehicle_not_found`.
- Vehicle lookup is scoped by both `organization_id` and `tracker_device_id`.
- The resolver requests at most two rows so it can distinguish a unique mapping from an ambiguous mapping.
- Zero matching vehicles return `vehicle_not_found`.
- More than one matching vehicle returns `ambiguous_device`.
- A unique match returns the HarborGuard vehicle UUID plus the existing `tracker_device_id`.
- Database query errors are propagated instead of being silently treated as not-found mappings.
- This resolver is intentionally provider-neutral and can be reused by Traccar, Webfleet or another future provider that normalizes an external device identity.
- No Traccar polling route was added.
- No provider API request was added in this work item.
- No `telematics_sync_state` write was added.
- No `telematics_message_receipts` write was added.
- No call to `processVehicleLocationUpdate()` was added.
- No database schema or migration was changed.
- No telemetry thresholds, alert behavior, trip lifecycle or fleet-risk behavior was changed.
- Validation completed before commit:
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build compiled successfully;
  - all 121/121 static pages were generated successfully;
  - only `lib/telematics/resolveVehicleForProviderDevice.ts` was staged;
  - staged diff validation passed.
- Implementation commit: `76bdc6d` (`Add telematics device vehicle resolver`).
- The implementation commit contains exactly one file with 88 insertions.
- The implementation was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `76bdc6d`.
- Next step: audit the smallest Traccar ingestion-cycle boundary that combines provider positions, organization-scoped vehicle resolution, idempotency receipts and normalized `processVehicleLocationUpdate()` processing without yet exposing a public route.
## 2026-08-08 - Telematics message receipt processing state

- Continued the external-telematics ingestion roadmap from verified baseline `23fd9ad`.
- Audited the existing `telematics_message_receipts` contract before implementation.
- Confirmed the existing receipt table uniquely identifies messages by `organization_id`, `provider`, `stream` and `provider_message_id`.
- Confirmed the existing receipt model could only represent receipt existence and could not distinguish a claimed message from successful or failed processing.
- Confirmed no application-level receipt claiming implementation currently exists.
- Added migration `20260808151000_add_telematics_message_processing_state.sql`.
- Added `processing_status` with allowed states `processing`, `processed` and `failed`.
- Existing receipt rows default to `processed` so historical receipt semantics remain intact.
- Added nullable `claimed_at`.
- Added nullable `processed_at`.
- Added nullable `last_failure_at`.
- Added nullable `last_failure_message`.
- Added `attempt_count` with a minimum value of 1.
- Added a processing-status check constraint.
- Added an attempt-count check constraint.
- Existing processed receipt rows are backfilled so `processed_at` falls back to `received_at` when no processed timestamp exists.
- Added an organization/provider/stream/status/received-time index for processing-state lookup.
- This migration establishes the state required for future atomic message claiming and retry semantics.
- No Traccar provider request was added.
- No live Traccar token was used.
- No polling or public ingestion route was added.
- No message-claim application helper was added yet.
- No sync-state write was added.
- No call to `processVehicleLocationUpdate()` was added.
- No vehicle mapping behavior was changed.
- No telemetry thresholds, alert behavior, trip lifecycle or fleet-risk behavior was changed.
- Validation completed before commit:
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - the production build compiled successfully;
  - all 121/121 static pages were generated successfully;
  - only the receipt processing-state migration was staged;
  - staged diff validation passed.
- Implementation commit: `724997b` (`Add telematics receipt processing state`).
- The implementation commit contains exactly one migration with 63 insertions.
- The implementation was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `724997b`.
- Next step: audit and implement the smallest atomic telematics message-claim boundary using the new receipt processing states before wiring normalized Traccar positions into `processVehicleLocationUpdate()`.
## 2026-08-08 - Atomic telematics message claiming

- Continued the external-telematics ingestion roadmap from verified baseline `d22d8f5`.
- Audited the existing telematics provider, vehicle resolver, Supabase usage and receipt migrations before implementation.
- Confirmed message claiming requires a database-level atomicity boundary rather than an application-level read-then-write sequence.
- Added migration `20260808152500_add_telematics_message_claim_function.sql`.
- Added `public.claim_telematics_message(...)`.
- The claim function uses the existing unique receipt identity across organization, provider, stream and provider message ID.
- New messages are inserted directly with `processing_status = 'processing'`.
- New claims record `claimed_at`, initialize `attempt_count` to 1 and preserve receipt metadata.
- Duplicate insertion is handled with `ON CONFLICT DO NOTHING`.
- Existing conflicting receipts are selected with `FOR UPDATE`.
- Existing failed receipts can be atomically reclaimed.
- Reclaiming a failed receipt changes its status back to `processing`.
- Reclaiming clears prior processed/failure timestamps and failure message.
- Reclaiming increments `attempt_count`.
- Existing `processing` or `processed` receipts return `claimed = false` and are not reprocessed by the claim boundary.
- The function validates organization ID, provider, stream and provider message ID inputs.
- The function uses `SECURITY INVOKER` and an explicit `public` search path.
- No TypeScript receipt helper was added in this work item.
- No receipt success/failure finalization helper was added.
- No Traccar polling or ingestion route was added.
- No live Traccar API request was made.
- No Traccar token was used.
- No call to `processVehicleLocationUpdate()` was added.
- No vehicle mapping behavior was changed.
- No telemetry thresholds, alert behavior, trip lifecycle or fleet-risk behavior was changed.
- Validation completed before commit:
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - production compilation succeeded;
  - all 121/121 static pages were generated successfully;
  - exactly one migration was staged;
  - staged diff validation passed.
- Implementation commit: `7ab2e2f` (`Add atomic telematics message claim`).
- The implementation commit contains exactly one migration with 128 insertions.
- The implementation was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `7ab2e2f`.
- Next step: audit the exact application-side insertion point for a TypeScript receipt claim/finalization helper before wiring normalized Traccar positions into the existing vehicle-location processing pipeline.
## 2026-08-08 - Telematics message finalization boundary

- Continued the external-telematics ingestion roadmap from verified baseline `e9d5fa5`.
- Audited the application-side receipt boundary before implementation.
- Confirmed that receipt finalization must preserve claim ownership and must not rely on an unguarded application-level table update.
- Added migration `20260808154500_add_telematics_message_finalization_functions.sql`.
- Added `public.complete_telematics_message(...)`.
- Added `public.fail_telematics_message(...)`.
- Successful finalization requires the receipt to still have `processing_status = 'processing'`.
- Successful finalization also requires the receipt `attempt_count` to equal the attempt being finalized.
- Successful finalization changes the receipt to `processed`, records `processed_at` and clears failure state.
- Failed finalization requires the same processing-state and attempt-count ownership checks.
- Failed finalization changes the receipt to `failed`, records `last_failure_at` and stores the trimmed failure message.
- Both functions return `false` when no receipt matching the active claim attempt can be finalized.
- Both functions validate required arguments.
- Both functions use `SECURITY INVOKER` with an explicit `public` search path.
- This prevents a stale worker from finalizing a later retry attempt using only a receipt ID.
- The application layer can now carry the `{ receiptId, attemptCount }` claim identity through processing and use it for guarded completion or failure.
- No TypeScript receipt helper was added in this work item.
- No Traccar polling or ingestion route was added.
- No live Traccar API request was made.
- No Traccar token was used.
- No call to `processVehicleLocationUpdate()` was added.
- No vehicle mapping behavior was changed.
- No telemetry thresholds, alert behavior, trip lifecycle or fleet-risk behavior was changed.
- Validation completed before commit:
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - production compilation succeeded;
  - all 121/121 static pages were generated successfully;
  - exactly one migration was staged;
  - staged diff validation passed.
- Implementation commit: `d3cc203` (`Add telematics message finalization`).
- The implementation commit contains exactly one migration with 76 insertions.
- The implementation was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `d3cc203`.
- Next step: implement the smallest TypeScript receipt lifecycle helper around the atomic claim, completion and failure RPC boundaries before wiring Traccar positions into vehicle-location processing.
## 2026-08-08 - Telematics receipt lifecycle application helper

- Continued the external-telematics ingestion roadmap from verified baseline `2d43960`.
- Implemented the application-side receipt lifecycle boundary after establishing database-level atomic claim and guarded finalization semantics.
- Added `lib/telematics/messageReceiptLifecycle.ts`.
- Added `claimTelematicsMessage(...)`.
- The claim helper validates organization ID, provider, stream and provider message ID before calling the database claim RPC.
- The claim helper calls `public.claim_telematics_message(...)` through Supabase RPC.
- Claim metadata can be passed through to the receipt boundary.
- The helper validates the shape of the database claim response before exposing it to callers.
- A successful claim exposes the receipt ID and attempt count required to preserve processing ownership.
- A rejected duplicate/busy claim exposes the existing receipt ID, processing status and attempt count without granting processing ownership.
- Added `completeTelematicsMessage(...)`.
- Successful completion calls `public.complete_telematics_message(...)` with the receipt ID and exact claimed attempt count.
- Completion throws when the database rejects finalization because the claim is no longer active.
- Added `failTelematicsMessage(...)`.
- Failed processing calls `public.fail_telematics_message(...)` with the receipt ID, exact claimed attempt count and validated failure message.
- Failure finalization throws when the database rejects finalization because the claim is no longer active.
- Added positive-integer validation for attempt counts.
- Added non-blank validation for lifecycle identifiers and failure messages.
- The helper preserves dependency injection by accepting the Supabase client from its caller.
- No Traccar polling or ingestion route was added in this work item.
- No live Traccar API request was made.
- No Traccar token was used.
- No normalized Traccar position was processed.
- No call to `processVehicleLocationUpdate()` was added.
- No vehicle mapping behavior was changed.
- No telemetry thresholds, alert behavior, trip lifecycle or fleet-risk behavior was changed.
- Validation completed before commit:
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - production compilation succeeded;
  - all 121/121 static pages were generated successfully;
  - exactly one TypeScript file was staged;
  - staged diff validation passed.
- Implementation commit: `5757e43` (`Add telematics receipt lifecycle helper`).
- The implementation commit contains exactly one new TypeScript file with 250 insertions.
- The implementation was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `5757e43`.
- Next step: audit the exact normalized Traccar-position ingestion boundary, including provider message identity, organization/device mapping and the existing `processVehicleLocationUpdate()` contract, before wiring live provider data into HarborGuard.
## 2026-08-08 - Normalized telematics position processing boundary

- Continued the external-telematics roadmap from verified baseline `db71f87`.
- Added `lib/telematics/processTelematicsPosition.ts`.
- Added a provider-neutral normalized telematics processing boundary.
- The processor accepts an injected Supabase client, organization ID, provider, stream and normalized position.
- Normalized positions carry provider message ID, provider device ID, latitude, longitude, speed in km/h, heading and provider-recorded event time.
- Vehicle identity is resolved before message claiming through the organization-scoped `resolveVehicleForProviderDevice(...)` boundary.
- Vehicle resolution continues to use `vehicles.tracker_device_id`.
- Vehicle resolution failures return `vehicle_not_found` or `ambiguous_device` without claiming the provider message.
- Provider messages are claimed through `claimTelematicsMessage(...)`.
- Claim metadata records provider device ID, resolved HarborGuard vehicle ID and provider event time.
- Existing processed receipts are treated as duplicates and are not reprocessed.
- Existing active processing receipts are treated as already being processed and are not reprocessed.
- Successfully claimed positions are delegated to the shared `processVehicleLocationUpdate(...)` pipeline.
- External telematics continues to use `source: "hardware"`.
- Provider event time is preserved through `recordedAt`.
- Provider speed, heading, latitude and longitude flow through the existing normalized fleet location-processing path.
- Successful processing finalizes the exact claimed receipt attempt through `completeTelematicsMessage(...)`.
- Intentional `jitter` and `gps_spike` skips are treated as successfully handled observations and therefore complete the receipt rather than causing indefinite provider retries.
- Normalized location-processing failures mark the exact claim attempt failed through `failTelematicsMessage(...)`.
- Unexpected thrown processing errors are also marked failed where possible.
- If both processing and failure finalization fail, the processor throws an `AggregateError` so the dual failure is not hidden.
- No Traccar API call was added in this work item.
- No polling or cron route was added.
- No live Traccar token was used.
- No `telematics_sync_state` write was added.
- No provider polling cursor was introduced.
- No telemetry thresholds, alert behavior, trip lifecycle or fleet-risk behavior was changed.
- Validation completed before commit:
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - production compilation succeeded;
  - all 121/121 static pages were generated successfully;
  - exactly one TypeScript file was staged;
  - staged diff validation passed.
- Implementation commit: `8eff1e9` (`Add normalized telematics position processing`).
- The implementation commit contains exactly one new TypeScript file with 210 insertions.
- The implementation was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `8eff1e9`.
- Next step: audit the smallest Traccar polling/sync-cycle boundary that loads provider positions, normalizes them, delegates each position to `processTelematicsPosition(...)` and advances organization/provider sync state only after the cycle completes safely.
## 2026-08-08 - Traccar position sync cycle

- Continued the external-telematics roadmap from verified baseline `bf6e895`.
- Audited the existing Traccar provider client, normalized telematics position processor and `telematics_sync_state` contract before implementation.
- Added `lib/telematics/runTraccarPositionSync.ts`.
- Added `runTraccarPositionSync(...)` as the internal server-side orchestration boundary for one organization-scoped Traccar position synchronization cycle.
- The sync cycle accepts an injected Supabase client and explicit organization ID.
- Blank organization IDs are rejected before provider or database work begins.
- The cycle loads the latest positions through the existing Traccar provider client rather than duplicating provider HTTP or normalization logic.
- Each provider position is normalized through the existing Traccar normalization boundary.
- Each normalized position is delegated to `processTelematicsPosition(...)`.
- Vehicle resolution, receipt claiming, duplicate/in-progress handling, normalized vehicle-location processing and guarded receipt finalization remain owned by the existing lower-level telematics boundaries.
- Added cycle summary accounting for received positions, normally processed positions, duplicates, positions already being processed, jitter skips and GPS-spike skips.
- A non-successful `processTelematicsPosition(...)` result fails the overall cycle rather than silently recording the position as successful.
- Successful completion upserts organization/provider/stream state into `telematics_sync_state`.
- Successful sync state records `last_successful_sync_at` and clears prior failure state.
- Sync metadata records the cycle summary.
- Provider or processing failures attempt to record `last_failure_at` and `last_failure_message`.
- If both the original cycle and sync-state failure recording fail, an `AggregateError` preserves both failures.
- The sync state continues to use provider `traccar` and stream `positions`.
- No public API route was added in this work item.
- No cron route was added in this work item.
- No scheduler was added in this work item.
- No live Traccar token was committed or written to tracked source.
- No database schema or migration was changed.
- No telemetry thresholds, alert behavior, trip lifecycle or fleet-risk behavior was changed.
- Validation completed before commit:
  - `npx tsc --noEmit` passed;
  - `npm run build` passed;
  - production compilation succeeded;
  - all 121/121 static pages were generated successfully;
  - exactly one TypeScript file was staged;
  - staged diff validation passed.
- Implementation commit: `5056b88` (`Add Traccar position sync cycle`).
- The implementation commit contains exactly one new TypeScript file with 271 insertions.
- The implementation was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `5056b88`.
- The external-telematics path now has an internal Traccar synchronization cycle from provider loading through normalized/idempotent HarborGuard processing and organization/provider sync-state recording.
- Next step: audit the smallest protected server execution boundary for invoking `runTraccarPositionSync(...)`, including existing HarborGuard cron/machine-authentication conventions and organization-selection semantics, before exposing the sync cycle through an API route or scheduler.
## 2026-08-08 - Protected Traccar sync execution route

- Continued the external-telematics roadmap from verified baseline `40e083f`.
- Audited existing HarborGuard cron authentication, service-role Supabase client creation, organization-selection patterns and Vercel cron configuration before implementation.
- Added `app/api/telematics/cron/traccar/route.ts`.
- Added a protected dynamic `GET /api/telematics/cron/traccar` server execution boundary.
- The route requires `CRON_SECRET` to be configured.
- Requests must provide the configured secret as an `Authorization: Bearer ...` header.
- Unauthorized requests return HTTP 401 before telematics synchronization begins.
- The route requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- The route creates a non-persistent service-role Supabase client for machine execution.
- The route requires an explicit `TRACCAR_SYNC_ORGANIZATION_ID`.
- The configured organization ID is verified against the `organizations` table before synchronization begins.
- Organization selection is server-controlled rather than accepted from request query parameters or request bodies.
- After validation, the route delegates the actual synchronization cycle to the existing `runTraccarPositionSync(...)` boundary.
- Provider loading, Traccar normalization, idempotent message processing, vehicle resolution and telematics sync-state recording remain owned by the existing telematics layers.
- The route is configured as dynamic and currently has a 60-second maximum duration.
- Route failures are logged server-side and returned as HTTP 500 JSON responses.
- No Traccar provider token is hard-coded or committed in the route.
- No database schema or migration was changed.
- No telemetry processing thresholds or fleet-risk behavior was changed.
- `vercel.json` was intentionally not modified in this work item.
- No scheduler or automatic invocation was added in this work item.
- TypeScript validation passed before commit.
- The full production build passed before commit.
- Next.js production compilation discovered `/api/telematics/cron/traccar` as a dynamic server route.
- Implementation commit: `78719b0` (`Add protected Traccar sync route`).
- The implementation commit contains exactly one new route file with 145 insertions.
- The implementation was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote heads were verified identical at `78719b0`.
- HarborGuard now has a protected machine-execution boundary capable of invoking the internal Traccar position synchronization cycle for one explicitly configured organization.
- Next step: audit deployment configuration and the existing Vercel cron cadence conventions before deciding whether and how `/api/telematics/cron/traccar` should be scheduled; separately verify the required Traccar runtime environment variables before any live provider invocation.
## 2026-08-08 - First successful live Traccar telematics sync

- Continued the external-telematics roadmap from verified baseline `46a64f3`.
- Configured the required Traccar runtime environment variables outside tracked source.
- Confirmed the HarborGuard Demo organization for the active test user.
- Confirmed the protected Preview deployment route could be reached through Vercel Deployment Protection using the automation bypass mechanism while retaining HarborGuard `CRON_SECRET` authentication.
- Identified that the remote Supabase database was behind the repository migration history.
- Applied the pending migration chain through `20260808154500`.
- Confirmed local and remote Supabase migration history are now aligned through `20260808154500`.
- Confirmed `telematics_sync_state` exists and is accessible remotely.
- Confirmed `telematics_message_receipts` exists and is accessible remotely.
- Confirmed `claim_telematics_message`, `complete_telematics_message` and `fail_telematics_message` are present and execute validation successfully.
- Confirmed Traccar device `16839` is `HarborGuard Test Vehicle 01`.
- Confirmed the Traccar device unique identifier is `41877137`.
- Added a dedicated HarborGuard Demo vehicle for this external telematics test rather than overwriting an existing vehicle mapping.
- Created HarborGuard vehicle `TRACCAR-16839` with nickname `HarborGuard Test Vehicle 01`.
- Mapped `vehicles.tracker_device_id` to provider device ID `16839`.
- Completed the first successful protected live Traccar synchronization request.
- The live request returned HTTP 200.
- The synchronization summary reported:
  - `received = 1`;
  - `processed = 1`;
  - `duplicates = 0`;
  - `alreadyProcessing = 0`;
  - `jitterSkipped = 0`;
  - `gpsSpikeSkipped = 0`.
- Confirmed `telematics_sync_state` recorded a successful `traccar` / `positions` cycle.
- Confirmed `last_failure_at` and `last_failure_message` are clear after the successful cycle.
- Confirmed the sync-state metadata records one received and one processed position.
- Confirmed provider message `116208899` exists in `telematics_message_receipts`.
- Confirmed that receipt reached `processing_status = processed`.
- Confirmed the receipt completed on attempt `1`.
- Confirmed the dedicated HarborGuard vehicle remains active and mapped to Traccar device `16839`.
- This validates the full live path from Traccar position retrieval through normalization, organization-scoped vehicle resolution, atomic receipt claiming, normalized HarborGuard location processing, receipt finalization and sync-state success recording.
- No Traccar token, Supabase service-role key, cron secret or Vercel automation bypass secret was committed to Git.
- No recurring Traccar scheduler has been enabled yet.
- Next step: audit the appropriate Traccar polling cadence and Vercel scheduling constraints before adding any automatic invocation of `/api/telematics/cron/traccar`.
## 2026-08-09 - Automated production Traccar synchronization

- Completed the production scheduling milestone for external Traccar vehicle telemetry.
- Promoted the validated HarborGuard development history from `feature/expanded-incident-taxonomy` to production `main` through a fast-forward-only promotion.
- Confirmed `main` and the feature branch were non-divergent before promotion.
- Confirmed production `main` reached commit `709d210`.
- TypeScript validation passed before production promotion.
- The full Next.js production build passed before promotion.
- All 121/121 static pages were generated successfully.
- Confirmed the production build includes dynamic route `/api/telematics/cron/traccar`.
- Confirmed the production Vercel deployment for commit `709d210` reached Ready state.
- Confirmed the production Traccar execution route accepts the configured `CRON_SECRET` Bearer authentication.
- Confirmed a direct production execution returned `ok = true`.
- The direct production execution reported:
  - `received = 1`;
  - `processed = 0`;
  - `duplicates = 1`;
  - `alreadyProcessing = 0`;
  - `jitterSkipped = 0`;
  - `gpsSpikeSkipped = 0`.
- Confirmed the duplicate result reflects the existing processed Traccar provider message rather than duplicate HarborGuard location processing.
- Created QStash schedule `harborguard-traccar-10m` in the EU region.
- Configured the schedule with cron expression `*/10 * * * *`.
- Configured QStash to invoke `GET https://harborguard.vercel.app/api/telematics/cron/traccar`.
- QStash forwards the existing HarborGuard `Authorization: Bearer <CRON_SECRET>` contract without weakening the machine-authentication boundary.
- Confirmed the schedule is active and not paused.
- Confirmed three consecutive automated production deliveries:
  - 09:00 local time - delivered;
  - 09:10 local time - delivered;
  - 09:20 local time - delivered.
- Confirmed the 09:20 automated cycle updated `telematics_sync_state` at `2026-08-09T07:20:04.391Z`.
- Confirmed the sync state contains no `last_failure_at` or `last_failure_message`.
- Confirmed the automated cycle metadata recorded:
  - `received = 1`;
  - `processed = 0`;
  - `duplicates = 1`;
  - `alreadyProcessing = 0`;
  - `jitterSkipped = 0`;
  - `gpsSpikeSkipped = 0`.
- Confirmed provider message `116208899` remains `processed` with `attempt_count = 1`.
- No QStash token, HarborGuard cron secret, Traccar token or Supabase service-role key was committed to source.
- The external telematics path is now automatically invoked in production every ten minutes through an external scheduler compatible with the current Vercel Hobby plan.
- This closes the initial Traccar external-telemetry ingestion and production-scheduling milestone.
- Next step: perform an audit-first investigation of how normalized external telematics currently propagates into HarborGuard road intelligence, fleet-risk, telemetry alerts and corroboration so the smallest remaining telematics-intelligence-fusion gap can be identified before adding new behavior.
## 2026-08-09 - Corroborated harsh-braking road-intelligence promotion

- Completed the first telemetry-to-road-intelligence promotion bridge for HarborGuard.
- Confirmed through audit that external Traccar hardware telemetry already enters the shared `processVehicleLocationUpdate()` pipeline rather than a separate integration silo.
- Confirmed the shared location lifecycle already performs harsh-braking detection, behavior-alert creation, active-trip updates, stop lifecycle updates and fleet-risk evaluation.
- Confirmed the existing harsh-braking corroboration model uses:
  - a 15-minute observation window;
  - a 150-metre geographic radius;
  - at least two distinct vehicles before the corroboration threshold is met.
- Confirmed `createTelemetryObservation()` previously created only an in-memory telemetry observation and did not persist/promote corroborated telemetry into shared road intelligence.
- Added `lib/route-safety/promoteHarshBrakingTelemetry.ts`.
- Single-vehicle harsh-braking candidates remain fleet telemetry alerts only and do not affect shared road-risk intelligence.
- Corroborated harsh-braking events now upsert a verified `route_intelligence` record.
- The route-intelligence source is `fleet_telemetry`.
- The source record ID is the originating `vehicle_alerts.id`, giving the promotion a stable provider-local idempotency key.
- The existing unique `(organization_id, source, source_record_id)` route-intelligence index is reused rather than creating a parallel deduplication mechanism.
- Corroborated telemetry records preserve vehicle, trip, harsh-braking candidate and corroboration details in route-intelligence metadata.
- Verified telemetry promotion calls the existing `aggregate_road_risk_intelligence` RPC.
- The existing road-risk aggregation idempotency boundary remains in place through the unique route-intelligence-to-road-risk event relationship.
- `harsh_braking` currently falls through the existing road-risk aggregation taxonomy to `other_event_count`; no new risk weighting was invented in this work item.
- Added migration `20260809090000_allow_service_role_road_risk_aggregation.sql`.
- The migration preserves the existing authenticated-user organization isolation check.
- Trusted HarborGuard service-role execution now bypasses only the authenticated-user `current_user_org_id()` comparison so machine-authenticated telemetry ingestion can aggregate intelligence for its explicitly validated organization.
- Execution permission for `aggregate_road_risk_intelligence` now includes both `authenticated` and `service_role`.
- The migration was verified to differ from the previous taxonomy-v2 aggregation RPC only by the audited service-role authorization and grant changes.
- Supabase migration dry-run confirmed that `20260809090000_allow_service_role_road_risk_aggregation.sql` was the only pending migration.
- Migration `20260809090000` was applied successfully to the linked HarborGuard Supabase project and is recorded in both local and remote migration history.
- Service-role RPC execution was verified against production Supabase with an intentionally null `route_intelligence_id`.
- The service-role request passed the authorization boundary and reached the function's own `route_intelligence_id is required` validation.
- That authorization test stopped before the road-risk write path and therefore did not create test risk data.
- `git diff --check` passed.
- TypeScript validation passed.
- The full Next.js production build passed.
- All 121/121 static pages were generated successfully.
- Implementation committed as `96fbce9` with message `Promote corroborated harsh braking to road intelligence`.
- The implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: continue the audit-first telematics-intelligence roadmap by determining whether rapid acceleration, harsh cornering, speeding or other accepted hardware telemetry should have similarly evidence-gated intelligence promotion, or whether the next higher-value roadmap gap lies elsewhere.
## 2026-08-09 - Rapid-acceleration corroboration diagnostics

- Completed the next audit-first fleet-telemetry evidence milestone.
- Audited rapid acceleration, harsh cornering and speeding after completion of the corroborated harsh-braking road-intelligence bridge.
- Confirmed rapid acceleration and harsh cornering remained low-confidence fleet telemetry candidates requiring corroboration.
- Confirmed speeding has a different evidence model because it is already temporally corroborated through consecutive samples but still uses a fixed 120 km/h threshold rather than a road-specific legal speed limit.
- Audited the existing telemetry corroboration architecture and confirmed it is deliberately harsh-braking-specific rather than a generic reusable telemetry evidence abstraction.
- Chose not to generalize harsh-braking corroboration because doing so would implicitly impose the same spatial radius, time window and distinct-vehicle evidence policy on unrelated driving behaviours without sufficient evidence.
- Added `lib/fleet/rapidAccelerationCorroboration.ts`.
- Rapid-acceleration corroboration currently uses an evidence-gathering baseline of:
  - 15-minute observation window;
  - 150-metre geographic radius;
  - minimum two distinct vehicles.
- The rapid-acceleration corroborator queries only organization-scoped `vehicle_alerts` with `alert_type = rapid_acceleration`.
- Nearby alerts are filtered geographically using the existing `getDistanceMeters()` helper.
- Distinct vehicle IDs are calculated so repeated alerts from one vehicle cannot independently satisfy the multi-vehicle corroboration threshold.
- Wired rapid-acceleration corroboration into `createRapidAccelerationAlert.ts` after successful vehicle-alert insertion.
- Corroboration failures are isolated from the primary rapid-acceleration alert lifecycle and are logged diagnostically.
- Successful corroboration checks emit threshold, distinct-vehicle, nearby-alert, radius and observation-window diagnostic information.
- This milestone is diagnostic/evidence-gathering only.
- Rapid acceleration is NOT promoted into `route_intelligence` by this work item.
- Rapid acceleration does NOT invoke `aggregate_road_risk_intelligence`.
- Rapid acceleration does NOT modify `road_risk_segments`.
- No Supabase migration was required.
- Existing harsh-braking corroboration and promotion behaviour was left unchanged.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 121/121 static pages were generated successfully.
- Implementation committed as `5e460ed` with message `Add rapid acceleration corroboration diagnostics`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: gather or audit sufficient evidence before deciding whether rapid acceleration should ever become verified road intelligence; otherwise continue the audit-first roadmap to the next higher-value telemetry/intelligence gap rather than automatically promoting another behaviour.
## 2026-08-09 - Harsh-cornering corroboration diagnostics

- Completed the next audit-first fleet-telemetry evidence milestone.
- Confirmed harsh cornering remained a low-confidence fleet telemetry candidate that explicitly required corroboration before any verified road-intelligence treatment.
- Added `lib/fleet/harshCorneringCorroboration.ts`.
- Harsh-cornering corroboration currently uses an evidence-gathering baseline of:
  - 15-minute observation window;
  - 150-metre geographic radius;
  - minimum two distinct vehicles.
- The harsh-cornering corroborator queries only organization-scoped `vehicle_alerts` with `alert_type = harsh_cornering`.
- Nearby alerts are filtered geographically using the existing `getDistanceMeters()` helper.
- Distinct vehicle IDs are calculated so repeated alerts from one vehicle cannot independently satisfy the multi-vehicle corroboration threshold.
- Wired harsh-cornering corroboration into `createHarshCorneringAlert.ts` after successful vehicle-alert insertion.
- Corroboration failures are isolated from the primary harsh-cornering alert lifecycle and are logged diagnostically.
- Successful corroboration checks emit threshold, distinct-vehicle, nearby-alert, radius and observation-window diagnostic information.
- This milestone is diagnostic/evidence-gathering only.
- Harsh cornering is NOT promoted into `route_intelligence` by this work item.
- Harsh cornering does NOT invoke `aggregate_road_risk_intelligence`.
- Harsh cornering does NOT modify `road_risk_segments`.
- No Supabase migration was required.
- Existing harsh-braking promotion and rapid-acceleration diagnostic behaviour were left unchanged.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 121/121 static pages were generated successfully.
- Implementation committed as `4478b79` with message `Add harsh cornering corroboration diagnostics`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: continue the audit-first roadmap without automatically promoting harsh cornering; compare remaining telemetry/intelligence gaps, especially road-specific speeding context and evidence-policy maturity, before choosing the next focused change.
## 2026-08-09 - Driver GPS heading propagation fix

- Completed an audit-first mobile telemetry propagation fix discovered while preparing road-specific speeding context.
- Confirmed the driver page already calculated GPS heading from `position.coords.heading`.
- Confirmed `sendLocation()` already accepted a heading argument and included it in the `/api/fleet/update-location` payload.
- Identified the precise gap: the live GPS loop called `sendLocation(lat, lng, speedKmh)` without forwarding the calculated heading, causing the default heading value of `0` to be transmitted.
- Changed the live GPS call to `sendLocation(lat, lng, speedKmh, heading)`.
- Left the separate delivered-trip completion call unchanged because its explicit heading value is part of a different lifecycle action.
- Preserved the existing UTF-8 BOM on `app/driver/page.tsx`.
- No database schema or migration changes were required.
- No HERE routing logic was changed.
- No speeding threshold or sustained-speeding policy was changed.
- This fix improves mobile heading fidelity for the normalized fleet telemetry pipeline and removes an upstream blocker for direction-aware road-speed context.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 121/121 static pages were generated successfully.
- Implementation committed as `c44b6c5` with message `Propagate driver GPS heading`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: resume the audit-first HERE road-speed context work using trustworthy mobile heading data before changing the speeding detector.
## 2026-08-09 - HERE road-specific speeding context

- Completed the next audit-first fleet telemetry speeding milestone.
- Confirmed the existing sustained-speeding detector previously used a fixed 120 km/h threshold.
- Confirmed HERE Routing v8 can return road `maxSpeed` span data using the existing HarborGuard HERE API key.
- Added `lib/routing/resolveHereRoadSpeedLimit.ts`.
- The HERE road-speed resolver:
  - accepts live latitude, longitude and heading;
  - projects a short forward destination along the vehicle heading;
  - calls HERE Routing v8 with `spans=length,maxSpeed`;
  - extracts a finite positive `maxSpeed`;
  - converts HERE metres-per-second values to km/h;
  - returns `null` when trustworthy road-speed context is unavailable.
- Runtime experiments around Johannesburg returned approximately 60 km/h road-speed context for northbound, eastbound and westbound probes.
- Wired the resolver into `analyzeVehicleLocationTelemetry.ts` after GPS jitter/spike validation and before sustained-speeding detection.
- HERE road-speed resolution is performed only for non-manual telemetry.
- When HERE returns a finite positive road speed, that value is used as the effective sustained-speeding threshold.
- When HERE road-speed context is unavailable, the existing static `speedingMinimumSpeedKmh` fallback remains in effect.
- The existing sustained-speeding evidence policy remains unchanged:
  - 90-second lookback;
  - minimum three consecutive samples;
  - minimum 30 seconds sustained duration.
- No speeding tolerance or legal-margin policy was introduced in this milestone.
- Historical samples are still evaluated using the current invocation's effective threshold; per-sample persisted road-speed context was intentionally left for a future evidence-maturity milestone.
- Manual telemetry behavior remains unchanged.
- No Supabase migration was required.
- `git diff --check` and resolver whitespace validation passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 121/121 static pages were generated successfully.
- Implementation committed as `06aae32` with message `Use HERE road speed context for speeding`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: audit speeding evidence maturity before adding any tolerance policy, persisted per-sample road-speed context, or road-intelligence promotion.
## 2026-08-09 - Persisted road-speed evidence for sustained speeding

- Completed the next audit-first speeding evidence-maturity milestone.
- Added nullable `road_speed_limit_kmh` persistence to `vehicle_locations`.
- Added migration `20260809103000_add_vehicle_location_road_speed_limit.sql`.
- Extended the generated Supabase `vehicle_locations` Row, Insert and Update types with `road_speed_limit_kmh`.
- Extended `AnalyzeVehicleLocationTelemetryResult` with `roadSpeedLimitKmh`.
- The already-resolved HERE road speed is now propagated out of telemetry analysis rather than being trapped inside the speeding-analysis branch.
- `processVehicleLocationUpdate.ts` now passes the resolved road-speed value into `createVehicleLocation.ts`.
- `createVehicleLocation.ts` persists the value as `road_speed_limit_kmh`.
- Sustained-speeding history now selects `speed_kmh`, `road_speed_limit_kmh` and `recorded_at`.
- Each historical sample is evaluated against its own persisted road-speed limit when that value is finite and positive.
- Historical samples with `NULL` or invalid road-speed context continue to fall back to the existing `minimumSpeedKmh`, preserving compatibility with legacy telemetry.
- The existing 90-second lookback, minimum three consecutive samples and minimum 30-second sustained-duration policy remain unchanged.
- No speeding tolerance or legal-margin policy was introduced.
- No road-intelligence promotion logic was added.
- No duplicate HERE request was introduced for persistence; the existing resolved value is propagated through the telemetry result.
- `git diff --check` passed.
- Migration whitespace validation passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 121/121 static pages were generated successfully.
- Implementation committed as `828ea57` with message `Persist road speed evidence for speeding`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Database migration has NOT yet been applied at this milestone-documentation step.
- Next step: audit local/remote Supabase migration state, dry-run the single pending migration, then apply and verify it separately before beginning another implementation item.
## 2026-08-09 - Road-speed evidence migration deployed

- Completed database deployment for the persisted road-speed evidence milestone.
- Applied Supabase migration `20260809103000_add_vehicle_location_road_speed_limit.sql`.
- The migration added nullable `road_speed_limit_kmh double precision` to `public.vehicle_locations`.
- Pre-deployment migration audit confirmed `20260809103000` was local-only and pending.
- `supabase db push --dry-run` confirmed that only `20260809103000_add_vehicle_location_road_speed_limit.sql` would be applied.
- The dry run did not modify the remote database.
- The migration was then applied successfully with `supabase db push`.
- Post-deployment migration history confirmed `20260809103000` is recorded on both local and remote migration histories.
- Runtime verification queried the remote PostgREST endpoint for `vehicle_locations.road_speed_limit_kmh`.
- The remote query succeeded and returned the new field, confirming that the column is available through the runtime API.
- The verification response returned `road_speed_limit_kmh: null` for an existing telemetry row, which is expected for legacy data recorded before road-speed persistence.
- No backfill was performed; legacy rows intentionally remain nullable and continue to use the existing speeding-threshold fallback.
- Git HEAD remained unchanged during migration application and runtime verification.
- The tracked working tree remained clean throughout the deployment.
- Implementation remains committed as `828ea57` with message `Persist road speed evidence for speeding`.
- Pre-deployment milestone documentation remains committed as `cedc7cd` with message `Document persisted road speed evidence`.
- Persisted per-sample road-speed evidence is now available end-to-end in code and in the deployed database schema.
- Next step: begin a fresh audit-first roadmap assessment before choosing any further speeding tolerance, evidence-policy or road-intelligence promotion work.
## 2026-08-09 - Speeding alert road-context semantics corrected

- Completed a focused audit-first semantic correction in the sustained-speeding alert path.
- Confirmed the speeding alert text still described detection as using a fixed threshold and stated that road-specific speed limits were not yet used.
- Those statements had become stale after HERE road-speed context and persisted per-sample road-speed evidence were introduced.
- Updated the speeding alert message to describe the active threshold as the effective threshold rather than a fixed threshold.
- Updated the intelligence narrative to state that speeding analysis uses available road-speed context and falls back to the configured threshold when road-speed context is unavailable.
- Replaced the phrase `Corroborated fleet telemetry candidate` with `Sustained fleet telemetry candidate`.
- The wording now reflects temporal evidence from consecutive samples without implying the multi-vehicle corroboration contract used by harsh-braking road-intelligence promotion.
- No speeding detector logic was changed.
- No road-speed thresholds were changed.
- No sustained-duration or minimum-sample policy was changed.
- No database schema or migration changes were required.
- No speeding promotion into `route_intelligence` was introduced.
- No call to `aggregate_road_risk_intelligence` was introduced.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 121/121 static pages were generated successfully.
- Implementation committed as `2019192` with message `Correct speeding alert road context semantics`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first assessment of the next fleet/road-intelligence gap rather than automatically promoting speeding.
## 2026-08-09 - Vehicle alert review outcomes

- Completed the next audit-first telemetry evidence-maturity milestone.
- Identified that `vehicle_alerts` already had a durable resolution lifecycle through `is_resolved`, `resolved_at` and `resolution_notes`, but did not record structured ground-truth meaning for the resolution.
- Added nullable `review_outcome` persistence to `vehicle_alerts`.
- Added migration `20260809110000_add_vehicle_alert_review_outcome.sql`.
- The migration constrains non-null review outcomes to:
  - `confirmed`;
  - `false_positive`;
  - `inconclusive`.
- Extended generated Supabase `vehicle_alerts` Row, Insert and Update types with `review_outcome`.
- Extended `/api/fleet/resolve-alert` with a typed review-outcome contract.
- The fleet alert resolver now validates review outcomes before resolution persistence.
- Valid review outcomes are stored atomically with the existing resolved state, timestamp and resolution notes.
- `/api/fleet/alerts` now returns `review_outcome` so resolved-alert consumers can display the recorded disposition.
- The dedicated Vehicle Alerts screen now requires the operator to explicitly select Confirmed, False positive or Inconclusive before resolving an alert.
- Resolved alerts now display the recorded review outcome alongside the existing resolution notes.
- Command Center quick resolution now supplies `inconclusive` because that workflow does not currently provide a dedicated ground-truth review decision.
- Incident-linked alert resolution was intentionally left unchanged and does not assign `review_outcome`; ordinary incident closure is not automatically treated as detector ground truth.
- Existing alert acknowledgement behavior was left unchanged.
- No telemetry detector thresholds were changed.
- No harsh-braking, rapid-acceleration, harsh-cornering or speeding detection behavior was changed.
- No telemetry-to-road-intelligence promotion behavior was changed.
- No automatic detector calibration was introduced.
- This milestone creates durable operator-labeled evidence that can support future telemetry precision/false-positive analysis without automatically mutating production thresholds.
- `git diff --check` passed.
- Migration whitespace validation passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 121/121 static pages were generated successfully.
- Implementation committed as `f8e4d65` with message `Add vehicle alert review outcomes`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Database migration has NOT yet been applied at this documentation step.
- Next step: audit local/remote Supabase migration state, dry-run the single pending review-outcome migration, then apply and verify it separately before starting another implementation item.
## 2026-08-09 - Vehicle alert review outcomes deployed

- Completed deployment of the vehicle-alert review-outcome milestone.
- Implementation introduced explicit review outcomes for resolved vehicle alerts while preserving the existing resolved/acknowledged lifecycle.
- Supported review outcomes are `confirmed`, `false_positive`, and `inconclusive`.
- Review outcome data is exposed through the fleet alerts API and command-center alert data contract.
- The vehicle-alert review interface now allows an operator to classify the outcome while resolving an alert.
- Added Supabase migration `20260809110000_add_vehicle_alert_review_outcome.sql`.
- The migration adds nullable `review_outcome` evidence to `public.vehicle_alerts`.
- The database check constraint restricts persisted non-null review outcomes to the supported review-outcome contract.
- Legacy vehicle-alert rows intentionally remain nullable.
- Pre-deployment migration audit confirmed `20260809110000` was local-only and pending.
- `supabase db push --dry-run` confirmed that exactly `20260809110000_add_vehicle_alert_review_outcome.sql` would be applied.
- The dry run did not modify the remote database.
- The migration was subsequently applied successfully with `supabase db push`.
- Post-deployment migration history confirmed `20260809110000` is recorded in both local and remote migration histories.
- Runtime verification queried the remote PostgREST endpoint for `vehicle_alerts.review_outcome`.
- The runtime query succeeded, confirming that the new column is exposed through the deployed API schema.
- The verification response returned `review_outcome: null` for an existing alert, which is expected for legacy data created before review-outcome persistence.
- No synthetic production alert was inserted solely to exercise the database constraint.
- Git HEAD remained unchanged during migration deployment and runtime verification.
- The tracked working tree remained clean throughout deployment.
- Deployed feature branch HEAD is `36401af`.
- Vehicle-alert review outcomes are now implemented and deployed end-to-end.
- Next step: begin a fresh audit-first roadmap assessment before selecting another fleet or road-intelligence milestone.
## 2026-08-09 - Telemetry alert review performance analytics

- Completed the next audit-first telemetry evidence-quality milestone.
- Confirmed that vehicle-alert review outcomes were persisted and exposed operationally but were not yet consumed for detector-quality analysis.
- Added `lib/fleet/calculateTelemetryAlertReviewPerformance.ts`.
- Added `/api/fleet/telemetry-review-performance`.
- Added a new Telemetry Alert Review Performance section to the Analytics page.
- The analysis is limited to HarborGuard-generated telemetry alert types:
  - `harsh_braking`;
  - `rapid_acceleration`;
  - `harsh_cornering`;
  - `speeding`.
- Review evidence uses the deployed `vehicle_alerts.review_outcome` values:
  - `confirmed`;
  - `false_positive`;
  - `inconclusive`.
- The performance helper reports:
  - reviewed alerts;
  - evaluated alerts;
  - confirmed alerts;
  - false positives;
  - inconclusive reviews;
  - confirmation rate.
- `reviewedAlerts` includes confirmed, false-positive and inconclusive reviews.
- `evaluatedAlerts` includes only confirmed and false-positive reviews.
- Confirmation rate is calculated as `confirmed / (confirmed + false_positive)`.
- Inconclusive reviews are intentionally excluded from the confirmation-rate denominator.
- The metric is named confirmation rate rather than precision because the available review evidence does not identify false negatives.
- The API is organization-scoped.
- Analytics date filtering is applied to `resolved_at`, reflecting when the human review disposition was recorded.
- The API supports optional vehicle filtering and therefore follows the existing Analytics vehicle selector.
- Analytics displays overall review-performance metrics plus separate breakdowns for harsh braking, rapid acceleration, harsh cornering and speeding.
- The Analytics UI explicitly explains that the analysis is descriptive only.
- No telemetry detector thresholds were changed.
- No alert-generation logic was changed.
- No automatic calibration or threshold mutation was introduced.
- No telemetry-to-road-intelligence promotion behavior was changed.
- No database migration or schema change was required.
- `git diff --check` passed.
- New-file whitespace validation passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- The production route manifest includes `/api/fleet/telemetry-review-performance`.
- Implementation committed as `200e442` with message `Add telemetry alert review performance analytics`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first roadmap assessment before selecting another telemetry, fleet or road-intelligence implementation.
## 2026-08-09 - Telemetry review performance segmented by vehicle

- Completed the next audit-first telemetry evidence-segmentation milestone.
- Extended `TelemetryAlertReviewEvaluation` with nullable `vehicle_id`.
- Extended telemetry review performance output with `byVehicle`.
- Added `TelemetryAlertReviewVehicleBreakdown`.
- The telemetry review API now selects `vehicle_id` alongside `alert_type` and `review_outcome`.
- Vehicle-level review segmentation uses the same existing review-performance summary semantics as overall and per-alert-type analysis.
- Vehicle rows with `NULL` `vehicle_id` are intentionally excluded from `byVehicle`.
- Distinct non-null vehicle IDs are deduplicated and sorted deterministically before breakdown generation.
- Each vehicle breakdown reports:
  - reviewed alerts;
  - evaluated alerts;
  - confirmed alerts;
  - false positives;
  - inconclusive reviews;
  - confirmation rate.
- Existing overall review-performance behavior remains unchanged.
- Existing per-alert-type review-performance behavior remains unchanged.
- Confirmation rate remains `confirmed / (confirmed + false_positive)`.
- Inconclusive reviews remain excluded from the confirmation-rate denominator.
- No detector thresholds were changed.
- No telemetry alert-generation behavior was changed.
- No telemetry-to-road-intelligence promotion behavior was changed.
- No database schema or migration change was required.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- The existing `/api/fleet/telemetry-review-performance` route remained present in the production route manifest.
- Implementation committed as `76f6322` with message `Segment telemetry review performance by vehicle`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first assessment before deciding whether to expose the new `byVehicle` evidence in Analytics or pursue another telemetry evidence-maturity gap.
## 2026-08-09 - Telemetry review performance exposed by vehicle

- Completed the next audit-first telemetry review analytics milestone.
- Exposed the existing backend `byVehicle` telemetry review-performance evidence in the Analytics page.
- Extended the Analytics telemetry review response contract with `TelemetryAlertReviewVehicleBreakdown`.
- Added `byVehicle` to the Analytics-side `TelemetryAlertReviewPerformance` type.
- Added a vehicle-label helper that resolves vehicle IDs against the already-loaded Analytics vehicle list.
- Vehicle labels prefer `nickname (registration_number)` when both are available.
- Vehicle labels fall back to nickname, registration number or the raw vehicle ID when needed.
- Added a `Review Performance by Vehicle` section to Telemetry Alert Review Performance.
- The vehicle breakdown is displayed only when Analytics is scoped to `All vehicles`.
- Vehicle-filtered Analytics requests continue to rely on the existing `selectedVehicleId` API filter and do not render a redundant fleet comparison.
- Each vehicle breakdown displays:
  - reviewed alerts;
  - confirmed alerts;
  - false positives;
  - inconclusive reviews;
  - confirmation rate.
- Existing overall telemetry review metrics remain unchanged.
- Existing per-alert-type review metrics remain unchanged.
- Existing confirmation-rate semantics remain unchanged.
- No backend API changes were required in this milestone because `byVehicle` was already returned by `/api/fleet/telemetry-review-performance`.
- No database schema or migration changes were required.
- No detector thresholds were changed.
- No telemetry alert-generation behavior was changed.
- No telemetry-to-road-intelligence promotion behavior was changed.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- `/api/fleet/telemetry-review-performance` remained present in the production route manifest.
- Implementation committed as `9879991` with message `Expose telemetry review performance by vehicle`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first roadmap assessment before selecting another telemetry, fleet or road-intelligence milestone.
## 2026-08-09 - Vehicle alert telemetry evidence persistence added

- Completed a focused audit-first persistence milestone for telemetry-derived vehicle alerts.
- Added nullable `telemetry_evidence jsonb` storage to `vehicle_alerts`.
- Added the corresponding `telemetry_evidence` Row, Insert, and Update contracts to the generated Supabase database typing surface.
- Harsh-braking alerts now persist the detector candidate as telemetry evidence.
- Rapid-acceleration alerts now persist the detector candidate as telemetry evidence.
- Harsh-cornering alerts now persist the detector candidate as telemetry evidence.
- Sustained-speeding alerts now persist the detector candidate as telemetry evidence.
- The persisted evidence preserves the telemetry context that caused each alert to be created for later review, analytics, and detector-quality assessment.
- No detector thresholds were changed.
- No detector candidate semantics were changed.
- No location-update lifecycle behavior was changed.
- No road-intelligence promotion behavior was changed.
- No automatic threshold tuning was introduced.
- Added migration `20260809130000_add_vehicle_alert_telemetry_evidence.sql`.
- The migration has been committed but has not yet been pushed to the remote Supabase database.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- Implementation committed as `00045f9` with message `Persist telemetry evidence with vehicle alerts`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: inspect migration history and perform a guarded Supabase dry run before deploying the telemetry-evidence migration.
## 2026-08-09 - Telemetry evidence migration encoding corrected

- Completed a focused recovery after the first deployment attempt for `20260809130000_add_vehicle_alert_telemetry_evidence.sql`.
- The pre-deployment migration audit and Supabase dry run confirmed that `20260809130000` was the only pending migration.
- The initial real `supabase db push` did not apply the migration because PostgreSQL rejected the first SQL token as `﻿alter`.
- The failure was traced to a UTF-8 byte-order mark written at the start of the migration file.
- The database migration did not become recorded remotely during the failed deployment attempt.
- The migration remained local-only after the failure.
- Rewrote the migration as UTF-8 without BOM while preserving its two SQL statements exactly.
- Verified the corrected migration begins with bytes `61 6C 74 65 72 20 74 61`, corresponding directly to `alter ta`.
- Verified the migration still contains only:
  - `alter table public.vehicle_alerts`
  - `add column if not exists telemetry_evidence jsonb;`
- Verified the encoding correction changed only `20260809130000_add_vehicle_alert_telemetry_evidence.sql`.
- `git diff --check` passed.
- TypeScript validation passed after the encoding correction.
- Full Next.js production build passed after the correction.
- All 122/122 static pages were generated successfully.
- Encoding correction committed as `9400715` with message `Remove BOM from telemetry evidence migration`.
- Encoding-correction commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Migration `20260809130000` remains NOT deployed at this documentation step.
- Next step: perform a fresh guarded dry run from the corrected migration file, verify it remains the sole pending migration, then retry deployment separately.
## 2026-08-09 - Telemetry evidence migration deployed

- Completed database deployment for the vehicle-alert telemetry-evidence persistence milestone.
- Applied Supabase migration `20260809130000_add_vehicle_alert_telemetry_evidence.sql`.
- The migration adds nullable `telemetry_evidence jsonb` to `public.vehicle_alerts`.
- Pre-deployment migration history confirmed `20260809130000` was local-only and pending.
- A fresh post-encoding-fix `supabase db push --dry-run` confirmed that only `20260809130000_add_vehicle_alert_telemetry_evidence.sql` would be applied.
- The dry run did not modify the remote database.
- The corrected migration file was verified to be UTF-8 without BOM before deployment.
- The migration was then applied successfully with `supabase db push`.
- Post-deployment migration history confirmed `20260809130000` is recorded on both local and remote migration histories.
- Runtime verification queried the remote PostgREST endpoint for `vehicle_alerts.telemetry_evidence`.
- The remote query succeeded, confirming that the new column is available through the runtime API.
- The verification response returned `telemetry_evidence: null` for an existing alert, which is expected for legacy alerts created before structured telemetry-evidence persistence.
- No historical backfill was performed.
- New harsh-braking, rapid-acceleration, harsh-cornering and sustained-speeding alerts can now persist their detector candidate as structured telemetry evidence.
- No detector thresholds were changed.
- No detector candidate semantics were changed.
- No location-update lifecycle behavior was changed.
- No road-intelligence promotion behavior was changed.
- No automatic threshold tuning was introduced.
- Git HEAD remained unchanged during deployment and runtime verification.
- The tracked working tree remained clean throughout deployment.
- Implementation remains committed as `00045f9` with message `Persist telemetry evidence with vehicle alerts`.
- Migration encoding correction remains committed as `9400715` with message `Remove BOM from telemetry evidence migration`.
- Encoding-correction documentation remains committed as `921766f` with message `Document telemetry migration encoding correction`.
- Persisted structured telemetry evidence is now available end-to-end in application code and the deployed database schema.
- Next step: begin a fresh audit-first roadmap assessment before choosing another telemetry, fleet or road-intelligence milestone.
## 2026-08-09 - Vehicle alert telemetry evidence exposed to reviewers

- Completed a focused audit-first reviewer workflow improvement for telemetry-derived vehicle alerts.
- Extended `/api/fleet/alerts` to return the persisted `telemetry_evidence` field.
- Extended the Vehicle Alerts client contract with nullable structured telemetry evidence.
- Added human-readable telemetry evidence formatting helpers.
- Added a dedicated `Telemetry Evidence` panel to vehicle-alert cards when structured evidence is present.
- The evidence panel is rendered before the existing resolved/review-control branch so reviewers can inspect detector evidence before selecting a review outcome.
- Evidence labels are converted from stored field names into readable labels.
- Speed values are displayed in km/h.
- Acceleration and deceleration values are displayed in m/s².
- Durations are displayed in seconds.
- Heading values and heading-change values are displayed in degrees.
- Existing alerts without telemetry evidence remain unaffected and do not render the panel.
- No detector thresholds were changed.
- No detector candidate semantics were changed.
- No database schema changes were required.
- No new migration was required.
- No telemetry review analytics were changed.
- No road-intelligence promotion behavior was changed.
- No automatic threshold tuning was introduced.
- Preserved the existing UTF-8 BOM state of `app/vehicle-alerts/page.tsx`.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- Implementation committed as `c2ae223` with message `Expose telemetry evidence on vehicle alerts`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first assessment before choosing another telemetry, analytics, fleet, or road-intelligence milestone.
## 2026-08-09 - Telemetry evidence coverage diagnostics added

- Completed a focused audit-first telemetry review evidence-maturity milestone.
- Extended the telemetry review-performance query to select `telemetry_evidence` from `vehicle_alerts`.
- Extended `TelemetryAlertReviewEvaluation` with nullable structured telemetry evidence.
- Extended `TelemetryAlertReviewSummary` with:
  - `evidenceAvailable`;
  - `evidenceCoverageRate`.
- `evidenceAvailable` counts reviewed telemetry alerts whose persisted telemetry evidence is non-null, object-shaped and non-empty.
- `evidenceCoverageRate` is calculated as `evidenceAvailable / reviewedAlerts`.
- The existing review-performance semantics remain unchanged.
- `reviewedAlerts` still includes confirmed, false-positive and inconclusive reviews.
- `evaluatedAlerts` still includes only confirmed and false-positive reviews.
- Confirmation rate remains `confirmed / (confirmed + false_positive)`.
- Inconclusive reviews remain excluded from the confirmation-rate denominator.
- Evidence coverage is descriptive only and does not infer detector quality by itself.
- No detector thresholds were changed.
- No telemetry detector candidate semantics were changed.
- No alert-generation behavior was changed.
- No database schema changes were required.
- No new migration was required.
- No road-intelligence promotion behavior was changed.
- No automatic detector calibration or threshold tuning was introduced.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- The production route manifest continues to include `/api/fleet/telemetry-review-performance`.
- Implementation committed as `c2ea003` with message `Add telemetry evidence coverage diagnostics`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first assessment before deciding whether to expose evidence coverage in Analytics or pursue another telemetry, fleet, or road-intelligence milestone.
## 2026-08-09 - Telemetry evidence coverage exposed in Analytics

- Completed a focused audit-first analytics presentation milestone.
- Extended the Analytics-side `TelemetryAlertReviewSummary` contract with:
  - `evidenceAvailable`;
  - `evidenceCoverageRate`.
- Added an overall `Evidence Coverage` metric to the Telemetry Alert Review Performance section.
- Added evidence coverage to each per-alert-type review-performance breakdown.
- Added evidence coverage to each per-vehicle review-performance breakdown.
- Evidence coverage is displayed with the existing performance-percentage formatter.
- Extended the Analytics explanatory copy to define evidence coverage as the share of reviewed alerts with persisted structured telemetry evidence.
- The Analytics copy explicitly states that evidence coverage is descriptive and does not by itself indicate detector quality.
- Existing confirmation-rate semantics remain unchanged.
- Existing confirmed, false-positive and inconclusive review counts remain unchanged.
- Inconclusive reviews remain excluded from the confirmation-rate denominator.
- The analysis still does not identify false negatives.
- No backend API changes were required because `/api/fleet/telemetry-review-performance` already returned `evidenceAvailable` and `evidenceCoverageRate`.
- No detector thresholds were changed.
- No telemetry detector candidate semantics were changed.
- No alert-generation behavior was changed.
- No database schema changes were required.
- No new migration was required.
- No road-intelligence promotion behavior was changed.
- No automatic detector calibration or threshold tuning was introduced.
- Preserved the existing no-BOM CRLF encoding state of `app/analytics/page.tsx`.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- The production route manifest continues to include `/api/fleet/telemetry-review-performance`.
- Implementation committed as `e4c1c25` with message `Expose telemetry evidence coverage in analytics`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first roadmap assessment before choosing another telemetry, fleet, analytics, or road-intelligence milestone.
## 2026-08-09 - Per-alert-type telemetry evidence outcome diagnostics added

- Completed a focused audit-first telemetry review evidence-quality milestone.
- Added descriptive evidence-strength diagnostics to telemetry review performance.
- Diagnostics are attached only to the per-alert-type breakdown so incompatible units are never averaged together in the overall or per-vehicle summaries.
- Added `TelemetryEvidenceOutcomeDiagnostic` with:
  - `confirmedAverage`;
  - `falsePositiveAverage`.
- Harsh-braking evidence strength uses persisted `decelerationMps2`.
- Rapid-acceleration evidence strength uses persisted `accelerationMps2`.
- Harsh-cornering evidence strength uses persisted `headingChangeDegrees`.
- Sustained-speeding evidence strength uses the persisted speed margin `speedKmh - thresholdKmh`.
- Confirmed and false-positive evidence-strength averages are calculated independently.
- Reviews with missing or non-numeric detector-specific evidence are excluded from the corresponding evidence-strength average.
- Inconclusive reviews are not included in the confirmed-versus-false-positive evidence-strength comparison.
- Existing overall review-performance semantics remain unchanged.
- Existing per-vehicle review-performance semantics remain unchanged.
- Existing evidence-coverage metrics remain unchanged.
- The shared `TelemetryAlertReviewSummary` remains unit-neutral.
- The per-vehicle `TelemetryAlertReviewVehicleBreakdown` remains unit-neutral.
- No detector thresholds were changed.
- No detector candidate semantics were changed.
- No alert-generation behavior was changed.
- No database schema changes were required.
- No new migration was required.
- No road-intelligence promotion behavior was changed.
- No automatic detector calibration or threshold tuning was introduced.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- Implementation committed as `e567701` with message `Add telemetry evidence outcome diagnostics`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first assessment before deciding whether to expose these per-alert-type evidence-strength diagnostics in Analytics or pursue another telemetry, fleet, or road-intelligence milestone.
## 2026-08-09 - Telemetry evidence outcome diagnostics exposed in Analytics

- Completed a focused audit-first Analytics presentation milestone for telemetry evidence outcome diagnostics.
- Extended the Analytics-side `TelemetryAlertReviewBreakdown` contract with per-alert-type `evidenceStrength` values.
- Added:
  - `confirmedAverage`;
  - `falsePositiveAverage`.
- Added a unit-aware `formatTelemetryEvidenceStrength` formatter.
- Harsh-braking evidence averages are displayed in `m/s²`.
- Rapid-acceleration evidence averages are displayed in `m/s²`.
- Harsh-cornering evidence averages are displayed in degrees.
- Sustained-speeding evidence averages are displayed as `km/h above threshold`.
- Added `Confirmed evidence avg` to each per-alert-type telemetry review card.
- Added `False-positive evidence avg` to each per-alert-type telemetry review card.
- Evidence-strength diagnostics remain limited to per-alert-type summaries so incompatible units are never mixed in overall or per-vehicle views.
- Existing overall telemetry review metrics remain unchanged.
- Existing per-vehicle telemetry review metrics remain unchanged.
- Existing confirmation-rate semantics remain unchanged.
- Existing evidence-coverage semantics remain unchanged.
- No detector thresholds were changed.
- No detector candidate semantics were changed.
- No alert-generation behavior was changed.
- No database schema changes were required.
- No new migration was required.
- No road-intelligence promotion behavior was changed.
- No automatic detector calibration or threshold tuning was introduced.
- Preserved the existing no-BOM CRLF encoding state of `app/analytics/page.tsx`.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- The production route manifest continues to include `/api/fleet/telemetry-review-performance`.
- Implementation committed as `59ad3eb` with message `Expose telemetry evidence outcome diagnostics in analytics`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first roadmap assessment before selecting another telemetry, fleet, analytics, or road-intelligence milestone.
## 2026-08-09 - Telemetry evidence sample counts exposed

- Completed a focused audit-first telemetry evidence diagnostic maturity milestone.
- Extended `TelemetryEvidenceOutcomeDiagnostic` with:
  - `confirmedSamples`;
  - `falsePositiveSamples`.
- Evidence sample counts are derived from the exact filtered evidence-strength arrays used to calculate each corresponding average.
- Confirmed sample counts therefore represent only confirmed reviews with usable detector-specific evidence strength.
- False-positive sample counts therefore represent only false-positive reviews with usable detector-specific evidence strength.
- Reviews with missing or non-numeric detector-specific evidence remain excluded from the corresponding average and sample count.
- Refactored the evidence outcome diagnostic calculation so each usable evidence-strength array is derived once and reused for both its average and sample count.
- Extended the Analytics-side telemetry review contract with the same two sample-count fields.
- Analytics now displays each per-alert-type confirmed evidence average with its sample size.
- Analytics now displays each per-alert-type false-positive evidence average with its sample size.
- A missing average remains displayed as `-` while its sample count remains explicit, including `n=0`.
- Evidence-strength diagnostics remain limited to per-alert-type summaries so incompatible detector units are never mixed.
- Existing overall telemetry review semantics remain unchanged.
- Existing per-vehicle telemetry review semantics remain unchanged.
- Existing confirmation-rate semantics remain unchanged.
- Existing evidence-coverage semantics remain unchanged.
- No detector thresholds were changed.
- No detector candidate semantics were changed.
- No alert-generation behavior was changed.
- No database schema changes were required.
- No new migration was required.
- No road-intelligence promotion behavior was changed.
- No automatic detector calibration or threshold tuning was introduced.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- Implementation committed as `c73f540` with message `Expose telemetry evidence sample counts`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first roadmap assessment before selecting another telemetry, analytics, fleet, or road-intelligence milestone.
## 2026-08-09 - Telemetry evidence median diagnostics added

- Completed a focused audit-first telemetry evidence distribution milestone.
- Extended `TelemetryEvidenceOutcomeDiagnostic` with:
  - `confirmedMedian`;
  - `falsePositiveMedian`.
- Added a local median helper beside the existing average helper.
- Median calculation returns `null` for an empty sample.
- Median calculation sorts a copied array so the original evidence-strength arrays are not mutated.
- Odd-sized samples return the middle sorted value.
- Even-sized samples return the arithmetic mean of the two middle sorted values.
- Confirmed medians are calculated from the same filtered `confirmedEvidenceStrengths` array already used for the confirmed average and confirmed sample count.
- False-positive medians are calculated from the same filtered `falsePositiveEvidenceStrengths` array already used for the false-positive average and false-positive sample count.
- Reviews with missing or non-numeric detector-specific evidence remain excluded from these evidence-strength diagnostics.
- Extended the Analytics-side evidence-strength contract with both median fields.
- Added `Confirmed evidence median` to each per-alert-type telemetry review card.
- Added `False-positive evidence median` to each per-alert-type telemetry review card.
- Median values reuse the existing alert-type-aware evidence formatter and therefore preserve the correct detector-specific units.
- Existing sample-count semantics remain unchanged.
- Existing average semantics remain unchanged.
- Existing overall telemetry review semantics remain unchanged.
- Existing per-vehicle telemetry review semantics remain unchanged.
- Existing evidence-coverage semantics remain unchanged.
- Existing confirmation-rate semantics remain unchanged.
- No detector thresholds were changed.
- No detector candidate semantics were changed.
- No alert-generation behavior was changed.
- No database schema changes were required.
- No new migration was required.
- No road-intelligence promotion behavior was changed.
- No automatic calibration or threshold tuning was introduced.
- Both modified files preserved their existing UTF-8 no-BOM CRLF encoding state.
- `git diff --check` passed.
- TypeScript validation passed.
- Targeted ESLint surfaced pre-existing Analytics lint failures outside the median patch; the median patch itself did not touch those reported locations.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- Implementation committed as `cb02596` with message `Add telemetry evidence median diagnostics`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first roadmap assessment before selecting another telemetry, analytics, fleet, or road-intelligence milestone.
## 2026-08-09 - Vehicle alert reviewer attribution persisted

- Completed a focused audit-first reviewer-attribution milestone for vehicle-alert review outcomes.
- Added nullable `reviewed_by uuid` storage to `vehicle_alerts`.
- Added a foreign key from `vehicle_alerts.reviewed_by` to `auth.users(id)`.
- The reviewer foreign key uses `ON DELETE SET NULL`, matching HarborGuard's established actor-attribution pattern.
- Extended the generated Supabase `vehicle_alerts` Row, Insert, and Update contracts with nullable `reviewed_by`.
- Updated `/api/fleet/resolve-alert` to destructure the authenticated `user` from the existing `requireOrganization()` result.
- When a valid vehicle-alert review outcome is persisted, the route now also stores `reviewed_by: user.id`.
- Existing role enforcement remains unchanged.
- Existing organization scoping remains unchanged.
- Existing review-outcome validation remains unchanged.
- Existing resolution-note behavior remains unchanged.
- Existing `resolved_at` behavior remains unchanged.
- No separate `reviewed_at` field was added because the current review and resolution action is atomic and `resolved_at` already records the event time.
- No Vehicle Alerts reviewer-name UI was added in this milestone.
- No telemetry review analytics were changed.
- No detector thresholds were changed.
- No detector candidate semantics were changed.
- No alert-generation behavior was changed.
- No road-intelligence promotion behavior was changed.
- Added migration `20260809140000_add_vehicle_alert_reviewer_attribution.sql`.
- Verified the migration file is UTF-8 without BOM.
- Guarded Supabase dry run confirmed that `20260809140000` was the only pending migration before deployment.
- Migration `20260809140000` was deployed successfully to the remote Supabase database.
- Post-deployment migration history confirmed local/remote synchronization for `20260809140000`.
- Remote PostgREST verification successfully selected `id`, `review_outcome`, and `reviewed_by` from `vehicle_alerts`.
- The remote verification confirmed that `reviewed_by` is available through the live API schema.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- Implementation committed as `777084c` with message `Persist vehicle alert reviewer attribution`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first assessment before deciding whether reviewer attribution should be exposed in the Vehicle Alerts UI or whether another reviewer-workflow gap has higher value.
## 2026-08-09 - Vehicle alert reviewer identity exposed in the review UI

- Completed a focused audit-first reviewer-workflow improvement for resolved vehicle alerts.
- Extended `/api/fleet/alerts` to return the persisted `reviewed_by` field.
- Added a single batched lookup against `profiles` for all unique reviewer IDs in the current alert result set.
- Reviewer profile lookup is explicitly scoped to the current `organizationId`.
- Reviewer profile lookup selects only `id`, `full_name`, and `email`.
- Attached a nullable reviewer object to each returned alert.
- Existing alerts without reviewer attribution remain valid.
- Extended the Vehicle Alerts client contract with nullable `reviewed_by` and reviewer profile data.
- Resolved vehicle-alert cards now display `Reviewed by`.
- Reviewer display prefers `full_name`.
- Reviewer display falls back to the reviewer email when no display name is available.
- Alerts with a reviewer ID but no resolvable organization-scoped profile display `Unknown reviewer`.
- Older alerts without reviewer attribution display `Not recorded`.
- Existing review-outcome display remains unchanged.
- Existing resolution-note display remains unchanged.
- Existing resolution timestamp display remains unchanged.
- No database schema changes were required.
- No new migration was required.
- No reviewer persistence behavior was changed.
- No telemetry review analytics were changed.
- No detector thresholds were changed.
- No detector candidate semantics were changed.
- No alert-generation behavior was changed.
- No road-intelligence promotion behavior was changed.
- Preserved the existing UTF-8 BOM state of both modified files.
- Preserved the existing mixed line-ending state of `app/api/fleet/alerts/route.ts` rather than normalizing unrelated content.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- Implementation committed as `a2191ce` with message `Expose vehicle alert reviewer identity`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first assessment before selecting another reviewer-workflow, telemetry, fleet, or road-intelligence milestone.
## 2026-08-09 - Telemetry source provenance preserved in behavior alerts

- Completed a focused audit-first telemetry provenance improvement.
- Confirmed normalized vehicle-location updates already carry `source` as `mobile`, `hardware`, or `manual`.
- Confirmed normalized source is already used during telemetry detection and persisted on vehicle-location records.
- Identified the precise provenance gap at the transition from `processVehicleLocationUpdate()` into `runPostLocationUpdateLifecycle()`.
- Extended the post-location lifecycle input contract to carry normalized telemetry source.
- Extended `createLocationBehaviorAlerts()` to carry normalized telemetry source.
- Passed normalized source into harsh-braking alert creation.
- Passed normalized source into rapid-acceleration alert creation.
- Passed normalized source into harsh-cornering alert creation.
- Passed normalized source into speeding alert creation.
- Persisted normalized source inside each telemetry alert's existing `telemetry_evidence` JSON object.
- Existing detector candidate shapes were intentionally left unchanged.
- Existing detector thresholds were unchanged.
- Existing detector candidate semantics were unchanged.
- Existing alert classifications were unchanged.
- Existing review analytics behavior was unchanged.
- Existing road-intelligence promotion behavior was unchanged.
- No database schema change was required.
- No migration was required.
- No provider-specific Traccar field was introduced into the shared behavior-alert contract.
- The change preserves the provider-neutral normalized telemetry architecture for future Webfleet support.
- Existing BOM states were preserved across all modified files.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- Implementation committed as `01d8103` with message `Preserve telemetry source in behavior alerts`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first assessment of whether normalized telemetry source should now be surfaced in telemetry review analytics or whether another telemetry-data-quality gap has higher value.
## 2026-08-09 - Telemetry review analytics segmented by source

- Completed a focused audit-first telemetry review analytics improvement.
- Confirmed `telemetry_evidence.source` is now persisted for new behavior alerts.
- Added a normalized telemetry analytics source taxonomy:
  - `hardware`
  - `mobile`
  - `manual`
  - `unknown`
- Added explicit legacy/malformed-source handling through the `unknown` category.
- Added `TelemetryAlertReviewSourceBreakdown`.
- Extended `TelemetryAlertReviewPerformance` with a stable `bySource` breakdown.
- Reused the existing review-summary calculations for source segmentation rather than introducing new scoring semantics.
- Source breakdowns include reviewed-alert count, evaluated-alert count, confirmed count, false-positive count, inconclusive count, confirmation rate, evidence availability, and evidence coverage.
- Source categories are returned in a stable order:
  - hardware
  - mobile
  - manual
  - unknown
- Existing telemetry review API query shape was reused because `telemetry_evidence` is already selected.
- No database schema change was required.
- No migration was required.
- No detector thresholds were changed.
- No detector candidate semantics were changed.
- No alert-generation behavior was changed.
- No road-intelligence promotion behavior was changed.
- Added `Review Performance by Telemetry Source` to the Analytics page.
- Analytics now displays reviewed, confirmed, false-positive, inconclusive, confirmation-rate, and evidence-coverage metrics for each source category.
- Added explanatory copy stating that `Unknown` includes reviewed alerts without a recognized persisted telemetry source.
- Preserved no-BOM CRLF encoding for both modified files.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 122/122 static pages were generated successfully.
- Implementation committed as `99ed9cf` with message `Add telemetry source review analytics`.
- Implementation commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Next step: begin a fresh audit-first assessment of the next telemetry-data-quality or fleet-intelligence gap before implementing anything else.
## 2026-08-09 - Traccar integration health visibility

- Completed an audit-first operational-observability milestone for Traccar telemetry ingestion.
- Confirmed HarborGuard already persists Traccar sync state and message receipt lifecycle state, but previously had no useful fleet-facing health surface.
- Added organization-scoped `GET /api/fleet/telematics-health`.
- Reused the existing `requireOrganization()` authorization boundary.
- Added read-only Traccar integration health derived from:
  - `telematics_sync_state`
  - `telematics_message_receipts`
- Added integration status states:
  - `healthy`
  - `warning`
  - `failed`
  - `never_synced`
- Added last successful sync visibility.
- Added latest failed sync time and failure message visibility.
- Added explicit device-mapping failure classification for:
  - missing tracker/device mapping
  - ambiguous tracker/device mapping
- Added current receipt counts for:
  - processing
  - failed
- Added oldest currently-processing receipt visibility.
- Added recent failed receipt visibility including:
  - provider message ID
  - provider device ID when available in metadata
  - last failure time
  - last failure message
  - attempt count
- Corrected the initial health endpoint to the actual receipt schema before exposing it in the UI:
  - `claimed_at`
  - `last_failure_at`
  - `last_failure_message`
  - `metadata.providerDeviceId`
- No database migration was required.
- No telematics ingestion behavior was changed.
- No automatic retry behavior was changed.
- No Traccar synchronization semantics were changed.
- No Webfleet integration was introduced; Webfleet remains pending provider access.
- Added a read-only `Traccar Integration Health` card to `/fleet`.
- Fleet health visibility now includes:
  - health status
  - received count
  - processed count
  - duplicate count
  - failed receipt count
  - processing receipt count
  - jitter-skipped count
  - GPS-spike-skipped count
  - already-processing count
  - last successful sync
  - last failure
  - latest failure message
  - device-mapping issue indication
  - oldest processing message
  - recent failed receipts
- Existing Fleet reload behavior now also refreshes telematics integration health.
- Health endpoint implementation committed as `bc9598b` with message `Expose Traccar integration health`.
- Receipt-schema correction committed as `48912cd` with message `Correct telematics health receipt fields`.
- Fleet UI implementation committed as `7366866` with message `Add Traccar integration health to fleet`.
- TypeScript validation passed for the endpoint and Fleet UI.
- Full Next.js production builds passed.
- Build generated 123/123 static pages successfully with `/api/fleet/telematics-health` registered.
- All three implementation commits were pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Tracked working tree was clean after the final push.
- Next step: begin a fresh audit-first assessment of the next telemetry data-quality, fleet-intelligence, or multi-tenant telematics scheduling gap before implementing anything else.
## 2026-08-09 - Organization-scoped telematics integration registry

- Completed an audit-first telematics configuration-model milestone.
- Confirmed the existing `intelligence_sources` registry is not appropriate for organization-owned telematics integrations because it is a global provider catalog rather than an organization-scoped integration store.
- Confirmed the current Traccar implementation still uses deployment-level environment credentials:
  - `TRACCAR_API_TOKEN`
  - `TRACCAR_API_BASE_URL`
- Confirmed the current Traccar cron remains intentionally single-organization through `TRACCAR_SYNC_ORGANIZATION_ID`.
- Confirmed HarborGuard does not yet have a secure organization-specific telematics credential store.
- Deliberately did not make the Traccar cron multi-tenant yet.
- Deliberately did not store Traccar or future Webfleet API secrets in the database.
- Added migration `20260809150000_create_telematics_integrations.sql`.
- Added organization-scoped `public.telematics_integrations`.
- Registry fields include:
  - `organization_id`
  - `provider`
  - `enabled`
  - `base_url`
  - `credential_source`
  - `metadata`
  - creation/update timestamps
- Added unique integration ownership boundary:
  - `(organization_id, provider)`
- Added provider non-blank validation.
- Added optional base-URL non-blank validation.
- Added credential-source non-blank validation.
- `credential_source` defaults to `environment`.
- `metadata` is explicitly intended for non-secret provider configuration only.
- Migration comments explicitly prohibit storing:
  - API tokens
  - API keys
  - passwords
  - secret keys
  - other provider credentials
  in metadata or plaintext configuration columns.
- Added organization/enabled index for future integration enumeration.
- Enabled row-level security.
- Authenticated users receive read-only visibility for integrations belonging to their own organization.
- Service-role access is retained for future controlled configuration and scheduler operations.
- No Traccar ingestion behavior was changed.
- No Traccar cron behavior was changed.
- No telematics synchronization behavior was changed.
- No Webfleet implementation was introduced.
- No provider secrets were migrated into the database.
- Migration contract validation passed.
- Plaintext-secret-column safety validation passed.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- All 123/123 static pages were generated successfully.
- Registry migration committed as `262dedb` with message `Add telematics integration registry`.
- Registry migration commit was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Migration has not yet been deployed to Supabase.
- Next step: perform a guarded Supabase migration-history and dry-run audit for `20260809150000_create_telematics_integrations.sql` before any database deployment.
## 2026-08-09 - Telematics registry deployment and type synchronization

- Completed guarded deployment of `20260809150000_create_telematics_integrations.sql`.
- Pre-deployment migration history confirmed the registry migration was local-only.
- Final `supabase db push --dry-run` confirmed exactly one pending migration:
  - `20260809150000_create_telematics_integrations.sql`
- Applied the migration successfully to the linked remote Supabase database.
- Post-deployment migration history confirmed:
  - local version `20260809150000`
  - remote version `20260809150000`
- Post-deployment `supabase db push --dry-run` reported:
  - `Remote database is up to date.`
- No additional migrations remained pending after deployment.
- Git HEAD and tracked working tree remained unchanged by the database deployment.
- Audited the repository's Supabase type workflow.
- Confirmed there is currently no automated `supabase gen types` script checked into the repository.
- Audited the exact telematics schema and migration evolution before editing `types/supabase.ts`.
- Added checked-in Supabase table types for:
  - `telematics_integrations`
  - `telematics_message_receipts`
  - `telematics_sync_state`
- Added `Row`, `Insert`, `Update`, and `Relationships` contracts for all three telematics tables.
- Preserved the organization foreign-key relationships to `organizations(id)`.
- Included the full current receipt-processing schema introduced by later migrations:
  - `processing_status`
  - `claimed_at`
  - `processed_at`
  - `last_failure_at`
  - `last_failure_message`
  - `attempt_count`
- Did not add nonexistent receipt fields such as `claimed_by` or `provider_device_id`.
- Preserved the existing `types/supabase.ts` encoding contract:
  - UTF-8 without BOM
  - CRLF line endings
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- Production build generated all 123/123 static pages successfully.
- Telematics Supabase type synchronization committed as `db0e9b1` with message `Add telematics Supabase types`.
- Commit `db0e9b1` was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote feature heads matched after the push.
- Tracked working tree was clean after the push.
- Organization-scoped telematics integration registry is now deployed and represented in checked-in Supabase types.
- Current Traccar scheduling remains intentionally single-organization.
- Current Traccar provider credentials remain deployment-level environment credentials.
- No Webfleet implementation has been introduced while provider access remains pending.
- Next step: perform a fresh audit-first assessment of how the deployed `telematics_integrations` registry should be consumed by the current single-organization Traccar configuration before changing cron or provider behavior.
## 2026-08-09 - Traccar registry bootstrap

- Completed a guarded live bootstrap of the deployed organization-scoped telematics integration registry.
- Confirmed the configured `TRACCAR_SYNC_ORGANIZATION_ID` resolves to the existing HarborGuard Demo organization.
- Confirmed the Traccar registry initially contained zero rows for the configured organization/provider.
- Inserted exactly one organization-scoped Traccar integration record.
- Bootstrapped integration contract:
  - provider: `traccar`
  - enabled: `true`
  - credential source: `environment`
  - base URL: `null`
  - metadata: empty object
- No provider credential values were written to Supabase.
- `TRACCAR_API_TOKEN` remains an environment-managed secret.
- `TRACCAR_API_BASE_URL` remains environment-managed configuration.
- The inserted row passed the registry contract verification.
- Post-insert registry count was exactly one.
- Migration history remained synchronized at `20260809150000` locally and remotely.
- Git HEAD remained unchanged at `907c7d7`.
- Tracked working tree remained clean.
- No application code was modified.
- No cron behavior was modified.
- No provider behavior was modified.
- No multi-tenant scheduling was introduced.
- No Webfleet work was introduced.
- Next step: perform an audit-first implementation of a narrow Traccar cron registry gate that requires an enabled `provider = "traccar"` integration for `TRACCAR_SYNC_ORGANIZATION_ID`, while leaving current environment-based credential resolution unchanged.
## 2026-08-09 - Traccar cron registry gate

- Completed the audit-first Traccar cron registry-gate milestone.
- Preserved the existing single-organization scheduler contract using `TRACCAR_SYNC_ORGANIZATION_ID`.
- Preserved the existing organization-existence validation.
- Added an organization-scoped lookup against `telematics_integrations`.
- Traccar synchronization now requires an integration row matching:
  - the configured organization ID
  - provider `traccar`
  - enabled `true`
- The registry validation executes before `runTraccarPositionSync()`.
- If no enabled Traccar integration exists for the configured organization, the cron returns a controlled server error instead of running synchronization.
- Registry lookup failures propagate through the existing cron error handling.
- Existing `TRACCAR_API_TOKEN` credential resolution remains environment-based.
- Existing `TRACCAR_API_BASE_URL` configuration remains environment-based.
- No provider credentials were moved into Supabase.
- No changes were made to `runTraccarPositionSync`.
- No changes were made to the Traccar provider adapter.
- No changes were made to scheduling cadence.
- No multi-tenant organization enumeration was introduced.
- No Webfleet implementation was introduced.
- The live HarborGuard Demo Traccar registry row had already been bootstrapped and enabled before enforcement was added.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- Production build generated all 123/123 static pages successfully.
- Cron registry gate committed as `c7f5878` with message `Gate Traccar cron on integration registry`.
- Commit `c7f5878` was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote feature heads matched after push.
- Tracked working tree was clean after push.
- Next step: perform a fresh audit-first roadmap assessment before changing Traccar configuration further or beginning Webfleet work.
## 2026-08-09 - Registry-aware telematics health

- Completed the audit-first registry-aware telematics health milestone.
- Updated `app/api/fleet/telematics-health/route.ts`.
- Updated `app/fleet/page.tsx`.
- The telematics health API now reads the organization-scoped `telematics_integrations` record for provider `traccar`.
- The health response now exposes:
  - `configured`
  - `enabled`
- Added explicit telematics health status:
  - `disabled`
- A configured but disabled Traccar integration now reports `disabled` instead of appearing healthy from historical sync state.
- A missing integration remains distinguishable through `configured: false`.
- Existing sync-state, failure, and receipt health logic remains intact.
- Fleet UI now shows registry state as:
  - `Configured and enabled`
  - `Configured but disabled`
  - `Not configured`
- Existing environment-based Traccar credential handling remains unchanged.
- No Traccar provider credential values were moved into Supabase.
- No scheduling behavior was changed.
- No sync orchestrator behavior was changed.
- No Webfleet implementation was introduced.
- Preserved the existing mixed worktree newline state in `app/fleet/page.tsx`.
- Git index representation for both modified files remained canonical LF.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- Production build generated all 123/123 static pages successfully.
- Implementation committed as `96bbec8` with message `Make telematics health registry aware`.
- Commit `96bbec8` was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote feature heads matched after push.
- Tracked working tree was clean after push.
- Next step: perform a fresh audit-first roadmap assessment before starting another implementation.
## 2026-08-09 - Traccar integration admin control

- Completed the audit-first Traccar integration administration milestone.
- Updated `app/api/fleet/telematics-health/route.ts`.
- Updated `app/fleet/page.tsx`.
- Extended the telematics health response with `canManage`.
- `canManage` is true only for organization roles:
  - `owner`
  - `admin`
- Added `PATCH /api/fleet/telematics-health`.
- PATCH accepts only the desired final state:
  - `{ enabled: boolean }`
- PATCH requires an authenticated organization context.
- PATCH requires `owner` or `admin` via `requireRole`.
- Registry mutation uses the existing server-side `supabaseAdmin` service-role client.
- Registry mutation is scoped by both:
  - the authenticated `organization_id`
  - provider `traccar`
- PATCH updates only the `enabled` field.
- PATCH does not create a missing registry record.
- Missing Traccar registry configuration returns a 404 response.
- No token mutation was introduced.
- No `TRACCAR_API_TOKEN` handling was changed.
- No `TRACCAR_API_BASE_URL` handling was changed.
- No `credential_source` editing was introduced.
- No `base_url` editing was introduced.
- No arbitrary metadata editing was introduced.
- No integration deletion was introduced.
- Fleet UI now exposes an Enable/Disable Traccar control only when:
  - the integration is configured
  - the authenticated user can manage the integration
- The control submits the desired final `enabled` state.
- After a successful PATCH, the Fleet page reloads telematics health from the server as the source of truth.
- Existing Traccar health visibility remains intact.
- Existing cron registry enforcement remains intact.
- Existing environment-based credential resolution remains intact.
- No Webfleet implementation was introduced.
- Existing Fleet page mixed worktree newline state was preserved.
- Git index representation for both modified files remained canonical LF.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- Production build generated all 123/123 static pages successfully.
- Implementation committed as `5ebfc2a` with message `Add Traccar integration admin control`.
- Commit `5ebfc2a` was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote feature heads matched after push.
- Tracked working tree was clean after push.
- Live enable/disable behavior has not yet been exercised against the production Traccar registry record.
- Next step: perform a separately guarded live admin-control validation before changing any further telematics behavior.
## 2026-08-09 - Live Traccar admin-control validation

- Completed a guarded live validation of the organization-admin Traccar enable/disable control.
- Validation was performed against the existing HarborGuard Demo Traccar registry record.
- Preflight confirmed:
  - the registry record existed
  - provider was `traccar`
  - registry state was `enabled = true`
  - credential source remained `environment`
  - registry base URL remained null
  - Traccar sync state existed
  - the cron registry gate would allow execution
- The Fleet UI initially reported:
  - health `Healthy`
  - registry `Configured and enabled`
  - `Disable Traccar` control available
- The authorized Fleet UI control was used once to disable Traccar.
- Independent service-role database verification confirmed:
  - `enabled = false`
  - credential source remained `environment`
  - base URL remained null
  - cron registry gate would not allow Traccar execution
- The Fleet UI correctly reported:
  - health `Disabled`
  - registry `Configured but disabled`
  - `Enable Traccar` control available
- The authorized Fleet UI control was then used once to re-enable Traccar.
- Independent database verification confirmed:
  - `enabled = true`
  - credential source remained `environment`
  - base URL remained null
  - cron registry gate would allow Traccar execution
- Fleet UI returned to:
  - health `Healthy`
  - registry `Configured and enabled`
  - `Disable Traccar` control available
- Final Traccar sync state showed:
  - last successful sync at `2026-08-09T16:00:26.723+00:00`
  - no recorded last failure
  - no recorded failure message
- Production registry was restored to `enabled = true` before validation ended.
- No source files were modified during live validation.
- No credentials were changed.
- No registry row was created or deleted.
- No Webfleet behavior was introduced.
- Live Traccar administration is now validated end to end:
  - owner/admin UI authorization
  - server PATCH authorization
  - organization-scoped registry mutation
  - disabled health-state visibility
  - cron-gate enforcement
  - successful restoration to enabled state
- Next step: perform a fresh audit-first roadmap assessment before starting another implementation.
## 2026-08-10 - Multi-tenant Traccar scheduler

- Completed the audit-first multi-tenant Traccar scheduler milestone.
- Updated `app/api/telematics/cron/traccar/route.ts`.
- Removed the scheduler dependency on `TRACCAR_SYNC_ORGANIZATION_ID`.
- Removed the single configured-organization lookup from the Traccar cron route.
- The cron now queries `telematics_integrations` for all rows matching:
  - `provider = "traccar"`
  - `enabled = true`
- Each enabled integration contributes its `organization_id` to the sync cycle.
- Enabled organizations are processed sequentially.
- The existing `runTraccarPositionSync({ supabase, organizationId })` pipeline is reused unchanged.
- Existing environment-based Traccar credential resolution remains unchanged.
- No per-organization credential storage was introduced.
- No provider adapter code was modified.
- No telematics receipt or sync-state schema was modified.
- No migration was added.
- No Vercel or QStash scheduling configuration was changed.
- Per-organization failure isolation was added:
  - one organization failure does not stop later enabled organizations from being attempted
  - successful and failed organizations are recorded separately in the cron response
- Aggregate response now includes:
  - `integrations`
  - `succeeded`
  - `failed`
  - per-organization results
- Aggregate `success` is true only when `failed === 0`.
- Partial per-organization failures intentionally remain a non-throwing aggregate HTTP response.
- This matches the existing HarborGuard scheduled-report pattern where item-level failures are accumulated without failing the entire cron delivery.
- Scheduler-level failures still propagate through the outer error handler and return HTTP 500.
- `git diff --check` passed.
- TypeScript validation passed.
- Full Next.js production build passed.
- Production build generated all 123/123 static pages.
- Implementation committed as `f80ab47` with message `Run Traccar sync for enabled organizations`.
- Commit `f80ab47` was pushed successfully to `origin/feature/expanded-incident-taxonomy`.
- Local and remote feature heads matched after push.
- Tracked working tree was clean after push.
- Next step: perform a guarded production validation of the existing QStash Traccar schedule against the new registry-driven scheduler before starting another telematics implementation.
## 2026-08-10 - Production multi-tenant Traccar scheduler validation

- Completed guarded post-deployment validation of the multi-tenant Traccar scheduler.
- Validated production deployment commit `235a392`.
- Confirmed Vercel production deployment reached `Ready` on `main`.
- Confirmed the existing QStash schedule continued delivering requests to `/api/telematics/cron/traccar`.
- Observed successful QStash deliveries after production deployment.
- Production validation used the registry-driven scheduler introduced by implementation commit `f80ab47`.
- Confirmed the production Traccar integration registry contains an enabled Traccar integration.
- Confirmed the enabled integration remained organization scoped.
- Confirmed the integration credential source remained `environment`.
- Confirmed Traccar position sync state exists for the enabled organization.
- Confirmed a successful Traccar sync was recorded after deployment.
- Confirmed no Traccar sync failure was recorded during validation.
- Confirmed recent telematics message receipts exist for the enabled organization.
- Post-deployment audit reported one healthy enabled organization.
- Multi-tenant scheduler production execution is therefore validated for the currently enabled Traccar organization.
- No database writes were performed by the post-deployment audit.
- No credentials were changed.
- No integration registry configuration was changed.
- No QStash scheduling configuration was changed.
- No application source code was changed during production validation.
- No Webfleet implementation was introduced.
- Next step: perform a fresh audit-first roadmap assessment before starting the next telematics implementation.
## 2026-08-10 - Traccar provider configuration boundary

- Added an explicit Traccar provider configuration boundary.
- Implementation commit: `6304f5c`.
- Added exported `TraccarConfiguration` containing `token` and `baseUrl`.
- Added exported `getEnvironmentTraccarConfiguration()` as the current environment-backed resolver.
- Updated the internal Traccar fetch path to receive explicit configuration instead of resolving environment state internally.
- Updated `loadTraccarDevices()` to accept optional explicit Traccar configuration.
- Updated `loadTraccarLatestPositions()` to accept optional explicit Traccar configuration.
- Preserved backward compatibility by keeping environment configuration as the default when no explicit configuration is supplied.
- Existing production Traccar behavior therefore remains unchanged.
- No database schema changes were introduced.
- No telematics integration registry changes were introduced.
- No provider secrets were written to Supabase.
- No scheduler logic was changed.
- No QStash configuration was changed.
- TypeScript validation passed.
- Production build passed.
- This establishes the provider-side insertion point required for future secure per-organization Traccar credential resolution.
- Next step: audit the smallest secure server-only credential resolver design before implementing tenant-specific secret storage.
## 2026-08-10 - Traccar sync configuration injection

- Extended the Traccar position-sync boundary to accept explicit provider configuration.
- Implementation commit: `49ab9c0`.
- Imported the existing `TraccarConfiguration` provider contract into `runTraccarPositionSync.ts`.
- Added optional `configuration?: TraccarConfiguration` to `RunTraccarPositionSyncInput`.
- Updated `runTraccarPositionSync()` to receive the optional configuration.
- Passed the configuration through to `loadTraccarLatestPositions(configuration)`.
- Preserved existing production behavior because configuration remains optional.
- Existing cron callers that provide only `supabase` and `organizationId` remain valid.
- Environment-backed Traccar configuration therefore remains the active production fallback.
- No cron scheduler logic was changed.
- No telematics integration registry schema was changed.
- No provider credentials were stored or migrated.
- No production environment variables were changed.
- No Supabase secret storage was introduced.
- TypeScript validation passed.
- Production build passed.
- This completes the provider-to-sync configuration injection path required for a future organization-specific credential resolver.
- Next step: audit the exact cron-side insertion point for resolving configuration from each enabled integration before implementing any new secret storage.
## 2026-08-10 - Traccar integration configuration resolver

- Added a server-only Traccar integration configuration resolver.
- Implementation commit: `3c9501a`.
- Added `lib/telematics/resolveTraccarIntegrationConfiguration.ts`.
- The resolver accepts `organizationId`, `credentialSource`, and optional `baseUrl`.
- The resolver currently supports only `credential_source = "environment"`.
- Unsupported credential sources fail explicitly rather than silently falling back to shared credentials.
- The resolver reuses `getEnvironmentTraccarConfiguration()` for the provider token.
- Organization-specific non-secret `base_url` now participates in runtime Traccar configuration when present.
- The cron registry query now selects `organization_id`, `credential_source`, and `base_url`.
- The cron resolves a `TraccarConfiguration` separately for each enabled integration.
- The resolved configuration is passed into `runTraccarPositionSync()`.
- Per-organization failure isolation remains intact because configuration resolution occurs inside the existing organization `try` block.
- No provider secret values were written to `telematics_integrations`.
- No provider secret values were written to Supabase metadata.
- No database migration was introduced.
- No production environment variables were changed.
- Existing environment-backed credentials remain the active credential source.
- TypeScript validation passed.
- Production build passed.
- This completes the registry-to-provider runtime configuration path for the current environment credential source.
- Next step: perform a fresh audit-first assessment before introducing any tenant-specific secret-storage mechanism or additional telematics credential source.
## 2026-08-10 - Traccar credential reference boundary

- Added a non-secret credential reference boundary for Traccar integrations.
- Implementation commit: `3b621de`.
- Added migration `20260810100000_add_telematics_credential_reference.sql`.
- Added nullable `credential_reference` to `telematics_integrations`.
- The migration explicitly documents that `credential_reference` must never contain an API token, password, secret key, or other credential value.
- Added a non-blank constraint for non-null credential references.
- Updated the generated Supabase type surface for Row, Insert, and Update.
- Updated the Traccar cron query to select `credential_reference`.
- The cron now passes `credential_reference` into `resolveTraccarIntegrationConfiguration()`.
- The Traccar resolver now accepts optional organization-specific credential references.
- Credential references are validated as uppercase environment-variable style names.
- When `credential_reference` is null, the existing environment-backed `TRACCAR_API_TOKEN` behavior remains active.
- When `credential_reference` is present, the resolver reads that named environment variable server-side.
- A missing referenced environment variable causes that organization's sync to fail explicitly.
- No provider secret values were written to Supabase.
- No API token column was introduced.
- No password or secret-key column was introduced.
- No secret value was added to integration metadata.
- No production environment variables were changed.
- The migration was committed but was not manually applied during implementation.
- TypeScript validation passed.
- Production build passed.
- This establishes organization-specific Traccar credential selection without storing provider secrets in the database.
- Next step: perform a fresh audit-first assessment of migration deployment and production compatibility before configuring any organization-specific credential reference.
## 2026-08-10 - Traccar credential reference migration deployed

- Deployed migration `20260810100000_add_telematics_credential_reference.sql` to the linked production Supabase database.
- Application baseline remained at `f909cbf` during database deployment.
- Pre-deployment migration history showed `20260810100000` as local-only and pending remotely.
- A guarded `supabase db push --dry-run` confirmed that `20260810100000_add_telematics_credential_reference.sql` was the only pending migration.
- A final pre-push dry run again confirmed exactly one pending migration.
- Applied the migration successfully with `supabase db push`.
- Supabase reported database push exit code `0`.
- Post-deployment migration history confirmed `20260810100000` exists in both local and remote migration histories.
- A post-deployment `supabase db push --dry-run` reported that the remote database is up to date.
- No migrations remain pending.
- The production `telematics_integrations` schema now includes nullable `credential_reference`.
- Existing Traccar integrations remain backward compatible when `credential_reference` is null.
- No provider secret values were written to Supabase.
- No production environment variables were changed.
- No organization-specific credential reference was configured during this deployment.
- Git HEAD remained unchanged during database deployment and verification.
- Tracked working tree remained clean.
- Nothing was staged.
- Next step: perform a fresh audit-first production compatibility check before configuring the first organization-specific credential reference.
## 2026-08-10 - Traccar credential reference production runtime validation

- Completed production runtime validation of the organization-specific Traccar credential reference path.
- Application baseline remained at `749785f`.
- Validated enabled Traccar organization `1fe53de7-8483-4767-a63e-3265e4dcb33d`.
- Validated registry row `c41c8cec-65d2-49f9-8fce-631952cf6ce8`.
- Confirmed `credential_source` remains `environment`.
- Confirmed `credential_reference` is `TRACCAR_API_TOKEN_ORG_1FE53DE7`.
- Confirmed the runtime resolver is therefore using the organization-specific environment-variable reference path.
- Confirmed Traccar positions sync state exists in `telematics_sync_state`.
- Confirmed `last_successful_sync_at` advanced to `2026-08-10T10:00:08.853+00:00`.
- Confirmed `last_failure_at` is null.
- Confirmed `last_failure_message` is null.
- Production runtime validation reported `TRACCAR_CREDENTIAL_REFERENCE_RUNTIME: HEALTHY`.
- No database writes were performed by the runtime validation.
- No credential values were changed during the runtime validation.
- No secret values were printed.
- No application source files were changed.
- Git HEAD remained at `749785f`.
- Tracked working tree remained clean.
- Nothing was staged.
- The legacy `TRACCAR_API_TOKEN` remains in place as a rollback/backward-compatibility safeguard and must not be removed yet.
- Organization-specific Traccar credential resolution is now validated in production for the currently enabled organization.
- Next step: perform a fresh audit-first roadmap assessment before removing any legacy credential fallback or starting another telematics implementation.


## 2026-08-10 - Traccar referenced credential decoupling

- Completed the audit-first Traccar credential-decoupling milestone.
- Implementation commit: `566c4c6`.
- Updated `lib/telematics/resolveTraccarIntegrationConfiguration.ts`.
- Removed the requirement to resolve the shared environment-backed Traccar token before evaluating an organization-specific `credential_reference`.
- When `credential_reference` is present, the resolver now:
  - validates the reference;
  - resolves the referenced server-side environment variable;
  - uses that referenced token directly;
  - resolves the configured organization-specific base URL when present;
  - otherwise falls back only to the environment Traccar base URL.
- The organization-specific referenced credential path therefore no longer depends on `TRACCAR_API_TOKEN` being populated.
- When no `credential_reference` is configured, the existing legacy environment-backed path remains unchanged through `getEnvironmentTraccarConfiguration()`.
- Legacy `TRACCAR_API_TOKEN` fallback remains implemented for backward compatibility and rollback safety.
- No database migration was introduced.
- No Supabase schema changes were introduced.
- No credential values were written to Supabase.
- No Vercel environment variables were removed or changed.
- No scheduler logic was changed.
- No QStash configuration was changed.
- TypeScript validation passed.
- Production build passed.
- Staged resolver contract was verified directly from the Git index before commit.
- Implementation commit contained exactly one file:
  - `lib/telematics/resolveTraccarIntegrationConfiguration.ts`
- Commit `566c4c6` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `566c4c6`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- Next step: perform a fresh audit-first roadmap assessment before starting another HarborGuard implementation.

## 2026-08-10 - Stable HERE traffic-flow segment identity

- Completed the audit-first stable identity milestone for future historical traffic-flow persistence.
- Implementation commit: `aa044de`.
- Updated `lib/here/traffic.ts`.
- Added nullable `providerSegmentId` to normalized HERE Traffic Flow results.
- Stable provider identity resolution now prefers:
  - HERE `location.id`;
  - otherwise the first HERE shape-link `linkId`;
  - otherwise `null`.
- The existing runtime/display `id` behavior remains unchanged and may still use the positional `here-flow-${index + 1}` fallback.
- Positional fallback identifiers are therefore not treated as stable provider segment identities.
- Existing HERE traffic calculations were not changed:
  - current speed;
  - free-flow speed;
  - congestion;
  - delay;
  - confidence;
  - jam factor;
  - risk level.
- No database migration was introduced.
- No traffic-flow history table was created yet.
- No provider cron behavior was changed.
- No forecasting logic was introduced.
- No production risk thresholds were changed.
- TypeScript validation passed.
- Production build passed.
- Implementation changed exactly one tracked file.
- Commit `aa044de` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `aa044de`.
- Next step: audit and implement the smallest organization-scoped historical traffic-flow observation schema using `providerSegmentId` as the provider-issued identity boundary.


## 2026-08-10 - Historical traffic-flow observation schema foundation

- Completed the audit-first historical traffic-flow schema milestone.
- Implementation commit: `71a7311`.
- Added migration:
  - `supabase/migrations/20260810113000_create_traffic_flow_observations.sql`
- Added organization-scoped `traffic_flow_observations` storage for factual traffic-flow history.
- Each observation requires a stable provider-issued `provider_segment_id`.
- Positional runtime fallback identifiers such as `here-flow-${index + 1}` are not valid persistence identities.
- Persisted factual fields are:
  - provider;
  - provider segment ID;
  - road name;
  - current speed in km/h;
  - free-flow speed in km/h;
  - congestion percentage;
  - delay minutes;
  - confidence;
  - jam factor;
  - observation timestamp;
  - persistence timestamp.
- Added organization/time index:
  - `traffic_flow_observations_org_observed_idx`
- Added organization/provider/segment/time index:
  - `traffic_flow_observations_org_segment_observed_idx`
- Row Level Security is enabled.
- Authenticated users have organization-scoped read access through `public.current_user_org_id()`.
- Authenticated access is read-only.
- `service_role` has server-side access for future ingestion.
- Added validation constraints for:
  - non-blank provider;
  - non-blank provider segment ID;
  - non-negative current speed;
  - non-negative free-flow speed;
  - congestion range 0-100;
  - non-negative delay.
- No traffic-flow writer was implemented.
- No provider cron behavior was changed.
- No forecasting logic was introduced.
- No production traffic-risk logic was changed.
- TypeScript validation passed.
- Production build passed.
- Implementation commit contained exactly one migration.
- Commit `71a7311` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `71a7311`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- Next step: audit the smallest server-side traffic-flow observation writer and determine the exact existing provider-cycle insertion point before changing ingestion behavior.


## 2026-08-10 - Traffic-flow observation writer foundation

- Completed the audit-first traffic-flow observation writer milestone.
- Implementation commit: `4204f80`.
- Added:
  - `lib/traffic/persistTrafficFlowObservations.ts`
- Added a reusable server-side persistence boundary for historical HERE traffic-flow observations.
- The writer accepts:
  - an existing Supabase client;
  - organization ID;
  - normalized traffic-flow observations;
  - an explicit observation timestamp.
- The writer does not perform a HERE API request.
- The writer does not make any latitude, longitude, or radius assumptions.
- Each persisted row writes factual traffic-flow fields only:
  - organization ID;
  - provider (`here`);
  - stable provider segment ID;
  - road name;
  - current speed;
  - free-flow speed;
  - congestion percentage;
  - delay minutes;
  - confidence;
  - jam factor;
  - observation timestamp.
- Observations without a stable `providerSegmentId` are skipped rather than persisting positional runtime fallback identities.
- The writer reports:
  - received observation count;
  - persisted observation count;
  - count skipped because no stable provider segment ID was available.
- The writer validates that:
  - organization ID is non-empty;
  - the supplied observation timestamp is valid.
- Database errors are propagated to the caller.
- No retry policy was introduced.
- No upsert or deduplication policy was introduced.
- No HERE request was added.
- No provider-cycle integration was added.
- No provider cron behavior was changed.
- No collection geography was chosen.
- No forecasting logic was added.
- UTF-8 BOM was removed before commit.
- Final newline was present.
- TypeScript validation passed.
- Production build passed.
- Implementation commit contained exactly one new file.
- Commit `4204f80` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `4204f80`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- Next step: audit the organization-specific traffic-flow collection geography and cadence before integrating the writer into the existing provider cycle.


## 2026-08-10 - Traffic-flow collection scope resolver

- Completed the audit-first traffic-flow collection geography milestone.
- Implementation commit: `c0a5b96`.
- Added:
  - `lib/traffic/resolveTrafficFlowCollectionScope.ts`
- Added a reusable organization-scoped traffic-flow collection-scope resolver.
- Collection geography is derived from HarborGuard vehicle-location data rather than a hard-coded city fallback.
- The resolver:
  - queries organization-scoped `vehicle_locations`;
  - orders locations by `recorded_at` descending;
  - inspects the newest records first;
  - selects the first location with valid coordinates;
  - validates latitude range `-90..90`;
  - validates longitude range `-180..180`;
  - requires a source vehicle ID;
  - requires a source recorded timestamp;
  - returns `null` when no valid organization vehicle location is available.
- The collection radius reuses HarborGuard's existing 10 km traffic-intelligence precedent.
- The resolved scope carries:
  - latitude;
  - longitude;
  - radius meters;
  - source vehicle ID;
  - source location timestamp.
- No Cape Town fallback coordinates were introduced.
- No HERE API request was performed.
- No traffic-flow observations were persisted.
- No writer integration was added.
- No provider-cycle behavior was changed.
- No provider cron schedule was changed.
- No location freshness cutoff was introduced yet.
- No forecasting logic was added.
- TypeScript validation passed.
- Production build passed.
- Implementation commit contained exactly one new file.
- Commit `c0a5b96` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `c0a5b96`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- Next step: audit and choose the smallest safe traffic-flow collection cadence before wiring collection scope, HERE flow retrieval, and observation persistence into the provider cycle.

## 2026-08-10 - Traffic-flow observation collection orchestrator

- Completed the audit-first traffic-flow collection orchestrator milestone.
- Implementation commit: `2af1755`.
- Added:
  - `lib/traffic/collectTrafficFlowObservations.ts`
- Added a reusable orchestration layer that connects:
  - organization-scoped traffic-flow collection scope resolution;
  - HERE traffic-flow retrieval;
  - historical traffic-flow observation persistence.
- The orchestrator:
  - validates the organization ID;
  - resolves the organization traffic-flow collection scope first;
  - returns a no-op result when no valid collection scope exists;
  - records a single observation timestamp for the collection cycle;
  - calls `getHereTrafficFlow()` using the resolved latitude, longitude, and radius;
  - correctly reads the HERE result envelope and passes only `trafficFlow.flow` to persistence;
  - persists observations through `persistTrafficFlowObservations()`;
  - returns source vehicle metadata and persistence counts.
- No hard-coded Cape Town fallback coordinates were introduced.
- No Supabase client creation was added to the orchestrator.
- No API endpoint was added.
- No provider-cycle integration was added.
- No Vercel cron schedule was changed.
- No QStash schedule was created or modified.
- The existing Traccar QStash schedule remained untouched.
- No forecasting logic was added.
- Initial TypeScript validation identified that `getHereTrafficFlow()` returns an envelope containing `rawCount` and `flow`.
- The orchestrator was corrected to persist only `trafficFlow.flow`.
- TypeScript validation then passed.
- Production build passed.
- Implementation commit contained exactly one new file.
- Commit `2af1755` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `2af1755`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- Next step: audit and implement the smallest authenticated server-side traffic-flow collection endpoint before creating any separate QStash schedule.

## 2026-08-10 - Authenticated traffic-flow collection endpoint

- Completed the audit-first authenticated traffic-flow collection endpoint milestone.
- Implementation commit: `82ec21d`.
- Added:
  - `app/api/traffic-flow/cron/route.ts`
- Added a dedicated server-side `GET` endpoint for traffic-flow collection.
- The endpoint follows HarborGuard's existing cron security conventions:
  - requires `CRON_SECRET`;
  - reads the `Authorization` header;
  - requires `Bearer ${CRON_SECRET}`;
  - returns HTTP 401 for unauthorized requests.
- The endpoint follows HarborGuard's existing service-role Supabase conventions:
  - reads `NEXT_PUBLIC_SUPABASE_URL`;
  - reads `SUPABASE_SERVICE_ROLE_KEY`;
  - creates a non-persistent server-side Supabase client;
  - disables session persistence and token auto-refresh.
- The endpoint reuses `TRAFFIC_IMPORT_ORGANIZATION_ID`.
- The configured traffic organization is validated against the `organizations` table before collection begins.
- Traffic-flow collection is delegated to `collectTrafficFlowObservations()`.
- HERE API retrieval logic is not duplicated in the endpoint.
- Collection-scope logic is not duplicated in the endpoint.
- Persistence logic is not duplicated in the endpoint.
- Successful responses include:
  - `success: true`;
  - organization ID;
  - collection scope status;
  - source vehicle metadata;
  - received observation count;
  - persisted observation count;
  - skipped observation count.
- Server-side failures return HTTP 500 with the normalized error message.
- The route is configured as dynamic with a 60-second maximum duration.
- The production build confirmed `/api/traffic-flow/cron` exists in the Next.js route tree.
- TypeScript validation passed.
- Production build passed.
- Implementation commit contained exactly one new route file.
- Commit `82ec21d` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `82ec21d`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- No QStash schedule was created or modified.
- The existing `harborguard-traccar-10m` schedule remained untouched.
- No `vercel.json` changes were made.
- Next step: verify the new traffic-flow endpoint in production before creating a separate QStash schedule for it.


## 2026-08-10 - Stable HERE TMC traffic-flow identity

- Completed the audit-first HERE TMC traffic-flow identity milestone.
- Implementation commit: `2339a7a`.
- Updated:
  - `lib/here/traffic.ts`
- Production HERE response-shape audits proved that:
  - `locationReferencing=shape` returns geometry but no stable `location.id`, `linkId`, or other provider-issued segment identifier;
  - `locationReferencing=tmc` returns structured TMC location identity;
  - `locationReferencing=tmc,shape` returns both the TMC identity and existing shape geometry.
- HarborGuard now requests HERE traffic flow using:
  - `locationReferencing=tmc,shape`
- Added a stable provider segment identity helper based on:
  - extended country code;
  - EBU country code;
  - TMC table ID;
  - TMC location ID;
  - queuing direction;
  - extent.
- Stable TMC identities are serialized with the `tmc:` prefix into a composite provider segment identifier.
- `affectedLength` is intentionally not part of the persisted identity.
- `primaryOffset` is intentionally not part of the persisted identity.
- Existing legacy provider identity fallbacks remain available when HERE exposes them:
  - `location.id`;
  - first shape-link `linkId`;
  - otherwise `null`.
- Existing runtime/display fallback IDs such as `here-flow-${index + 1}` remain unchanged.
- Positional runtime IDs are still not accepted as stable persisted provider identities.
- Existing shape geometry remains available to HarborGuard.
- Existing traffic calculations were not changed.
- The traffic-flow persistence writer was not changed.
- The traffic-flow database schema was not changed.
- The authenticated traffic-flow endpoint was not changed.
- No QStash schedule was created or modified.
- TypeScript validation passed.
- Production build passed.
- Implementation commit contained exactly one tracked file.
- Commit `2339a7a` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `2339a7a`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- Next step: verify the authenticated production traffic-flow endpoint again and confirm that HERE observations now persist with stable TMC provider identities before creating any QStash schedule.

## 2026-08-10 - Traffic-flow production migration BOM correction

### Status

The production traffic-flow persistence migration remains pending.

### Audit finding

Production execution of `20260810113000_create_traffic_flow_observations.sql`
was blocked because the migration file contained a UTF-8 byte-order mark
before its opening SQL statement.

The migration began with bytes:

`EF BB BF`

The BOM was removed without changing the SQL contract.

After correction, the file begins directly with:

`create table if not exists public.traffic_flow_observations`

### Verification

- exactly one tracked implementation file changed
- changed file:
  `supabase/migrations/20260810113000_create_traffic_flow_observations.sql`
- Git diff showed one first-line replacement only
- diff numstat was one insertion and one deletion
- SQL text was otherwise unchanged
- TypeScript validation passed
- production build passed
- migration remained pending remotely after the correction
- no database migration was applied during the correction
- no QStash schedule was created or changed

### Implementation commit

`442d0a9` - `Remove BOM from traffic flow migration`

### Next controlled step

Re-run a production Supabase migration dry-run from committed main
`442d0a9`.

Do not apply the production migration until that dry-run confirms that
`20260810113000_create_traffic_flow_observations.sql` is the only migration
that would be pushed.

Do not create the QStash traffic-flow collection schedule until production
traffic-flow persistence has been successfully verified.

## 2026-08-10 - Production traffic-flow persistence verified

### Status

Production traffic-flow collection and persistence are now functioning end to end.

### Production database deployment

Migration:

`20260810113000_create_traffic_flow_observations.sql`

was successfully applied to the production Supabase database.

Supabase migration history confirmed:

- local migration: `20260810113000`
- remote migration: `20260810113000`
- no pending migrations remained after deployment

Repository main remained unchanged during database deployment.

### Production traffic-flow verification

The authenticated production endpoint:

`/api/traffic-flow/cron`

was executed successfully using the existing `CRON_SECRET`.

Production response:

- `success`: true
- `scopeResolved`: true
- HERE observations received: 20
- observations persisted: 6
- observations skipped without stable provider identity: 14
- persistence counts reconciled: 6 + 14 = 20

The production request therefore proved the complete collection path:

authenticated traffic-flow endpoint
-> organization-scoped vehicle-derived collection scope
-> HERE traffic flow
-> stable provider segment identity
-> traffic_flow_observations persistence

### Stable identity behavior

The persisted observations used stable provider identity.

HarborGuard continues to reject observations without an acceptable stable
provider segment identifier rather than persisting positional runtime IDs.

The 14 skipped HERE observations are not considered persistence failures.
They require a separate audit before any broader provider identity fallback
is introduced.

### Repository state

- repository baseline: `8cf1d95`
- local and remote main remained synchronized
- no tracked source files changed during production verification
- no Git commit was created by the production verification
- no QStash schedule was created or changed

### Next controlled step

Before enabling recurring traffic-flow collection, perform an audit-first
assessment of production scheduling requirements and existing QStash
configuration.

Do not modify the existing Traccar schedule.

Do not weaken the stable provider identity requirement merely to persist
the 14 currently skipped HERE observations.

## 2026-08-10 - Traffic-flow collection freshness guard

- Completed the audit-first traffic-flow collection freshness milestone.
- Implementation commit: `13dd393`.
- Updated `lib/traffic/resolveTrafficFlowCollectionScope.ts` only.
- Added `MAX_TRAFFIC_FLOW_LOCATION_AGE_MINUTES = 15`.
- The 15-minute threshold matches existing HarborGuard vehicle offline/freshness conventions.
- Traffic-flow scope candidates now require:
  - valid latitude;
  - valid longitude;
  - vehicle ID;
  - recorded timestamp;
  - parseable recorded timestamp;
  - location age no greater than 15 minutes.
- Stale vehicle locations now resolve to no traffic-flow collection scope.
- The existing orchestrator therefore safely returns `scopeResolved: false` without calling HERE or persisting traffic-flow observations when no fresh scope exists.
- No HERE traffic implementation changed.
- No observation persistence implementation changed.
- No traffic-flow endpoint changed.
- No database schema changed.
- Existing Traccar scheduling remained untouched.
- No QStash traffic-flow schedule was created or changed.
- TypeScript validation passed.
- Production build passed.
- Implementation changed exactly one tracked source file.
- Commit `13dd393` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `13dd393`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- Next step: perform an audit-first assessment of traffic-flow retry/idempotency behavior before enabling recurring QStash traffic-flow collection.

## 2026-08-10 - Traffic-flow collection identity schema

- Completed the audit-first traffic-flow retry/idempotency schema foundation.
- Implementation commit: `29b3b83`.
- Added migration `supabase/migrations/20260810160000_add_traffic_flow_collection_key.sql`.
- Added nullable `collection_key` to `public.traffic_flow_observations`.
- Non-null collection keys must be nonblank.
- Added database-level unique collection identity across:
  - organization ID;
  - provider;
  - provider segment ID;
  - collection key.
- Existing observations remain compatible because `collection_key` is nullable.
- Existing unkeyed/manual persistence remains structurally supported.
- The migration was committed and pushed to `origin/main`.
- Local and remote `main` both ended at `29b3b83`.
- The production database migration has not yet been applied.
- No traffic-flow writer behavior changed.
- No traffic-flow endpoint behavior changed.
- Existing Traccar scheduling remained untouched.
- No traffic-flow QStash schedule was created or changed.
- Next step: wire the optional collection key through the traffic-flow persistence path using conflict-safe persistence before enabling recurring QStash collection.

## 2026-08-10 - Production traffic-flow collection identity migration deployed

- Production migration `20260810160000_add_traffic_flow_collection_key.sql` was applied successfully.
- Supabase db push completed with exit code `0`.
- Remote migration history now records `20260810160000`.
- No pending migrations remain.
- Repository baseline remained `521d7d1` during deployment.
- Local and remote `main` remained synchronized.
- No tracked source files changed during deployment.
- No traffic-flow writer code changed.
- No traffic-flow endpoint code changed.
- Existing Traccar scheduling remained untouched.
- No traffic-flow QStash schedule was created or changed.
- Production now has the nullable `collection_key` schema required for the next retry/idempotency implementation step.
- Next step: audit and implement the smallest collection-key propagation path from the traffic-flow endpoint through the orchestrator to conflict-safe persistence.

## 2026-08-10 - Traffic-flow collection key propagation

- Completed the retry-safe traffic-flow collection identity propagation milestone.
- Implementation commit: `b82330b`.
- Updated exactly three implementation files:
  - `app/api/traffic-flow/cron/route.ts`;
  - `lib/traffic/collectTrafficFlowObservations.ts`;
  - `lib/traffic/persistTrafficFlowObservations.ts`.
- The traffic-flow cron endpoint now reads optional `Upstash-Message-Id` from the request headers.
- Blank or missing message IDs normalize to `null`.
- The optional collection key is propagated through the traffic-flow orchestrator.
- The writer persists the normalized key to `collection_key`.
- Keyed writes use conflict-targeted Supabase upsert against:
  - organization ID;
  - provider;
  - provider segment ID;
  - collection key.
- Unkeyed/manual writes retain the existing plain insert behavior.
- Production already contains migration `20260810160000_add_traffic_flow_collection_key.sql`.
- TypeScript validation passed.
- Production build passed.
- Local and remote `main` both ended at `b82330b`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- No database schema changed in this implementation.
- Existing Traccar scheduling remained untouched.
- No traffic-flow QStash schedule was created or changed.
- Next step: verify keyed production behavior and retry idempotency before enabling recurring QStash collection.

## 2026-08-10 - Traffic-flow collection receipt boundary

- Completed the audit-first message-level traffic-flow idempotency schema foundation.
- Implementation commit: `8799a58`.
- Added migration `supabase/migrations/20260810174500_add_traffic_flow_collection_receipts.sql`.
- Added `public.traffic_flow_collection_receipts` as the delivery-level receipt boundary for scheduled traffic-flow collection.
- Receipt identity is unique across organization ID and collection key.
- Receipt processing states are:
  - `processing`;
  - `processed`;
  - `failed`.
- Added atomic `public.claim_traffic_flow_collection(...)`.
- New collection keys are claimed in `processing` state with attempt count `1`.
- Duplicate collection keys are serialized through the database claim boundary.
- Already processed or currently processing receipts are not reclaimed.
- Failed receipts can be atomically reclaimed.
- Reclaiming a failed receipt increments `attempt_count` and resets prior failure/finalization state.
- Added guarded `public.complete_traffic_flow_collection(...)` finalization.
- Added guarded `public.fail_traffic_flow_collection(...)` finalization.
- Completion and failure require both active `processing` state and matching attempt count.
- This mirrors HarborGuard's proven telematics receipt claim/finalization architecture.
- TypeScript validation passed.
- Production build passed.
- Build generated all 123/123 static pages successfully.
- The migration implementation changed exactly one tracked file.
- Commit `8799a58` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `8799a58`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- Unrelated untracked audit and backup files were not modified.
- The production database migration has not yet been applied.
- No traffic-flow endpoint code changed.
- No traffic-flow orchestrator code changed.
- No traffic-flow writer code changed.
- Existing Traccar scheduling remained untouched.
- No traffic-flow QStash schedule was created or changed.
- Next step: commit this documentation milestone, then separately verify and deploy the receipt migration before wiring the claim/finalization lifecycle into the traffic-flow endpoint.

## 2026-08-10 - Production traffic-flow collection receipt migration deployed

- Deployed and verified the production traffic-flow collection receipt migration.
- Repository HEAD remained at documentation commit `0767441` throughout the database deployment.
- Applied migration `20260810174500_add_traffic_flow_collection_receipts.sql` to the linked production Supabase database.
- Supabase reported the migration application completed successfully.
- Remote migration history now records `20260810174500`.
- Local and remote migration versions for `20260810174500` match.
- No pending migrations remain after deployment.
- Production now contains the `traffic_flow_collection_receipts` receipt boundary introduced by implementation commit `8799a58`.
- Production now contains the receipt lifecycle RPCs:
  - `claim_traffic_flow_collection`;
  - `complete_traffic_flow_collection`;
  - `fail_traffic_flow_collection`.
- The receipt boundary includes retry-attempt tracking through `attempt_count`.
- The repository remained unchanged during the production database deployment.
- Local and remote `main` remained at `0767441`.
- No source code changed during deployment.
- No traffic-flow endpoint code changed.
- No traffic-flow orchestrator code changed.
- No traffic-flow writer code changed.
- No traffic-flow QStash schedule was created or changed.
- Production receipt infrastructure is now deployed, but the traffic-flow endpoint has not yet been wired to the receipt lifecycle.
- Next step: perform an audit-first review of the exact endpoint and orchestration insertion points for `claim_traffic_flow_collection`, `complete_traffic_flow_collection`, and `fail_traffic_flow_collection` before changing source code.

## Traffic-flow receipt lifecycle application helper — 2026-08-10

- Implementation commit: `11d0d7e` (`Add traffic flow receipt lifecycle helper`).
- Parent baseline: `c663775`.
- Added `lib/traffic/collectionReceiptLifecycle.ts` as the application boundary for the deployed traffic-flow collection receipt lifecycle.
- `claimTrafficFlowCollection` wraps `claim_traffic_flow_collection` and returns the receipt ID, attempt count, and claim state while validating the RPC result.
- `completeTrafficFlowCollection` wraps `complete_traffic_flow_collection` and requires the active receipt ID and attempt count.
- `failTrafficFlowCollection` wraps `fail_traffic_flow_collection` and records a non-blank failure message for the active attempt.
- The helper rejects malformed claim responses and rejected/stale completion or failure finalization rather than silently continuing.
- TypeScript validation passed with `npx tsc --noEmit`.
- Production validation passed with `npm run build`.
- The implementation commit contains exactly one new helper file.
- No traffic-flow endpoint code changed in this work item.
- No traffic-flow orchestrator or writer code changed.
- No database changes were made in this work item; the receipt migration was already deployed separately.
- No traffic-flow QStash schedule was created or changed.
- The production traffic-flow endpoint has not yet been wired to the receipt lifecycle.
- Next step: perform an audit-first review of the traffic-flow endpoint insertion points before wiring claim, completion, and failure handling.

## Traffic-flow receipt lifecycle endpoint wiring — 2026-08-10

- Implementation commit: `515f5f1` (`Wire traffic flow receipt lifecycle`).
- Parent baseline: `80512ba`.
- Updated exactly one implementation file: `app/api/traffic-flow/cron/route.ts`.
- Keyed traffic-flow requests now claim the delivery through `claimTrafficFlowCollection` before collection begins.
- Receipt identity continues to use the normalized `Upstash-Message-Id` as the collection key.
- Requests without a collection key retain the existing unkeyed/manual collection path.
- Already processed keyed deliveries return success with `skipped: "duplicate"` without invoking traffic collection.
- Currently processing keyed deliveries return success with `skipped: "processing"` without invoking traffic collection.
- Successfully claimed deliveries run `collectTrafficFlowObservations` using the claimed collection key.
- Successful claimed deliveries finalize through `completeTrafficFlowCollection` using the exact receipt ID and attempt count.
- Failed claimed deliveries finalize through `failTrafficFlowCollection` before the original error is rethrown.
- If failure finalization also fails, both errors are preserved through `AggregateError`.
- The receipt claim therefore surrounds scope resolution, the HERE traffic-flow request, and persistence.
- TypeScript validation passed with `npx tsc --noEmit`.
- Production validation passed with `npm run build`.
- Production build generated all 123/123 static pages successfully.
- Commit `515f5f1` was pushed successfully to `origin/main`.
- Local and remote `main` both ended at `515f5f1`.
- Tracked working tree was clean after push.
- Nothing remained staged.
- No traffic-flow orchestrator code changed.
- No traffic-flow writer code changed.
- No database changes were made in this implementation.
- No traffic-flow QStash schedule was created or changed.
- The production endpoint has not yet been invoked to verify receipt lifecycle behavior.
- Next step: commit this documentation milestone, then perform a controlled production keyed-request verification before creating or changing any recurring QStash schedule.

## Production traffic-flow receipt idempotency verified - 2026-08-10

- Production receipt lifecycle verification completed successfully against `https://harborguard.vercel.app`.
- Repository baseline remained `4832c76`.
- Verification collection key: `harborguard-receipt-test-51e3f62cfb3945d7ae636612015940ae`.
- Production receipt ID: `62235569-6520-4300-8677-55cbe0f4e668`.
- The initial keyed request created exactly one receipt.
- The receipt completed with `processing_status = processed`.
- The receipt remained at `attempt_count = 1`.
- The initial request resolved no traffic scope and therefore persisted zero traffic-flow observations.
- A second production request using the exact same `Upstash-Message-Id` returned `skipped: "duplicate"`.
- The duplicate response returned the same receipt ID.
- Receipt count remained exactly one after duplicate delivery.
- Receipt status remained `processed` after duplicate delivery.
- Receipt attempt count remained `1` after duplicate delivery.
- Observation count remained unchanged at zero.
- Observation identities remained unchanged.
- The duplicate delivery therefore did not re-run traffic collection or create duplicate persistence.
- Production message-level idempotency for already-processed traffic-flow deliveries is verified.
- No source code changed during production verification.
- No database schema changed during production verification.
- No recurring traffic-flow QStash schedule was created or changed.
- Next step: commit and push this documentation milestone before deciding whether the traffic-flow recurring QStash schedule is ready to be enabled.

## Live production traffic-flow collection verified - 2026-08-10

- Production verification completed against `https://harborguard.vercel.app`.
- Repository baseline remained `c70e6ad`.
- Verification collection key: `harborguard-live-traffic-test-549982d376f54c4bb9c1b3ffe9a3485b`.
- Source vehicle ID: `152119a0-6497-4692-a40f-4ced454d722e`.
- Source vehicle location timestamp: `2026-08-10T16:39:29+00:00`.
- Source location age at invocation was approximately `2.59` minutes.
- Traffic scope resolved successfully with `scopeResolved = true`.
- HERE returned `20` traffic-flow records.
- HarborGuard persisted `6` valid traffic-flow observations.
- `14` provider records were skipped because they did not contain a usable provider segment ID.
- Database verification confirmed exactly `6` observations for the collection key.
- Production receipt ID: `8326ca72-aa12-45d5-9d26-20d58b009cd9`.
- Receipt completed with `processing_status = processed`.
- Receipt completed on `attempt_count = 1`.
- Persisted observations included live HERE traffic data for roads including Vanguard Drive, Klipfontein Road, Lansdowne Road and the N1.
- Endpoint persisted count matched the independently queried database observation count.
- This verifies the production path from fresh normalized Traccar vehicle location -> traffic scope resolution -> HERE traffic retrieval -> normalized HarborGuard persistence -> receipt completion.
- Production message-level retry idempotency had already been verified separately before this live-scope test.
- No source code changed during production verification.
- No database schema changed during production verification.
- No recurring traffic-flow QStash schedule was created or changed.
- Next step: commit and push this documentation milestone, then audit the existing QStash/cron scheduling architecture before deciding whether to enable recurring production traffic-flow collection.

---

## 2026-08-10 - Recurring production traffic-flow QStash scheduling verified

### Status

Recurring production traffic-flow collection is now scheduled through QStash.

Production schedules:

- Traccar collection: every 10 minutes
- Traffic-flow collection: every 10 minutes
- Traffic-flow destination: `/api/traffic-flow/cron`
- Traffic-flow QStash schedule ID: `harborguard-traffic-flow-10m`
- Traffic-flow method: `GET`
- Cron authentication is forwarded through the `Authorization` header.

### Production verification

The recurring traffic-flow schedule was created after the scheduling-readiness audit.

The first scheduled traffic-flow delivery returned HTTP `401` with:

`Unauthorized cron request.`

Investigation confirmed that the QStash schedule was not initially forwarding the correct production cron authorization value.

The QStash traffic-flow schedule Authorization forwarding configuration was corrected.

A subsequent genuine scheduled QStash traffic-flow delivery succeeded with HTTP `200`.

HarborGuard database verification confirmed that the genuine automated QStash delivery created a message-backed traffic-flow collection receipt and that the receipt reached:

- `processing_status = processed`
- `attempt_count = 1`
- no processing failure
- no processing failure timestamp

This verifies the recurring production path:

`QStash schedule -> authenticated GET /api/traffic-flow/cron -> HarborGuard traffic collection -> receipt processing`

The successful automated verification run persisted `0` traffic observations. This does not invalidate scheduler/authentication verification: the collection receipt itself completed successfully. Observation yield remains dependent on the resolved collection scope and provider result for an individual collection cycle.

### Cron-secret security remediation

During QStash configuration, the previous production cron secret became visible during operator verification.

That secret has now been rotated.

The QStash recurring schedules were updated to use the rotated cron authorization value and were confirmed working after the rotation.

The cron secret value itself is intentionally not recorded in repository documentation.

### Result

Recurring production traffic-flow QStash scheduling is operational.

The earlier HTTP `401` authorization failure is resolved.

The production cron secret has been rotated.

The recurring schedules are using the replacement authorization value.

No source-code change was required for this production scheduling/remediation step.

No database schema change was required.

Traffic-flow scheduling is no longer a pending deployment item.

---

## 2026-08-10 - Per-threat congestion score diagnostics

### Implementation

Commit: `56a82f4`

File changed:

- `app/api/route-safety/predict/route.ts`

The Route Safety prediction endpoint now exposes congestion-aware diagnostic scoring on each individual route threat.

A shared helper was introduced:

- `trafficCongestionMultiplierForRiskLevel`

The existing congestion multiplier behavior remains:

- LOW -> `1.0`
- MEDIUM -> `1.1`
- HIGH -> `1.25`
- CRITICAL -> `1.5`

Each individual route threat now exposes:

- `averageCongestion`
- `trafficCongestionMultiplier`
- `scoreBeforeTrafficWeighting`
- `scoreAfterTrafficWeighting`

`scoreBeforeTrafficWeighting` is the existing production threat score after intelligence, historical recency, and provider-geometry weighting.

`scoreAfterTrafficWeighting` is diagnostic only and is calculated by multiplying the existing production threat score by the traffic congestion multiplier, clamped to the `0..100` range.

### Production behavior preserved

The existing production `score` field was not replaced.

Route-threat sorting continues to use the existing production `score`.

Aggregate `threatRiskScore` continues to sum the existing production threat scores.

Automatic escalation continues to use:

`threatRiskScore >= 80`

Automatic rerouting continues to use:

`threatRiskScore >= 80`

Production overall risk continues to use:

`threatRiskScore + weatherContribution + trafficContribution`

The diagnostic congestion-weighted score does not currently alter warnings, escalations, rerouting, or production risk.

### Shared diagnostic behavior

The existing aggregate traffic diagnostic now reuses the same congestion-multiplier helper, avoiding duplicate multiplier formulas.

### Validation

Validation completed successfully before commit:

- `git diff --check`
- `npx tsc --noEmit`
- `npm run build`
- Next.js production build compiled successfully
- `123/123` static pages generated
- exactly one source file changed
- production score/action contracts verified unchanged

### Result

HarborGuard can now compare the existing production threat score with a congestion-weighted diagnostic score at the individual-threat level.

This closes the diagnostic-only congestion multiplier implementation gap while keeping congestion weighting out of production threat decisions.

The next step should be real-route validation of these per-threat diagnostics before considering any production weighting change.

---

## 2026-08-10 - Real-route per-threat congestion diagnostics verified

### Production validation

Implementation under validation:

- `56a82f4` - Add congestion threat score diagnostics
- documentation baseline before validation: `efe6e88`

A controlled authenticated production request was sent to:

`POST /api/route-safety/predict`

The request deliberately omitted both `vehicleId` and `tripId`.

This prevented eligibility for the vehicle-specific automatic escalation and automatic rerouting branches and prevented trip-linked route prediction snapshot persistence.

### HTTP result

- HTTP status: `200`
- request succeeded: `true`
- returned threat count: `7`
- `riskScore = 100`
- `riskLevel = CRITICAL`
- `threatRiskScore = 100`
- `threatRiskLevel = CRITICAL`
- `trafficRiskScore = 100`
- `trafficRiskLevel = critical`
- aggregate `trafficCongestionMultiplier = 1.5`
- aggregate `diagnosticTrafficWeightedThreatRisk = 100`

### Per-threat diagnostic verification

All seven returned threats exposed:

- `averageCongestion`
- `trafficCongestionMultiplier`
- `scoreBeforeTrafficWeighting`
- `scoreAfterTrafficWeighting`

For all seven threats:

- `averageCongestion = 75`
- `trafficCongestionMultiplier = 1.5`
- `scoreBeforeTrafficWeighting` matched the existing production `score`
- `scoreAfterTrafficWeighting` matched the expected rounded and clamped congestion-weighted score

Representative validated results:

- critical road closure: production `69` -> diagnostic `100`
- critical smash-and-grab hotspot: production `48` -> diagnostic `72`
- high roadblock: production `36` -> diagnostic `54`
- aggregated road-risk collision segment: production `35` -> diagnostic `53`
- Stock Road roadworks: production `30` -> diagnostic `45`
- New Eisleben Road roadworks: production `30` -> diagnostic `45`
- traffic-light outage: production `22` -> diagnostic `33`

### Result

`PASS: REAL-ROUTE PER-THREAT CONGESTION DIAGNOSTICS VERIFIED.`

The real production route confirms that the congestion diagnostics behave correctly while the existing production threat scores remain unchanged.

No production congestion weighting has been enabled.

Production warnings, escalation thresholds, rerouting thresholds, threat sorting, and production risk calculation remain based on the existing production score path.

The next step is to evaluate the diagnostic evidence before considering any production congestion weighting.

---

## 2026-08-11 - Threat score saturation diagnostics

### Implementation

Commit: `2d11034`

File changed:

- `app/api/route-safety/predict/route.ts`

HarborGuard now exposes diagnostic visibility into route threat score saturation without changing production scoring behavior.

The following route-level diagnostics were added:

- `candidateThreatCount`
- `consolidatedThreatCount`
- `duplicateThreatsRemoved`
- `uncappedThreatRiskScore`
- `saturationAmount`
- `isThreatScoreSaturated`

### Diagnostic meaning

`candidateThreatCount` records the number of route threats before existing route-level duplicate consolidation.

`consolidatedThreatCount` records the number of threats remaining after existing same-type spatial consolidation.

`duplicateThreatsRemoved` records the difference between those two counts.

`uncappedThreatRiskScore` records the sum of the retained production threat scores before the existing `100` cap is applied.

`saturationAmount` records how much threat score was hidden by the production cap.

`isThreatScoreSaturated` indicates whether the uncapped retained threat score exceeded the production `threatRiskScore`.

### Production behavior preserved

The existing production `threatRiskScore` calculation remains unchanged.

Production threat sorting remains unchanged.

Automatic escalation continues to use the existing production threshold.

Automatic rerouting continues to use the existing production threshold.

Route prediction snapshot persistence remains unchanged.

Production congestion weighting remains disabled.

The new saturation fields are diagnostic response fields only.

### Validation

Validation completed successfully before commit:

- `git diff --check`
- `npx tsc --noEmit`
- `npm run build`
- Next.js production build compiled successfully
- `123/123` static pages generated
- exactly one source file changed
- production scoring and action contracts verified unchanged

### Result

HarborGuard can now distinguish a route whose production threat score is merely capped at `100` from the underlying uncapped threat burden that produced that cap.

This creates the observability needed to evaluate future threat aggregation, overlap handling, diminishing returns, or other saturation-aware scoring approaches without changing production behavior prematurely.

The next step should be real-route validation of these saturation diagnostics before considering any production threat aggregation change.

---

## 2026-08-11 - Real-route threat saturation diagnostics verified

### Validation target

Implementation commit: `2d11034`

Documentation commit before this validation record: `36133c1`

The diagnostic-only threat saturation fields were validated against the production Route Safety prediction endpoint using a real route.

The request intentionally omitted both `vehicleId` and `tripId` so that vehicle-specific automatic escalation/rerouting and trip prediction snapshot persistence were not eligible during the validation request.

### HTTP result

The production endpoint returned:

- HTTP status: `200`
- request successful: `true`

### Production threat score

The production scoring contract returned:

- `threatRiskScore = 100`
- `threatRiskLevel = CRITICAL`

The existing production threat score therefore remained capped at `100`.

### Saturation diagnostics

The new diagnostic fields returned:

- `candidateThreatCount = 6`
- `consolidatedThreatCount = 6`
- `duplicateThreatsRemoved = 0`
- `uncappedThreatRiskScore = 201`
- `saturationAmount = 101`
- `isThreatScoreSaturated = true`

The diagnostics therefore expose that the six retained threats had a combined pre-cap production score of `201`, while the existing production threat score remained capped at `100`.

The hidden saturation amount for this route was therefore `101`.

### Returned threat score breakdown

The endpoint returned six retained threats with production scores:

- Known smash-and-grab hotspot: `48`
- Possible roadblock ahead: `36`
- Aggregated road-risk segment: `35`
- At Stock Road - Road construction: `30`
- At New Eisleben Road - Road construction: `30`
- Traffic lights not working: `22`

The sum of the returned production threat scores was:

`48 + 36 + 35 + 30 + 30 + 22 = 201`

This exactly matched:

`uncappedThreatRiskScore = 201`

### Consolidation observation

For this validation route:

- candidate threats: `6`
- consolidated threats: `6`
- duplicates removed: `0`

The observed score saturation was therefore not caused by threats being removed during the existing consolidation pass.

All six candidate threats remained in the final route-threat set.

This provides evidence that the observed saturation is an aggregation/capping issue for this route rather than a simple duplicate-removal issue.

### Contract verification

The real-route diagnostic validation passed.

Observed result:

`PASS: REAL-ROUTE THREAT SATURATION DIAGNOSTICS VERIFIED.`

The diagnostic contract correctly exposed the relationship between:

- candidate threat count
- consolidated threat count
- duplicate removal count
- uncapped threat score
- capped production threat score
- saturation amount
- saturation state

### Production behavior preserved

This validation did not change production scoring.

The production `threatRiskScore` remains capped at `100`.

Production threat sorting was not changed.

Production escalation thresholds were not changed.

Production rerouting thresholds were not changed.

Production congestion weighting remains disabled.

No production threat aggregation change has been enabled.

### Side-effect safety

The validation request omitted `vehicleId`.

Therefore vehicle-specific automatic escalation and rerouting were not eligible.

The validation request omitted `tripId`.

Therefore the trip prediction snapshot path was not eligible.

### Result

Real-route threat saturation diagnostics are now verified in production.

The validation demonstrates a concrete saturated route where:

- six retained threats produced an uncapped score of `201`
- the production threat score remained `100`
- `101` points of threat-score magnitude were hidden by the production cap
- no candidate threats were removed by the current consolidation pass

This closes the real-route validation step for the diagnostic-only threat saturation instrumentation.

The next engineering step should analyze the production threat aggregation model using these diagnostics before changing any production scoring behavior.

---

## Threat family diagnostics

**Status:** Implemented, verified, committed, and pushed
**Implementation commit:** `32dddf1`
**Parent commit:** `30ab42f`

### Purpose

Added diagnostic-only threat-family visibility to the route safety prediction pipeline so HarborGuard can measure how different categories of threats contribute to route threat-score saturation before any production aggregation or diminishing-return weighting is introduced.

### Threat family taxonomy

The route prediction endpoint now classifies threats into the following diagnostic families:

- `security`
- `access_disruption`
- `road_safety`
- `weather_environment`
- `other`

Current mappings include:

- `smash_grab_hotspot`, `protest` -> `security`
- `roadblock`, `road_closure`, `roadworks`, `congestion`, `lane_closure`, `vehicle_breakdown` -> `access_disruption`
- `collision`, `traffic_light_outage`, `road_hazard` -> `road_safety`
- `weather_hazard`, `flooding` -> `weather_environment`
- unclassified threat types -> `other`

### Diagnostic response fields

`POST /api/route-safety/predict` now exposes:

- `threatFamilyCount`
- `threatFamilyBreakdown`
- `largestThreatFamily`
- `largestThreatFamilyCount`
- `largestThreatFamilyScore`

`threatFamilyBreakdown` records both the number of threats and total production threat score contributed by each family.

These fields provide visibility into whether route threat-score saturation is being driven by several independent threat families or repeated contributions from the same general family.

### Verification

Implementation verification confirmed:

- exactly one production source file was modified:
  - `app/api/route-safety/predict/route.ts`
- TypeScript validation passed
- production build passed
- all `123/123` static pages generated successfully
- production `threatRiskScore` calculation remains unchanged
- production threat sorting remains unchanged
- automatic escalation threshold remains unchanged
- automatic rerouting threshold remains unchanged
- route prediction snapshot persistence remains unchanged
- no diminishing-return family weighting has been implemented
- production congestion weighting remains disabled

### Production behavior preserved

This milestone is diagnostic only.

Threat-family information does **not** currently modify:

- individual production threat scores
- `threatRiskScore`
- `riskScore`
- threat sorting
- escalation eligibility
- automatic rerouting eligibility
- persisted route prediction scores

No production threat aggregation change has been enabled.

### Next validation

Perform real-route validation of the new threat-family diagnostic fields.

The validation should confirm that:

1. `threatFamilyCount` matches the number of represented diagnostic families.
2. `threatFamilyBreakdown` correctly groups returned threats.
3. family counts equal the returned threat count when summed.
4. family `totalScore` values equal the corresponding production threat scores when summed.
5. `largestThreatFamily`, `largestThreatFamilyCount`, and `largestThreatFamilyScore` agree with the breakdown.
6. existing saturation diagnostics remain correct.
7. production `threatRiskScore` remains unchanged.

Do not introduce diminishing-return weighting or production family aggregation until real-route behavior has been observed and documented.

---

## 2026-08-11 - Real-route threat family diagnostics verified

### Validation target

Threat-family implementation commit: `32dddf1`

Threat-family documentation commit: `4353b66`

The diagnostic-only threat-family fields were validated against the production Route Safety prediction endpoint using a real route.

The validation request intentionally omitted both `vehicleId` and `tripId`.

### HTTP result

The production prediction request completed successfully.

### Production scoring

Production threat scoring remained unchanged.

The route returned:

- `threatRiskScore = 100`
- `threatRiskLevel = CRITICAL`

The production threat score remained capped at `100`.

### Saturation diagnostics

The route returned:

- `candidateThreatCount = 6`
- `consolidatedThreatCount = 6`
- `duplicateThreatsRemoved = 0`
- `uncappedThreatRiskScore = 195`
- `saturationAmount = 95`
- `isThreatScoreSaturated = true`

The six retained threats therefore carried a combined production score of `195`, while production continued to expose the existing capped `threatRiskScore = 100`.

### Threat family diagnostics

The route returned:

- `threatFamilyCount = 3`
- `largestThreatFamily = access_disruption`
- `largestThreatFamilyCount = 3`
- `largestThreatFamilyScore = 90`

The diagnostic family breakdown was:

- `security`
  - count: `1`
  - total score: `48`

- `access_disruption`
  - count: `3`
  - total score: `90`

- `road_safety`
  - count: `2`
  - total score: `57`

The family totals reconcile exactly:

`48 + 90 + 57 = 195`

This matched the sum of the returned production threat scores and `uncappedThreatRiskScore = 195`.

### Returned threat breakdown

The six retained production threats were:

- Known smash-and-grab hotspot
  - type: `smash_grab_hotspot`
  - production score: `48`
  - diagnostic family: `security`

- Possible roadblock ahead
  - type: `roadblock`
  - production score: `36`
  - diagnostic family: `access_disruption`

- Aggregated road-risk segment
  - type: `collision`
  - production score: `35`
  - diagnostic family: `road_safety`

- At Stock Road - Road construction
  - type: `roadworks`
  - production score: `27`
  - diagnostic family: `access_disruption`

- At New Eisleben Road - Road construction
  - type: `roadworks`
  - production score: `27`
  - diagnostic family: `access_disruption`

- Traffic lights not working
  - type: `traffic_light_outage`
  - production score: `22`
  - diagnostic family: `road_safety`

The individual production scores reconcile exactly:

`48 + 36 + 35 + 27 + 27 + 22 = 195`

### Observed aggregation structure

The largest diagnostic family was `access_disruption`.

It contributed:

`36 + 27 + 27 = 90`

The `road_safety` family contributed:

`35 + 22 = 57`

The `security` family contributed:

`48`

This demonstrates that the observed production score saturation was distributed across three meaningful threat families rather than being caused by one duplicate threat type.

### Contract verification

The browser validation completed with:

`PASS: REAL-ROUTE THREAT FAMILY DIAGNOSTICS VERIFIED.`

The following contracts were verified:

- `threatFamilyCount` matched the number of represented families.
- family threat counts summed to the returned threat count.
- family score totals summed to the returned production threat-score total.
- family score totals matched `uncappedThreatRiskScore`.
- `largestThreatFamily` matched the highest-scoring family.
- `largestThreatFamilyCount` matched that family's threat count.
- `largestThreatFamilyScore` matched that family's score.
- existing saturation diagnostics remained correct.
- production threat scoring remained unchanged.

### Side-effect safety

`vehicleId` was omitted.

Therefore vehicle-specific automatic escalation and automatic rerouting were not eligible during this validation request.

`tripId` was omitted.

Therefore the trip prediction snapshot path was not eligible.

### Production behavior preserved

No production aggregation formula was changed.

No diminishing-return family weighting has been enabled.

Production escalation thresholds remain unchanged.

Production rerouting thresholds remain unchanged.

Production congestion weighting remains disabled.

### Result

Real-route threat-family diagnostics are verified in production.

HarborGuard can now observe both total score saturation and the family-level structure responsible for that saturation without changing live threat decisions.

For this route, `access_disruption` was the largest contributing threat family with a score of `90`, followed by `road_safety` at `57` and `security` at `48`.

The next engineering step should use these verified diagnostics to evaluate candidate diminishing-return or family-aware aggregation models diagnostically before any production threat-score formula is changed.

---

## 2026-08-11 - Marginal-decay threat diagnostics

### Implementation

Implementation commit: `3e593ad`

Parent commit: `bfd8888`

File changed:

- `app/api/route-safety/predict/route.ts`

HarborGuard now exposes a diagnostic-only marginal-decay threat aggregation model for evaluating repeated same-family threat contributions.

The model does not replace or alter production `threatRiskScore`.

### Marginal-decay model

Within each diagnostic threat family, threats are ordered by their existing production score from highest to lowest.

The model applies the following contribution weights:

- first threat in the family -> `100%`
- second threat -> `50%`
- third threat -> `25%`
- fourth threat -> `12.5%`
- each subsequent threat halves again

The weight is calculated with:

`Math.pow(0.5, index)`

The strongest threat in each family therefore remains fully represented, while additional same-family threats contribute progressively less.

### Diagnostic response fields

The Route Safety prediction response now exposes:

- `diagnosticMarginalDecayFamilyBreakdown`
- `diagnosticMarginalDecayUncappedThreatRiskScore`
- `diagnosticMarginalDecayThreatRiskScore`
- `diagnosticMarginalDecayReduction`

Each family entry exposes:

- threat count
- raw total production score
- marginal-decay score
- reduction
- individual threat contributions
- contribution position
- contribution weight
- weighted contribution score

### Local real-route validation

The diagnostic implementation was validated locally against the same real route used for earlier threat-family and saturation validation.

The local request completed successfully with HTTP `200`.

The production threat scoring contract remained:

- `uncappedThreatRiskScore = 195`
- `threatRiskScore = 100`

The marginal-decay diagnostic result was:

- `diagnosticMarginalDecayUncappedThreatRiskScore = 150.25`
- `diagnosticMarginalDecayThreatRiskScore = 100`
- `diagnosticMarginalDecayReduction = 44.75`

The diagnostic model therefore reduced the uncapped threat burden from `195` to `150.25`, a reduction of `44.75`, while production continued to expose the existing capped score of `100`.

### Family validation

#### security

Raw score:

`48`

Marginal-decay score:

`48`

Reduction:

`0`

Contribution:

- `smash_grab_hotspot`
  - production score: `48`
  - position: `1`
  - weight: `1`
  - weighted score: `48`

#### access_disruption

Raw score:

`90`

Marginal-decay score:

`56.25`

Reduction:

`33.75`

Contributions:

- `roadblock`
  - production score: `36`
  - position: `1`
  - weight: `1`
  - weighted score: `36`

- first `roadworks`
  - production score: `27`
  - position: `2`
  - weight: `0.5`
  - weighted score: `13.5`

- second `roadworks`
  - production score: `27`
  - position: `3`
  - weight: `0.25`
  - weighted score: `6.75`

The family calculation reconciles:

`36 + 13.5 + 6.75 = 56.25`

#### road_safety

Raw score:

`57`

Marginal-decay score:

`46`

Reduction:

`11`

Contributions:

- `collision`
  - production score: `35`
  - position: `1`
  - weight: `1`
  - weighted score: `35`

- `traffic_light_outage`
  - production score: `22`
  - position: `2`
  - weight: `0.5`
  - weighted score: `11`

The family calculation reconciles:

`35 + 11 = 46`

### Total reconciliation

Raw family totals:

`48 + 90 + 57 = 195`

Marginal-decay family totals:

`48 + 56.25 + 46 = 150.25`

Reduction:

`195 - 150.25 = 44.75`

The local browser validation completed with:

`PASS: LOCAL MARGINAL DECAY DIAGNOSTICS VERIFIED.`

### Rejected square-root candidate

An earlier diagnostic candidate using:

`sqrt(100 * raw family score)`

was tested locally and rejected because it increased the validated route's uncapped score from `195` to approximately `239`.

That candidate was fully reverted before the marginal-decay implementation was created.

The rejected square-root diagnostic identifiers are not present in the committed implementation.

### Validation

Before commit, the implementation passed:

- `git diff --check`
- `npx tsc --noEmit`
- `npm run build`
- Next.js production build compiled successfully
- `123/123` static pages generated
- exactly one tracked source file changed
- production `threatRiskScore` calculation verified unchanged
- production sorting verified unchanged
- automatic escalation threshold verified unchanged
- automatic rerouting threshold verified unchanged
- route prediction snapshot persistence verified unchanged

### Production behavior preserved

This milestone remains diagnostic only.

The marginal-decay result does not currently alter:

- individual production threat scores
- production `threatRiskScore`
- overall production `riskScore`
- threat sorting
- automatic escalation
- automatic rerouting
- persisted production route prediction scores
- congestion weighting

Production congestion weighting remains disabled.

No marginal-decay weighting has been enabled in the production threat aggregation formula.

### Result

HarborGuard now has a viable diagnostic model for measuring the effect of diminishing repeated same-family threat contributions.

On the validated route, the model reduced the uncapped threat score from `195` to `150.25` while preserving the strongest threat in each represented family at full contribution.

This provides a materially better diagnostic candidate than the rejected square-root model.

The next step should be production runtime validation of these diagnostic response fields before any consideration of enabling marginal-decay aggregation in production.

---

## 2026-08-11 - Production marginal-decay diagnostics verified

### Validation target

Implementation commit: `3e593ad`

Documentation baseline: `409aa10`

The diagnostic-only marginal-decay threat aggregation fields were validated against the production Route Safety prediction endpoint.

The validation request intentionally omitted both `vehicleId` and `tripId`.

### Production result

The production request completed successfully with HTTP `200`.

The existing production scoring contract remained:

- `uncappedThreatRiskScore = 195`
- `threatRiskScore = 100`

The production marginal-decay diagnostics returned:

- `diagnosticMarginalDecayUncappedThreatRiskScore = 150.25`
- `diagnosticMarginalDecayThreatRiskScore = 100`
- `diagnosticMarginalDecayReduction = 44.75`

The diagnostic model therefore reduced the uncapped threat burden from `195` to `150.25`, a reduction of `44.75`, while production continued to expose the existing capped `threatRiskScore = 100`.

### Production family breakdown

#### security

- count: `1`
- raw total score: `48`
- marginal-decay score: `48`
- reduction: `0`

Contribution:

- `smash_grab_hotspot`
  - production score: `48`
  - position: `1`
  - weight: `1`
  - weighted score: `48`

#### access_disruption

- count: `3`
- raw total score: `90`
- marginal-decay score: `56.25`
- reduction: `33.75`

Contributions:

- `roadblock`
  - production score: `36`
  - position: `1`
  - weight: `1`
  - weighted score: `36`

- first `roadworks`
  - production score: `27`
  - position: `2`
  - weight: `0.5`
  - weighted score: `13.5`

- second `roadworks`
  - production score: `27`
  - position: `3`
  - weight: `0.25`
  - weighted score: `6.75`

The family calculation reconciles:

`36 + 13.5 + 6.75 = 56.25`

#### road_safety

- count: `2`
- raw total score: `57`
- marginal-decay score: `46`
- reduction: `11`

Contributions:

- `collision`
  - production score: `35`
  - position: `1`
  - weight: `1`
  - weighted score: `35`

- `traffic_light_outage`
  - production score: `22`
  - position: `2`
  - weight: `0.5`
  - weighted score: `11`

The family calculation reconciles:

`35 + 11 = 46`

### Total reconciliation

Raw family total:

`48 + 90 + 57 = 195`

Marginal-decay family total:

`48 + 56.25 + 46 = 150.25`

Reduction:

`195 - 150.25 = 44.75`

The production browser validation completed with:

`PASS: PRODUCTION MARGINAL DECAY DIAGNOSTICS VERIFIED.`

### Production safety

The request omitted `vehicleId`.

Therefore vehicle-specific automatic escalation and automatic rerouting were not eligible during the validation request.

The request omitted `tripId`.

Therefore the trip prediction snapshot path was not eligible.

### Production behavior preserved

The marginal-decay model remains diagnostic only.

It does not currently alter:

- individual production threat scores
- production `threatRiskScore`
- overall production `riskScore`
- threat sorting
- automatic escalation
- automatic rerouting
- production route-prediction persistence
- congestion weighting

Production congestion weighting remains disabled.

No marginal-decay weighting has been enabled in the production threat aggregation formula.

### Result

Marginal-decay threat diagnostics are now verified in production.

The same validated route produced the same diagnostic result observed locally:

- raw uncapped threat score: `195`
- diagnostic marginal-decay score: `150.25`
- reduction: `44.75`
- production capped threat score: `100`

This confirms the diagnostic model behaves consistently across local and production runtime environments.

The next engineering step should be an audit-first evaluation of whether this model has enough evidence across multiple routes and threat distributions before any production aggregation change is considered.

---

## Multi-route marginal-decay production evidence

**Status:** Production diagnostic evidence collected and verified

**Baseline commit:** `7539d6f`

### Purpose

Validate the diagnostic marginal-decay threat aggregation model across multiple real production routes and threat distributions before considering any production aggregation change.

The marginal-decay model remains diagnostic only.

Production `threatRiskScore` calculation was not changed.

Production congestion weighting remains disabled.

No marginal-decay weighting has been enabled in the production threat aggregation formula.

### Diagnostic formula

Within each threat family, threats are ordered by their existing production score and receive marginal contribution weights:

- first threat: `1`
- second threat: `0.5`
- third threat: `0.25`
- subsequent threats continue with `Math.pow(0.5, index)`

Single-threat families therefore retain their complete production contribution.

### Multi-route production validation

Five production route requests were evaluated.

All requests omitted `vehicleId` and `tripId`, preventing vehicle-specific automatic escalation/rerouting and trip prediction snapshot side effects during evidence collection.

| Route | Threats | Families | Production uncapped | Production capped | Diagnostic uncapped | Diagnostic capped | Reduction | Reduction % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Validated Khayelitsha Route | 6 | 3 | 195 | 100 | 150.25 | 100 | 44.75 | 22.95% |
| Admin Test Route | 4 | 3 | 141 | 100 | 130 | 100 | 11 | 7.8% |
| Driver Existing Route | 1 | 1 | 27 | 27 | 27 | 27 | 0 | 0% |
| Admin Test Route Reverse | 4 | 3 | 141 | 100 | 130 | 100 | 11 | 7.8% |
| Driver Existing Route Reverse | 1 | 1 | 27 | 27 | 27 | 27 | 0 | 0% |

### Aggregate results

- Routes attempted: `5`
- HTTP 200 routes: `5`
- Formula PASS routes: `5`
- Production saturated routes: `3`
- Diagnostic still >100 routes: `3`
- Average production uncapped score: `106.20`
- Average diagnostic uncapped score: `92.85`
- Average score reduction: `7.71%`

### Validated Khayelitsha route

Production:

`uncappedThreatRiskScore = 195`

`threatRiskScore = 100`

Diagnostic:

`diagnosticMarginalDecayUncappedThreatRiskScore = 150.25`

`diagnosticMarginalDecayThreatRiskScore = 100`

`diagnosticMarginalDecayReduction = 44.75`

Family diagnostic contributions:

- security: `48`
- access_disruption: `56.25`
- road_safety: `46`

Verification:

`48 + 56.25 + 46 = 150.25`

`195 - 150.25 = 44.75`

Reduction: `22.95%`

### Admin Test Route

Production uncapped:

`141`

Diagnostic uncapped:

`130`

Reduction:

`11`

Reduction percentage:

`7.8%`

The route remained saturated after diagnostic marginal decay.

### Driver Existing Route

Production uncapped:

`27`

Diagnostic uncapped:

`27`

Reduction:

`0`

The single-threat route remained unchanged, confirming that the diagnostic model preserves the full contribution of the first threat in a family.

### Reverse-route evidence

Admin Test Route Reverse produced the same aggregate evidence as the forward route:

- production uncapped: `141`
- diagnostic uncapped: `130`
- reduction: `11`
- reduction percentage: `7.8%`

Driver Existing Route Reverse also remained unchanged:

- production uncapped: `27`
- diagnostic uncapped: `27`
- reduction: `0`

### Validation result

`PASS: MULTI-ROUTE MARGINAL DECAY DIAGNOSTICS VERIFIED.`

All five production requests returned HTTP `200`.

All five routes passed the diagnostic formula contract.

The marginal-decay diagnostic correctly reduces repeated contributions within the same threat family while preserving single-threat family contributions.

### Important saturation finding

The diagnostic model reduced aggregate threat scores, but it did not eliminate saturation on the routes that were already saturated.

Production saturated routes: `3`

Diagnostic still >100 routes: `3`

Examples:

- `195 -> 150.25`
- `141 -> 130`
- `141 -> 130`

Therefore the current marginal-decay candidate is mathematically valid and behaves consistently across the tested routes, but the available evidence does not justify enabling it as the production aggregation formula.

### Production safety

Production threat scoring remains unchanged.

Production congestion weighting remains disabled.

Marginal-decay weighting remains diagnostic only.

No production threat aggregation change has been enabled.

### Next engineering step

Audit stronger diagnostic aggregation candidates using the existing multi-route evidence as the comparison baseline.

Do not enable production marginal-decay aggregation yet.

---

---

## Route-level soft-cap threat diagnostics

**Status:** Implemented locally, verified, committed, and pushed

**Parent baseline:** `164fa0b`

**Implementation commit:** `dbc741f`

### Purpose

Introduce a stronger diagnostic-only route-level saturation model for comparison against the existing marginal-decay candidate.

The purpose of this diagnostic is to preserve the existing production threat score contract while evaluating whether a route-level soft saturation curve provides more useful differentiation above the production CRITICAL threshold.

Production threat scoring remains unchanged.

Production congestion weighting remains disabled.

Marginal-decay weighting remains diagnostic only.

Route-level soft-cap weighting remains diagnostic only.

No production threat aggregation change has been enabled.

### Diagnostic formula

The route-level soft-cap diagnostic preserves the production threat score through the existing CRITICAL threshold of `80`.

For an uncapped threat score less than or equal to `80`:

`diagnostic = raw`

For an uncapped threat score greater than `80`:

`excess = raw - 80`

`diagnostic = 80 + 20 * (excess / (excess + 40))`

The soft-cap constant is therefore:

`40`

This design preserves the first `80` threat-risk points exactly and applies diminishing returns only to the excess above `80`.

The diagnostic approaches `100` asymptotically without replacing the existing production hard cap.

### Diagnostic response fields

The prediction endpoint now exposes the following diagnostic-only fields:

- `diagnosticRouteSoftCapUncappedThreatRiskScore`
- `diagnosticRouteSoftCapThreatRiskScore`
- `diagnosticRouteSoftCapReduction`
- `diagnosticRouteSoftCapExcess`

These fields are informational only.

They do not currently alter:

- production `threatRiskScore`
- production `threatRiskLevel`
- overall production `riskScore`
- threat sorting
- automatic escalation
- automatic rerouting
- route prediction persistence
- traffic weighting
- marginal-decay diagnostics

### Reference formula verification

The implementation was verified against the following reference values:

- raw `27` -> diagnostic `27`
- raw `80` -> diagnostic `80`
- raw `81` -> diagnostic approximately `80.487805`
- raw `100` -> diagnostic approximately `86.666667`
- raw `141` -> diagnostic approximately `92.079208`
- raw `195` -> diagnostic approximately `94.838710`
- raw `300` -> diagnostic approximately `96.923077`

Scores less than or equal to `80` remain unchanged.

Scores greater than `80` remain greater than or equal to `80` and below `100`.

### Static verification

Before commit, the implementation passed:

- `git diff --check`
- TypeScript: `npx tsc --noEmit`
- production build: `npm run build`
- static generation: `123/123`

The source change was limited to:

`app/api/route-safety/predict/route.ts`

The production `threatRiskScore` calculation remained unchanged.

The two existing production `threatRiskScore >= 80 &&` action thresholds remained unchanged.

Production route prediction persistence continued to store:

- `threat_risk_score: threatRiskScore`
- `overall_risk_score: riskScore`

Existing marginal-decay diagnostics remained intact.

### Local runtime validation

A real route prediction request was executed against:

`http://localhost:3000`

The validation request intentionally omitted both `vehicleId` and `tripId`.

The request returned HTTP `200`.

Production score values:

- `threatRiskScore = 100`
- `uncappedThreatRiskScore = 195`

Route-level soft-cap diagnostic values:

- `diagnosticRouteSoftCapExcess = 115`
- `diagnosticRouteSoftCapUncappedThreatRiskScore = 94.83870967741936`
- `diagnosticRouteSoftCapThreatRiskScore = 94.83870967741936`
- `diagnosticRouteSoftCapReduction = 100.16129032258064`

The expected formula values exactly matched the returned runtime values.

Validation result:

`PASS: LOCAL ROUTE SOFT-CAP DIAGNOSTICS VERIFIED.`

### Production safety

The production threat score remained:

`threatRiskScore = 100`

The diagnostic score did not replace the production score.

Because `vehicleId` was omitted, vehicle-specific automatic escalation and automatic rerouting were not eligible during the validation request.

Because `tripId` was omitted, the trip prediction snapshot path was not eligible during the validation request.

Production persistence remains based on the existing production score.

Production congestion weighting remains disabled.

### Current conclusion

The route-level soft-cap diagnostic is implemented and locally verified.

For the validated raw threat score of `195`, the diagnostic transformed the uncapped value to approximately `94.84` while the production `threatRiskScore` remained `100`.

This demonstrates that the candidate can preserve the existing CRITICAL threshold while avoiding immediate hard saturation in the diagnostic output.

However, this is still diagnostic evidence only.

No production threat aggregation change has been enabled.

### Next engineering step

Perform production runtime validation of the route-level soft-cap diagnostic fields.

Use a request that omits both `vehicleId` and `tripId`.

Verify that:

- production `threatRiskScore` remains unchanged
- the four route-level soft-cap diagnostic fields are present
- the route-level soft-cap formula reconciles correctly
- production side-effect paths remain ineligible
- marginal-decay diagnostics remain intact

Do not enable route-level soft-cap production aggregation yet.

---


## Production route-level soft-cap diagnostics verified

**Status:** Production runtime validation passed

**Implementation commit:** `dbc741f`

**Prior documentation commit:** `f179911`

### Production validation purpose

Validate the route-level soft-cap diagnostic fields against the deployed production HarborGuard runtime without changing production threat aggregation behavior.

The validation request intentionally omitted both `vehicleId` and `tripId`.

No production aggregation change was enabled by this validation.

Production congestion weighting remains disabled.

Marginal-decay weighting remains diagnostic only.

Route-level soft-cap weighting remains diagnostic only.

### Production endpoint result

The production request returned:

- HTTP status: `200`
- HTTP OK: `true`
- `threatRiskScore = 100`
- `uncappedThreatRiskScore = 195`
- `threatRiskLevel = CRITICAL`

Production threat scoring remained unchanged.

### Route-level soft-cap diagnostic fields

All four expected diagnostic fields were present in the production response:

- `diagnosticRouteSoftCapUncappedThreatRiskScore`
- `diagnosticRouteSoftCapThreatRiskScore`
- `diagnosticRouteSoftCapReduction`
- `diagnosticRouteSoftCapExcess`

Returned production diagnostic values:

- `diagnosticRouteSoftCapUncappedThreatRiskScore = 94.83870967741936`
- `diagnosticRouteSoftCapThreatRiskScore = 94.83870967741936`
- `diagnosticRouteSoftCapReduction = 100.16129032258064`
- `diagnosticRouteSoftCapExcess = 115`

### Formula reconciliation

For the production raw score:

`uncappedThreatRiskScore = 195`

The expected excess is:

`195 - 80 = 115`

The route-level soft-cap diagnostic formula is:

`diagnostic = 80 + 20 * (excess / (excess + 40))`

Therefore:

`diagnostic = 80 + 20 * (115 / (115 + 40))`

The expected diagnostic value was:

`94.83870967741936`

The production response returned:

`94.83870967741936`

The expected reduction was:

`195 - 94.83870967741936 = 100.16129032258064`

The production response returned:

`diagnosticRouteSoftCapReduction = 100.16129032258064`

The production runtime therefore exactly matched the diagnostic formula.

### Existing marginal-decay diagnostics

The following pre-existing marginal-decay fields remained present:

- `diagnosticMarginalDecayFamilyBreakdown`
- `diagnosticMarginalDecayUncappedThreatRiskScore`
- `diagnosticMarginalDecayThreatRiskScore`
- `diagnosticMarginalDecayReduction`

The route-level soft-cap implementation did not remove or replace the marginal-decay diagnostics.

### Production safety

The production threat score remained:

`threatRiskScore = 100`

The production threat level remained:

`threatRiskLevel = CRITICAL`

The route-level soft-cap diagnostic did not replace the production score.

Because `vehicleId` was omitted, vehicle-specific automatic escalation and automatic rerouting were not eligible during this validation request.

Because `tripId` was omitted, the trip prediction snapshot path was not eligible during this validation request.

No production threat aggregation change was enabled.

Production congestion weighting remains disabled.

Marginal-decay weighting remains diagnostic only.

Route-level soft-cap weighting remains diagnostic only.

### Validation result

`PASS: PRODUCTION ROUTE SOFT-CAP DIAGNOSTICS VERIFIED.`

### Current conclusion

The route-level soft-cap diagnostic has now passed:

- static source verification
- TypeScript validation
- production build validation
- local runtime validation
- production runtime validation

For the validated production route:

- production raw score: `195`
- production capped score: `100`
- route-level soft-cap diagnostic: `94.83870967741936`
- diagnostic reduction: `100.16129032258064`

This confirms that the deployed diagnostic behaves exactly as designed while leaving the production threat score unchanged.

However, this remains diagnostic evidence only.

No route-level soft-cap production aggregation has been enabled.

### Next engineering step

Collect multi-route production evidence for the route-level soft-cap diagnostic before considering any production aggregation change.

Compare the route-level soft-cap candidate against:

- production uncapped scoring
- the existing marginal-decay candidate
- low-risk routes below the `80` threshold
- saturated routes above the `80` threshold
- forward and reverse route variants

Do not enable route-level soft-cap production aggregation yet.

---


## Corrected multi-route production soft-cap evidence

**Status:** Production evidence collection passed

**Baseline commit:** `6670058`

### Purpose

Collect apples-to-apples production evidence for the route-level soft-cap diagnostic using the same route geometries previously used for marginal-decay validation.

All five requests intentionally omitted `vehicleId` and `tripId`.

Production `threatRiskScore` was not changed.

Route soft-cap production aggregation remains disabled.

Marginal-decay production aggregation remains disabled.

Production congestion weighting remains disabled.

### Corrected route set

The corrected production route set was:

1. Validated Khayelitsha Route
2. Admin Test Route
3. Driver Existing Route
4. Admin Test Route Reverse
5. Driver Existing Route Reverse

The Admin and Driver routes used distinct route geometries, matching the earlier marginal-decay evidence set.

### Per-route results

| Route | Threats | Families | Production uncapped | Production capped | Marginal-decay uncapped | Route soft-cap uncapped | Soft-cap reduction | Reduction % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Validated Khayelitsha Route | 6 | 3 | 195 | 100 | 150.25 | 94.83870967741936 | 100.16129032258064 | 51.36% |
| Admin Test Route | 4 | 3 | 141 | 100 | 130 | 92.07920792079207 | 48.92079207920793 | 34.70% |
| Driver Existing Route | 1 | 1 | 27 | 27 | 27 | 27 | 0 | 0% |
| Admin Test Route Reverse | 4 | 3 | 141 | 100 | 130 | 92.07920792079207 | 48.92079207920793 | 34.70% |
| Driver Existing Route Reverse | 1 | 1 | 27 | 27 | 27 | 27 | 0 | 0% |

### Aggregate results

- Routes attempted: `5`
- HTTP 200 routes: `5`
- Formula PASS routes: `5`
- Production saturated routes: `3`
- Low-risk routes <=80: `2`
- Average production uncapped score: `106.20`
- Average marginal-decay uncapped score: `92.85`
- Average route soft-cap score: `66.60`

### Forward and reverse consistency

Admin Test Route:

- forward production uncapped: `141`
- reverse production uncapped: `141`
- forward marginal-decay uncapped: `130`
- reverse marginal-decay uncapped: `130`
- forward route soft-cap: `92.07920792079207`
- reverse route soft-cap: `92.07920792079207`

Driver Existing Route:

- forward production uncapped: `27`
- reverse production uncapped: `27`
- forward marginal-decay uncapped: `27`
- reverse marginal-decay uncapped: `27`
- forward route soft-cap: `27`
- reverse route soft-cap: `27`

The forward and reverse route pairs therefore produced matching aggregate evidence.

### Saturation comparison

The corrected route set reproduced the same historical production distribution used for the earlier marginal-decay evidence:

- `195`
- `141`
- `27`
- `141`
- `27`

The marginal-decay diagnostic reduced repeated-family contributions but remained above `100` on all three saturated routes:

- `195 -> 150.25`
- `141 -> 130`
- `141 -> 130`

The route-level soft-cap diagnostic instead mapped those saturated raw scores below `100`:

- `195 -> 94.83870967741936`
- `141 -> 92.07920792079207`
- `141 -> 92.07920792079207`

The two low-risk routes remained unchanged:

- `27 -> 27`
- `27 -> 27`

This demonstrates that the route-level soft-cap diagnostic preserves scores at or below the `80` threshold while compressing scores above the threshold into the diagnostic range below `100`.

### Validation result

`PASS: CORRECTED MULTI-ROUTE PRODUCTION SOFT-CAP DIAGNOSTICS VERIFIED.`

### Production safety

All five requests omitted `vehicleId`.

All five requests omitted `tripId`.

Production `threatRiskScore` was not changed.

Route soft-cap production aggregation remains disabled.

Marginal-decay production aggregation remains disabled.

Production congestion weighting remains disabled.

No production threat aggregation change was enabled by this evidence collection.

### Current conclusion

The route-level soft-cap diagnostic has now passed:

- static source verification
- TypeScript validation
- production build validation
- local runtime validation
- single-route production runtime validation
- corrected five-route production validation
- forward/reverse consistency checks
- low-risk preservation checks
- saturated-route formula reconciliation

The candidate provides materially stronger de-saturation than the marginal-decay diagnostic on the tested saturated routes while leaving the two `27` routes unchanged.

This remains diagnostic evidence only.

Do not enable route-level soft-cap production aggregation yet.

### Next engineering step

Perform a focused decision audit comparing the route-level soft-cap candidate against the current production aggregation contract and operational action thresholds.

The audit should determine whether any production rollout is justified, what safeguards would be required, and whether the `80` threshold and `40` soft-cap constant should remain unchanged.

No production aggregation change should be made until that decision audit is complete.

---

## Route soft-cap decision-readiness diagnostics implemented

**Status:** Implemented and source-verified

**Baseline commit:** `7c98b9b`

**Implementation commit:** `87b7a8d`

### Purpose

Add explicit diagnostic decision-readiness fields for the route-level
soft-cap candidate without enabling the candidate in production
aggregation.

The implementation converts the existing route soft-cap diagnostic score
into fields that make production decision impact directly observable.

### Implementation

Updated:

- `app/api/route-safety/predict/route.ts`

Added the following diagnostic response fields:

- `diagnosticRouteSoftCapRiskLevel`
- `diagnosticRouteSoftCapCriticalAgreement`
- `diagnosticRouteSoftCapThreatRiskScoreDelta`
- `diagnosticRouteSoftCapWouldChangeCriticalState`
- `diagnosticRouteSoftCapOperationallyEquivalent`

### Diagnostic risk level

`diagnosticRouteSoftCapRiskLevel` applies the existing threat-risk level
boundaries to the route soft-cap diagnostic score:

- score >= 80 -> `CRITICAL`
- score >= 60 -> `HIGH`
- score >= 35 -> `MEDIUM`
- otherwise -> `LOW`

This classification is diagnostic only.

Production `threatRiskLevel` remains unchanged.

### Critical-state agreement

`diagnosticRouteSoftCapCriticalAgreement` compares whether the diagnostic
route soft-cap score and the production threat score agree on the
production critical boundary:

`score >= 80`

The field exposes whether replacing the production score with the route
soft-cap candidate would preserve the current critical/non-critical state.

### Threat-score delta

`diagnosticRouteSoftCapThreatRiskScoreDelta` records:

`production threatRiskScore - diagnostic route soft-cap threatRiskScore`

This makes the magnitude of the candidate's score reduction directly
observable without changing the production score.

### Critical-state change indicator

`diagnosticRouteSoftCapWouldChangeCriticalState` is the inverse of
`diagnosticRouteSoftCapCriticalAgreement`.

It identifies cases where the diagnostic candidate would cross the
production critical-state boundary.

### Operational-equivalence indicator

`diagnosticRouteSoftCapOperationallyEquivalent` currently reflects
critical-state agreement.

This definition is intentionally narrow.

It records equivalence against the currently verified production critical
threshold used by the route-safety action gates and does not claim complete
equivalence across future operational decisions.

### Source verification

The implementation audit verified:

- exactly one source file was modified
- the implementation added `29` lines
- all five decision-readiness fields were added to the API response
- the production critical action-gate count remained unchanged
- production persistence fields remained unchanged
- `npx tsc --noEmit` passed

Implementation commit:

`87b7a8d`

### Production safety

This change does not enable route soft-cap production aggregation.

The following production behavior remains unchanged:

- production `threatRiskScore`
- production `threatRiskLevel`
- production action thresholds
- production persistence
- production congestion weighting

Marginal-decay remains diagnostic only.

Route-level soft-cap weighting remains diagnostic only.

Decision-readiness fields remain diagnostic only.

### Decision status

The corrected multi-route evidence demonstrated that the route soft-cap
formula behaves consistently across saturated and unsaturated routes.

The new decision-readiness diagnostics make the operational effect of that
candidate measurable against the production critical threshold.

This remains additional diagnostic evidence only.

Do not enable route soft-cap production aggregation yet.

### Next engineering step

Deploy implementation commit `87b7a8d` and perform production runtime
validation of the five new decision-readiness fields.

Use requests that omit both `vehicleId` and `tripId`.

Verify across the previously validated multi-route evidence set that:

- `diagnosticRouteSoftCapRiskLevel` matches the diagnostic score
- `diagnosticRouteSoftCapCriticalAgreement` reconciles against the
  production `80` threshold
- `diagnosticRouteSoftCapThreatRiskScoreDelta` reconciles numerically
- `diagnosticRouteSoftCapWouldChangeCriticalState` is the inverse of
  critical agreement
- `diagnosticRouteSoftCapOperationallyEquivalent` matches the current
  critical-state agreement definition
- production `threatRiskScore` remains unchanged
- production `threatRiskLevel` remains unchanged
- requests remain ineligible for vehicle escalation/rerouting and trip
  prediction side effects

Do not enable route soft-cap production aggregation until the runtime
decision-readiness evidence has been reviewed.

---

## Multi-route production decision-readiness diagnostics verified

**Status:** Production runtime validation passed

**Baseline commit:** `14b4487`

**Decision-readiness implementation commit:** `87b7a8d`

### Purpose

Validate the five route soft-cap decision-readiness diagnostic fields in
production across the same corrected five-route evidence set used for the
route-level soft-cap investigation.

All requests omitted both `vehicleId` and `tripId`.

No production aggregation behavior was changed.

### Routes validated

1. Validated Khayelitsha Route
2. Admin Test Route
3. Driver Existing Route
4. Admin Test Route Reverse
5. Driver Existing Route Reverse

### Production runtime results

| Route | Production score | Production level | Soft-cap score | Soft-cap level | Critical agreement | Score delta | Would change critical state | Operationally equivalent |
| --- | ---: | --- | ---: | --- | --- | ---: | --- | --- |
| Validated Khayelitsha Route | 100 | CRITICAL | 94.83870967741936 | CRITICAL | true | 5.161290322580641 | false | true |
| Admin Test Route | 100 | CRITICAL | 92.07920792079207 | CRITICAL | true | 7.920792079207928 | false | true |
| Driver Existing Route | 27 | LOW | 27 | LOW | true | 0 | false | true |
| Admin Test Route Reverse | 100 | CRITICAL | 92.07920792079207 | CRITICAL | true | 7.920792079207928 | false | true |
| Driver Existing Route Reverse | 27 | LOW | 27 | LOW | true | 0 | false | true |

### Aggregate results

- Routes attempted: `5`
- HTTP 200 routes: `5`
- Formula PASS routes: `5`
- Critical agreement routes: `5`
- Would-change-critical-state routes: `0`
- Operationally equivalent routes: `5`

### Runtime conclusion

The route-level soft-cap candidate preserved the current production
critical/non-critical classification across all five tested routes.

The three production CRITICAL routes remained CRITICAL under the
diagnostic score:

- `100 -> 94.83870967741936`
- `100 -> 92.07920792079207`
- `100 -> 92.07920792079207`

The two LOW routes remained unchanged:

- `27 -> 27`
- `27 -> 27`

No tested route crossed the production critical boundary.

`diagnosticRouteSoftCapCriticalAgreement` was `true` for all five routes.

`diagnosticRouteSoftCapWouldChangeCriticalState` was `false` for all five
routes.

`diagnosticRouteSoftCapOperationallyEquivalent` was `true` for all five
routes under the current critical-threshold definition.

### Validation result

`PASS: MULTI-ROUTE PRODUCTION DECISION-READINESS DIAGNOSTICS VERIFIED.`

### Production safety

Production `threatRiskScore` was not changed.

Production `threatRiskLevel` was not changed.

All requests omitted `vehicleId`.

All requests omitted `tripId`.

Route soft-cap production aggregation remains disabled.

Marginal-decay production aggregation remains disabled.

Production congestion weighting remains disabled.

No production threat aggregation change was enabled by this validation.

### Current decision status

The route-level soft-cap candidate has now demonstrated:

- deterministic formula reconciliation
- preservation of low-risk scores below the soft-cap threshold
- compression of saturated production scores
- forward/reverse consistency
- production runtime availability
- production critical-state agreement on all five tested routes
- zero observed critical-state changes in the tested route set
- operational equivalence under the current `>= 80` critical-action definition

This is strong evidence for continued evaluation.

It is not yet authorization to replace the production threat score.

### Next engineering step

Perform the final production-rollout decision audit.

That audit should determine:

- whether five-route evidence is sufficient for rollout consideration
- whether more route distributions are required
- whether the `80` threshold remains the correct operational boundary
- whether the soft-cap constant `40` has sufficient calibration evidence
- whether persisted `threat_risk_score` semantics would need versioning
- whether dashboards or downstream consumers assume the current capped
  production score semantics
- whether rollout should be full replacement, shadow-only, feature-flagged,
  or rejected

Do not enable route soft-cap production aggregation until that final
decision audit is complete and documented.

---

## Route soft-cap shadow persistence implemented

**Status:** Implemented and source-verified

**Baseline commit:** `cd3a652`

**Implementation commit:** `32ba4e8`

### Purpose

Continue route-level soft-cap evaluation in shadow-only mode by durably
persisting the existing diagnostic evidence alongside trip-linked route
prediction snapshots.

This change does not replace or modify production threat scoring.

### Implementation

Updated:

- `app/api/route-safety/predict/route.ts`

Added a versioned diagnostic object under:

`route_prediction_snapshots.metadata.routeSoftCapShadow`

Current metadata version:

`1`

The object persists:

- `diagnosticRouteSoftCapUncappedThreatRiskScore`
- `diagnosticRouteSoftCapThreatRiskScore`
- `diagnosticRouteSoftCapReduction`
- `diagnosticRouteSoftCapExcess`
- `diagnosticRouteSoftCapRiskLevel`
- `diagnosticRouteSoftCapCriticalAgreement`
- `diagnosticRouteSoftCapThreatRiskScoreDelta`
- `diagnosticRouteSoftCapWouldChangeCriticalState`
- `diagnosticRouteSoftCapOperationallyEquivalent`

### Persistence contract

The canonical production snapshot fields remain unchanged:

- `overall_risk_score`
- `overall_risk_level`
- `threat_risk_score`
- `threat_risk_level`
- `weather_risk_score`
- `traffic_risk_score`
- `traffic_risk_level`

The soft-cap candidate is persisted only inside additive diagnostic
`metadata`.

No database schema migration was required because
`route_prediction_snapshots.metadata` is already `jsonb`.

### Outcome Learning compatibility

The existing completed-trip v1 evaluation pipeline remains unchanged.

The evaluator continues to consume the existing production prediction
contract and does not use `routeSoftCapShadow` to determine its current
classification.

This preserves historical and production evaluation semantics while
allowing future analysis to compare the diagnostic soft-cap candidate with
observed completed-trip outcomes.

### Validation

Implementation verification completed successfully:

- exactly one source file changed
- `12` lines were added
- `git diff --check` passed
- `npx tsc --noEmit` passed
- `npm run build` passed
- Next.js production build generated all `123/123` static pages
- exactly one `routeSoftCapShadow` object exists
- production snapshot score fields remain unchanged
- production critical action gates remain unchanged

Implementation commit:

`32ba4e8`

### Production safety

Production `threatRiskScore` remains unchanged.

Production `threatRiskLevel` remains unchanged.

Persisted `threat_risk_score` semantics remain unchanged.

Persisted `threat_risk_level` semantics remain unchanged.

Completed-trip v1 evaluation remains unchanged.

Automatic escalation and rerouting remain unchanged.

Marginal-decay production aggregation remains disabled.

Route soft-cap production aggregation remains disabled.

Production congestion weighting remains disabled.

### Current rollout status

The route-level soft-cap remains a shadow-only diagnostic candidate.

The new persistence provides durable evidence collection for trip-linked
predictions without redefining production score semantics.

This enables future calibration analysis against completed-trip outcomes,
including evaluation of:

- the soft-cap constant `40`
- the production boundary at `80`
- exact score deltas
- critical-state agreement
- operational equivalence
- observed trip outcomes across a larger real-world distribution

### Next engineering step

Deploy implementation commit `32ba4e8` and validate shadow persistence
using a legitimate trip-linked Route Safety prediction.

Verify that:

- the snapshot is created successfully
- production `threat_risk_score` remains the existing production score
- production `threat_risk_level` remains unchanged
- `metadata.routeSoftCapShadow.version` equals `1`
- all nine route soft-cap shadow fields are persisted
- no production aggregation behavior changes
- completed-trip v1 evaluation behavior remains unchanged

After production shadow persistence is verified, continue collecting
trip-linked evidence before reconsidering production rollout.

Do not enable route soft-cap production aggregation.

---

## Production trip-linked route soft-cap shadow persistence verified

**Status:** Production persistence validation passed

**Baseline commit:** `5daebda`

**Shadow persistence implementation commit:** `32ba4e8`

### Purpose

Verify that the route-level soft-cap diagnostic shadow payload is persisted
durably in production for a legitimate trip-linked route prediction without
changing production threat scoring or activating automatic vehicle side
effects.

### Controlled production validation

A legitimate active production trip was selected:

`41d58a40-90c9-46d1-a45b-85a5a4832a66`

The Route Safety prediction request supplied:

- a valid `tripId`
- no `vehicleId`
- the previously validated Khayelitsha route coordinates

The production request started at:

`2026-08-11T17:45:42.321Z`

`vehicleId` was deliberately omitted so that automatic vehicle escalation
and automatic rerouting remained ineligible.

### Production response validation

The Route Safety response returned successfully.

Production scoring remained:

- `threatRiskScore = 100`
- `threatRiskLevel = CRITICAL`
- `uncappedThreatRiskScore = 195`

All nine route soft-cap diagnostic response fields were present.

Observed values:

- `diagnosticRouteSoftCapUncappedThreatRiskScore = 94.83870967741936`
- `diagnosticRouteSoftCapThreatRiskScore = 94.83870967741936`
- `diagnosticRouteSoftCapReduction = 100.16129032258064`
- `diagnosticRouteSoftCapExcess = 115`
- `diagnosticRouteSoftCapRiskLevel = CRITICAL`
- `diagnosticRouteSoftCapCriticalAgreement = true`
- `diagnosticRouteSoftCapThreatRiskScoreDelta = 5.161290322580641`
- `diagnosticRouteSoftCapWouldChangeCriticalState = false`
- `diagnosticRouteSoftCapOperationallyEquivalent = true`

Validation result:

`PASS: TRIP-LINKED ROUTE SOFT-CAP RESPONSE VERIFIED.`

### Production snapshot persistence verification

A read-only Supabase query was then used to inspect
`route_prediction_snapshots`.

Exactly one matching snapshot was identified after the controlled request.

Observed snapshot:

- `created_at = 2026-08-11 17:45:43.952474+00`
- `trip_id = 41d58a40-90c9-46d1-a45b-85a5a4832a66`
- `vehicle_id = null`
- `threat_risk_score = 100`
- `threat_risk_level = CRITICAL`

The persisted metadata contained:

`metadata.routeSoftCapShadow.version = 1`

Persisted route-soft-cap shadow values matched the production response:

- `diagnosticRouteSoftCapUncappedThreatRiskScore = 94.83870967741936`
- `diagnosticRouteSoftCapThreatRiskScore = 94.83870967741936`
- `diagnosticRouteSoftCapReduction = 100.16129032258064`
- `diagnosticRouteSoftCapExcess = 115`
- `diagnosticRouteSoftCapRiskLevel = CRITICAL`
- `diagnosticRouteSoftCapCriticalAgreement = true`
- `diagnosticRouteSoftCapThreatRiskScoreDelta = 5.161290322580641`
- `diagnosticRouteSoftCapWouldChangeCriticalState = false`
- `diagnosticRouteSoftCapOperationallyEquivalent = true`

### Persistence conclusion

The complete production shadow path is now verified:

1. a legitimate production `tripId` was supplied
2. the Route Safety prediction completed successfully
3. production threat scoring remained unchanged
4. all route soft-cap diagnostic values were returned
5. a real `route_prediction_snapshots` row was created
6. canonical production `threat_risk_score` remained `100`
7. canonical production `threat_risk_level` remained `CRITICAL`
8. `vehicle_id` remained `null`
9. `metadata.routeSoftCapShadow.version` persisted as `1`
10. all nine route soft-cap shadow fields persisted correctly

The production HTTP values and persisted database values reconciled exactly.

### Production safety

Production `threatRiskScore` remains unchanged.

Production `threatRiskLevel` remains unchanged.

Persisted `threat_risk_score` semantics remain unchanged.

Persisted `threat_risk_level` semantics remain unchanged.

No `vehicleId` was supplied during the controlled validation.

Automatic vehicle escalation remained ineligible.

Automatic rerouting remained ineligible.

Completed-trip v1 evaluation remains unchanged.

Marginal-decay production aggregation remains disabled.

Route soft-cap production aggregation remains disabled.

Production congestion weighting remains disabled.

No production scoring replacement was enabled.

### Current engineering status

Route-level soft-cap shadow persistence is now verified end-to-end in
production for a legitimate trip-linked prediction.

The candidate remains shadow-only.

The next engineering objective is to accumulate a larger distribution of
real trip-linked shadow evidence and define the evaluation method for
comparing shadow scores against completed-trip outcomes.

Do not enable route soft-cap production aggregation yet.

---

## Completed-trip route soft-cap shadow evaluation implemented

**Status:** Implemented, verified, committed, and pushed

**Implementation commit:** `89c4960`

### Purpose

Extend completed-trip prediction evaluation so persisted route soft-cap
shadow diagnostics can be evaluated against actual trip outcomes without
changing canonical production prediction semantics.

### Implementation

`lib/fleet/evaluateCompletedTripPrediction.ts` now reads snapshot metadata
alongside the existing canonical prediction fields.

When valid version-1 `routeSoftCapShadow` metadata is available, the
completed-trip evaluator reads:

- `diagnosticRouteSoftCapThreatRiskScore`
- persisted weather contribution
- persisted traffic contribution

It then recomposes a shadow overall risk score using the diagnostic
route soft-cap threat score plus the same persisted weather and traffic
contributions.

The shadow score is capped at `100`.

The evaluator derives:

- shadow overall risk score
- shadow overall risk level
- shadow predicted adverse-event state
- shadow evaluation classification
- production/shadow classification agreement
- production-versus-shadow overall-risk-score delta

These values are persisted inside evaluation metadata under:

`routeSoftCapShadowEvaluation`

The shadow evaluation metadata is versioned as `version: 1`.

### Canonical production semantics preserved

The canonical completed-trip evaluation remains unchanged.

Specifically:

- canonical `predicted_risk_score` remains the persisted production score
- canonical `predicted_risk_level` remains unchanged
- prediction-positive threshold remains `35`
- canonical predicted adverse-event semantics remain unchanged
- canonical observed adverse-event semantics remain unchanged
- canonical evaluation classification remains unchanged
- one evaluation row per trip semantics remain unchanged

No database migration was required.

Production Route Safety scoring was not changed.

Route soft-cap production aggregation remains disabled.

Marginal-decay production aggregation remains disabled.

Production congestion weighting remains disabled.

### Verification

Implementation verification passed:

- existing v1 evaluation contract verified before modification
- snapshot metadata select insertion verified at exactly one anchor
- shadow recomposition insertion verified at exactly one anchor
- optional evaluation metadata insertion verified at exactly one anchor
- exactly one tracked source file modified
- shadow evaluation contract verified
- canonical v1 evaluation contract verified unchanged
- no database migration changed
- production Route Safety scoring source unchanged
- `git diff --check` passed
- TypeScript validation passed
- production build passed

### Source change

Implementation commit:

`89c4960 feat: evaluate route soft-cap shadow outcomes`

The implementation changed only:

`lib/fleet/evaluateCompletedTripPrediction.ts`

The source commit changed `99` lines by insertion and `1` line by
replacement.

Local `main` and `origin/main` were both verified at `89c4960` after push.

### Safety status

This implementation is shadow-only.

It does not replace the production threat score.

It does not replace the canonical completed-trip prediction score.

It does not alter the production prediction-positive threshold.

It does not alter production action thresholds.

It does not enable route soft-cap production aggregation.

### Next engineering step

Perform focused end-to-end runtime validation of completed-trip
`routeSoftCapShadowEvaluation` persistence.

The validation should prove that a real trip-linked prediction snapshot
containing valid route soft-cap shadow metadata can progress through trip
completion and create a prediction evaluation whose metadata contains the
expected shadow recomposition and production/shadow classification
comparison.

Do not enable route soft-cap production aggregation during this
validation.

---

## Trip-linked null-vehicle prediction snapshots made evaluation-eligible

**Status:** Implemented, verified, committed, and pushed

**Implementation commit:** `9237994`

**Parent documentation baseline:** `98cb936`

### Purpose

Allow legitimate trip-linked prediction snapshots whose `vehicle_id` is
`NULL` to participate in completed-trip prediction evaluation.

This closes the eligibility gap discovered during production
`routeSoftCapShadowEvaluation` runtime validation.

### Audit finding

The controlled production shadow snapshot:

`4499c4f0-a66b-4159-8262-375d8b37b155`

belongs to trip:

`41d58a40-90c9-46d1-a45b-85a5a4832a66`

and contains valid persisted `routeSoftCapShadow` metadata.

The snapshot intentionally has:

`vehicle_id = NULL`

because the original controlled prediction omitted `vehicleId` to keep
automatic vehicle escalation and rerouting ineligible.

The completed-trip evaluator previously required all of:

- matching `organization_id`
- matching `vehicle_id`
- matching `trip_id`

That meant the legitimate trip-linked shadow snapshot could not be selected
for completed-trip evaluation even though it was correctly linked by
organization and trip.

### Focused implementation

`lib/fleet/evaluateCompletedTripPrediction.ts` now requires:

- matching `organization_id`
- matching `trip_id`
- `vehicle_id` matching the trip vehicle OR `vehicle_id IS NULL`

The snapshot eligibility filter is now:

`.or(`vehicle_id.eq.${vehicleId},vehicle_id.is.null`)`

The evaluator still selects only snapshots created at or before the completed
outcome timestamp and still chooses the most recent eligible snapshot.

### Vehicle safety preserved

Outcome lookup continues to require the real trip vehicle ID.

The existing outcome query still requires:

`.eq("vehicle_id", vehicleId)`

Therefore this change does not weaken completed-trip outcome ownership or
vehicle association.

Only prediction snapshot eligibility was broadened.

### Canonical v1 semantics preserved

The canonical completed-trip evaluation remains unchanged.

Specifically:

- canonical `predicted_risk_score` remains unchanged
- canonical `predicted_risk_level` remains unchanged
- prediction-positive threshold remains `35`
- canonical predicted adverse-event semantics remain unchanged
- canonical observed adverse-event semantics remain unchanged
- canonical classification remains unchanged
- `routeSoftCapShadowEvaluation` remains diagnostic metadata only
- one evaluation row per trip semantics remain unchanged

No database migration was introduced.

Production Route Safety scoring was not changed.

Route soft-cap production aggregation remains disabled.

Marginal-decay production aggregation remains disabled.

Production congestion weighting remains disabled.

### Verification

The focused implementation passed:

- clean baseline verification at `98cb936`
- exactly one source-file modification
- exactly one snapshot-filter anchor replacement
- organization filter retained
- trip filter retained
- outcome vehicle filter retained
- snapshot vehicle eligibility expanded only to matching vehicle or `NULL`
- canonical v1 evaluation contract verified unchanged
- `git diff --check`
- TypeScript validation
- production build

The source diff was:

`1 insertion, 1 deletion`

The implementation was committed as:

`9237994 Allow trip-linked null-vehicle prediction snapshots`

Local and remote `main` were verified at `9237994` after push.

### Production validation status

No production trip was completed during this implementation.

No new vehicle-linked prediction was created.

No database row was manually modified.

The existing controlled shadow snapshot remains available for end-to-end
runtime validation.

Target trip:

`41d58a40-90c9-46d1-a45b-85a5a4832a66`

Target snapshot:

`4499c4f0-a66b-4159-8262-375d8b37b155`

### Next engineering step

After this documentation update is committed and pushed, perform the
controlled end-to-end completed-trip runtime validation using the normal
HarborGuard trip-completion lifecycle.

Verify that:

- the trip completes through the normal application path
- `route_prediction_outcomes` is created normally
- `route_prediction_evaluations` is created normally
- the existing `NULL`-vehicle shadow snapshot is selected
- canonical v1 evaluation fields remain unchanged
- evaluation metadata contains `routeSoftCapShadowEvaluation`
- the persisted shadow recomposition reconciles with the expected formula
- no route soft-cap production aggregation is enabled

Do not complete the production trip until this documentation work item is
committed and pushed.

---

## Driver active-trip restoration implemented

**Status:** Implemented, verified, committed, and pushed

**Implementation commit:** `08d74c8`

**Parent baseline:** `f3a8e6e`

### Purpose

Restore an already-active backend trip into the Driver page after a refresh,
new browser session, or vehicle selection.

This closes the UI state-restoration gap discovered during the controlled
completed-trip shadow-evaluation validation.

### Audit finding

`/api/fleet/live` correctly returned the controlled trip as the selected
vehicle's `activeTrip`.

The Driver page did not previously restore that backend `activeTrip` into its
local `tripId` state.

As a result:

- the backend trip remained active
- the Driver page still displayed `Start Trip`
- `stopTrip()` could not complete the existing trip because local `tripId`
  remained `null`
- the Driver page could present controls inconsistent with backend lifecycle
  state

### Focused implementation

`app/driver/page.tsx` now defines a typed `ActiveTrip` contract containing:

- `id`
- `status`
- `expectedRoute`
- `originPort`
- `destinationFishery`

`VehicleOption` now includes:

`activeTrip: ActiveTrip | null`

The selected vehicle now restores active-trip state with:

`setTripId(activeTrip?.id || null)`

It also restores:

- `originPort`
- `destinationFishery`

When the selected vehicle has no active trip, those restored trip fields are
cleared.

### Driver controls corrected

`Start Trip` is now disabled whenever `tripId` already exists.

This prevents the Driver page from offering a new trip start while an active
backend trip is already associated with the selected vehicle.

The former `Stop Trip` control is now labeled:

`Complete Trip`

It is disabled when there is no `tripId`.

### Completion lifecycle preserved

The existing `stopTrip()` implementation was not changed.

It still requires:

- a valid `tripId`
- current latitude
- current longitude

It still completes the trip through the existing `sendLocation(...)` path
using:

`"delivered"`

No API route was changed.

The existing production completion lifecycle therefore remains responsible
for:

- location update
- delivered transition
- actual-arrival persistence
- completed-trip outcome creation
- completed-trip prediction evaluation
- downstream post-location lifecycle processing

### Validation

The implementation passed:

- clean baseline verification at `f3a8e6e`
- exactly one source-file modification
- UTF-8 BOM preservation
- no first-line encoding churn
- `git diff --check`
- TypeScript validation
- production build
- implementation contract verification
- existing completion lifecycle verification

Final source diff:

`1 file changed, 24 insertions(+), 3 deletions(-)`

Implementation commit:

`08d74c8 Restore active trip state in driver console`

The commit contained exactly:

`app/driver/page.tsx`

Local and remote `main` were verified at `08d74c8` after push.

### Production validation status

The controlled production trip has not yet been completed.

Target trip:

`41d58a40-90c9-46d1-a45b-85a5a4832a66`

Target vehicle:

`c4bf3073-839c-4dab-ab0c-3def20dac26f`

Target shadow snapshot:

`4499c4f0-a66b-4159-8262-375d8b37b155`

No new prediction was created during this UI fix.

No database row was manually modified.

Route soft-cap production aggregation remains disabled.

### Next engineering step

After this documentation work item is committed and pushed:

1. wait for production deployment of `08d74c8`
2. reload the Driver page
3. confirm the existing backend trip restores into the UI
4. confirm `Start Trip` is disabled
5. confirm `Complete Trip` is enabled once current location is available
6. complete the controlled trip through the normal Driver lifecycle
7. verify the completed-trip outcome
8. verify the completed-trip evaluation
9. verify the selected prediction snapshot is
   `4499c4f0-a66b-4159-8262-375d8b37b155`
10. verify `metadata.routeSoftCapShadowEvaluation` is persisted
11. confirm canonical v1 evaluation semantics remain unchanged

Do not complete the production trip until this documentation work item is
committed and pushed.


## Delivered-trip actual-departure integrity guard implemented

**Implementation commit:** `5e847bd`

**Parent baseline:** `c41e92f`

### Production failure that triggered this work

Controlled completed-trip validation exposed a lifecycle-integrity gap.

Trip `41d58a40-90c9-46d1-a45b-85a5a4832a66` transitioned to `delivered` and received `actual_arrival`, but its existing `actual_departure` was null.

Because completed-trip outcome generation requires both `actual_departure` and `actual_arrival`, `createCompletedTripOutcome` correctly skipped outcome creation. The completed-trip prediction evaluator consequently had no outcome to evaluate.

No manual production database repair was performed.

### Implemented guard

`lib/fleet/updateActiveTripFromLocation.ts` now validates the persisted trip before allowing a requested `delivered` transition.

For `requestedStatus === "delivered"`, HarborGuard reads the trip's persisted `actual_departure` using both:

- `activeTrip.id`
- `organizationId`

If `actual_departure` is absent, the lifecycle throws:

`Trip cannot be completed before actual departure is recorded.`

The failure occurs before `updates.actual_arrival = occurredAt` and before the trip update is persisted.

Therefore an incomplete trip can no longer be converted to `delivered` while simultaneously creating an invalid completed-trip observation window.

### Preserved semantics

- Normal scheduled-trip activation remains unchanged.
- A trip beginning from `scheduled` still records `actual_departure: occurredAt`.
- Completed-trip outcome semantics were not changed.
- Completed-trip prediction evaluator semantics were not changed.
- Route soft-cap production aggregation remains disabled.
- No database migration was introduced.
- No synthetic or inferred departure timestamp is created.

### Verification

- Exact implementation contract verification passed.
- Existing scheduled-trip departure lifecycle verification passed.
- `git diff --check` passed.
- TypeScript validation passed with `npx tsc --noEmit`.
- Production build passed with `npm run build`.
- Implementation commit contains only `lib/fleet/updateActiveTripFromLocation.ts`.
- Local and remote `main` both resolved to implementation commit `5e847bd` after push.

### Remaining lifecycle work

The production failure audit also established a separate observability/integrity gap in the post-location lifecycle: a newly delivered trip can currently receive a skipped completed-trip outcome result without that skipped result being explicitly surfaced by `runPostLocationUpdateLifecycle`.

That behavior is intentionally not changed by implementation commit `5e847bd` and remains a separate focused work item.

The already delivered controlled production trip must not be manually repaired until its recovery/replay semantics are separately audited.

**Next:** document and close this implementation work item, then audit the post-location lifecycle's handling of skipped completed-trip outcome creation before performing another controlled production completion.

## Skipped completed-trip outcome handling implemented

**Implementation commit:** `3f6fc6d`

**Parent baseline:** `f142a29`

### Purpose

Improve completed-trip lifecycle observability and control flow when `createCompletedTripOutcome` returns a skipped result.

This work follows the production failure investigation where a delivered trip had no valid completed-trip outcome and the prediction evaluator subsequently had no outcome to evaluate.

### Audit finding

`runPostLocationUpdateLifecycle` previously awaited `createCompletedTripOutcome(...)` but discarded its returned result.

The prediction evaluator then ran whenever a trip had transitioned to `delivered`, even if completed-trip outcome creation had explicitly returned `skipped: true`.

A skipped completed-trip outcome means there is no valid outcome row available for evaluation.

An existing outcome is different from a skipped outcome and remains evaluator-eligible.

### Focused implementation

`lib/fleet/runPostLocationUpdateLifecycle.ts` now captures:

`const outcomeResult = await createCompletedTripOutcome(...)`

When:

`outcomeResult.skipped === true`

HarborGuard now logs:

`Completed-trip outcome creation was skipped:`

together with:

- `organizationId`
- `vehicleId`
- `tripId`

The completed-trip prediction evaluator is not invoked for that skipped-outcome path.

### Preserved evaluator paths

If outcome creation was not skipped, evaluation continues normally.

This preserves both:

- newly created outcome evaluation
- existing outcome evaluation

Existing outcomes remain evaluator-eligible because an outcome row already exists and an evaluation may still need to be created.

### Preserved contracts

- `runPostLocationUpdateLifecycle` remains `Promise<void>`.
- The HTTP response contract was not changed.
- The location processing result contract was not changed.
- Database persistence semantics were not changed.
- Completed-trip outcome semantics were not changed.
- Completed-trip prediction evaluator semantics were not changed.
- Vehicle-stop lifecycle processing remains enabled.
- Automatic fleet risk detection remains enabled.
- Route soft-cap production aggregation remains disabled.
- No database migration was introduced.

### Error behavior

A skipped completed-trip outcome is treated as a non-fatal post-transition lifecycle condition.

The implementation intentionally does not throw after the trip transition has already persisted because that could return an HTTP failure even though the trip status change had already succeeded.

The skipped state is instead made explicit through structured server logging and the guaranteed-useless evaluator invocation is suppressed.

### Verification

- Exactly one source file changed.
- Exact implementation contract verification passed.
- Exactly one `createCompletedTripOutcome` call remains.
- Exactly one `evaluateCompletedTripPrediction` call remains.
- Exactly one skipped-outcome log exists.
- `git diff --check` passed.
- TypeScript validation passed with `npx tsc --noEmit`.
- Production build passed with `npm run build`.
- `Promise<void>` lifecycle contract remained unchanged.
- Implementation commit contains exactly `lib/fleet/runPostLocationUpdateLifecycle.ts`.
- Local and remote `main` both resolved to `3f6fc6d` after push.

### Current lifecycle status

The completed-trip lifecycle now has two complementary protections:

1. A trip cannot transition to `delivered` without an existing `actual_departure`.
2. If completed-trip outcome generation is nevertheless skipped, that condition is explicitly logged and the prediction evaluator is not called without a valid outcome.

No production recovery or database repair has been performed for the previously completed controlled trip.

### Next engineering step

After this documentation work item is committed and pushed, perform a fresh controlled production validation using a normally started trip with a real `actual_departure`.

That validation should verify:

- normal trip start records `actual_departure`
- completion records `actual_arrival`
- completed-trip outcome creation succeeds
- prediction evaluation succeeds
- the intended route prediction snapshot is selected
- `metadata.routeSoftCapShadowEvaluation` persists
- canonical completed-trip v1 semantics remain unchanged

Do not run another production completion until this documentation work item is committed and pushed.

## Delivered completion through filtered GPS implemented

**Implementation commit:** `afabc29`

**Parent baseline:** `9c140a8`

### Problem identified during controlled production validation

- Controlled production validation exposed a completion-specific interaction between trip lifecycle handling and location telemetry filtering.
- The controlled test trip had a valid persisted `actual_departure` and remained `en_route_to_port` before completion.
- The Driver completion action sent the final known position with requested lifecycle status `delivered`.
- When that position was sufficiently close to the most recent persisted vehicle location, telemetry analysis could classify the point as `jitter`.
- The same structural risk also existed for a point classified as `gps_spike`.
- `processVehicleLocationUpdate` previously returned immediately for either filtered telemetry result.
- That early return occurred before `runPostLocationUpdateLifecycle` and therefore before the requested `delivered` transition.
- `/api/fleet/update-location` still returned an HTTP-success response for the filtered point.
- The Driver UI interpreted that HTTP success as successful completion and cleared its local trip state even though the persisted `vehicle_trips` row remained active.

### Focused implementation

- Extracted the existing trip-status transition, completed-trip outcome creation, and completed-trip prediction evaluation path into reusable `runTripStatusLifecycle` logic.
- The normal accepted-location path continues to invoke the same trip lifecycle before stop lifecycle processing and automatic fleet-risk detection.
- Updated `processVehicleLocationUpdate` so a telemetry sample filtered as `jitter` or `gps_spike` may still execute the trip-status lifecycle only when the explicit requested status is `delivered`.
- The rejected location point itself remains filtered and is not persisted as a vehicle location.
- Filtered completion does not manufacture behavior alerts, stop-detection evidence, or other telemetry-derived evidence from the rejected point.
- Other requested trip statuses were not given this filtered-location exception.
- Ordinary telemetry jitter and GPS-spike filtering behavior remains unchanged.

### Completed-trip learning semantics preserved

- `updateActiveTripFromLocation` remains the canonical persisted trip-status transition path.
- Existing delivered-transition validation requiring a real `actual_departure` remains intact.
- A legitimate delivered transition continues to persist `actual_arrival`.
- `createCompletedTripOutcome` remains the canonical completed-trip outcome path.
- Skipped completed-trip outcomes remain logged and continue to suppress prediction evaluation.
- Existing or newly created completed-trip outcomes remain evaluator-eligible.
- `evaluateCompletedTripPrediction` remains the canonical completed-trip prediction evaluation path.
- The previously implemented `routeSoftCapShadowEvaluation` persistence path was not changed.
- Canonical completed-trip v1 semantics were not changed.
- Prediction-positive threshold semantics were not changed.
- Production Route Safety scoring was not changed.
- Route soft-cap production aggregation remains disabled.

### Data and schema impact

- No database migration was introduced.
- No production database row was manually repaired as part of this implementation.
- No synthetic departure or arrival timestamp behavior was introduced.
- Rejected jitter/GPS-spike location samples remain unpersisted.

### Validation completed

- `git diff --check` passed for the focused two-file implementation.
- TypeScript validation passed with `npx tsc --noEmit`.
- Production build passed with `npm run build`.
- Next.js production build generated all `123/123` static pages successfully.
- Implementation commit `afabc29` contains exactly:
  - `lib/fleet/processVehicleLocationUpdate.ts`
  - `lib/fleet/runPostLocationUpdateLifecycle.ts`
- Implementation commit parent is `9c140a8`.
- Implementation was pushed successfully to `origin/main`.
- Local and remote `main` matched at `afabc29` after push.
- Tracked working tree was clean and nothing remained staged.

### Production validation passed

- Controlled production validation of implementation `afabc29` completed successfully.
- Production validation used dedicated test vehicle `TRACCAR-16839`.
- Vehicle ID: `152119a0-6497-4692-a40f-4ced454d722e`.
- Controlled trip ID: `f18e9e30-129c-4ec2-8200-bd2bcc9ac3db`.
- Route: Cape Town Harbour to Saldanha Fishery Depot.
- The controlled trip had a genuine persisted `actual_departure` before completion.
- A trip-linked route prediction snapshot existed before completion.
- The completion retry was performed through the normal Driver completion flow after production deployment of `afabc29`.

#### Completion lifecycle result

- The Driver completion request completed successfully.
- Read-only `/api/fleet/live` verification showed the controlled vehicle no longer exposed an active trip after the retry.
- The persisted trip transitioned from `en_route_to_port` to `delivered`.
- Persisted `actual_departure` remained `2026-08-12 07:39:07.607+00`.
- Persisted `actual_arrival` was created as `2026-08-12 08:46:38.919+00`.
- The completion therefore preserved the real-departure integrity guard and produced a real persisted arrival timestamp.

#### Completed-trip outcome

- Completed-trip outcome ID: `34c8b77e-4750-483f-ad19-6a7af6662821`.
- The outcome is linked to controlled trip `f18e9e30-129c-4ec2-8200-bd2bcc9ac3db`.
- The outcome observation window begins at the persisted departure and ends at the persisted completion timestamp.
- `adverse_event_occurred` was `false`.
- No adverse-event evidence was observed for the controlled validation trip.

#### Prediction snapshot

- Prediction snapshot ID: `d0e4c076-86d5-4bf5-83bc-9eaae843afca`.
- The snapshot is linked to the controlled trip.
- Snapshot `vehicle_id` is `NULL`, exercising the implemented trip-linked null-vehicle eligibility path.
- Canonical `overall_risk_score` was `100`.
- Canonical `overall_risk_level` was `CRITICAL`.
- The intended pre-completion snapshot was selected by the completed-trip evaluator.

#### Completed-trip prediction evaluation

- Evaluation ID: `53d4eec2-dd8e-4c58-a8bd-9a413057772a`.
- Evaluation snapshot ID: `d0e4c076-86d5-4bf5-83bc-9eaae843afca`.
- Evaluation outcome ID: `34c8b77e-4750-483f-ad19-6a7af6662821`.
- Persisted `predicted_risk_score` was `100`.
- Persisted `predicted_risk_level` was `CRITICAL`.
- Prediction-positive threshold remained `35`.
- `predicted_adverse_event` was `true`.
- `observed_adverse_event` was `false`.
- Canonical evaluation classification was `false_positive`.

#### Route soft-cap shadow evaluation

- `routeSoftCapShadowEvaluation` persisted on the completed-trip prediction evaluation.
- Shadow overall risk score remained `100`.
- Shadow overall risk level remained `CRITICAL`.
- Shadow classification was `false_positive`.
- `classificationAgreement` was `true`.
- `overallRiskScoreDelta` was `0`.
- Canonical and shadow completed-trip classifications therefore agreed for this controlled production case.
- The previously persisted route soft-cap diagnostic threat score remained approximately `99.38223938223938`.
- Route soft-cap diagnostics remained operationally equivalent for the tested route.
- The shadow model did not change the critical-state decision.

#### Filtered-location completion validation

- The controlled production retry validates the `afabc29` filtered-location completion fix.
- A final completion location may be rejected by telemetry filtering without preventing the explicit `delivered` trip lifecycle transition.
- Rejected jitter/GPS-spike location samples remain unpersisted.
- The delivered lifecycle still persists `actual_arrival`.
- Completed-trip outcome creation remains intact.
- Completed-trip prediction evaluation remains intact.
- Route soft-cap shadow evaluation persistence remains intact.
- Ordinary telemetry filtering remains unchanged.
- Other requested trip statuses remain unchanged.

#### Production invariants confirmed

- Canonical completed-trip v1 semantics remain unchanged.
- Canonical `predicted_risk_score` remains the persisted production score.
- Prediction-positive threshold remains `35`.
- Production Route Safety scoring was not changed.
- Route soft-cap production aggregation remains disabled.
- No database migration was introduced.
- No manual production database repair was required for the successful retry.
- No synthetic departure timestamp was introduced.
- No synthetic arrival timestamp was introduced.

#### Validation conclusion

- Controlled production validation PASSED.
- The controlled trip reached `delivered`.
- `actual_arrival` persisted.
- The completed-trip outcome persisted.
- The intended route prediction snapshot was selected.
- The completed-trip prediction evaluation persisted.
- `routeSoftCapShadowEvaluation` persisted.
- Canonical and shadow classifications agreed.
- The filtered-location completion regression is runtime-validated for this controlled production case.
## Route soft-cap shadow evidence reader implemented

**Implementation commit:** `5787684`

**Parent baseline:** `b388306`

A focused read-only evidence reader was added for the already-persisted completed-trip route soft-cap shadow evaluations.

### Implementation

Two files were introduced:

- `lib/fleet/analyzeRouteSoftCapShadowEvidence.ts`
- `app/api/fleet/route-soft-cap-shadow-evidence/route.ts`

The helper reads persisted `metadata.routeSoftCapShadowEvaluation` values and accepts only the existing version-1 shadow-evaluation contract.

The evidence summary reports:

- total evaluations examined;
- valid route soft-cap shadow evaluations;
- classification agreement and disagreement counts;
- classification agreement rate;
- positive-state agreement and change counts;
- route soft-cap score-delta positive, zero, and negative counts;
- mean score delta;
- minimum score delta;
- maximum score delta.

The API route is authenticated through `requireOrganization()` and remains organization-scoped through `organization_id`.

It mirrors the existing route-prediction analytical reader filtering contract with optional:

- `vehicleId`;
- `start`;
- `end`.

Date filtering continues to use `outcome_completed_at`.

### Validation

- TypeScript validation passed with `npx tsc --noEmit`.
- Production build passed with `npm run build`.
- The production build generated 124/124 static pages.
- `/api/fleet/route-soft-cap-shadow-evidence` was present in the production build.
- The implementation commit contains exactly the two intended implementation files.
- Local and remote `main` matched at implementation commit `5787684` after push.
- The tracked working tree was clean.
- Nothing remained staged.

### Safety and semantic boundaries

This work item is observational only.

- No database migration was introduced.
- No route-prediction evaluation schema was changed.
- No completed-trip evaluator semantics were changed.
- No prediction-positive threshold was changed.
- No production route-risk scoring was changed.
- No production route-soft-cap aggregation was enabled.
- No automatic vehicle-action eligibility semantics were changed.
- Existing persisted evidence remains the source of truth.
- Invalid or unsupported shadow metadata is excluded rather than reinterpreted.
- Route soft-cap production aggregation remains disabled.

### Purpose

The reader provides an organization-scoped way to accumulate and inspect a larger distribution of real completed-trip route soft-cap shadow evidence without changing production scoring behavior.

The evidence endpoint is not a rollout decision engine and does not recommend enabling the soft cap.

Future route soft-cap rollout consideration remains a separate focused work item and must be based on accumulated production shadow evidence rather than this reader's existence alone.

## Route Soft-Cap Shadow Evidence Analytics

Status: **Implemented and pushed**

Implementation commit: `85d6635` — `Add route soft cap shadow evidence analytics`

### Completed

- Added the Analytics-page consumer for the read-only route soft-cap shadow evidence endpoint.
- Reused the existing Analytics reporting-period selection.
- Reused the existing vehicle filter when requesting shadow evidence.
- Added loading, error, empty-evidence, and populated-evidence presentation states.
- Added descriptive evidence metrics including classification agreement, positive-state changes, and score-delta reporting.
- Corrected the JSX insertion boundary so the Route Soft-Cap Shadow Evidence panel and Trend Over Time panel remain independent sibling cards.
- Verified the implementation with `git diff --check`, `npx tsc --noEmit`, and a successful production `npm run build`.
- Production build confirmed `/analytics` and `/api/fleet/route-soft-cap-shadow-evidence`.
- Implementation was committed as `85d6635` and pushed to `origin/main`.
- Local `main` and `origin/main` were verified equal at `85d6635`.

### Safety / rollout state

- The evidence presentation is descriptive only.
- No rollout recommendation was added.
- No production activation was added.
- Route soft-cap production aggregation remains disabled.
- This milestone does not change the production scoring decision path.

### Next engineering boundary

Continue collecting and reviewing route soft-cap shadow evidence before considering any production aggregation change. Any future activation decision must be handled as a separate audited work item with its own validation and rollout controls.

## Route Soft-Cap Shadow Evidence by Production Classification

Status: **Implemented and pushed**

Implementation commit: `d6d5193` — `Add route shadow evidence by production classification`

### Completed

- Extended route soft-cap shadow evidence with a descriptive `byProductionClassification` breakdown.
- Used the persisted `route_prediction_evaluations.classification` column as the canonical production classification source.
- Supported the canonical completed-trip classifications:
  - `true_positive`
  - `false_positive`
  - `false_negative`
  - `true_negative`
- Preserved the existing aggregate shadow-evidence semantics independently from classification grouping.
- Added per-classification valid shadow-evaluation counts.
- Added per-classification classification agreement counts, disagreement counts, and agreement rates.
- Added per-classification production-minus-shadow score-delta mean, minimum, and maximum.
- Extended the shadow-evidence API query to retrieve both `classification` and `metadata`.
- Passed the canonical classification into the shadow-evidence analyzer.
- Extended the Analytics Route Soft-Cap Shadow Evidence panel with a `By production classification` section.
- Reused the existing Analytics reporting-period and optional vehicle scope.
- Reused the established True Positive, False Positive, False Negative, and True Negative display terminology.
- Verified the implementation with `git diff --check`.
- Verified TypeScript with `npx tsc --noEmit`.
- Verified a successful production `npm run build`.
- Production build confirmed both `/analytics` and `/api/fleet/route-soft-cap-shadow-evidence`.
- Implementation was committed as `d6d5193` and pushed to `origin/main`.
- Local `main` and `origin/main` were verified equal at `d6d5193`.

### Safety / rollout state

- The classification breakdown is observational and descriptive only.
- No rollout-readiness calculation was added.
- No preferred model or threshold recommendation was added.
- No production activation was added.
- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.
- No database migration was introduced.

### Next engineering boundary

Continue collecting and reviewing the expanded production shadow-evidence distribution. Any future decision to enable route soft-cap production aggregation must remain a separate audited work item with explicit evidence review, validation, rollout controls, and rollback planning.

## Route Soft-Cap Shadow Evidence Coverage

Status: **Implemented and pushed**

Implementation commit: `643ea98` — `Add route shadow evidence coverage analytics`

### Completed

- Extended the existing route soft-cap shadow-evidence analysis with descriptive evidence coverage metrics.
- Added overall shadow-evidence coverage as valid shadow evaluations divided by all scoped completed-trip prediction evaluations.
- Added per-production-classification coverage using the canonical completed-trip classification groups:
  - `true_positive`
  - `false_positive`
  - `false_negative`
  - `true_negative`
- Added an explicit eligible evaluation count for each production classification.
- Defined each per-classification coverage rate as valid shadow evaluations in that classification divided by all scoped evaluations with that canonical production classification.
- Preserved existing valid shadow-evaluation counts independently from the new eligible classification denominators.
- Preserved existing classification agreement, disagreement, positive-state, and score-delta semantics.
- Extended the Analytics Route Soft-Cap Shadow Evidence panel with overall `Shadow Evidence Coverage`.
- Extended the `By production classification` presentation with eligible counts and descriptive coverage rates.
- Preserved the existing reporting-period and optional vehicle scopes.
- Corrected the classification-agreement display formatting without changing metric semantics.
- Verified the focused implementation with `git diff --check`.
- Verified TypeScript with `npx tsc --noEmit`.
- Verified a successful production `npm run build`.
- Production build confirmed `/analytics` and `/api/fleet/route-soft-cap-shadow-evidence`.
- Implementation was committed as `643ea98` and pushed to `origin/main`.
- Local `main` and `origin/main` were verified equal at `643ea98`.

### Safety / rollout state

- Shadow-evidence coverage is observational and descriptive only.
- Coverage is not a rollout-readiness calculation.
- No minimum sample threshold or evidence-sufficiency threshold was introduced.
- No preferred model, threshold, or activation recommendation was added.
- No database migration was introduced.
- No route-prediction evaluation schema was changed.
- No completed-trip evaluator semantics were changed.
- No production route-risk scoring was changed.
- No production route-soft-cap aggregation was enabled.
- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.
- Existing persisted production classifications and versioned shadow metadata remain the evidence source of truth.

### Next engineering boundary

Continue accumulating and reviewing route soft-cap shadow evidence with explicit attention to overall coverage, per-classification coverage, sample distribution, classification agreement, and score-delta behavior. Coverage must not be interpreted as rollout readiness on its own. Before defining any evidence-sufficiency threshold or considering production activation, perform a separate audit of the accumulated evidence distribution and define that decision boundary explicitly. Any future route soft-cap production activation remains a separate audited work item requiring production validation, rollout controls, and rollback planning.

## Route Soft-Cap Shadow Evidence Sample Distribution

Status: **Implemented and pushed**

Implementation commit: `801d695` — `Add route shadow sample distribution analytics`

### Completed

- Extended the existing route soft-cap shadow-evidence analysis with descriptive production-classification sample-distribution metrics.
- Added `classifiedEvaluationCount` as the total scoped evaluation population carrying one of the canonical completed-trip production classifications:
  - `true_positive`
  - `false_positive`
  - `false_negative`
  - `true_negative`
- Added `classifiedValidShadowEvaluationCount` as the valid shadow-evaluation population carrying one of those same canonical production classifications.
- Added `eligibleDistributionRate` for each production classification.
- Defined `eligibleDistributionRate` as that classification's eligible evaluation count divided by `classifiedEvaluationCount`.
- Added `shadowDistributionRate` for each production classification.
- Defined `shadowDistributionRate` as that classification's valid shadow-evaluation count divided by `classifiedValidShadowEvaluationCount`.
- Preserved the existing per-classification shadow-evidence coverage denominator independently from the new distribution denominators.
- Preserved the existing classification agreement, disagreement, positive-state, and score-delta semantics.
- Extended the Analytics Route Soft-Cap Shadow Evidence summary with `Classified Evaluations`.
- Extended the Analytics summary with `Classified Shadow Evaluations`.
- Extended each `By production classification` entry with `Eligible sample share`.
- Extended each `By production classification` entry with `Shadow sample share`.
- Preserved the existing reporting-period and optional vehicle scopes.
- No API-route change was required because the existing shadow-evidence endpoint already supplies the canonical production classification and shadow metadata required by the analyzer.
- Verified the focused implementation with `git diff --check`.
- Verified TypeScript with `npx tsc --noEmit`.
- Verified a successful production `npm run build`.
- Production build confirmed `/analytics` and `/api/fleet/route-soft-cap-shadow-evidence`.
- Implementation was committed as `801d695` and pushed to `origin/main`.
- Local `main` and `origin/main` were verified equal at `801d695`.

### Safety / rollout state

- Sample-distribution reporting is observational and descriptive only.
- Distribution percentages describe the composition of the accumulated canonical production-classification populations; they are not evidence-sufficiency or rollout-readiness calculations.
- No minimum sample threshold was introduced.
- No evidence-sufficiency threshold was introduced.
- No preferred model or threshold recommendation was introduced.
- No production activation recommendation was added.
- No database migration was introduced.
- No route-prediction evaluation schema was changed.
- No completed-trip evaluator semantics were changed.
- No production route-risk scoring was changed.
- No production route-soft-cap aggregation was enabled.
- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.
- Existing persisted production classifications and versioned shadow metadata remain the evidence source of truth.

### Next engineering boundary

Continue accumulating and reviewing route soft-cap shadow evidence with explicit attention to overall coverage, per-classification coverage, eligible sample distribution, valid-shadow sample distribution, classification agreement, and score-delta behavior. The newly exposed distribution percentages must not be interpreted as evidence sufficiency or rollout readiness on their own. Before defining any minimum evidence threshold, evidence-sufficiency decision, preferred model or threshold, or considering production activation, perform a separate audit of the accumulated production evidence and explicitly define the decision criteria, validation requirements, rollout controls, and rollback plan. Any future route soft-cap production activation remains a separate audited work item.

## Route Soft-Cap Shadow Evidence Temporal Coverage

Status: **Implemented and pushed**

Implementation commit: `5011505` — `Add temporal route shadow evidence analytics`

### Completed

- Extended the route soft-cap shadow-evidence analysis with descriptive temporal evidence visibility.
- Reused persisted completed-trip `outcome_completed_at` as the canonical evidence timestamp for this milestone.
- Extended the route soft-cap shadow-evidence API query to select `outcome_completed_at` together with the existing production classification and shadow metadata.
- Passed the persisted timestamp into the analyzer as `outcomeCompletedAt`.
- Added defensive timestamp parsing that accepts valid persisted timestamp strings and returns `null` for missing or invalid values.
- Missing or invalid timestamps do not invalidate an otherwise valid shadow evaluation; they are excluded only from temporal calculations.
- Temporal metrics are calculated only from timestamp-bearing valid shadow evaluations.
- Added `oldestEvidenceCompletedAt` as the earliest valid persisted shadow-evidence completion timestamp in the current API scope.
- Added `newestEvidenceCompletedAt` as the latest valid persisted shadow-evidence completion timestamp in the current API scope.
- Added `evidenceSpanDays` as the elapsed time in days between the oldest and newest valid shadow-evidence timestamps.
- When no timestamp-bearing valid shadow evaluations exist, the oldest timestamp, newest timestamp, and span are `null`.
- When exactly one timestamp-bearing valid shadow evaluation exists, oldest and newest are equal and the evidence span is `0` days.
- Temporal analysis is deterministic for the same persisted evidence set and does not use `Date.now()` or request-time evidence-age calculations.
- Extended the Analytics Route Soft-Cap Shadow Evidence summary with `Oldest Shadow Evidence`.
- Extended the Analytics summary with `Newest Shadow Evidence`.
- Extended the Analytics summary with `Evidence Span`.
- Preserved the existing reporting-period and optional vehicle scopes.
- Preserved existing coverage, sample-distribution, classification-agreement, positive-state, and score-delta semantics.
- No database migration was required because `outcome_completed_at` already exists and was already the endpoint's completed-outcome reporting-window field.
- Verified the focused implementation with `git diff --check`.
- Verified TypeScript with `npx tsc --noEmit`.
- Verified a successful production `npm run build`.
- Production build confirmed `/analytics` and `/api/fleet/route-soft-cap-shadow-evidence`.
- Implementation was committed as `5011505` and pushed to `origin/main`.
- Local `main` and `origin/main` were verified equal at `5011505`.

### Safety / rollout state

- Temporal evidence reporting is observational and descriptive only.
- Oldest/newest timestamps and evidence span describe the time coverage of currently accumulated valid shadow evidence; they are not evidence-sufficiency or rollout-readiness calculations.
- No evidence-age threshold was introduced.
- No minimum sample threshold was introduced.
- No evidence-sufficiency threshold was introduced.
- No preferred model or threshold recommendation was introduced.
- No production activation recommendation was added.
- No database migration was introduced.
- No route-prediction evaluation schema was changed.
- No completed-trip evaluator semantics were changed.
- No production route-risk scoring was changed.
- No production route-soft-cap aggregation was enabled.
- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.
- Existing persisted production classifications, versioned shadow metadata, and completed-outcome timestamps remain the evidence source of truth.

### Next engineering boundary

Continue accumulating and reviewing route soft-cap shadow evidence with explicit attention to overall coverage, per-classification coverage, eligible sample distribution, valid-shadow sample distribution, temporal evidence coverage, classification agreement, and score-delta behavior. Oldest/newest evidence timestamps and evidence span must not be interpreted as evidence sufficiency or rollout readiness on their own. Before defining any minimum evidence threshold, evidence-sufficiency decision, preferred model or threshold, or considering production activation, perform a separate audit of the remaining descriptive decision-support gaps, including vehicle concentration, model/version distribution, and richer score-delta dispersion, then explicitly define the decision criteria, validation requirements, rollout controls, and rollback plan. Any future route soft-cap production activation remains a separate audited work item.

## Route Soft-Cap Shadow Evidence Score-Delta Median

Status: **Implemented and pushed**

Implementation commit: `8eb9a94` — `Add route shadow score delta median analytics`

### Completed

- Extended the existing route soft-cap shadow-evidence score-delta analysis with a deterministic median statistic.
- Added a reusable `median` helper in `analyzeRouteSoftCapShadowEvidence.ts`.
- The median helper returns `null` for an empty input population.
- For an odd-sized population, the median is the middle value of an ascending numeric sort.
- For an even-sized population, the median is the arithmetic mean of the two middle values.
- The helper sorts a copied array and does not mutate the existing score-delta population.
- Added overall `scoreDelta.median` for the complete valid shadow-evidence population.
- Added per-production-classification `scoreDelta.median`.
- Overall and per-classification medians use the same existing production-minus-shadow score-delta definition as the existing mean/min/max calculations.
- Extended the Analytics route soft-cap shadow-evidence response type with overall `scoreDelta.median`.
- Extended each production-classification score-delta response type with `median`.
- Extended the Analytics overall score-delta summary to display the median beside the existing mean.
- Extended each `By production classification` entry to display its score-delta median beside the existing mean.
- Preserved existing positive/zero/negative score-delta counts.
- Preserved existing mean, minimum, and maximum score-delta calculations.
- Preserved existing overall coverage, temporal coverage, sample distribution, production-classification coverage, classification-agreement, and positive-state semantics.
- No route-soft-cap shadow-evidence API change was required because the raw production and shadow scores were already available in analyzer memory.
- No database migration was required.
- Verified the focused implementation with `git diff --check`.
- Verified TypeScript with `npx tsc --noEmit`.
- Verified a successful production `npm run build`.
- Production build confirmed `/analytics` and `/api/fleet/route-soft-cap-shadow-evidence`.
- Implementation was committed as `8eb9a94` and pushed to `origin/main`.
- Local `main` and `origin/main` were verified equal at `8eb9a94`.

### Safety / rollout state

- Score-delta median reporting is observational and descriptive only.
- The median provides a more robust description of the accumulated production-minus-shadow score-delta population; it is not an evidence-sufficiency or rollout-readiness calculation.
- No percentile or statistical-confidence threshold was introduced.
- No minimum sample threshold was introduced.
- No evidence-sufficiency threshold was introduced.
- No preferred model or threshold recommendation was introduced.
- No production activation recommendation was added.
- No route-soft-cap shadow-evidence API contract was changed.
- No database migration was introduced.
- No route-prediction evaluation schema was changed.
- No completed-trip evaluator semantics were changed.
- No production route-risk scoring was changed.
- No production route-soft-cap aggregation was enabled.
- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.
- Existing persisted production classifications, versioned shadow metadata, completed-outcome timestamps, and stored production/shadow scores remain the evidence source of truth.

### Next engineering boundary

Continue accumulating and reviewing route soft-cap shadow evidence with explicit attention to overall coverage, per-classification coverage, eligible sample distribution, valid-shadow sample distribution, temporal coverage, classification agreement, and richer score-delta behavior. The newly exposed median must not be interpreted as evidence sufficiency or rollout readiness on its own. Before defining any minimum evidence threshold, statistical-confidence rule, evidence-sufficiency decision, preferred model or threshold, or considering production activation, continue the separate audit of the remaining descriptive decision-support gaps, with vehicle concentration and stable model/version distribution still unresolved. Any future route soft-cap production activation remains a separate audited work item requiring explicit decision criteria, validation requirements, rollout controls, and rollback planning.

## Route Soft-Cap Shadow Evidence Vehicle Concentration

Status: **Implemented and pushed**

Implementation commit: `20e85bc` — `Add route shadow vehicle concentration analytics`

### Completed

- Extended route soft-cap shadow-evidence analysis with aggregate vehicle-concentration visibility.
- Reused the existing persisted `vehicle_id` field from `route_prediction_evaluations`.
- Extended the route soft-cap shadow-evidence API query to select `vehicle_id` together with the existing classification, metadata, and completed-outcome timestamp fields.
- Passed persisted `vehicle_id` into the analyzer as `vehicleId`.
- Added defensive vehicle-ID handling so only non-empty string identifiers participate in concentration aggregation.
- Vehicle concentration is calculated only across valid shadow evaluations.
- Added `uniqueVehicleCount` as the number of distinct represented vehicles among valid shadow evaluations in the current reporting scope.
- Added `largestVehicleEvaluationCount` as the largest valid-shadow evaluation contribution from any one represented vehicle.
- Added `largestVehicleShare` as `largestVehicleEvaluationCount / validShadowEvaluationCount`.
- When no valid shadow evaluations are present, `largestVehicleShare` remains `null` through the existing ratio helper.
- Missing or invalid vehicle identifiers are excluded from the represented-vehicle count and per-vehicle contribution map.
- Raw vehicle identifiers are used only internally for aggregation and are not returned in the route soft-cap shadow-evidence response.
- No raw vehicle identifiers, vehicle names, registrations, or ranked vehicle table were added to Analytics.
- Extended the Analytics route soft-cap shadow-evidence response type with `uniqueVehicleCount`.
- Extended the Analytics response type with `largestVehicleEvaluationCount`.
- Extended the Analytics response type with `largestVehicleShare`.
- Added `Vehicles Represented` to the Analytics summary.
- Added `Largest Vehicle Evidence Count` to the Analytics summary.
- Added `Largest Vehicle Evidence Share` to the Analytics summary.
- Preserved existing organization, reporting-period, and optional single-vehicle filters.
- When a single vehicle is selected and valid shadow evidence exists, the scoped concentration naturally represents one vehicle and a largest-vehicle share of 100 percent.
- Preserved existing coverage, temporal coverage, sample distribution, production-classification coverage, classification-agreement, positive-state, and score-delta semantics.
- No database migration was required because `vehicle_id` already exists on the persisted evaluation records used by the endpoint.
- Verified the focused implementation with `git diff --check`.
- Verified TypeScript with `npx tsc --noEmit`.
- Verified a successful production `npm run build`.
- Production build confirmed `/analytics` and `/api/fleet/route-soft-cap-shadow-evidence`.
- Implementation was committed as `20e85bc` and pushed to `origin/main`.
- Local `main` and `origin/main` were verified equal at `20e85bc`.

### Safety / rollout state

- Vehicle-concentration reporting is observational and descriptive only.
- `uniqueVehicleCount`, `largestVehicleEvaluationCount`, and `largestVehicleShare` describe the distribution of currently accumulated valid shadow evidence across vehicles; they are not evidence-sufficiency or rollout-readiness calculations.
- No maximum-concentration threshold was introduced.
- No minimum unique-vehicle threshold was introduced.
- No evidence-sufficiency threshold was introduced.
- No preferred model or threshold recommendation was introduced.
- No production activation recommendation was added.
- No raw vehicle identifiers were exposed in the Analytics UI.
- No vehicle ranking table was introduced.
- No database migration was introduced.
- No route-prediction evaluation schema was changed.
- No completed-trip evaluator semantics were changed.
- No production route-risk scoring was changed.
- No production route-soft-cap aggregation was enabled.
- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.
- Existing persisted production classifications, versioned shadow metadata, completed-outcome timestamps, stored production/shadow scores, and persisted vehicle identifiers remain the evidence source of truth.

### Next engineering boundary

Continue accumulating and reviewing route soft-cap shadow evidence with explicit attention to overall coverage, per-classification coverage, eligible sample distribution, valid-shadow sample distribution, temporal coverage, classification agreement, score-delta behavior, and vehicle concentration. Vehicle concentration must not be interpreted as evidence sufficiency or rollout readiness on its own. The remaining explicitly unresolved descriptive decision-support gap is stable model/version distribution. Before defining any minimum evidence threshold, concentration threshold, statistical-confidence rule, evidence-sufficiency decision, preferred model or threshold, or considering production activation, perform a separate audit of whether a stable model/version identifier is actually persisted and can be aggregated without altering production persistence semantics. Any future route soft-cap production activation remains a separate audited work item requiring explicit decision criteria, validation requirements, rollout controls, and rollback planning.

## Route Soft-Cap Shadow Scoring-Version Persistence

Status: **Implemented and pushed**

Implementation commit: `c702201` — `Persist route soft cap scoring version`

### Completed

- Added an explicit immutable scoring identity for newly generated route soft-cap shadow evidence.
- The scoring identity is `route-soft-cap-v1`.
- New route-prediction snapshots now persist `routeSoftCapShadow.scoringVersion`.
- The existing `routeSoftCapShadow.version: 1` field remains the metadata/schema contract version and is not treated as scoring identity.
- The completed-trip evaluator now reads `routeSoftCapShadow.scoringVersion` when it is present as a non-empty string.
- The completed-trip evaluator copies the explicit scoring version forward into `routeSoftCapShadowEvaluation.scoringVersion`.
- The scoring-version value is propagated unchanged rather than reconstructed or inferred later.
- `scoringVersion` remains optional for historical snapshots.
- Historical snapshots and evaluations without explicit scoring identity remain unversioned / unknown.
- No historical record was assigned `route-soft-cap-v1` by assumption.
- No backfill was performed from metadata `version: 1`.
- No backfill was performed from prediction threshold values.
- No backfill was performed from Git history, commit dates, or deployment dates.
- Existing shadow-metadata eligibility remains based on the existing metadata contract rather than requiring `scoringVersion`.
- No database migration was required because snapshot and evaluation metadata are already persisted as JSONB.
- No route-prediction evaluation schema change was required.
- No shadow-evidence analyzer change was made.
- No route soft-cap shadow-evidence API change was made.
- No Analytics UI change was made.
- No model/version distribution reader was implemented in this milestone.
- No model/version distribution UI was implemented in this milestone.
- Verified the focused implementation with `git diff --check`.
- Verified TypeScript with `npx tsc --noEmit`.
- Verified a successful production `npm run build`.
- Implementation was committed as `c702201` and pushed to `origin/main`.
- Local `main` and `origin/main` were verified equal at `c702201`.

### Safety / rollout state

- Scoring-version persistence is observational metadata only.
- Persisting `route-soft-cap-v1` does not change production route-risk calculations.
- Persisting `route-soft-cap-v1` does not enable route soft-cap production aggregation.
- No existing route-soft-cap shadow score, threshold, classification, or evaluator decision was changed.
- `scoringVersion` is not an evidence-sufficiency signal.
- `scoringVersion` is not a rollout-readiness signal.
- No minimum versioned-evidence threshold was introduced.
- No evidence-sufficiency threshold was introduced.
- No preferred model or threshold recommendation was introduced.
- No production activation recommendation was added.
- Historical missing scoring versions remain explicit unknowns rather than being inferred.
- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.

### Next engineering boundary

The missing stable scoring-identity persistence gap is now closed for newly generated route soft-cap shadow evidence. The next work item must remain a separate read-only audit of the scoring-version distribution reader boundary. That audit should determine the exact parser, analyzer, response-contract, and Analytics insertion points for grouping explicit `scoringVersion` values while preserving an `Unknown` bucket for historical evidence without explicit identity. It must also determine whether version distribution should initially remain descriptive only and whether any minimum amount of explicitly versioned evidence is required before the distribution is useful. No scoring-version distribution, evidence-sufficiency rule, rollout-readiness logic, preferred-model decision, or production activation should be implemented until that audit is complete. Any future production activation remains a separate audited work item requiring explicit decision criteria, validation requirements, rollout controls, and rollback planning.

## Route Soft-Cap Shadow Scoring-Version Distribution

Status: **Implemented and pushed**

Implementation commit: `f774bf5` — `Add scoring version shadow evidence distribution`

### Completed

- Extended the route soft-cap shadow-evidence analyzer to parse optional `scoringVersion` from persisted shadow-evaluation metadata.
- Missing, blank, or non-string scoring-version values remain unknown and are never inferred as `route-soft-cap-v1`.
- Added `explicitVersionedEvaluationCount`, `unknownVersionEvaluationCount`, `explicitVersionCoverageRate`, and deterministic per-version count/share reporting.
- Valid shadow evaluations remain the denominator for scoring-version coverage and per-version shares.
- Unknown evidence remains separate from explicit scoring versions.
- Extended Analytics with `Versioned Shadow Evidence`, `Unknown Scoring Version`, `Explicit Version Coverage`, and a compact `By scoring version` distribution.
- Preserved the existing API query, prediction writer, completed-trip evaluator, database schema, and historical records.
- No migration or historical backfill was introduced.
- Verified with `git diff --check`, `npx tsc --noEmit`, a production `npm run build`, and a second TypeScript check after regenerating Next.js generated types.
- Implementation was committed as `f774bf5` and pushed to `origin/main`.

### Safety / rollout state

- Scoring-version distribution is observational and descriptive only.
- No minimum versioned-evidence threshold, evidence-sufficiency rule, statistical-confidence rule, preferred scoring version, rollout-readiness decision, or production activation recommendation was introduced.
- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.
- Historical evidence without explicit scoring identity remains unknown.

### Next engineering boundary

The scoring-version distribution reader and Analytics visibility gap is now closed. Continue collecting and reviewing overall coverage, per-classification coverage, temporal coverage, classification agreement, score-delta behavior, vehicle concentration, explicit scoring-version coverage, unknown-version evidence, and per-version distribution. Before defining any evidence-sufficiency or rollout-readiness rule, perform a separate read-only audit of the remaining decision-support boundary. Any future production activation remains a separate audited work item requiring explicit decision criteria, validation requirements, rollout controls, and rollback planning.

## Route Shadow Evidence Representativeness

Status: **Implemented and pushed**

Implementation commit: `6824754` - `Add route shadow evidence representativeness`

### Completed

- Extended route soft-cap shadow-evidence analysis with a deterministic per-vehicle distribution.
- Added per-vehicle valid-shadow evaluation counts and shares.
- Added deterministic UTC evidence-day distribution for timestamped valid shadow evidence.
- Extended Analytics visibility with descriptive `By vehicle` and `By UTC evidence day` sections.
- Preserved scoring-version distribution and the existing route soft-cap shadow-evidence analysis.
- Representativeness reporting remains observational and descriptive only.
- No acceptable vehicle-concentration threshold was introduced.
- No minimum active-day or temporal-spread requirement was introduced.
- No evidence-sufficiency, statistical-confidence, rollout-readiness, or production-activation rule was introduced.
- Verified with `git diff --check`, `npx tsc --noEmit`, a production `npm run build`, and a second TypeScript check after the build.
- Implementation was committed as `6824754` and pushed to `origin/main`.

### Safety / rollout state

- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.
- Vehicle concentration and temporal distribution are exposed as decision-support evidence only.
- The new distributions do not independently establish representativeness or evidence sufficiency.
- No production activation recommendation is implied by this milestone.

### Next engineering boundary

The route shadow-evidence representativeness visibility gap is now closed at the descriptive evidence layer. Continue collecting and reviewing overall coverage, production-classification coverage, temporal coverage, classification agreement, score-delta behavior, vehicle concentration, explicit scoring-version coverage, unknown-version evidence, per-version distribution, per-vehicle distribution, and UTC-day evidence distribution. Before defining any evidence-sufficiency, statistical-confidence, representativeness, rollout-readiness, or production-activation rule, perform a separate read-only audit of the remaining decision-support boundary. Any future production activation remains a separate audited work item requiring explicit decision criteria, validation requirements, rollout controls, and rollback planning.
## Route Shadow Evidence Observation Identity

Status: **Implemented and pushed**

Implementation commit: `554726b` - `Preserve route shadow trip identity`

### Completed

- Established the completed trip as the stable observation identity for route soft-cap shadow-evidence analysis.
- Confirmed `route_prediction_evaluations` already persists a stable `trip_id` and enforces one evaluation per trip through the existing unique `trip_id` constraint.
- Preserved existing persistence semantics; no database migration, uniqueness change, backfill, deduplication, or evaluator persistence change was required.
- Extended the route soft-cap shadow-evidence API query to select the existing `trip_id`.
- Extended the API row contract with `trip_id`.
- Mapped persisted `trip_id` to analyzer-facing `tripId`.
- Extended `RouteSoftCapShadowEvidenceEvaluation` with `tripId`.
- Preserved normalized trip identity through valid shadow-evaluation construction as `string | null`.
- Kept trip identity internal to the analysis path; no Analytics UI exposure was introduced.
- Existing vehicle and UTC-day representativeness reporting remains unchanged.
- Existing scoring-version distribution remains unchanged.
- No statistical calculation was introduced.
- Verified the focused two-file implementation with `git diff --check`, TypeScript before build, a successful production `npm run build`, and TypeScript again after the build.
- Implementation was committed as `554726b` and pushed to `origin/main`.

### Safety / rollout state

- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.
- Trip identity propagation is observational infrastructure only.
- No confidence interval, standard error, bootstrap, significance test, or other inferential statistic was introduced.
- No minimum sample-size, vehicle-count, active-day, agreement-rate, score-delta, or scoring-version threshold was introduced.
- No evidence-sufficiency or representativeness rule was introduced.
- No rollout-readiness decision was introduced.
- No preferred scoring version was selected.
- No production activation recommendation was introduced.
- Historical scoring-version evidence without explicit scoring identity remains unknown.

### Next engineering boundary

The route shadow-evidence observation-identity propagation gap is now closed: persisted completed-trip identity is available to the analyzer without changing database schema or persistence semantics. The next work item must remain a separate audit-first decision-support task. Before implementing statistical uncertainty, evidence-sufficiency, representativeness, rollout-readiness, or production-activation logic, determine which dependency structure can be supported by the available trip-level observations, repeated vehicle observations, UTC evidence-day structure, and scoring-version strata. Any statistical methodology must explicitly account for the observation unit and relevant dependence rather than assuming that all completed-trip evaluations are independent. No statistical threshold or production activation should be implemented until that methodology boundary has been separately audited and justified.

## Route Shadow Evidence Vehicle x UTC-Day Dependency Visibility

Status: **Implemented and pushed**

Implementation commit: `b641d02` — `Add vehicle day shadow evidence visibility`

### Completed

- Extended the route soft-cap shadow-evidence analyzer with a descriptive joint vehicle × UTC evidence-day grouping.
- Joint grouping includes only valid shadow evaluations that have both usable vehicle identity and completion time.
- Added `byVehicleUtcDay` output containing `vehicleId`, `utcDay`, and `evaluationCount`.
- Vehicle/day groups are ordered deterministically by descending evaluation count, then vehicle identity, then UTC day.
- Extended Analytics with a `By vehicle and UTC evidence day` section exposing the joint observation counts.
- Preserved the existing independent vehicle, UTC-day, scoring-version, classification, score-delta, and other shadow-evidence reporting.
- No API contract, database schema, persistence writer, or historical record migration was changed.
- Verified with `git diff --check`, `npx tsc --noEmit`, a production `npm run build`, and a second TypeScript check after generated Next.js types were refreshed.
- Implementation was committed as `b641d02` and pushed to `origin/main`.

### Safety / methodology boundary

- Vehicle × UTC-day reporting is descriptive and observational only.
- No statistical independence assumption was introduced.
- No clustering method, cluster-robust variance calculation, bootstrap method, confidence interval, hypothesis test, or inferential statistic was introduced.
- No minimum sample-size or evidence-sufficiency threshold was introduced.
- No rollout-readiness or production-activation decision was introduced.
- Route soft-cap production aggregation and the production scoring decision path remain unchanged.
- The joint distribution exists to make repeated-observation dependency structure visible before any later statistical methodology is selected.

### Next engineering boundary

Vehicle × UTC-day dependency visibility is now available alongside the existing marginal shadow-evidence distributions. The next work item must remain audit-first. Before selecting any inferential methodology, evidence-sufficiency rule, confidence requirement, or rollout-readiness criterion, inspect the observed dependency structure and determine whether additional descriptive joint dimensions are required. Scoring-version dependency, statistical inference, thresholds, and production activation remain separate audited work items.

## Route Shadow Evidence Vehicle x Scoring-Version Dependency Visibility

Status: **Implemented and pushed**

Implementation commit: `daa2753` — `Add vehicle scoring version shadow evidence visibility`

### Completed

- Extended the route soft-cap shadow-evidence analyzer with a descriptive joint vehicle × scoring-version grouping.
- Joint grouping includes only valid shadow evaluations with both usable vehicle identity and an explicit scoring version.
- Historical or otherwise unknown scoring-version evidence remains excluded from explicit version grouping and remains represented by the existing unknown-version reporting.
- Added `byVehicleScoringVersion` output containing `vehicleId`, `scoringVersion`, and `evaluationCount`.
- Vehicle/version groups are ordered deterministically by descending evaluation count, then vehicle identity, then scoring-version identity.
- Used a tuple-derived grouping key rather than inferring or reconstructing scoring-version identity.
- Extended Analytics with a `By vehicle and scoring version` section exposing descriptive joint counts.
- Preserved the existing vehicle, UTC-day, vehicle × UTC-day, scoring-version, classification, score-delta, and other shadow-evidence reporting.
- No API contract, database schema, persistence writer, completed-trip evaluator semantics, or historical record migration was changed.
- Verified with `git diff --check`, TypeScript, a production `npm run build`, and a second TypeScript check after the build.
- Implementation was committed as `daa2753` and pushed to `origin/main`.

### Safety / methodology boundary

- Vehicle × scoring-version reporting is descriptive and observational only.
- No statistical independence assumption was introduced.
- No preferred scoring version was selected.
- No scoring-version threshold was introduced.
- No bootstrap, confidence interval, standard error, hypothesis test, clustering method, or other inferential statistic was introduced.
- No evidence-sufficiency or rollout-readiness rule was introduced.
- No UTC-day × scoring-version or three-way dependency grouping was introduced.
- Route soft-cap production aggregation remains disabled.
- The production scoring decision path remains unchanged.
- Historical evidence without explicit scoring identity remains unknown and is never inferred as `route-soft-cap-v1`.

### Next engineering boundary

Vehicle × scoring-version dependency visibility is now available alongside vehicle × UTC-day visibility and the existing marginal scoring-version distribution. The next work item must remain audit-first. Before adding UTC-day × scoring-version visibility, three-way dependency reporting, statistical inference, evidence-sufficiency criteria, preferred-version logic, or rollout-readiness rules, determine whether another descriptive joint dimension is actually required to resolve a concrete dependency-visibility gap. No statistical or production-activation decision should be made merely because the required fields are technically available.

## Route Shadow Evidence Live Dependence-Method Readiness Audit

Audit baseline: `37e6c9c`

A read-only live evidence audit was completed against the existing authenticated `/api/fleet/route-soft-cap-shadow-evidence` path. No source code, database rows, migrations, environment configuration, or production behavior were changed.

Observed live evidence at the time of the audit:

- total evaluation count: 1
- valid shadow evaluation count: 1
- unique vehicle count: 1
- largest vehicle evaluation count: 1
- largest vehicle share: 1
- observed vehicle x UTC-day cells: 1
- evaluations in the observed vehicle x UTC-day cell: 1
- observed UTC evidence days: 1
- evidence span: 0 days
- explicit scoring-version observations: 0
- unknown scoring-version observations: 1
- explicit scoring-version coverage rate: 0
- vehicle x explicit scoring-version groups: none
- observed classification agreement: 1 of 1
- observed score-delta mean, median, minimum, and maximum: 0

Method-readiness result: `D - OBSERVED DATA ARE STILL INSUFFICIENT TO SELECT A DEPENDENCE STRUCTURE`.

The current live evidence contains one completed-trip observation from one vehicle on one UTC evidence day. It therefore does not expose repeated-vehicle dependence, repeated-day dependence, crossed vehicle x UTC-day dependence, or an explicit scoring-version stratum from which a defensible inferential dependence structure can be selected.

The observed 1-of-1 classification agreement and zero score delta remain descriptive point observations only. They do not establish statistical precision, evidence sufficiency, rollout readiness, or production-activation readiness.

No vehicle-clustered bootstrap, UTC-day-clustered bootstrap, multiway or hierarchical resampling method, cluster-robust variance method, confidence interval, standard error, statistical acceptance threshold, minimum sample size, minimum vehicle count, minimum active-day count, or scoring-version threshold is authorized by this audit.

Unknown scoring-version observations remain valid global descriptive observations but cannot be assigned to an explicit scoring-version inferential stratum.

Next methodological action: continue normal route-shadow evidence accumulation. Revisit dependence-method selection only after the observed evidence contains enough repeated vehicle, UTC-day, and scoring-version structure to evaluate the dependence dimensions descriptively.

This audit does not select a preferred scoring version, define evidence sufficiency, define rollout readiness, or authorize route soft-cap production activation.

The next HarborGuard work item must remain audit-first.

## Track B-1 — Route Shadow Evidence Analyzer Regression Coverage

Implementation commit: `a3a0b4d`

HarborGuard now has its first automated regression-test milestone for production-readiness release confidence.

The existing `lib/fleet/analyzeRouteSoftCapShadowEvidence.ts` production analyzer was intentionally left unchanged.

A Node-native regression suite was added at:

- `tests/analyzeRouteSoftCapShadowEvidence.test.mjs`

The project now exposes:

- `npm test`

using Node's built-in `node:test` runner with no third-party test framework dependency.

The regression suite protects the analyzer's existing descriptive behavior across five cases:

1. empty evidence input;
2. one valid explicitly versioned evaluation;
3. historical valid evidence with unknown scoring version;
4. malformed shadow metadata excluded from shadow calculations;
5. deterministic aggregation across multiple valid evaluations.

The tests cover existing behavior including:

- shadow evidence coverage;
- vehicle concentration;
- UTC-day grouping;
- scoring-version distribution;
- vehicle × UTC-day grouping;
- vehicle × scoring-version grouping;
- classification agreement and disagreement;
- positive-state agreement/change;
- score-delta counts and summary statistics;
- temporal evidence span;
- malformed metadata exclusion.

Verification completed before commit:

- `npm test`: PASS — 5 tests, 5 passed, 0 failed;
- `npx tsc --noEmit`: PASS;
- production build: PASS;
- `git diff --check`: PASS;
- production analyzer source: unchanged.

No statistical inference was introduced.

No evidence-sufficiency threshold was introduced.

No route-soft-cap rollout-readiness decision was introduced.

No production scoring behavior was changed.

No database migration, provider configuration, or production endpoint behavior was changed.

This milestone establishes the first automated release-confidence boundary for HarborGuard while preserving the existing route-shadow evidence methodology.

Track A remains separate and continues normal production shadow-evidence accumulation.

The next Track B work item must remain audit-first and should identify the next highest-value production-readiness regression or release-confidence boundary rather than expanding test coverage speculatively.

## Track B-2 — GPS Movement Evaluation Regression Coverage

Implementation commit: `ef5c921`

HarborGuard now has automated regression coverage for the deterministic GPS movement decision boundary used by fleet telemetry processing.

The existing production evaluator remained unchanged:

- `lib/fleet/evaluateGpsMovement.ts`

A new Node-native regression suite was added at:

- `tests/evaluateGpsMovement.test.mjs`

The existing `npm test` command now runs both the Track B-1 route-shadow evidence suite and the Track B-2 GPS movement suite.

Track B-2 protects eight existing GPS movement behaviors:

1. movement below the minimum distance is classified as `jitter`;
2. movement exactly at the minimum-distance boundary is not classified as jitter when speed remains valid;
3. ordinary movement inside configured limits is accepted;
4. movement above the configured maximum speed is classified as `gps_spike`;
5. movement whose calculated JavaScript speed equals the configured maximum is accepted;
6. zero elapsed interval preserves the current calculated-speed fallback of `0`;
7. negative elapsed interval preserves the current calculated-speed fallback of `0`;
8. jitter classification remains higher priority than GPS-spike classification when both conditions could otherwise appear relevant.

During regression development, a proposed mathematical boundary fixture exposed normal IEEE-754 floating-point behavior: a calculation expected mathematically to equal 120 km/h evaluated as `120.00000000000001`.

The production evaluator was not changed in response.

Instead, the final equality-boundary regression uses a configured maximum equal to the actual JavaScript calculated value so the test protects the existing strict `>` contract without introducing a new epsilon, rounding, or tolerance policy.

Verification completed before commit:

- `npm test`: PASS — 13 tests, 13 passed, 0 failed;
- `npx tsc --noEmit`: PASS;
- production build: PASS;
- `git diff --check`: PASS;
- `lib/fleet/evaluateGpsMovement.ts`: unchanged.

No GPS movement thresholds were changed.

No jitter semantics were changed.

No GPS-spike semantics were changed.

No telemetry persistence behavior was changed.

No anomaly-alert behavior was changed.

No provider-ingestion behavior was changed.

No database migration or production configuration change was introduced.

Track A remains separate and continues normal production shadow-evidence accumulation.

The next Track B work item must remain audit-first and should identify the next highest-value deterministic production-readiness regression or the smallest justified integration-test boundary.

## Track B-3 — Harsh-Braking Candidate Regression Coverage

Implementation commit: `3882e4a`

HarborGuard now has automated regression coverage for the deterministic harsh-braking candidate decision boundary used by fleet telemetry processing.

The existing production detector remained unchanged:

- `lib/fleet/detectHarshBrakingCandidate.ts`

A new Node-native regression suite was added at:

- `tests/detectHarshBrakingCandidate.test.mjs`

The existing `npm test` command now runs the Track B-1 route-shadow evidence suite, Track B-2 GPS movement suite, and Track B-3 harsh-braking candidate suite.

Track B-3 protects sixteen existing harsh-braking behaviors, including:

1. valid harsh-braking candidate creation;
2. manual telemetry rejection;
3. previous-speed minimum rejection and exact-boundary behavior;
4. speed-drop minimum rejection;
5. exact minimum speed drop still requiring the independent deceleration threshold;
6. minimum interval rejection and exact minimum interval acceptance;
7. maximum interval rejection and exact maximum interval acceptance;
8. exact runtime equality at the minimum deceleration threshold;
9. below-threshold deceleration rejection;
10. non-finite previous-speed rejection;
11. non-finite current-speed rejection;
12. negative current-speed rejection;
13. existing output rounding for speeds;
14. existing output rounding for speed drop;
15. existing output rounding for interval duration;
16. existing output rounding for deceleration.

The production thresholds audited for this milestone remain:

- minimum previous speed: 30 km/h;
- minimum speed drop: 20 km/h;
- valid interval window: 2 through 15 seconds inclusive;
- minimum deceleration: 3 m/s².

The audit confirmed that a 20 km/h drop over 2 seconds produces approximately 2.7778 m/s² and therefore does not independently satisfy the deceleration threshold.

The audit also confirmed that a 21.6 km/h drop over 2 seconds produces exactly 3 m/s² at JavaScript runtime and is accepted by the existing strict `<` deceleration rejection rule when all other conditions pass.

Verification completed before commit:

- `npm test`: PASS — 29 tests, 29 passed, 0 failed;
- `npx tsc --noEmit`: PASS;
- production build: PASS;
- `git diff --check`: PASS;
- `lib/fleet/detectHarshBrakingCandidate.ts`: unchanged.

No harsh-braking thresholds were changed.

No telemetry-source eligibility rules were changed.

No harsh-braking alert-creation behavior was changed.

No telemetry persistence behavior was changed.

No route-intelligence promotion behavior was changed.

No database migration or production configuration change was introduced.

Track A remains separate and continues normal production shadow-evidence accumulation.

The next Track B work item must remain audit-first and should identify the next highest-value deterministic production-readiness regression or the smallest justified integration-test boundary.

## Track B-4 — Telemetry Input Parsing Regression Coverage

Implementation commit: `61e70da`

HarborGuard now has automated regression coverage for the deterministic telemetry request-normalization and validation boundary used by the fleet update-location flow.

The existing production parser remained unchanged:

- `lib/fleet/parseUpdateLocationInput.ts`

The existing update-location API route also remained unchanged:

- `app/api/fleet/update-location/route.ts`

A new Node-native regression suite was added at:

- `tests/parseUpdateLocationInput.test.mjs`

The existing `npm test` command now runs the Track B-1 route-shadow evidence suite, Track B-2 GPS movement suite, Track B-3 harsh-braking candidate suite, and Track B-4 telemetry input parser suite.

Track B-4 protects twenty existing parser behaviors, including:

1. numeric telemetry input preservation;
2. numeric-string conversion;
3. whitespace and malformed numeric input rejection as `NaN`;
4. scientific-notation numeric-string conversion;
5. hexadecimal numeric-string conversion;
6. required vehicle ID validation;
7. numeric-string coordinate conversion;
8. non-finite coordinate rejection;
9. exact latitude boundary acceptance at -90 and 90;
10. out-of-range latitude rejection;
11. exact longitude boundary acceptance at -180 and 180;
12. out-of-range longitude rejection;
13. finite speed and heading preservation;
14. current negative-speed acceptance behavior;
15. missing or invalid speed and heading defaulting to zero;
16. default source of `mobile` and default trip ID of `null`;
17. preservation of supplied trip ID, telemetry source, and requested status;
18. omitted `recordedAt` remaining undefined;
19. blank, invalid, and non-string `recordedAt` rejection;
20. valid `recordedAt` normalization to ISO together with preservation of the complete success-result shape.

The audit confirmed that `parseFleetTelemetryNumber(...)` currently delegates nonblank strings to JavaScript `Number(...)`. As a result, existing production behavior accepts numeric formats such as scientific notation and hexadecimal strings.

The audit also confirmed that the parser currently does not add runtime enum validation for telemetry source or requested status.

Finite negative speed values are currently preserved by this parser.

Finite heading values outside the conventional 0 through 360 degree range are currently preserved by this parser.

Track B-4 deliberately protects those current behaviors rather than silently introducing new request-validation policy.

The parser continues to provide explicit finite and range validation for latitude and longitude.

The update-location route continues mapping parser validation failures to HTTP 400 responses and passing successful parsed values into the existing vehicle-location processing flow.

Verification completed before commit:

- `npm test`: PASS — 49 tests, 49 passed, 0 failed;
- `npx tsc --noEmit`: PASS;
- production build: PASS;
- `git diff --check`: PASS;
- `lib/fleet/parseUpdateLocationInput.ts`: unchanged;
- `app/api/fleet/update-location/route.ts`: unchanged.

No telemetry parser production logic was changed.

No source-enum validation policy was added.

No requested-status validation policy was added.

No speed validation policy was changed.

No heading validation policy was changed.

No latitude or longitude policy was changed.

No `recordedAt` validation policy was changed.

No database behavior was changed.

No telemetry persistence behavior was changed.

No alert-lifecycle behavior was changed.

No production API response behavior was changed.

Track A remains separate and continues normal production shadow-evidence accumulation.

The next Track B work item must remain audit-first and should identify the next highest-value deterministic production-readiness regression or the smallest justified integration-test boundary.

## Track B-5 — Shared Geographic Distance Regression Coverage

Implementation commit: `abd6bd5`

HarborGuard now has automated regression coverage for the shared geographic-distance helper used across fleet telemetry, corroboration, geofence-risk, threat-prediction, and mobile-tracking flows.

The existing production helper remained unchanged:

- `lib/geo/getDistanceMeters.ts`

A new Node-native regression suite was added at:

- `tests/getDistanceMeters.test.mjs`

The existing `npm test` command now runs the Track B-1 route-shadow evidence suite, Track B-2 GPS movement suite, Track B-3 harsh-braking suite, Track B-4 telemetry parser suite, and Track B-5 geographic distance suite.

Track B-5 protects ten existing geographic-distance behaviors:

1. identical coordinates return zero distance;
2. one degree latitude at the equator produces the expected Haversine distance;
3. one degree longitude at the equator produces the expected Haversine distance;
4. one degree latitude and longitude are equivalent at the equator;
5. a realistic short Cape Town coordinate delta remains stable;
6. distance remains symmetric between two coordinates;
7. antipodal coordinates produce approximately pi times the configured Earth radius;
8. non-finite latitude input preserves the current NaN result;
9. infinite latitude input preserves the current NaN result;
10. the helper continues not to introduce coordinate-range validation for finite out-of-range values.

The audited implementation uses an Earth radius of 6,371,000 metres and the existing Haversine formula.

The audit confirmed representative numeric behavior including:

- identical coordinate distance: 0 metres;
- one degree latitude at the equator: approximately 111,194.9266 metres;
- one degree longitude at the equator: approximately 111,194.9266 metres;
- a 0.001-degree latitude delta near Cape Town: approximately 111.1949 metres;
- antipodal distance: approximately 20,015,086.7960 metres.

Tests use explicit floating-point tolerances where appropriate rather than depending on brittle decimal equality.

The audit also identified additional local geographic-distance implementations elsewhere in the codebase.

Those duplicate implementations were deliberately left unchanged because migration or consolidation was outside the narrow B-5 regression-coverage scope.

Verification completed before commit:

- `npm test`: PASS — 59 tests, 59 passed, 0 failed;
- `npx tsc --noEmit`: PASS;
- production build: PASS;
- `git diff --check`: PASS;
- `lib/geo/getDistanceMeters.ts`: unchanged.

No geographic-distance production logic was changed.

No Earth-radius constant was changed.

No Haversine calculation behavior was changed.

No coordinate-validation policy was added.

No duplicate distance implementation was migrated.

No geofence threshold was changed.

No telemetry threshold was changed.

No corroboration radius was changed.

No threat-prediction behavior was changed.

No database migration or production configuration change was introduced.

Track A remains separate and continues normal production shadow-evidence accumulation.

The next Track B work item must remain audit-first and should identify the next highest-value deterministic production-readiness regression or the smallest justified integration-test boundary.

## Track B-6 - City Road Context Enrichment

Implementation commit: `338d76c`

HarborGuard now enriches imported traffic safety alerts with City of Cape Town road-context data before persistence.

The implementation introduced a dedicated road-context abstraction and City of Cape Town provider:

- `lib/road-context/types.ts`
- `lib/road-context/provider.ts`
- `lib/road-context/providers/cityOfCapeTown.ts`

A shared point-to-polyline geographic helper was added at:

- `lib/geo/getPointToPolylineDistanceMeters.ts`

Route-safety road-context enrichment is implemented in:

- `lib/route-safety/enrichRouteSafetyAlertsWithRoadContext.ts`

The HERE and TomTom incident import paths now pass normalized traffic alerts through the shared road-context enrichment layer before upsert:

- `lib/route-safety/providers/importHereIncidents.ts`
- `lib/route-safety/providers/importTomTomIncidents.ts`

The existing route-safety upsert path was also updated so a same-provider refresh can fill a previously missing `road_name` while preserving an already populated road name.

The City of Cape Town provider resolves road context from the audited municipal road geometry source and uses point-to-polyline distance rather than relying only on point proximity.

The enrichment layer is provider-agnostic and preserves the alert when road context is unavailable rather than making external road-context availability a requirement for traffic-alert ingestion.

Diagnostic validation against representative Cape Town HERE traffic alerts confirmed that five alerts with missing `road_name` values were all enriched successfully.

The diagnostic returned:

- attempted: 5;
- enriched: 5;
- unavailable: 0.

Representative resolved road names included:

- KLOOF;
- ROELAND;
- MAIN;
- GOVAN MBEKI;
- EDWARD MAKELE.

Automated regression coverage was added at:

- `tests/cityOfCapeTownRoadContext.test.mjs`
- `tests/enrichRouteSafetyAlertsWithRoadContext.test.mjs`

The repository `npm test` command was extended to include both new regression suites while preserving the existing deterministic Track B test coverage.

Verification completed before the implementation commit:

- automated test suite: PASS;
- TypeScript verification: PASS;
- production build: PASS;
- `git diff --check`: PASS;
- representative live road-context enrichment diagnostic: PASS.

The implementation commit changed 11 files with 1,810 insertions and 3 deletions.

No database migration was introduced.

No route-risk scoring threshold was changed.

No traffic-provider registry policy was changed.

No existing alert was made dependent on successful road-context resolution.

No unrelated dirty worktree files were included in the implementation commit.

Track A remains separate and continues normal production shadow-evidence accumulation.

The next Track B work item must remain audit-first and should identify the next highest-value deterministic production-readiness regression or the smallest justified integration-test boundary.

## Track B-7 - Centralized Operational Road Risk

Implementation commit: `81e606a`

HarborGuard now has a shared operational road-risk calculation for runtime consumers that need the effective risk value derived from persisted segment risk and historical recency.

The implementation added the shared helper:

- `calculateOperationalRoadRisk(...)`

in:

- `lib/routing/roadRiskRecency.ts`

The helper preserves the existing operational calculation semantics by:

1. converting the persisted risk score to a numeric value;
2. constraining the raw score to the existing `0` to `100` range;
3. applying the existing `historicalRoadRiskRecencyWeight(...)`;
4. rounding the resulting effective score;
5. constraining the final result to the existing `0` to `100` range.

The Route Safety segments API now uses this shared helper instead of maintaining an inline copy of the same effective-risk calculation:

- `app/api/route-safety/segments/route.ts`

This was deliberately narrowed to a behavior-preserving refactor after audit.

The prediction route and HERE route-scoring path were not migrated as part of B-7 because their surrounding scoring semantics are not identical to the segments API calculation and changing them would have expanded the work beyond the verified behavior-preserving boundary.

Automated regression coverage was added at:

- `tests/calculateOperationalRoadRisk.test.mjs`

The repository `npm test` command was extended to include the new operational-road-risk regression suite while preserving the previously registered deterministic Track B suites.

The implementation commit changed exactly four files:

- `app/api/route-safety/segments/route.ts`
- `lib/routing/roadRiskRecency.ts`
- `package.json`
- `tests/calculateOperationalRoadRisk.test.mjs`

The implementation commit contained:

- 149 insertions;
- 16 deletions.

No persisted `road_risk_segments.risk_score` values were changed.

No database migration was introduced.

No historical recency thresholds were changed.

No route-risk threshold was changed.

No HERE routing verification weighting was changed.

No Route Safety prediction scoring behavior was changed.

No rapid-acceleration work was included in the implementation commit.

No unrelated dirty or untracked worktree files were included in the implementation commit.

Implementation commit `81e606a` was pushed successfully to `origin/main`.

Local `main` and `origin/main` were verified at the same implementation commit before documentation work began.

Track A remains separate and continues normal production shadow-evidence accumulation.

The next Track B work item must remain audit-first and should identify the next highest-value deterministic production-readiness regression or the smallest justified integration-test boundary.

## Track B-8 - Rapid Acceleration Detection Regression Coverage

Implementation commit: `7c4b51a`

HarborGuard now has deterministic regression coverage for the existing rapid-acceleration candidate detector.

This work item deliberately adds regression protection without changing production rapid-acceleration detection behavior.

Automated regression coverage was added at:

- `tests/detectRapidAccelerationCandidate.test.mjs`

The regression suite exercises the existing `detectRapidAccelerationCandidate(...)` contract in:

- `lib/fleet/detectRapidAccelerationCandidate.ts`

Coverage includes:

1. acceptance of qualifying hardware telemetry;
2. acceptance of qualifying mobile telemetry;
3. rejection of manual telemetry;
4. rejection of non-finite previous-speed values;
5. rejection of non-finite current-speed values;
6. rejection of negative previous speeds;
7. rejection of negative current speeds;
8. rejection below the minimum interval boundary;
9. acceptance at the exact minimum interval boundary when the remaining gates pass;
10. acceptance at the exact maximum interval boundary when the remaining gates pass;
11. rejection above the maximum interval boundary;
12. rejection below the minimum speed-increase threshold;
13. confirmation that the exact speed-increase threshold still obeys the acceleration gate;
14. rejection below the minimum acceleration threshold;
15. acceptance at the exact acceleration threshold;
16. preservation of the existing output-rounding contract.

The regression suite uses the audited production threshold values:

- minimum speed increase: `20 km/h`;
- minimum interval: `2 seconds`;
- maximum interval: `15 seconds`;
- minimum acceleration: `3 m/s²`.

The repository `npm test` command was extended to include:

- `tests/detectRapidAccelerationCandidate.test.mjs`

while preserving the previously registered deterministic Track B regression suites.

The implementation commit changed exactly two files:

- `package.json`
- `tests/detectRapidAccelerationCandidate.test.mjs`

The implementation commit contained:

- 216 insertions;
- 1 deletion.

No production rapid-acceleration detector implementation was changed.

No rapid-acceleration threshold was changed.

No telemetry-source eligibility policy was changed.

No rapid-acceleration alert lifecycle behavior was changed.

No rapid-acceleration corroboration behavior was changed.

No telemetry-to-road-intelligence promotion behavior was changed.

No database migration or schema change was introduced.

No unrelated dirty or untracked worktree files were included in the implementation commit.

Implementation commit `7c4b51a` was pushed successfully to `origin/main`.

Local `main` and `origin/main` were verified at the same implementation commit before documentation work began.

Track A remains separate and continues normal production shadow-evidence accumulation.

The next Track B work item must remain audit-first and should identify the next highest-value deterministic production-readiness regression or the smallest justified integration-test boundary.

## Track B-9 - Harsh Cornering Detection Regression Coverage

Implementation commit: `5f7b22d`

HarborGuard now has deterministic regression coverage for the existing harsh-cornering candidate detector.

This work item deliberately adds regression protection without changing production harsh-cornering detection behavior.

Automated regression coverage was added at:

- `tests/detectHarshCorneringCandidate.test.mjs`

The regression suite exercises the existing harsh-cornering candidate detection contract.

Coverage includes:

1. acceptance of qualifying hardware telemetry;
2. acceptance of qualifying mobile telemetry;
3. rejection of manual telemetry;
4. rejection of a null normalized heading delta;
5. rejection of a non-finite normalized heading delta;
6. rejection of a non-finite previous heading;
7. rejection of a non-finite current heading;
8. rejection of a non-finite speed;
9. rejection below the minimum speed boundary;
10. acceptance at the exact minimum speed boundary;
11. rejection below the minimum interval boundary;
12. acceptance at the exact minimum interval boundary;
13. acceptance at the exact maximum interval boundary;
14. rejection above the maximum interval boundary;
15. rejection below the minimum heading-change threshold;
16. acceptance at the exact heading-change threshold;
17. preservation of the existing output-rounding contract.

The repository `npm test` command was extended to include:

- `tests/detectHarshCorneringCandidate.test.mjs`

while preserving the previously registered deterministic Track B regression suites.

The implementation commit changed exactly two files:

- `package.json`
- `tests/detectHarshCorneringCandidate.test.mjs`

The implementation commit contained:

- 191 insertions;
- 1 deletion.

No production harsh-cornering detector implementation was changed.

No harsh-cornering threshold was changed.

No telemetry-source eligibility policy was changed.

No harsh-cornering alert lifecycle behavior was changed.

No harsh-cornering corroboration behavior was changed.

No telemetry-to-road-intelligence promotion behavior was changed.

No database migration or schema change was introduced.

No unrelated dirty or untracked worktree files were included in the implementation commit.

Implementation commit `5f7b22d` was pushed successfully to `origin/main`.

Local `main` and `origin/main` were verified at the same implementation commit before documentation work began.

Track A remains separate and continues normal production shadow-evidence accumulation.

The next Track B work item is the audit-first City traffic-calming context foundation. It must introduce traffic-calming context as a separate boundary from the existing road-identity context and must not change route-risk scoring, telemetry detector behavior, alert validity, or database state until the context resolver itself has deterministic regression coverage.

## Track B-10 - City of Cape Town Traffic-Calming Context Foundation

Implementation commit: `1e4e400`

HarborGuard now has a dedicated provider-neutral traffic-calming context boundary backed by audited City of Cape Town municipal traffic-calming data.

The implementation introduced:

- `lib/road-context/trafficCalmingTypes.ts`
- `lib/road-context/trafficCalmingProvider.ts`
- `lib/road-context/providers/cityOfCapeTownTrafficCalming.ts`

The City provider resolves two deterministic traffic-calming feature classes:

- speed bumps from City of Cape Town ODP Split 12 FeatureServer layer 7;
- raised intersections from City of Cape Town ODP Split 12 FeatureServer layer 8.

Traffic-calming context remains a separate boundary from the existing City road-identity context.

The provider performs bounded point-distance evaluation around the requested coordinate, normalizes municipal ArcGIS feature responses, and returns deterministic nearby traffic-calming context without making City data availability a requirement for unrelated HarborGuard behavior.

Automated regression coverage was added at:

- `tests/cityOfCapeTownTrafficCalmingContext.test.mjs`

The direct B-10 regression suite contains 16 deterministic tests and passed 16/16 with zero failures.

The repository `npm test` command was extended to register the B-10 suite while preserving the previously registered deterministic Track B suites.

After implementation, the complete registered HarborGuard test suite passed 141/141 with zero failures.

TypeScript validation passed with:

- `npx tsc --noEmit`

The production build also passed successfully, including generation of all 124 static pages.

The implementation commit changed exactly five files:

- `lib/road-context/providers/cityOfCapeTownTrafficCalming.ts`
- `lib/road-context/trafficCalmingProvider.ts`
- `lib/road-context/trafficCalmingTypes.ts`
- `package.json`
- `tests/cityOfCapeTownTrafficCalmingContext.test.mjs`

The implementation commit contained:

- 1,347 insertions;
- 1 deletion.

No route-risk scoring behavior was changed.

No telemetry detector behavior was changed.

No traffic-alert validity behavior was changed.

No database migration or schema change was introduced.

No production database state was changed.

No unrelated dirty or untracked worktree files were included in the implementation commit.

Implementation commit `1e4e400` was pushed successfully to `origin/main`.

Local `main` and `origin/main` were verified at the same implementation commit before documentation work began.

Track A remains separate and continues normal production shadow-evidence accumulation.

The next Track B work item must remain audit-first. Before integrating traffic-calming context into route-risk scoring, telemetry corroboration, operator-facing context, or another production consumer, the exact consumer boundary and behavior-preserving insertion point must be audited and justified.

## Track B-11 - Traffic-Calming Telemetry Evidence Context

Implementation commit: `e9b8813`

HarborGuard now enriches harsh-driving behavior alerts with nearby municipal traffic-calming context while preserving existing telemetry detection, corroboration, promotion, and route-risk behavior.

The implementation introduced:

- `lib/fleet/resolveBehaviorTrafficCalmingContext.ts`
- `tests/resolveBehaviorTrafficCalmingContext.test.mjs`

The existing behavior-alert orchestration boundary was updated at:

- `lib/fleet/createLocationBehaviorAlerts.ts`

The following alert creators now accept traffic-calming context:

- `lib/fleet/createHarshBrakingAlert.ts`
- `lib/fleet/createRapidAccelerationAlert.ts`
- `lib/fleet/createHarshCorneringAlert.ts`

The B-11 behavior-context helper reuses the canonical provider-neutral `TrafficCalmingContext` type introduced in B-10 rather than defining a second traffic-calming domain model.

Traffic-calming context is resolved only when at least one harsh-driving candidate exists.

When multiple harsh-driving candidates exist for the same location update, municipal traffic-calming context is resolved once and reused across the applicable behavior alerts.

The resolved context is attached only as explanatory `telemetry_evidence` for:

- harsh braking;
- rapid acceleration;
- harsh cornering.

Speeding alert behavior remains unchanged.

Traffic-calming context remains fail-open. If the municipal resolver returns no trustworthy context or throws an error, normal HarborGuard behavior continues and the context resolves to `null`.

B-11 does not treat municipal traffic-calming infrastructure as vehicle corroboration.

The existing corroboration modules remain unchanged:

- `lib/fleet/harshBrakingCorroboration.ts`
- `lib/fleet/rapidAccelerationCorroboration.ts`
- `lib/fleet/harshCorneringCorroboration.ts`

Telemetry candidate detection also remains unchanged.

The following production boundaries were explicitly left unchanged:

- `lib/fleet/analyzeVehicleLocationTelemetry.ts`
- `lib/fleet/processVehicleLocationUpdate.ts`
- `lib/route-safety/createTelemetryObservation.ts`
- harsh-braking telemetry promotion;
- rapid-acceleration telemetry promotion;
- harsh-cornering telemetry promotion;
- route-risk scoring;
- detector thresholds;
- alert validity rules;
- database schema and migrations.

The direct B-11 regression suite passed 6/6 with zero failures.

The complete registered HarborGuard test suite passed 147/147 with zero failures.

TypeScript validation passed with:

- `npx tsc --noEmit`

The production build passed successfully, including generation of all 124 static pages.

The B-11 implementation commit changed exactly seven files:

- `lib/fleet/createHarshBrakingAlert.ts`
- `lib/fleet/createHarshCorneringAlert.ts`
- `lib/fleet/createLocationBehaviorAlerts.ts`
- `lib/fleet/createRapidAccelerationAlert.ts`
- `lib/fleet/resolveBehaviorTrafficCalmingContext.ts`
- `package.json`
- `tests/resolveBehaviorTrafficCalmingContext.test.mjs`

The implementation commit contained:

- 227 insertions;
- 1 deletion.

Implementation commit `e9b8813` was pushed successfully to `origin/main`.

Local `main` and `origin/main` were verified at the same implementation commit before this documentation update began.

B-11 therefore establishes municipal traffic-calming data as non-authoritative explanatory telemetry evidence without allowing it to change candidate detection, corroboration thresholds, alert validity, telemetry promotion, or route-risk scoring.

The next Track B work item must begin with a fresh audit. No B-12 production consumer, City dataset, scoring change, or UI integration should be selected without first identifying one precise gap and its behavior-preserving insertion point.

## Track B-12 - Harsh-Braking Promotion Traffic-Calming Evidence Preservation

Implementation commit: `4f38574`

HarborGuard now preserves municipal traffic-calming evidence when already-corroborated harsh-braking telemetry is promoted into route intelligence.

B-12 closes the context-loss boundary identified after B-11:

- B-11 attaches nearby municipal traffic-calming context to harsh-driving `vehicle_alerts.telemetry_evidence`;
- corroborated harsh-braking telemetry may subsequently be promoted into `route_intelligence`;
- before B-12, that promotion preserved the telemetry candidate and corroboration evidence but dropped the traffic-calming context;
- B-12 now carries that context into `route_intelligence.metadata`.

The implementation introduced:

- `lib/route-safety/buildHarshBrakingPromotionMetadata.ts`
- `tests/buildHarshBrakingPromotionMetadata.test.mjs`

The following existing production files were updated:

- `lib/fleet/createHarshBrakingAlert.ts`
- `lib/route-safety/promoteHarshBrakingTelemetry.ts`
- `package.json`

`createHarshBrakingAlert.ts` now passes the already-resolved B-11 `trafficCalmingContext` into harsh-braking telemetry promotion.

`promoteHarshBrakingTelemetry.ts` now accepts that context and delegates route-intelligence metadata construction to `buildHarshBrakingPromotionMetadata(...)`.

The metadata builder preserves the existing telemetry metadata contract:

- `telemetryType`;
- `sourceVehicleId`;
- `tripId`;
- harsh-braking candidate evidence;
- corroboration threshold state;
- distinct vehicle count;
- distinct vehicle IDs;
- other vehicle IDs;
- nearby alert count;
- corroboration radius;
- corroboration time window;
- corroboration window timestamps.

It additionally preserves:

- `trafficCalmingContext`.

Traffic-calming context remains explanatory evidence only.

B-12 does not change harsh-braking promotion eligibility.

Promotion continues to require the existing `corroboration.thresholdMet` condition.

The following behavior remains unchanged:

- harsh-braking candidate detection;
- harsh-braking corroboration thresholds;
- distinct-vehicle requirements;
- promotion eligibility;
- promotion confidence calculation;
- `verification_count` calculation;
- road-risk aggregation RPC selection;
- road-risk aggregation RPC parameters;
- route-risk scoring;
- alert validity;
- database schema and migrations.

The existing `aggregate_road_risk_intelligence` RPC continues to receive the same event type, latitude, longitude, event time, organization and intelligence identifiers as before.

Traffic-calming context is not supplied as an aggregation parameter and therefore does not directly alter road-risk scoring.

The new direct B-12 regression suite passed 4/4 with zero failures.

The complete registered HarborGuard test suite passed 151/151 with zero failures.

TypeScript validation passed with:

- `npx tsc --noEmit`

The production build passed successfully.

The build completed TypeScript validation and generated all 124 static pages successfully.

The B-12 implementation commit changed exactly five files:

- `lib/fleet/createHarshBrakingAlert.ts`
- `lib/route-safety/buildHarshBrakingPromotionMetadata.ts`
- `lib/route-safety/promoteHarshBrakingTelemetry.ts`
- `package.json`
- `tests/buildHarshBrakingPromotionMetadata.test.mjs`

The implementation commit contained:

- 222 insertions;
- 27 deletions.

Implementation commit `4f38574` was pushed successfully to `origin/main`.

Local `main` and `origin/main` were verified at the same B-12 implementation commit before this documentation update began.

B-12 therefore preserves B-11 municipal traffic-calming evidence across the harsh-braking telemetry-to-route-intelligence promotion boundary without converting that evidence into corroboration, promotion policy, or road-risk weighting.

The next Track B work item must begin with a fresh audit. No B-13 dataset, scoring change, telemetry promotion extension, route-risk consumer, operator-facing integration, or City of Cape Town enrichment should be selected without first identifying one precise gap and its behavior-preserving insertion point.


## Track B-13 - Route-Safety Traffic-Calming Explanatory Context

Implementation commit: `f3369a2`

HarborGuard now carries validated municipal traffic-calming context from promoted route intelligence into the route-safety prediction threat model as explanatory context.

B-13 closes the downstream consumer gap identified after B-12:

- B-11 resolves and attaches nearby City of Cape Town traffic-calming context to harsh-driving telemetry evidence;
- B-12 preserves that context when corroborated harsh-braking telemetry is promoted into `route_intelligence.metadata`;
- before B-13, `/api/route-safety/predict` loaded route-intelligence metadata but only consumed existing descriptive metadata fields;
- B-13 now validates and propagates `trafficCalmingContext` through the prediction threat transformation.

The implementation introduced:

- `lib/route-safety/extractTrafficCalmingContext.ts`
- `tests/extractTrafficCalmingContext.test.mjs`

The following existing production files were updated:

- `app/api/route-safety/predict/route.ts`
- `package.json`

`extractTrafficCalmingContext(...)` validates the canonical `TrafficCalmingContext` contract before exposing it downstream.

The validated context preserves:

- provider;
- feature type;
- provider feature identity;
- ownership;
- status code;
- latitude;
- longitude;
- distance from the telemetry location.

Only the City of Cape Town traffic-calming provider is accepted.

Only the currently supported feature types are accepted:

- `speed_bump`;
- `raised_intersection`.

Malformed or incomplete metadata fails closed to `null` rather than being exposed as trusted traffic-calming evidence.

Within `/api/route-safety/predict`, the validated context is:

1. extracted from each `route_intelligence.metadata` object;
2. attached to the normalized intelligence input as `traffic_calming_context`;
3. propagated onto the route-threat object as `trafficCalmingContext`.

B-13 remains explanatory only.

The following scoring and decision behavior remains unchanged:

- `routeIncidentSeverityWeight`;
- `routeIncidentTypeWeight`;
- base route-threat score;
- geometry weighting;
- traffic weighting;
- `candidateThreatCount`;
- `threatRiskScore`;
- final route risk score;
- risk level;
- route-threat consolidation;
- duplicate-threat filtering;
- automatic escalation thresholds;
- automatic rerouting thresholds;
- road-risk aggregation;
- incident eligibility;
- telemetry promotion eligibility.

Traffic-calming context is therefore exposed to downstream route-safety consumers without becoming a scoring weight, corroboration factor, or route-selection rule.

The direct B-13 regression suite covers nine cases:

- valid speed-bump context;
- valid raised-intersection context;
- nullable provider attributes;
- absent context;
- unknown provider;
- unknown feature type;
- malformed provider feature identity;
- malformed status code;
- negative distance.

The registered HarborGuard test suite passed 160/160 with zero failures.

TypeScript validation passed with:

- `npx tsc --noEmit`

The production build passed successfully and generated all 124 static pages.

The final B-13 implementation commit changed exactly four files:

- `app/api/route-safety/predict/route.ts`
- `lib/route-safety/extractTrafficCalmingContext.ts`
- `package.json`
- `tests/extractTrafficCalmingContext.test.mjs`

The implementation commit contained:

- 212 insertions;
- 1 deletion.

Implementation commit `f3369a2` was pushed successfully to `origin/main`.

Local `main` and `origin/main` were verified at the same B-13 implementation commit before this documentation update began.

B-13 therefore completes the B-11 -> B-12 -> B-13 explanatory-evidence path:

`City traffic-calming context`
-> `vehicle_alerts.telemetry_evidence`
-> `route_intelligence.metadata`
-> `/api/route-safety/predict`
-> route threat `trafficCalmingContext`

without changing existing route-risk scoring or automated route-safety decisions.

The next Track B work item must begin with a fresh audit. No B-14 dataset, scoring change, operator UI change, predictive model change, route-selection rule, or City of Cape Town enrichment should be selected without first identifying one precise gap and its behavior-preserving insertion point.

---

# Engineering Progress Update - 14 August 2026

## City of Cape Town Municipal Data Integration - Consolidated Completion State

**Status:** Implemented, verified, committed, and pushed

**Current implementation baseline:** `e7b15d7`

**Branch:** `main`

**Remote state:** local `main` and `origin/main` verified synchronized at `e7b15d7`

### Objective

Record the completed HarborGuard City of Cape Town municipal-data integration work and distinguish clearly between:

1. City data that is connected to real HarborGuard application flows;
2. City context that improves route, telemetry, infrastructure, emergency, and environmental awareness;
3. explanatory/contextual data that deliberately does not yet modify production risk scoring.

The City integration work is not merely a collection of unused provider wrappers.

HarborGuard now consumes municipal data through real operational boundaries including:

- road-context enrichment;
- telemetry and traffic-calming evidence;
- promoted route intelligence;
- Route Safety prediction;
- route-wide environmental context;
- route-wide emergency-resource context;
- route-wide Koeberg emergency-planning context.

### Product impact

The City integration materially improves HarborGuard as a safety-intelligence SaaS by adding authoritative local context that generic navigation or basic fleet-tracking products do not necessarily provide.

The integrated municipal context improves:

- road identity and road semantics;
- interpretation of harsh-driving telemetry;
- permanent traffic-calming awareness;
- pedestrian-context awareness;
- road ownership and maintenance-authority awareness;
- environmental and drainage awareness;
- emergency-resource awareness;
- nuclear-emergency planning awareness;
- route explainability;
- future predictive-model inputs;
- future operator decision support.

These integrations deliberately separate factual municipal context from production risk policy.

A municipal feature is not automatically treated as danger merely because it exists near a route.

### City dataset integration state

#### TCT Road Centreline

**Status:** Integrated and operationally consumed.

HarborGuard uses City road context for authoritative road enrichment including applicable road identity and semantics such as:

- road name;
- road classification;
- speed-limit context where available;
- travel/direction context where available;
- road surface context where available;
- ownership or maintenance-authority enrichment where available.

This data strengthens HarborGuard's road-intelligence and provider-enrichment layer.

#### Traffic Calming - Speed Bumps

**Status:** Integrated and consumed.

City speed-bump context is used as factual traffic-calming evidence.

The established HarborGuard evidence path includes:

`City traffic-calming context`
-> `vehicle_alerts.telemetry_evidence`
-> `route_intelligence.metadata`
-> `/api/route-safety/predict`
-> route threat `trafficCalmingContext`

Speed-bump proximity therefore helps HarborGuard explain physical-road context around telemetry and route-intelligence events.

It does not independently increase route risk.

#### Traffic Calming - Raised Intersections

**Status:** Integrated and consumed.

Raised-intersection data participates in the same traffic-calming context boundary as speed bumps.

This improves explanation of harsh-driving and road-condition evidence while preserving existing detector and scoring semantics.

#### Pedestrian Crossings

**Status:** Integrated.

City pedestrian-crossing data is available as HarborGuard pedestrian and driving-context intelligence.

This creates a municipal evidence source for areas where pedestrian interaction is structurally more likely.

The integration remains context-aware rather than blindly treating every crossing as a dangerous location.

#### Road Ownership and Maintenance Authority

**Status:** Functionally integrated through road context.

HarborGuard carries ownership and maintenance-authority information where supplied by the audited City road-context source.

A separate standalone ownership provider is not required merely to duplicate authority information that is already available through the existing road context.

A future standalone City ownership layer should only be introduced if a new audit proves that it provides materially richer or more accurate authority information.

#### Road Classification

**Status:** Integrated through road-centreline context.

Road classification is already represented through the authoritative road-context integration and therefore does not require a duplicate classification provider without a newly identified gap.

### Stormwater and environmental infrastructure

HarborGuard now has multiple independent City environmental-context integrations.

They remain contextual and fail-open.

#### Open Watercourse

**Status:** Integrated into Route Safety.

HarborGuard can expose City open-watercourse context relevant to route geometry.

This provides useful environmental and future flood-prediction context.

#### Main Drainage

**Status:** Integrated into Route Safety.

HarborGuard resolves City main-drainage context against route geometry.

This expands environmental infrastructure awareness beyond generic weather information.

#### Drainage Catchment

**Status:** Integrated into Route Safety.

HarborGuard resolves City drainage-catchment context against the route.

This adds broader catchment-level environmental context useful for future flood and infrastructure modelling.

### Emergency-resource context

#### Fire Stations

**Status:** Integrated into Route Safety.

HarborGuard can resolve City fire-station context for route geometry.

This provides emergency-response resource awareness without treating proximity to a fire station as route risk.

#### Police Stations

**Status:** Integrated into Route Safety.

HarborGuard can resolve City police-station context for route geometry.

This provides emergency/security resource awareness while remaining context-only.

### Koeberg emergency-planning integration

The Koeberg municipal-data work is now represented by three complementary context families.

These features describe published emergency-planning geography.

They do not assert that an emergency, evacuation order, radiological event, road closure, or elevated route risk currently exists.

#### Koeberg Protective Action Zone

**Track B-27 route integration:** Complete.

**Implementation commit:** `b4b5fca`

HarborGuard performs route-wide PAZ sampling rather than relying on the route midpoint.

Behavior includes:

- valid route-coordinate filtering;
- preservation of route travel order;
- consecutive duplicate collapse;
- route-wide PAZ membership lookup;
- per-sample fail-open behavior;
- top-level `koebergProtectiveActionZoneContext`.

Risk scoring was not changed.

#### Koeberg Radii Planning

**Track B-28 route integration:** Complete.

**Implementation commit:** `fe06fd8`

HarborGuard evaluates valid route samples across the complete route and retains the valid context with the smallest encountered `planningDistanceKm`.

Behavior includes:

- full-route sampling;
- no midpoint-only semantics;
- invalid-coordinate filtering;
- consecutive duplicate collapse;
- minimum planning-distance selection;
- first route occurrence retained for equal minimum planning distances;
- per-sample fail-open behavior;
- top-level `koebergRadiiPlanningContext`.

Risk scoring was not changed.

#### Koeberg Evacuation Direction

**Track B-29 route integration:** Complete.

**Implementation commit:** `e7b15d7`

HarborGuard now evaluates the published City North, South, and East Koeberg evacuation-direction data across the complete route.

The underlying provider resolves the nearest published evacuation-direction feature for an individual coordinate.

The route-level integration then retains the context with the smallest valid `distanceMeters` encountered anywhere along the route.

Behavior includes:

- full-route sampling;
- no midpoint-only semantics;
- valid route-coordinate filtering;
- consecutive duplicate collapse;
- invalid provider-distance rejection;
- minimum `distanceMeters` selection;
- first route occurrence retained for equal route-level distance;
- provider-level North/South/East selection preserved;
- direction metadata preserved;
- route name/type metadata preserved;
- provider identity preserved;
- per-sample fail-open behavior;
- all-null/all-failure route returning `null`;
- top-level `koebergEvacuationDirectionContext`.

Risk scoring was not changed.

### Current Koeberg Route Safety response context

The completed Koeberg route-context sequence is now:

`koebergProtectiveActionZoneContext`
-> `koebergRadiiPlanningContext`
-> `koebergEvacuationDirectionContext`

All three are exposed as additive Route Safety context.

### Context versus production scoring

An important architectural decision was preserved throughout the City integration work.

The following municipal context does not automatically become production risk weight merely because it is present:

- traffic-calming infrastructure;
- pedestrian infrastructure;
- watercourses;
- drainage infrastructure;
- drainage catchments;
- fire stations;
- police stations;
- Koeberg planning geography.

This avoids false risk inflation.

For example:

- proximity to a speed bump can help explain harsh braking;
- proximity to drainage infrastructure can contribute future flood-model context;
- proximity to a fire or police station describes resource availability;
- presence inside Koeberg planning geography describes published emergency-planning context.

None of those facts independently proves an active hazard.

Any future change that allows one of these datasets to modify `threatRiskScore`, weather risk, traffic risk, overall route risk, escalation, or rerouting must begin with a separate audit and must be supported by evidence.

### Existing scoring behavior preserved

The City integration track did not use the later contextual integrations to redefine existing production:

- `threatRiskScore`;
- `weatherRiskScore`;
- `trafficRiskScore`;
- weather contribution;
- traffic contribution;
- route threat sorting;
- automatic escalation thresholds;
- automatic rerouting thresholds;
- route prediction persistence semantics.

The municipal integrations therefore improve HarborGuard's factual and explanatory intelligence without introducing uncontrolled scoring behavior.

### Regression and verification state

The final B-29 implementation was verified together with the existing City/Koeberg route context.

At the final City implementation checkpoint:

- focused B-29 route regression passed;
- B-26 evacuation provider regression passed;
- B-27 PAZ regression remained green;
- B-28 Radii regression remained green;
- existing route-context regressions remained green;
- the complete registered HarborGuard test suite passed;
- TypeScript validation passed;
- the Next.js production build passed;
- diff hygiene passed;
- UTF-8 BOM hygiene passed;
- the exact B-29 four-file scope was verified;
- local `main` and `origin/main` were synchronized after push.

### Final City implementation commit

The final City integration implementation checkpoint is:

`e7b15d7 feat: integrate Koeberg evacuation direction route context`

The B-29 commit changed exactly:

- `app/api/route-safety/predict/route.ts`;
- `lib/route-safety/resolveRouteKoebergEvacuationDirectionContext.ts`;
- `package.json`;
- `tests/resolveRouteKoebergEvacuationDirectionContext.test.mjs`.

### City of Cape Town integration status

**City of Cape Town Integration Track: COMPLETE**

The originally identified high-value municipal-data categories are now substantially represented inside HarborGuard.

The remaining work should no longer be framed primarily as "integrate City of Cape Town data."

Future work should instead ask more specific product questions such as:

- Which municipal contexts should be displayed directly to dispatchers?
- Which should appear on the Route Safety map?
- Which contextual features have enough evidence to become predictive features?
- Which should remain explanatory only?
- Should a dedicated Road Ownership dataset add anything beyond current road-authority enrichment?
- How should drainage and weather context eventually combine into a defensible flood-prediction model?
- How should emergency-resource context support response recommendations?
- How should Koeberg planning context be surfaced in operator and driver experiences without implying a live emergency?

Each of those must begin with a fresh audit before implementation.

### Documentation state

This section consolidates the City of Cape Town integration state after completion of B-29.

Earlier Engineering Master entries remain authoritative for their individual implementation milestones and validation evidence.

This consolidated section provides the current product-level view so a future HarborGuard development session does not incorrectly assume that these municipal datasets still need initial provider integration.

### Next recommended engineering step

Do not immediately add another City dataset merely to expand the provider count.

Begin the next roadmap decision with a fresh audit of the now-completed HarborGuard municipal context layer and identify the highest-value remaining product gap.

Potential candidates include:

- operator-facing visualization of the newly available route contexts;
- evidence-based predictive use of drainage/environmental context;
- emergency-resource recommendation UX;
- map representation of contextual infrastructure;
- validation of City-context behavior against real routes;
- broader production-readiness work.

No new risk-scoring formula should be introduced merely because the City integration track is complete.

---

---

# Engineering Progress Update - 14 August 2026

## Post-City Product Feature - Operator Municipal Route Context

**Status:** Complete

**Implementation commit:** `9e92382`

**Commit message:** `feat: surface municipal route context in command center`

**Branch:** `main`

### Objective

Convert the completed City of Cape Town backend municipal-context integrations into directly useful operator-facing HarborGuard intelligence.

The implementation surfaces existing municipal route context inside the Command Center Route Safety Prediction experience without changing production risk scoring, rerouting, escalation, API behavior, or database state.

### Product value

This milestone closes an important product gap between backend municipal intelligence and the operator experience.

Previously, HarborGuard's Route Safety API could resolve and return City of Cape Town context, but the Command Center did not visibly consume those fields.

Operators can now see relevant municipal context while reviewing a route prediction.

This improves:

- route explainability;
- environmental infrastructure awareness;
- emergency-resource awareness;
- Koeberg emergency-planning awareness;
- practical value from the completed City integration track;
- operator decision support.

### UI location

The feature is implemented in:

`app/command-center/sections/CommandCenterRouteSafetySection.tsx`

The new panel appears in the existing Route Safety Prediction result before the live-weather section.

### Municipal Route Context panel

A new operator-facing section is rendered as:

`Municipal Route Context`

The panel is displayed only when at least one supported municipal context is available.

If all municipal contexts are `null`, the panel is hidden rather than displaying empty placeholders.

The panel includes a:

`CONTEXT ONLY`

status badge.

The explanatory copy explicitly states that the municipal details are informational and do not change the HarborGuard route risk score.

### Environmental infrastructure context

The panel can display:

- Open Watercourse context;
- Main Drainage context;
- Drainage Catchment context.

Operator-facing details may include relevant names, descriptions, asset types, catchments, areas, and route-relative distance where available.

These remain contextual.

Their presence does not independently assert flooding or route danger.

### Emergency-resource context

The panel can display:

- Fire Station context;
- Police Station context.

Useful operator-facing metadata includes station identity, available classification or cluster information, and route-relative distance where available.

Proximity to emergency resources remains informational and does not independently increase route risk.

### Koeberg emergency-planning context

The panel can display all three completed Koeberg route-context families:

- `koebergProtectiveActionZoneContext`;
- `koebergRadiiPlanningContext`;
- `koebergEvacuationDirectionContext`.

The UI explicitly labels this as:

`Koeberg emergency-planning context`

and warns operators that published planning geography does not indicate:

- an active emergency;
- an evacuation order;
- a radiological condition;
- a road closure.

This preserves the context-versus-live-emergency boundary established during the City integration work.

### City contexts now surfaced in Command Center

The operator Route Safety UI now consumes all eight route-level municipal context fields:

1. `openWatercourseContext`
2. `mainDrainageContext`
3. `drainageCatchmentContext`
4. `fireStationContext`
5. `policeStationContext`
6. `koebergProtectiveActionZoneContext`
7. `koebergRadiiPlanningContext`
8. `koebergEvacuationDirectionContext`

### Architectural scope

This milestone required only a Command Center UI change.

No changes were required to:

- `/api/route-safety/predict`;
- route-context providers;
- route-context resolvers;
- database schema;
- migrations;
- risk-scoring logic;
- rerouting logic;
- escalation logic.

The existing `routePrediction` object already retained the complete prediction response, allowing this feature to consume the municipal context without introducing another backend contract.

### Exact implementation scope

The implementation commit changed exactly one file:

- `app/command-center/sections/CommandCenterRouteSafetySection.tsx`

The implementation added 280 lines.

### Verification evidence

Before commit and push, the implementation was verified with:

- exact one-file scope;
- all eight City context references present;
- backend/scoring/database boundaries unchanged;
- `git diff --check`;
- full HarborGuard registered test suite;
- TypeScript validation;
- production Next.js build;
- clean staged snapshot.

The full test suite passed:

`352 / 352`

TypeScript validation passed.

The production Next.js build completed successfully.

### Final repository state

Implementation commit:

`9e92382 feat: surface municipal route context in command center`

After push:

- local `HEAD`: `9e92382`;
- `origin/main`: `9e92382`;
- branch: `main`;
- tracked repository: clean;
- index: clean;
- local and remote: synchronized.

### Scoring and automation boundary

This feature is visualization and operator intelligence only.

It does not change:

- `threatRiskScore`;
- `weatherRiskScore`;
- `trafficRiskScore`;
- overall route risk;
- rerouting decisions;
- escalation behavior;
- automated incident behavior.

Any future decision to promote municipal context into predictive or scoring features requires a separate evidence-based audit.

### Current product state

The completed City of Cape Town integration is no longer backend-only.

HarborGuard now exposes a meaningful portion of its municipal route intelligence directly to Command Center operators during Route Safety prediction.

The completed path is:

`City municipal source`
-> provider
-> route resolver
-> `/api/route-safety/predict`
-> Command Center `routePrediction`
-> operator-facing Municipal Route Context

### Next recommended step

Do not add another municipal provider by default.

Begin the next feature with a fresh audit of operator value.

Strong candidate directions include:

- map visualization of municipal route context;
- operator drill-down or context details;
- validation of municipal context against real production routes;
- evidence-based flood prediction using weather plus drainage context;
- emergency-resource response recommendations;
- stronger typing for the Route Safety prediction client contract.

No scoring changes should be introduced without a separate audit.

---
## C-1A Anonymous Journey Exposure Persistence implemented

**Status:** Implemented, source-verified, committed, and pushed

**Baseline commit:** `0e8e7c0`

**Implementation commit:** `57b7e47` - `feat: add anonymous journey exposure foundation`

### Purpose

Begin the Crowd Intelligence exposure-denominator foundation without changing existing production Route Safety scoring.

HarborGuard already persisted adverse road-risk evidence through `road_risk_segments`, but it did not persist a privacy-separated denominator describing how completed journeys traverse road segments.

C-1A introduces that first anonymous journey-exposure persistence layer.

### Database foundation

Added migration:

`supabase/migrations/20260814090000_create_crowd_segment_traversals.sql`

The migration introduces:

`public.crowd_segment_traversals`

Each persisted row represents one anonymous completed-trip traversal bucket for:

- a canonical HarborGuard road `segment_key`;
- movement direction;
- UTC hour;
- observed date;
- one anonymous trip-scoped token.

The table stores:

- `segment_key`;
- `direction_bucket`;
- `hour_bucket`;
- `observed_date`;
- `trip_token`;
- `sample_count`;
- `first_seen_at`;
- `last_seen_at`;
- `created_at`.

### Existing segment identity reused

C-1A does not introduce a competing road segmentation model.

The helper uses the same three-decimal rounded-coordinate identity already used by HarborGuard road-risk intelligence:

`latitude.toFixed(3):longitude.toFixed(3)`

This keeps the new exposure layer compatible with the existing rounded-coordinate road-risk segment model.

### Privacy boundary

The shared crowd traversal table intentionally excludes raw:

- `user_id`;
- `vehicle_id`;
- `organization_id`;
- `trip_id`.

A deterministic SHA-256 trip-scoped token is stored only for repeat-safe persistence.

The token is derived from the trip identifier but the raw trip identifier is not written into the shared crowd table.

### Database access boundary

Row Level Security is enabled on `crowd_segment_traversals`.

Direct table access is revoked from:

- `anon`;
- `authenticated`.

The table is granted only to:

`service_role`

The existing authenticated or tenant-scoped Supabase client remains responsible for validating and reading the private source journey data.

Only the privacy-separated crowd persistence operation is elevated through the existing:

`supabaseAdmin`

service-role client.

### Source journey validation

Added:

`lib/fleet/createAnonymousJourneyExposure.ts`

Before creating anonymous exposure observations, the helper verifies the source trip using:

- `tripId`;
- `organizationId`;
- `vehicleId`;
- delivered status;
- persisted `actual_departure`;
- persisted `actual_arrival`.

Location evidence is then read from `vehicle_locations` for the exact organization, vehicle, trip, and completed-trip observation window.

Invalid coordinates and invalid timestamps are discarded.

A minimum of two valid location points is required.

### Traversal derivation

For each pair of consecutive accepted GPS observations, C-1A derives movement bearing from the actual coordinate movement.

The bearing is mapped into one of eight directional buckets:

- north;
- north-east;
- east;
- south-east;
- south;
- south-west;
- west;
- north-west.

The traversal is then bucketed by:

- rounded road segment;
- movement direction;
- UTC hour;
- observed date.

Repeated GPS observations in the same trip/segment/direction/hour/date bucket are accumulated through `sample_count`.

The first and last observation timestamps are retained for the bucket.

### Idempotency

The database has a unique traversal key across:

- `trip_token`;
- `segment_key`;
- `direction_bucket`;
- `hour_bucket`;
- `observed_date`.

Persistence uses an upsert against that key.

This makes repeated completed-trip processing repeat-safe for the same anonymous journey exposure bucket.

### Completed-trip lifecycle integration

Updated:

`lib/fleet/runPostLocationUpdateLifecycle.ts`

Anonymous journey exposure creation now runs only after successful completed-trip outcome creation.

If completed-trip outcome creation is skipped, the C-1A exposure path is not invoked.

When outcome creation succeeds, HarborGuard now attempts:

`createAnonymousJourneyExposure(...)`

before the existing completed-trip prediction evaluation.

### Failure isolation

Crowd exposure persistence is intentionally best-effort.

A failure in anonymous exposure creation is logged as:

`Anonymous journey exposure creation failed:`

but does not prevent the existing completed-trip prediction evaluator from running.

This prevents the Crowd Intelligence learning layer from becoming an operational dependency of the trip-completion lifecycle.

### Production semantics preserved

C-1A does not change:

- `road_risk_segments`;
- existing adverse-event aggregation;
- Route Safety production threat scoring;
- Route Safety risk levels;
- traffic weighting;
- weather weighting;
- route soft-cap production behavior;
- automatic rerouting thresholds;
- automatic escalation thresholds;
- completed-trip outcome semantics;
- canonical completed-trip prediction evaluation semantics.

No machine-learning scoring model was introduced.

No route-ranking or route-selection behavior was changed.

### Exact implementation scope

Implementation commit `57b7e47` contains exactly:

- `lib/fleet/createAnonymousJourneyExposure.ts`;
- `lib/fleet/runPostLocationUpdateLifecycle.ts`;
- `supabase/migrations/20260814090000_create_crowd_segment_traversals.sql`.

Source diff:

`3 files changed, 450 insertions(+)`

### Verification completed

Before commit and push:

- exact three-file scope was verified;
- the privacy schema excluded raw user, vehicle, organization, and trip identifiers;
- the source trip read remained tenant-scoped;
- the source vehicle-location read remained tenant-scoped;
- the shared crowd write was verified to use `supabaseAdmin`;
- the crowd table remained service-role-only;
- TypeScript validation passed with `npx tsc --noEmit`;
- the production Next.js build passed with `npm run build`;
- the production build generated all `124/124` static pages successfully;
- the staged snapshot contained exactly the three intended C-1A files.

### Repository state

Implementation commit:

`57b7e47 feat: add anonymous journey exposure foundation`

The implementation was pushed successfully to `origin/main`.

After push:

- local `HEAD`: `57b7e47`;
- `origin/main`: `57b7e47`;
- branch: `main`;
- tracked working tree: clean;
- index: clean.

### Runtime validation status

Production runtime validation has not yet been completed for C-1A.

The source implementation and migration are committed and pushed, but a real completed journey has not yet been used to prove the complete deployed persistence path.

Do not treat the existence of implementation commit `57b7e47` as evidence that production traversal rows have already been generated.

### Next engineering step

After this documentation update is committed and pushed, perform a focused C-1A deployment/runtime validation before beginning the next Crowd Intelligence implementation item.

That validation should verify:

- the C-1A migration is applied in the target environment;
- `crowd_segment_traversals` exists with the intended RLS and grants;
- a legitimately completed trip invokes the existing completed-trip lifecycle;
- private source reads remain organization and vehicle scoped;
- anonymous traversal rows are created through the service-role persistence boundary;
- no raw `user_id`, `vehicle_id`, `organization_id`, or `trip_id` is stored in the crowd table;
- the persisted `segment_key` uses the existing three-decimal rounded-coordinate identity;
- direction, UTC hour, observed date, sample count, and observation timestamps are populated correctly;
- reprocessing the same completed trip does not create duplicate traversal buckets;
- completed-trip prediction evaluation continues normally;
- Route Safety production scoring remains unchanged.

Only after C-1A runtime validation is documented should the next Crowd Intelligence roadmap item begin.

---

## C-1A deployment and runtime access validation completed

**Status:** Deployed and runtime access controls verified; end-to-end journey persistence validation deferred pending eligible real journey evidence.

### Remote migration deployment

The C-1A migration was successfully applied to the linked remote Supabase project:

`20260814090000_create_crowd_segment_traversals.sql`

After deployment, Supabase migration history reported:

`20260814090000 | 20260814090000 | 2026-08-14 09:00:00`

A subsequent `supabase db push --dry-run` reported:

`Remote database is up to date.`

This verifies that the C-1A migration is present in both local and remote migration history and that no local migrations remained pending after deployment.

### Runtime table and access validation

The deployed `public.crowd_segment_traversals` table was queried through the configured HarborGuard Supabase clients.

Service-role access succeeded with no database error.

The table contained zero traversal rows at the time of validation.

An anonymous client read was rejected with:

- HTTP status `401 Unauthorized`;
- PostgreSQL error code `42501`;
- `permission denied for table crowd_segment_traversals`.

This runtime result confirms that direct anonymous access to the shared crowd table is blocked while HarborGuard's service-role persistence boundary can access the deployed table.

### Real completed-trip evidence audit

Existing delivered trips were searched for trip-linked `vehicle_locations` within their persisted `actual_departure` to `actual_arrival` windows.

The recent delivered trips contained either zero or one matching location observation.

A broader search across up to 500 delivered trips found no completed trip containing at least two matching trip-linked GPS observations.

The audit result was:

`NO_ELIGIBLE_COMPLETED_TRIPS`

C-1A requires at least two valid location observations because movement between consecutive observations is required to derive anonymous segment traversal direction.

### Deferred end-to-end validation

The following C-1A behaviors therefore remain unproven against a legitimate completed journey:

- creation of anonymous `crowd_segment_traversals` rows from a real completed trip;
- persisted segment, direction, UTC-hour, observed-date, count, and timestamp values;
- repeat-safe upsert/idempotency when the same completed trip is processed again;
- continued completed-trip prediction evaluation during an actual successful crowd persistence event.

These checks were not forced using fabricated production journey data.

They should be completed when a legitimate completed trip contains at least two valid trip-linked GPS observations, or in an appropriate controlled non-production environment with representative journey evidence.

### C-1A validation conclusion

C-1A is now:

- source implemented;
- TypeScript verified;
- production-build verified;
- committed and pushed;
- remote migration deployed;
- local and remote migration history synchronized;
- deployed table existence verified through successful service-role access;
- anonymous table access denial runtime-verified;
- production table confirmed initially empty;
- end-to-end real-journey persistence and idempotency deferred because no eligible completed journey currently exists.

Do not record the deferred real-journey persistence and idempotency checks as passed until suitable journey evidence exists.

---

## C-1B Crowd Segment Exposure Aggregation implemented

**Status:** Implemented, committed, deployed, and runtime-validated against the current empty C-1A source state.

### Implementation

C-1B adds the durable privacy-separated aggregate layer above `public.crowd_segment_traversals`.

Migration:

`20260814112530_create_crowd_segment_exposure_stats.sql`

Implementation commit:

`5289980 feat: add crowd segment exposure aggregation`

The implementation introduces:

- `public.crowd_segment_exposure_stats`;
- one aggregate row per `segment_key + direction_bucket + hour_bucket + observed_date`;
- `traversal_count` as the count of anonymous completed-trip traversal buckets;
- `sample_count` as the summed accepted GPS evidence across those traversal buckets;
- `first_observed_at` and `last_observed_at` observation bounds;
- unique bucket identity for repeat-safe aggregation;
- segment/time lookup indexes;
- RLS with direct `anon` and `authenticated` table access revoked;
- service-role table access;
- `public.aggregate_crowd_segment_exposure_stats(date, date)` for idempotent aggregate recomputation;
- optional inclusive observed-date boundaries;
- service-role-only function execution.

The aggregate table does not store `trip_token`, `trip_id`, `vehicle_id`, `organization_id`, or `user_id`.

C-1B therefore moves the shared intelligence layer further away from identifiable journey evidence rather than reintroducing private identifiers.

### Aggregation semantics

The aggregation RPC recomputes aggregate values from `crowd_segment_traversals` and upserts the computed result into `crowd_segment_exposure_stats`.

For each segment, direction, UTC hour, and observed-date bucket:

- `traversal_count` = `COUNT(*)` of anonymous traversal buckets;
- `sample_count` = `SUM(sample_count)`;
- `first_observed_at` = `MIN(first_seen_at)`;
- `last_observed_at` = `MAX(last_seen_at)`.

The function does not blindly increment aggregate counters. Re-running aggregation against unchanged source observations therefore recomputes the same factual aggregate state.

C-1B does not modify `road_risk_segments` or Route Safety production scoring.

### Source verification

Before commit and deployment:

- the change was limited to the single C-1B migration;
- forbidden identity-field checks returned no matches;
- TypeScript validation passed with `npx tsc --noEmit`;
- the production Next.js build passed;
- all `124/124` static pages were generated successfully;
- the Supabase deployment dry run identified only the C-1B migration as pending.

### Remote deployment

The C-1B migration was successfully applied to the linked remote Supabase project.

After deployment, migration history reported:

`20260814112530 | 20260814112530 | 2026-08-14 11:25:30`

A subsequent `supabase db push --dry-run` reported:

`Remote database is up to date.`

### Runtime validation

Service-role access to `crowd_segment_exposure_stats` succeeded:

- HTTP status `200`;
- database error `null`;
- aggregate row count `0`.

The aggregation RPC was invoked successfully against the current production source state:

- HTTP status `200`;
- database error `null`;
- returned `aggregated_rows: 0`.

This zero-row result is expected because `crowd_segment_traversals` currently contains no legitimate completed-trip traversal observations.

Anonymous access to `crowd_segment_exposure_stats` was rejected at runtime:

- HTTP status `401 Unauthorized`;
- PostgreSQL error code `42501`;
- `permission denied for table crowd_segment_exposure_stats`.

This verifies the intended service-role-only access boundary in the deployed environment.

### Deferred non-zero aggregation validation

C-1B has not yet been validated with non-zero legitimate source observations because the upstream C-1A production table remains empty.

The following checks therefore remain deferred:

- aggregation of one or more legitimate anonymous C-1A traversal rows into non-zero C-1B statistics;
- exact non-zero `traversal_count` and `sample_count` correctness against real journey evidence;
- real-data `first_observed_at` and `last_observed_at` correctness;
- repeated RPC execution against non-zero unchanged source data producing stable aggregate values.

Do not record those non-zero-data checks as passed until legitimate C-1A traversal evidence exists or they are proven in an appropriate controlled non-production environment.

### C-1B conclusion

C-1B is now:

- implemented;
- TypeScript verified;
- production-build verified;
- committed and pushed as `5289980`;
- remote migration deployed;
- local and remote migration history synchronized;
- service-role table access runtime-verified;
- anonymous table access denial runtime-verified;
- empty-source aggregation RPC behavior runtime-verified;
- isolated from existing Route Safety production scoring;
- awaiting legitimate non-zero C-1A evidence for final non-zero aggregation and idempotency validation.

---

## C-1 controlled non-zero lifecycle validation completed

**Status:** C-1A non-zero lifecycle persistence verified with controlled representative journey evidence; C-1B non-zero aggregation and repeated-RPC idempotency verified.

### Controlled validation method

A controlled HarborGuard trip was created through the normal authenticated application API lifecycle rather than by inserting crowd-intelligence rows directly into Supabase.

The controlled validation used:

- the existing `/api/fleet/start-trip` route;
- the existing `/api/fleet/update-location` route;
- a real authenticated HarborGuard owner/admin/operator session;
- an existing organization-scoped vehicle;
- four accepted manual location observations;
- the normal delivered trip-status transition;
- the existing post-location completed-trip lifecycle;
- the deployed C-1A and C-1B production database objects.

The controlled trip ID was:

`cce1f24f-2d31-49d7-b72f-acc252765037`

The selected validation vehicle was:

`8c97bf76-be64-4d05-ad1b-e7b2176c39a2`

The trip completed through the normal lifecycle with persisted status `delivered`.

The persisted trip window was:

- `actual_departure`: `2026-08-14T11:45:35.634+00:00`;
- `actual_arrival`: `2026-08-14T11:51:35.634+00:00`.

Four trip-linked `vehicle_locations` rows were verified for the completed trip.

### C-1A non-zero persistence result

The completed-trip lifecycle created anonymous `crowd_segment_traversals` evidence successfully.

Three anonymous traversal buckets were verified for the completed trip:

- `-33.918:18.424` / direction bucket `2` / UTC hour `11` / observed date `2026-08-14`;
- `-33.918:18.425` / direction bucket `2` / UTC hour `11` / observed date `2026-08-14`;
- `-33.918:18.426` / direction bucket `2` / UTC hour `11` / observed date `2026-08-14`.

Each traversal row had `sample_count = 1` and the expected observation timestamp for its accepted GPS sample.

This proves that C-1A can persist non-zero anonymous completed-trip journey exposure through HarborGuard's normal delivered-trip lifecycle.

The persisted segment keys use the existing three-decimal HarborGuard coordinate-grid identity.

The direction bucket value `2` corresponds to eastbound movement under the existing eight-way C-1 direction model.

### C-1B non-zero aggregation result

The deployed `aggregate_crowd_segment_exposure_stats` RPC was executed successfully after C-1A persistence.

The RPC returned:

`aggregated_rows: 3`

Each C-1A traversal bucket had one matching row in `crowd_segment_exposure_stats`.

For all three matching aggregate rows:

- `traversal_count = 1`;
- `sample_count = 1`;
- `first_observed_at` matched the source `first_seen_at`;
- `last_observed_at` matched the source `last_seen_at`;
- segment, direction, UTC hour, and observed-date identity matched the C-1A source bucket exactly.

### C-1B repeated-RPC idempotency

The aggregation RPC was then executed twice against unchanged source observations.

Both executions completed without database error and each returned:

`aggregated_rows: 3`

The aggregate rows before the repeated executions, after the first execution, and after the second execution were identical in their factual aggregate values.

The explicit validation result was:

`IDEMPOTENT= true`

This closes the previously deferred C-1B non-zero aggregation and repeated-RPC idempotency validation condition.

### Remaining C-1A validation condition

One narrower C-1A runtime check remains open.

The controlled validation proved that a legitimate delivered lifecycle invocation creates anonymous traversal rows, but the same completed trip has not yet been explicitly reprocessed through `createAnonymousJourneyExposure()` twice to demonstrate runtime repeat-safe persistence of the C-1A source layer itself.

C-1A is designed for repeat-safe persistence through the unique bucket identity:

`trip_token + segment_key + direction_bucket + hour_bucket + observed_date`

and the helper uses an upsert on that identity.

However, do not record C-1A source reprocessing idempotency as runtime-passed until the same completed trip is deliberately reprocessed in an appropriate controlled validation path and confirmed not to create duplicate traversal buckets.

### Validation interpretation

This was a controlled lifecycle validation using representative manual GPS observations accepted through HarborGuard's normal update-location pipeline.

It was not a naturally collected live telematics journey, and it did not bypass the application lifecycle by directly inserting C-1A or C-1B rows.

No production Route Safety scoring behavior was changed.

### C-1 status after controlled validation

C-1A now has runtime proof of:

- authenticated normal-trip lifecycle traversal;
- delivered-trip transition;
- four persisted trip-linked location observations;
- non-zero anonymous traversal persistence;
- expected segment identity;
- expected direction bucket;
- expected UTC-hour and observed-date buckets;
- expected sample and observation timestamps.

C-1B now has runtime proof of:

- non-zero aggregate generation from legitimate C-1A source rows;
- exact matching aggregate bucket identity;
- correct non-zero traversal counts;
- correct non-zero sample counts;
- correct first and last observation timestamps;
- repeat-safe RPC recomputation against unchanged source data.

The only remaining C-1 validation item is explicit runtime reprocessing idempotency of the C-1A source helper itself.

---

## C-1A runtime reprocessing idempotency validated

**Status:** PASS. The final outstanding controlled-runtime validation condition for C-1 is closed.

### Validation target

The previously completed controlled trip was deliberately reprocessed through the real `createAnonymousJourneyExposure()` helper twice.

No new trip was created for this validation.

Controlled trip:

`cce1f24f-2d31-49d7-b72f-acc252765037`

Controlled vehicle:

`8c97bf76-be64-4d05-ad1b-e7b2176c39a2`

The validation invoked the existing production helper rather than manually inserting rows into `crowd_segment_traversals`.

### Baseline

Before reprocessing, the controlled trip had exactly three anonymous C-1A traversal rows.

Validation result:

`BEFORE COUNT= 3`

The three persisted buckets remained:

- `-33.918:18.424` / direction bucket `2` / UTC hour `11` / observed date `2026-08-14`;
- `-33.918:18.425` / direction bucket `2` / UTC hour `11` / observed date `2026-08-14`;
- `-33.918:18.426` / direction bucket `2` / UTC hour `11` / observed date `2026-08-14`.

Each bucket had `sample_count = 1`.

### First explicit reprocessing

The real `createAnonymousJourneyExposure()` helper was executed again against the same completed trip, organization, and vehicle.

The helper returned:

`RUN1 RESULT= { created: 3, skipped: false }`

After that execution, the persisted source-layer row count remained:

`AFTER RUN1 COUNT= 3`

The before and after row snapshots were identical.

Validation result:

`FIRST REPROCESS STABLE= true`

The helper's `created: 3` result represents the three calculated rows passed through the helper's upsert path; it did not produce three additional persisted traversal rows.

### Second explicit reprocessing

The same helper was immediately executed a second time against the same completed trip.

The helper returned:

`RUN2 RESULT= { created: 3, skipped: false }`

The persisted source-layer row count again remained:

`AFTER RUN2 COUNT= 3`

The row snapshot after the first reprocessing and the row snapshot after the second reprocessing were identical.

Validation result:

`SECOND REPROCESS STABLE= true`

### C-1A idempotency result

The explicit final validation result was:

`C1A IDEMPOTENT= true`

Across the baseline and both deliberate reprocessing executions:

- traversal row count remained exactly three;
- no duplicate traversal buckets were created;
- persisted row IDs remained stable;
- `segment_key` remained stable;
- `direction_bucket` remained stable;
- `hour_bucket` remained stable;
- `observed_date` remained stable;
- `trip_token` remained stable;
- `sample_count` remained stable;
- `first_seen_at` remained stable;
- `last_seen_at` remained stable.

This provides controlled-runtime proof that repeated processing of the same completed trip does not duplicate or alter the existing anonymous C-1A traversal buckets.

### Repository state after validation

The validation used transient execution tooling only.

No tracked HarborGuard source file was modified by the runtime validation.

After validation:

- `DOTENV_CONFIG_PATH` was removed from the PowerShell environment;
- tracked Git status was clean;
- no new application feature or Route Safety behavior was introduced.

### C-1 closure

The previously open C-1A source reprocessing-idempotency condition is now passed.

C-1A controlled-runtime validation now covers:

- deployed schema and access boundaries;
- authenticated normal completed-trip lifecycle execution;
- non-zero anonymous traversal persistence;
- expected segment identity;
- expected direction bucketing;
- expected UTC-hour and observed-date bucketing;
- expected sample and observation timestamps;
- repeated source-helper processing of the same completed trip;
- stable persisted row identity across repeated processing;
- absence of duplicate traversal buckets.

C-1B controlled-runtime validation covers:

- deployed aggregate schema and RPC;
- non-zero aggregation from legitimate C-1A source rows;
- exact aggregate bucket identity;
- correct traversal and sample counts;
- correct first and last observation timestamps;
- repeated-RPC idempotency against unchanged source evidence.

Therefore the C-1 controlled-runtime validation sequence is complete.

Do not interpret this controlled validation as naturally collected production telematics evidence. The validation used representative location observations passed through HarborGuard's normal authenticated trip lifecycle.

With C-1 implementation, deployment, documentation, non-zero lifecycle validation, C-1A reprocessing idempotency, and C-1B aggregation idempotency complete, the engineering workflow may proceed to the next Crowd Intelligence roadmap item after this documentation update is committed and pushed.

---

## C-1C1 authoritative road-risk event time preservation completed

**Status:** PASS. Authoritative adverse-event occurrence time is now durably preserved in the road-risk event ledger.

### Why this change was required

Before C-1C1, `aggregate_road_risk_intelligence` already received an authoritative `p_event_at` value from each producer, but `road_risk_segment_events` persisted only ledger `created_at`.

That meant downstream event-per-exposure analysis could not safely group historical adverse events by real occurrence time without falling back to ingestion time or source-specific metadata.

### Implementation

Implementation commit:

`7f1a66b fix: preserve road risk event time`

Migration:

`supabase/migrations/20260814151000_preserve_road_risk_event_time.sql`

The migration:

- added `event_at timestamptz` to `road_risk_segment_events`;
- conservatively backfilled existing rows from ledger `created_at`;
- made `event_at` non-null;
- added a `road_risk_segment_id, event_at desc` index;
- preserved the existing `aggregate_road_risk_intelligence` signature;
- preserved authenticated and service-role RPC execution permissions;
- updated the event-ledger insert so new rows persist `coalesce(p_event_at, now())`;
- preserved the existing `organization_id + route_intelligence_id` idempotency boundary.

No TypeScript, API, UI, predictor, reroute, or Route Safety scoring consumer was changed.

### Deployment validation

The migration was applied successfully to the linked Supabase project.

Remote migration state confirmed:

`20260814151000 | 20260814151000`

A subsequent dry-run reported:

`Remote database is up to date.`

### Existing-row backfill validation

Existing `road_risk_segment_events` rows were queried after deployment.

Validation results:

`NULL EVENT_AT= 0`

`BACKFILL MATCH COUNT= 2`

Both pre-C-1C1 ledger rows had `event_at` equal to their existing `created_at` value, as intended by the conservative backfill policy.

This backfill is explicitly provenance-limited: it does not claim that pre-C-1C1 `created_at` values represent original event occurrence time.

### Controlled runtime event-time persistence validation

A temporary controlled `route_intelligence` record was created with a deliberately distinct authoritative event timestamp:

`2026-08-14T10:15:30.000Z`

The real deployed `aggregate_road_risk_intelligence` RPC was then invoked with that value as `p_event_at`.

The resulting temporary `road_risk_segment_events` row persisted:

`created_at = 2026-08-14T15:17:09.785987+00:00`

`event_at   = 2026-08-14T10:15:30+00:00`

The explicit runtime comparison result was:

`EVENT_AT MATCH= true`

and:

`C1C1 EVENT TIME PRESERVATION= true`

This proves that newly aggregated road-risk evidence now preserves the authoritative adverse-event occurrence time independently from ledger creation time.

### Controlled validation cleanup

The temporary validation evidence was removed after the runtime proof.

Cleanup results:

`REMAINING LEDGER ROWS= 0`

`REMAINING ROUTE INTELLIGENCE ROWS= 0`

`REMAINING SEGMENT ROWS= 0`

No permanent synthetic road-risk evidence remained after validation.

### Verification completed

Before implementation commit and deployment:

- the migration scope was limited to one SQL file;
- the modified ledger insert was verified;
- the RPC signature was unchanged;
- the service-role grant remained intact;
- `supabase db push --dry-run` identified only the intended migration;
- `npx tsc --noEmit` passed;
- `npm run build` passed;
- the production build generated all `124/124` static pages successfully.

After deployment:

- the remote migration was present;
- the remote database was up to date;
- existing rows had non-null `event_at` values;
- new runtime evidence preserved the supplied `p_event_at` exactly;
- temporary validation rows were fully cleaned up;
- tracked Git status remained clean.

### C-1C1 closure

C-1C1 is complete at the implementation, deployment, backfill, and controlled-runtime-validation levels.

The event-time preservation boundary required for descriptive event-per-exposure analysis is now available.

The next Crowd Intelligence implementation may now proceed to the descriptive numerator/exposure layer, but production Route Safety scoring should remain unchanged until that later layer is explicitly audited and validated.

---

## C-1C2 descriptive event-per-exposure normalization completed

**Status:** PASS. The first descriptive adverse-event-per-exposure normalization layer is implemented, deployed, access-restricted, and runtime validated.

### Implementation boundary

C-1C2 intentionally remains descriptive-only.

It does not alter Route Safety scoring, rerouting, prediction, UI behavior, or any production safety decision.

The implementation is a non-persistent SQL RPC rather than a new durable aggregate table.

Implementation commit:

`a672b3d feat: add crowd event exposure normalization`

Migration:

`supabase/migrations/20260814153500_create_crowd_event_exposure_rpc.sql`

RPC:

`public.get_crowd_event_exposure_stats(date, date)`

### Descriptive evidence model

The numerator is sourced from `road_risk_segment_events` and uses the durable authoritative `event_at` established by C-1C1.

Adverse events are grouped by:

- canonical `segment_key`;
- UTC event date;
- UTC event hour.

The denominator is sourced from `crowd_segment_exposure_stats`.

Because the audited adverse-event evidence does not contain a consistent direction dimension, C-1C2 does not assign events to an arbitrary `direction_bucket`.

Instead, exposure is collapsed across all available direction buckets for the same:

- `segment_key`;
- `observed_date`;
- `hour_bucket`.

The RPC returns:

- `organization_id`;
- `segment_key`;
- `observed_date`;
- `hour_bucket`;
- `event_count`;
- `traversal_count`;
- `sample_count`;
- `events_per_100_traversals`.

Where exposure exists, the descriptive normalized value is:

`100 * event_count / traversal_count`

Missing exposure is not interpreted as zero exposure. If no denominator exists, `events_per_100_traversals` is `NULL`.

No minimum-evidence or statistical-confidence threshold was invented in C-1C2.

### Access boundary

The C-1C2 RPC is explicitly revoked from:

- `public`;
- `anon`;
- `authenticated`.

Execution is granted only to `service_role`.

Controlled runtime validation confirmed anonymous execution is rejected with PostgreSQL permission error `42501`.

### Deployment validation

The migration was applied successfully to the linked Supabase project.

Remote migration state confirmed:

`20260814153500 | 20260814153500`

A subsequent Supabase dry-run reported:

`Remote database is up to date.`

### Controlled runtime semantic validation

Temporary isolated evidence was created for three deliberately separate segment keys so each C-1C2 semantic could be proven independently.

#### Event plus exposure

The controlled bucket contained one adverse event and one traversal with two underlying samples.

Observed result:

- `event_count = 1`;
- `traversal_count = 1`;
- `sample_count = 2`;
- `events_per_100_traversals = 100`.

Validation result:

`BOTH PASS= true`

#### Exposure only

The controlled bucket contained exposure but no adverse event.

Observed result:

- `event_count = 0`;
- `traversal_count = 1`;
- `sample_count = 2`;
- `events_per_100_traversals = 0`.

Validation result:

`EXPOSURE ONLY PASS= true`

#### Event only

The controlled bucket contained an adverse event but no exposure denominator.

Observed result:

- `event_count = 1`;
- `traversal_count = NULL`;
- `sample_count = NULL`;
- `events_per_100_traversals = NULL`.

Validation result:

`EVENT ONLY PASS= true`

### Access-control runtime validation

Anonymous RPC execution returned:

`status = 401`

with:

`permission denied for function get_crowd_event_exposure_stats`

Validation results:

`SERVICE ROLE ONLY= true`

`C1C2 VALIDATION PASS= true`

### Controlled validation cleanup

The initial cleanup removed the temporary source traversal rows, road-risk segments, route-intelligence rows, and road-risk event evidence.

That cleanup exposed an independent C-1B lifecycle characteristic: rerunning `aggregate_crowd_segment_exposure_stats` does not prune aggregate buckets whose source traversal rows have subsequently been deleted.

The two temporary stale C-1B aggregate rows were therefore explicitly removed.

Final cleanup verification reported:

`ROUTE INTELLIGENCE= 0`

`ROAD RISK SEGMENTS= 0`

`TRAVERSALS= 0`

`EXPOSURE STATS= 0`

and:

`ALL TEMP DATA REMOVED= true`

No controlled C-1C2 validation evidence remained after cleanup.

### C-1B stale aggregate pruning follow-up

Controlled C-1C2 cleanup identified that `aggregate_crowd_segment_exposure_stats` recomputes or upserts buckets represented by source traversal evidence but does not delete an existing aggregate bucket when all corresponding source `crowd_segment_traversals` rows are later removed.

This observation does not invalidate C-1B aggregation correctness for existing source evidence and does not invalidate C-1C2 event-per-exposure normalization semantics.

It is nevertheless a real aggregate-lifecycle concern and must remain explicitly tracked for a later audit and implementation decision.

Do not silently interpret the current aggregation RPC as a pruning or synchronization mechanism.

### Verification completed

Before implementation deployment:

- only the intended C-1C2 SQL migration was introduced;
- the migration passed `git diff --check`;
- `supabase db push --dry-run` identified only the intended migration;
- `npx tsc --noEmit` passed;
- `npm run build` passed;
- the production build generated all `124/124` static pages successfully;
- the implementation was committed and pushed before deployment.

After deployment:

- the remote migration was present;
- the remote database was up to date;
- event-plus-exposure semantics passed;
- exposure-only semantics passed;
- event-only/null-denominator semantics passed;
- the service-role-only boundary passed;
- all temporary validation evidence was removed;
- tracked Git status remained clean.

### C-1C2 closure

C-1C2 is complete at the implementation, deployment, access-control, semantic-runtime-validation, and cleanup levels.

The system now has a descriptive service-side event-per-exposure primitive based on authoritative event occurrence time and anonymous crowd traversal exposure.

This primitive must remain separate from production Route Safety scoring until minimum-evidence requirements, statistical interpretation, representativeness, and any proposed scoring integration are separately audited and validated.

The C-1B stale aggregate pruning behavior discovered during controlled cleanup remains an explicit independent follow-up.

---

## C-1C3A - Crowd Event/Exposure Evidence Coverage

**Status:** Complete
**Date:** 2026-08-14
**Implementation commit:** `040d923`
**Scope:** Descriptive evidence coverage only; no statistical sufficiency, confidence, reliability, or production scoring semantics.

### Objective

Expose the current structure and coverage of HarborGuard crowd event/exposure evidence without inventing a minimum evidence threshold or treating sparse observational data as statistically sufficient.

C-1C3A intentionally reports descriptive evidence characteristics only. It does not determine whether an event rate is reliable, representative, statistically valid, sufficiently sampled, or eligible for Route Safety production scoring.

### Implementation

Added migration:

`supabase/migrations/20260814160000_create_crowd_event_exposure_coverage_rpc.sql`

The migration creates:

`public.get_crowd_event_exposure_coverage(p_start_date date, p_end_date date)`

The RPC delegates to the validated C-1C2 descriptive normalization layer:

`public.get_crowd_event_exposure_stats(...)`

It therefore does not introduce a second event/exposure normalization formula.

The RPC returns:

- `total_bucket_count`
- `event_exposure_bucket_count`
- `exposure_only_bucket_count`
- `event_only_bucket_count`
- `calculable_rate_bucket_count`
- `positive_calculable_rate_bucket_count`
- `unique_exposure_segment_count`
- `unique_event_segment_count`
- `exposure_day_count`
- `event_day_count`
- `has_event_exposure_overlap`

These fields describe evidence volume, coverage, and numerator/denominator overlap only.

### Explicit non-goals

C-1C3A does not define or expose:

- minimum traversal evidence;
- minimum sample counts;
- evidence sufficiency;
- statistical confidence;
- confidence intervals;
- reliability thresholds;
- representativeness thresholds;
- statistical validity;
- production-scoring eligibility;
- Route Safety score changes.

No production Route Safety scoring behavior was changed.

### Access boundary

The coverage RPC is service-role-only.

Execution is revoked from:

- `public`
- `anon`
- `authenticated`

Execution is granted to:

- `service_role`

Runtime anonymous validation returned:

`HTTP 401`

with PostgreSQL error:

`42501 - permission denied for function get_crowd_event_exposure_coverage`

This confirms the intended server-side-only access boundary.

### Deployment validation

Migration:

`20260814160000_create_crowd_event_exposure_coverage_rpc.sql`

was successfully deployed to the remote Supabase database.

Migration history confirmed:

`20260814160000 | 20260814160000 | 2026-08-14 16:00:00`

A subsequent:

`supabase db push --dry-run`

reported:

`Remote database is up to date.`

### Live runtime validation

The service-role RPC executed successfully with no error.

Current live descriptive evidence coverage returned:

| Metric | Value |
| --- | ---: |
| Total buckets | 5 |
| Event + exposure buckets | 0 |
| Exposure-only buckets | 3 |
| Event-only buckets | 2 |
| Calculable-rate buckets | 3 |
| Positive calculable-rate buckets | 0 |
| Unique exposure segments | 3 |
| Unique event segments | 1 |
| Exposure UTC days | 1 |
| Event UTC days | 1 |
| Event/exposure overlap present | false |

The automated runtime assertion returned:

`LIVE COVERAGE MATCH= true`

### Interpretation

The current production evidence remains sparse and structurally separated.

There are currently zero buckets containing both a positive adverse-event numerator and traversal exposure for the same normalized segment/date/hour bucket.

Consequently:

- no positive event-per-traversal rate is currently observable;
- the available evidence cannot support a defensible minimum-evidence threshold;
- the available evidence cannot support a statistical-confidence classification;
- the available evidence cannot support a reliability or representativeness claim;
- the available evidence must not yet influence Route Safety production scoring.

C-1C3A therefore exposes descriptive evidence visibility while deliberately preserving the boundary between observation and statistical judgment.

### Validation result

C-1C3A passed:

- migration dry-run;
- implementation commit and push;
- remote migration deployment;
- migration-history verification;
- remote schema synchronization;
- service-role runtime execution;
- expected live evidence semantics;
- anonymous-access denial;
- service-role-only boundary verification;
- tracked working-tree cleanliness.

**C-1C3A result: PASS**

### Next boundary

Do not introduce an arbitrary evidence threshold merely because the coverage RPC now exists.

The next crowd-intelligence work should continue accumulating and observing real event/exposure evidence. Statistical sufficiency, confidence, reliability, or production scoring should remain deferred until HarborGuard has enough real overlapping evidence to justify those semantics empirically.

---

## C-1B2 - Automatic Crowd Exposure Aggregation Lifecycle Wiring

**Status:** Complete
**Date:** 2026-08-14
**Implementation commit:** `bd2de95`
**Scope:** Automatically refresh validated C-1B crowd exposure aggregates after successful C-1A completed-journey persistence.

### Objective

Close the lifecycle gap between anonymous completed-journey traversal persistence and the existing C-1B exposure aggregation primitive.

Before C-1B2, `createAnonymousJourneyExposure(...)` persisted anonymous C-1A traversal evidence, but application code did not automatically invoke `aggregate_crowd_segment_exposure_stats(...)`.

As a result, C-1B aggregation existed and had been independently validated, but aggregate freshness depended on explicit/manual invocation.

### Audit findings

The pre-implementation audit confirmed:

- `createAnonymousJourneyExposure(...)` is the authoritative completed-trip C-1A persistence helper;
- traversal rows are upserted into `crowd_segment_traversals`;
- the helper returned immediately after a successful traversal upsert;
- no application-code caller of `aggregate_crowd_segment_exposure_stats(...)` existed;
- the existing completed-trip lifecycle already wraps crowd-exposure processing in its own best-effort error boundary;
- each traversal row derives its own UTC `observed_date`;
- a journey may therefore theoretically span more than one UTC date;
- the existing C-1B RPC accepts an inclusive nullable start/end date range and is service-role-only.

The smallest correct insertion point was therefore immediately after successful C-1A traversal persistence and before the helper returns.

### Implementation

Modified:

`lib/fleet/createAnonymousJourneyExposure.ts`

After a successful `crowd_segment_traversals` upsert, the helper now:

1. extracts `observed_date` from the traversal rows;
2. sorts those dates;
3. derives the earliest affected date;
4. derives the latest affected date;
5. invokes:

`aggregate_crowd_segment_exposure_stats`

with:

- `p_start_date` = earliest affected `observed_date`;
- `p_end_date` = latest affected `observed_date`.

If aggregation returns an error, the helper throws that error.

The existing outer completed-trip lifecycle remains responsible for the best-effort failure boundary, so an aggregation failure does not redefine delivered-trip completion semantics.

The existing helper return contract remains unchanged.

### Why a date range is used

C-1A derives `observed_date` independently from each accepted traversal timestamp.

A completed journey can theoretically cross UTC midnight.

C-1B2 therefore does not assume that all traversal evidence belongs to a single UTC date. It derives the minimum and maximum `observed_date` from the actual rows produced by the journey and refreshes the inclusive affected range.

### Verification

Before commit:

- exactly one tracked implementation file was modified;
- `git diff --check` passed;
- `npx tsc --noEmit` passed;
- `npm run build` passed;
- the Next.js production build compiled successfully;
- all 124 static pages were generated successfully.

Implementation was committed and pushed as:

`bd2de95 - feat: refresh crowd exposure aggregates after journey persistence`

Local `HEAD` and `origin/main` both resolved to:

`bd2de95`

with a clean tracked working tree.

### Controlled runtime validation

C-1B2 was validated against the known completed controlled trip:

`cce1f24f-2d31-49d7-b72f-acc252765037`

The validation invoked the real:

`createAnonymousJourneyExposure(...)`

helper directly.

The validation command did not separately invoke:

`aggregate_crowd_segment_exposure_stats(...)`

This isolates the new lifecycle wiring as the mechanism responsible for the aggregate refresh.

Before reprocessing, the three known C-1B aggregate rows had:

`updated_at = 2026-08-14T15:32:29.562402+00:00`

The helper returned:

`{ created: 3, skipped: false }`

After reprocessing, the same aggregate rows had:

`updated_at = 2026-08-14T16:18:23.284253+00:00`

while retaining their expected aggregate values.

Runtime assertions returned:

`C1A SOURCE STABLE= true`

`C1B MATCHING AGGREGATES= true`

`C1B UPDATED_AT REFRESHED= true`

`C1B2 AUTOMATIC AGGREGATION PASS= true`

### Runtime interpretation

The validation proves that reprocessing the completed journey:

- does not duplicate or mutate the authoritative C-1A traversal evidence;
- automatically invokes the C-1B aggregation path;
- refreshes the affected aggregate buckets;
- preserves the expected traversal and sample counts;
- requires no separate manual aggregation RPC invocation.

The source rows remained:

- three traversal buckets;
- one traversal per bucket;
- one sample per bucket.

The corresponding aggregate rows remained:

- three aggregate buckets;
- `traversal_count = 1`;
- `sample_count = 1`.

Only aggregate refresh metadata advanced as expected.

### Failure semantics

C-1B aggregation errors are deliberately not swallowed inside `createAnonymousJourneyExposure(...)`.

Instead, the helper throws the aggregation error to its existing caller.

The completed-trip lifecycle already owns a best-effort error boundary around anonymous journey exposure processing, preserving the existing lifecycle behavior while ensuring C-1B failures remain observable.

C-1B2 does not alter trip completion semantics.

### Explicit non-goals

C-1B2 does not:

- modify the C-1B aggregation formula;
- modify C-1A anonymization;
- modify C-1A idempotency semantics;
- introduce a cron or scheduled aggregation process;
- introduce a new migration;
- change crowd event/exposure normalization;
- define statistical sufficiency;
- define confidence or reliability thresholds;
- change Route Safety production scoring.

### Validation result

C-1B2 passed:

- audit-first insertion-point verification;
- focused one-file implementation;
- staged-diff verification;
- whitespace validation;
- TypeScript validation;
- production-build validation;
- implementation commit and push;
- local/remote commit synchronization;
- controlled completed-trip reprocessing;
- C-1A source-stability verification;
- automatic C-1B refresh verification;
- aggregate-value verification;
- tracked working-tree cleanliness.

**C-1B2 result: PASS**

### Result

C-1A anonymous completed-journey evidence persistence and C-1B exposure aggregation are now connected through the normal completed-journey processing path.

A successful C-1A persistence operation automatically refreshes the C-1B aggregate range covering the journey's actual UTC observation dates.

Manual C-1B invocation is no longer required for this lifecycle path.

### Remaining boundary

C-1B2 closes aggregate freshness for successful completed-journey processing.

It does not resolve the independently identified stale-aggregate pruning behavior when source traversal evidence is subsequently deleted.

That behavior remains a separate follow-up and must not be conflated with C-1B2 lifecycle aggregation.

---

---

# 2026-08-15 - C-1D Crowd Intelligence Production Hardening (Completed)

## Objective

Complete the C-1D Crowd Intelligence production-hardening sequence before enabling any Crowd-derived production Route Safety scoring.

The work was performed audit-first and incrementally. Each implementation item identified one precise gap, made a focused change, verified the change, and committed/pushed the result before proceeding.

C-1D is now complete across all ten planned items.

## Completed scope

### C-1D1 - Data-quality observability

**Status: COMPLETE**

Added explicit Crowd location-data quality observability so invalid or unusable journey evidence can be measured rather than silently discarded.

The implementation established visibility into location-quality filtering and provided the foundation for distinguishing valid Crowd evidence from collection-quality problems.

Implementation commit:

`d2db997` - `feat: add crowd location quality observability`

### C-1D2 - Journey evidence eligibility

**Status: COMPLETE**

Added deterministic temporal eligibility enforcement for Crowd journeys.

Completed journeys are evaluated against the required journey lifecycle and time-order conditions before anonymous evidence is accepted.

This prevents temporally invalid completed-trip evidence from entering Crowd traversal persistence.

Implementation commit:

`9a034dc` - `feat: enforce crowd journey temporal eligibility`

### C-1D3 - Pipeline observability

**Status: COMPLETE**

Added persistent Crowd journey pipeline observability and subsequent operational/failure diagnostics.

The completed processing path now records deterministic journey outcomes rather than leaving successful, skipped, or failed processing implicit.

The observability work includes:

- persistent journey pipeline receipts;
- operational-health visibility;
- explicit pipeline failure diagnostics;
- deterministic accepted/skipped/failed interpretation.

Implementation commits:

- `c4aba70` - `feat: add crowd journey pipeline observability`
- `bcaf3aa` - `feat: add crowd intelligence operational health`
- `6def309` - `feat: add crowd pipeline failure diagnostics`

### C-1D4 - Crowd Intelligence evidence dashboard/API

**Status: COMPLETE**

Added Crowd Intelligence freshness/evidence diagnostics to the existing operational-health surface.

The operational layer can now expose the state and freshness of Crowd evidence without changing production Route Safety scoring.

This closes the evidence-health visibility gap required before larger-scale real-world collection.

Implementation commit:

`39060ab` - `feat: add crowd intelligence freshness diagnostics`

### C-1D5 - Anonymous diversity/cohort architecture

**Status: COMPLETE**

Extended Crowd aggregation to preserve anonymous journey diversity rather than relying only on traversal/sample volume.

The architecture can now distinguish repeated evidence volume from the number of anonymous journeys contributing evidence to an aggregate bucket.

This improves the future statistical-sufficiency foundation without exposing private journey identity.

Implementation commit:

`bcbe7a3` - `feat: add anonymous crowd journey diversity`

### C-1D6 - Idempotency & replay guarantees

**Status: COMPLETE**

Added deterministic single-journey Crowd replay.

The replay path uses the existing completed-journey processing primitives while preserving idempotency.

Repeated replay does not intentionally multiply authoritative traversal evidence or aggregate evidence.

Strict receipt persistence is used during replay so replay failures remain observable instead of being silently swallowed.

Implementation commit:

`a7618a2` - `feat: add idempotent crowd journey replay`

### C-1D7 - Aggregation integrity monitoring

**Status: COMPLETE**

Added explicit Crowd aggregation integrity monitoring.

The integrity layer compares authoritative traversal-source buckets with persisted aggregate buckets and detects divergence including:

- missing aggregate buckets;
- orphan aggregate buckets;
- traversal-count mismatches;
- anonymous-journey-count mismatches;
- sample-count mismatches.

A healthy integrity snapshot requires all mismatch counts to remain zero.

Implementation commit:

`7bff0e9` - `feat: add crowd aggregation integrity monitoring`

### C-1D8 - Historical recomputation/rebuild tooling

**Status: COMPLETE**

Added deterministic historical Crowd journey rebuild tooling.

The historical rebuild path reuses the established journey replay behavior over eligible completed journeys rather than introducing a separate Crowd processing implementation.

This provides a recovery/recomputation mechanism for historical evidence while preserving the established idempotency boundary.

Implementation commit:

`bb8addd` - `feat: add historical crowd journey rebuild`

Controlled database snapshot validation confirmed:

- delivered completed trips: 3;
- pipeline receipts: 1;
- traversal rows: 3;
- aggregate rows: 3;
- source bucket count: 3;
- aggregate bucket count: 3;
- missing aggregate bucket count: 0;
- orphan aggregate bucket count: 0;
- traversal-count mismatch count: 0;
- anonymous-journey mismatch count: 0;
- sample-count mismatch count: 0;
- `integrity_ok = true`.

The snapshot also confirmed historical delivered-trip evidence exists across the controlled validation period.

### C-1D9 - Privacy & retention architecture

**Status: COMPLETE**

Added privacy-safe Crowd retention pruning.

The retention architecture operates through the established privacy-separated Crowd layer and accepts an explicit cutoff rather than embedding an arbitrary legal/business retention duration into application logic.

Retention-policy duration remains a separately governed operational/legal decision.

Implementation commit:

`0ed9602` - `feat: add privacy-safe crowd retention pruning`

### C-1D10 - Real-world collection protocol

**Status: COMPLETE**

Added the repeatable real-world Crowd Intelligence collection runbook:

`docs/Crowd_Intelligence_Real_World_Collection_Protocol.md`

The protocol defines:

- legitimate journey prerequisites;
- real device GPS collection requirements;
- normal journey start and completion behavior;
- accepted/skipped/failed outcome interpretation;
- post-journey Crowd health verification;
- privacy boundaries;
- replay and historical recovery guidance;
- collection-run acceptance criteria;
- minimum operational run records;
- retention boundaries;
- stop conditions;
- completion checklist;
- explicit production-scoring scope boundaries.

The protocol prohibits fabricated production GPS evidence and direct Crowd-table repair as a normal collection mechanism.

It also explicitly distinguishes collection-quality skips such as `insufficient_location_points` from Crowd pipeline infrastructure failures.

Implementation commit:

`33fdb0f` - `docs: add crowd real-world collection protocol`

## C-1D implementation sequence

The completed C-1D implementation chain on `main` is:

1. `d2db997` - Crowd location quality observability
2. `9a034dc` - Crowd journey temporal eligibility
3. `c4aba70` - Crowd journey pipeline observability
4. `bcaf3aa` - Crowd Intelligence operational health
5. `6def309` - Crowd pipeline failure diagnostics
6. `39060ab` - Crowd Intelligence freshness diagnostics
7. `bcbe7a3` - Anonymous Crowd journey diversity
8. `a7618a2` - Idempotent Crowd journey replay
9. `7bff0e9` - Crowd aggregation integrity monitoring
10. `bb8addd` - Historical Crowd journey rebuild
11. `0ed9602` - Privacy-safe Crowd retention pruning
12. `33fdb0f` - Real-world Crowd collection protocol

These commits collectively close the ten C-1D roadmap requirements.

## Validation summary

Across the C-1D sequence, validation included as applicable:

- audit-first repository and insertion-point inspection;
- focused source/database/documentation changes;
- staged-diff verification;
- `git diff --check`;
- TypeScript validation with `npx tsc --noEmit`;
- Next.js production builds;
- Supabase migration verification;
- controlled database/runtime validation;
- replay/idempotency checks;
- aggregate-integrity checks;
- local/remote Git synchronization;
- clean tracked working-tree verification.

The final C-1D10 state was committed and pushed on `main` at:

`33fdb0f`

At completion:

- `HEAD = 33fdb0f`;
- `origin/main = 33fdb0f`;
- the tracked working tree was clean.

## Production-scoring boundary

C-1D completion does **not** enable Crowd-derived production Route Safety scoring.

The work establishes the observability, evidence-quality, privacy, diversity, replay, integrity, historical-rebuild, retention, and collection foundations required to accumulate and evaluate real-world evidence safely.

Production Crowd-derived scoring must remain disabled until a separate audited milestone establishes sufficient real-world evidence and explicitly defines/validates:

- statistical sufficiency;
- minimum independent journey diversity;
- confidence/reliability thresholds;
- geographic coverage requirements;
- temporal coverage requirements;
- production weighting behavior;
- safe fallback behavior.

## Result

**C-1D1 through C-1D10: COMPLETE**

HarborGuard now has the operational hardening required to collect, observe, diagnose, replay, rebuild, validate, retain, and evaluate privacy-separated Crowd Intelligence evidence without silently promoting that evidence into production Route Safety scoring.

The next Crowd Intelligence phase should be selected only after reviewing the post-C-1D roadmap and the real-world evidence requirements.

## 2026-08-16 - HERE Traffic cost-control remediation phase 1

**Status: COMPLETE**

Completed the first HarborGuard HERE Traffic cost-control remediation work item.

The July HERE billing audit identified that historical HarborGuard runtime paths could trigger uncached live HERE Traffic Flow requests from multiple application services without a centralized persistence/read boundary.

As the first remediation step, HarborGuard now persists the geographic scope used for each centrally collected HERE Traffic Flow observation.

The traffic-flow observation persistence layer now records:

- `collection_latitude`
- `collection_longitude`
- `collection_radius_meters`

The controlled traffic-flow collector propagates the resolved collection scope into each persisted observation.

This makes future stored traffic-flow evidence geographically self-describing and provides the foundation required for a safe runtime reader that can match stored observations to requested traffic-intelligence locations without making fresh HERE requests.

### Database migration

Added:

`supabase/migrations/20260816100000_add_traffic_flow_collection_scope.sql`

The migration adds nullable geographic collection-scope columns to `traffic_flow_observations` together with validation constraints for:

- latitude range;
- longitude range;
- positive collection radius.

The migration has been committed but has **not yet been applied to Supabase production**.

### Runtime safety state

HERE Traffic remains intentionally disabled in the intelligence source registry:

- `enabled = false`
- `approved_for_ingestion = false`

The QStash `/api/traffic-flow/cron` schedule also remains paused.

No HERE Traffic re-enable or traffic-flow collection resumption was performed as part of this work item.

### Validation

Validation completed successfully:

- targeted Git diff review;
- `npx tsc --noEmit`;
- Next.js production build with `npm run build`;
- staged-diff verification;
- focused three-file commit;
- remote branch push.

Implementation commit:

`cb03757` - `Persist traffic flow collection scope`

Branch:

`fix/here-traffic-cost-control`

### Next work item

The next remediation step is to add a geographically safe recent-observation reader for `traffic_flow_observations` and replace the live HERE Traffic Flow call inside `buildTrafficIntelligence()` with stored observation reads.

HERE Traffic and the QStash traffic-flow collector must remain disabled/paused until that runtime-reader change is implemented, verified, and deployment/migration sequencing is complete.

## HERE Traffic Cost Control - Phase 2A: Provider Geometry Persistence

**Status: COMPLETE**

Extended persisted traffic-flow observations to retain the provider road geometry returned by HERE Traffic Flow.

The implementation now:

- preserves `location.shape` from each selected HERE Traffic Flow result as `providerGeometry`;
- persists that geometry as `provider_geometry`;
- introduces a nullable `jsonb` database column for provider geometry;
- preserves the existing traffic-flow collection and scoring behavior;
- does not yet replace runtime HERE Traffic Flow reads;
- does not enable HERE or resume scheduled traffic-flow collection.

Provider geometry is retained so a future stored-observation reader can determine whether an observation is geographically relevant to a requested traffic-intelligence location/radius without making a fresh HERE request.

The existing HarborGuard geometry model already supports HERE `links[].points[]` geometry, allowing the future reader to use actual road geometry rather than approximating a traffic segment using only the collection-circle center.

Migration added:

`supabase/migrations/20260816110000_add_traffic_flow_provider_geometry.sql`

The migration remains intentionally unapplied while the HERE traffic cost-control implementation is incomplete.

Validation completed:

- focused diff inspection;
- TypeScript validation with `npx tsc --noEmit`;
- successful Next.js production build;
- targeted staging verification;
- successful remote push.

Implementation commit:

`bfdc06d` - `Persist traffic flow provider geometry`

Operational state after Phase 2A:

- HERE remains disabled;
- scheduled traffic-flow collection remains paused;
- the Phase 1 and Phase 2A database migrations remain unapplied;
- no runtime traffic-intelligence caller has yet been switched from live HERE Flow to persisted observations.

### Next step

Audit and implement a geographically filtered, freshness-bounded stored traffic-flow observation reader before removing the live `getHereTrafficFlow()` call from `buildTrafficIntelligence()`.

## HERE Traffic Cost Control - Phase 2B: Stored Observation Reader

**Status: COMPLETE**

Added a dedicated reader for recent persisted traffic-flow observations.

The new reader:

- reads organization-scoped HERE traffic observations from `traffic_flow_observations`;
- applies a default 60-minute freshness cutoff;
- orders observations newest-first;
- keeps only the newest observation for each stable provider segment;
- requires persisted provider geometry;
- converts HERE `links[].points[]` geometry into polyline paths;
- uses the shared `getPointToPolylineDistanceMeters` helper for geographic relevance;
- excludes observations outside the requested runtime radius;
- reconstructs the existing traffic-flow item shape used by HarborGuard downstream consumers;
- caps returned flow corridors at 20;
- makes no external HERE request.

Implementation file:

`lib/traffic/loadRecentTrafficFlowObservations.ts`

The reader was intentionally implemented and verified independently before changing any runtime traffic-intelligence caller.

Validation completed:

- focused staged-diff inspection;
- `npx tsc --noEmit`;
- successful Next.js production build;
- `git diff --check`;
- single-file commit;
- successful remote branch push.

Implementation commit:

`4a8f476` - `Add stored traffic flow observation reader`

Operational state after Phase 2B:

- HERE remains disabled;
- scheduled HERE traffic-flow collection remains paused;
- the Phase 1 and Phase 2A database migrations remain unapplied;
- `buildTrafficIntelligence()` still uses the live HERE Traffic Flow path when HERE is enabled;
- the new stored reader is not yet wired into production runtime traffic intelligence.

### Next step

Replace the live `getHereTrafficFlow()` call inside `buildTrafficIntelligence()` with `loadRecentTrafficFlowObservations()` while preserving the existing intelligence-source registry kill switch and downstream flow contract.

That wiring change will establish the runtime cost-control boundary where application traffic-intelligence reads use Supabase and only the controlled collector is permitted to call HERE.

## HERE Traffic Cost Control - Phase 2C: Runtime Stored-Flow Cutover

**Status: COMPLETE**

Completed the HarborGuard runtime traffic-flow cost-control cutover.

`buildTrafficIntelligence()` no longer performs a live HERE Traffic Flow request.

When the `here_traffic` intelligence source is enabled and approved, runtime traffic intelligence now reads recent persisted traffic-flow observations through:

`lib/traffic/loadRecentTrafficFlowObservations.ts`

The existing intelligence-source registry kill switch remains in place.

Runtime behavior now:

- returns the existing disabled warning when HERE Traffic is disabled in the source registry;
- reads geographically filtered, freshness-bounded stored HERE traffic observations when the source is enabled;
- reports a warning when no recent stored observations are available for the requested area;
- reports the flow source as `here_flow_stored`;
- makes no direct HERE Traffic Flow request from `buildTrafficIntelligence()`.

The live HERE Traffic Flow boundary is now restricted to the controlled collection path:

`collectTrafficFlowObservations()` -> `getHereTrafficFlow()`

Application traffic-intelligence consumers therefore read Supabase rather than independently calling HERE.

Validation completed:

- targeted runtime cutover diff inspection;
- live HERE caller audit;
- TypeScript validation with `npx tsc --noEmit`;
- successful Next.js production build;
- `git diff --check`;
- single-file staged-diff verification;
- successful remote branch push.

Implementation commit:

`84500c1` - `Use stored traffic flow for runtime intelligence`

Operational state after Phase 2C:

- HERE remains disabled;
- scheduled traffic-flow collection remains paused;
- the Phase 1 and Phase 2A database migrations remain unapplied;
- runtime code is now prepared to consume stored observations once the required database schema is deployed and fresh observations are collected.

### Next step

Complete deployment sequencing:

1. apply the pending traffic-flow schema migrations;
2. deploy the cost-control branch/code;
3. verify the database columns and runtime reader behavior;
4. perform a controlled traffic-flow collection test;
5. only after successful validation, decide whether to re-enable HERE Traffic and resume scheduled collection at a deliberate low-cost cadence.

Until those steps are complete, HERE Traffic and scheduled collection must remain disabled/paused.

## HERE Traffic Cost Control - Phase 2D: Production Stored-Flow Validation

**Status: COMPLETE**

Completed controlled production validation of the HERE Traffic cost-control architecture.

Validation sequence:

- confirmed production schema migrations were applied and migration history was synchronized;
- deployed the cost-control implementation to production;
- confirmed `here_traffic` remained disabled and unapproved in the intelligence-source registry;
- generated one legitimate fresh vehicle-location observation through HarborGuard's normal authenticated location-update API;
- executed exactly one controlled traffic-flow collection while QStash remained paused;
- confirmed the collector resolved the intended vehicle scope;
- HERE returned 20 traffic-flow items;
- 5 observations with stable provider segment identities were persisted;
- 15 observations without stable provider segment identities were intentionally skipped;
- all 5 persisted observations contained:
  - collection latitude;
  - collection longitude;
  - 10,000 metre collection radius;
  - provider road geometry;
  - stable provider segment identity;
- directly executed `loadRecentTrafficFlowObservations()` against production Supabase;
- the stored reader returned exactly 5 current geographically relevant segments;
- all returned items reported `source = here_flow_stored`;
- reader validation made no HERE provider request;
- temporary validation tooling was deleted after execution.

Controlled collection result:

- `scopeResolved = true`;
- `received = 20`;
- `persisted = 5`;
- `skippedWithoutProviderSegmentId = 15`.

Stored-reader result:

- `rawCount = 5`;
- `latestSegmentCount = 5`;
- `flowCount = 5`.

Production validation therefore confirms:

`HERE controlled collection -> Supabase persistence -> stored observation reader`

works end-to-end.

### Remaining cost-control gap

The scheduled `/api/traffic-flow/cron` collection path does not currently enforce the `here_traffic` intelligence-source registry before calling HERE.

Therefore `enabled = false` / `approved_for_ingestion = false` is not currently a complete kill switch for paid traffic-flow collection.

QStash must remain paused and HERE must remain disabled until that collection-side guard is implemented and validated.


## HERE Traffic Cost Control - Phase 2E: Collection Kill Switch

**Status: COMPLETE**

Closed the remaining HERE Traffic Flow collection-side cost-control gap.

`collectTrafficFlowObservations()` now loads the `here_traffic` intelligence-source configuration before resolving collection scope or calling the HERE Traffic Flow provider.

Collection is permitted only when the registry configuration exists and both:

- `enabled = true`;
- `approved_for_ingestion = true`.

The collector now fails closed when:

- the source configuration cannot be loaded;
- the `here_traffic` source configuration does not exist;
- the source is disabled;
- the source is not approved for ingestion.

When disabled or unapproved, collection stops with:

`HERE Traffic Flow collection is disabled by the intelligence source registry.`

This establishes the collection-side paid-provider kill switch at the controlled HERE Traffic Flow boundary:

`/api/traffic-flow/cron -> collectTrafficFlowObservations() -> registry guard -> getHereTrafficFlow()`

Validation completed:

- `git diff --check` passed;
- TypeScript validation with `npx tsc --noEmit` passed;
- Next.js production build passed;
- controlled direct execution of `collectTrafficFlowObservations()` with the production registry disabled was blocked before HERE collection;
- temporary validation tooling was removed;
- staged diff contained only `lib/traffic/collectTrafficFlowObservations.ts`;
- implementation was committed and pushed successfully.

Kill-switch validation result:

- `blocked = true`;
- message = `HERE Traffic Flow collection is disabled by the intelligence source registry.`

Implementation commit:

`2aebdfb` - `Gate traffic flow collection by source registry`

### Cost-control state after Phase 2E

The previously identified collection-side cost-control gap is closed.

Both application traffic-intelligence consumption and controlled HERE Traffic Flow collection are now governed by the intended architecture:

`HERE controlled collection -> Supabase persistence -> stored observation reader`

with the intelligence-source registry acting as the collection kill switch before paid HERE Traffic Flow access.

HERE Traffic and scheduled collection should remain disabled/paused until an explicit controlled re-enable decision is made.

### Next step

Perform a final cost-control closure audit before changing the production operational state:

1. confirm there are no remaining direct HERE Traffic Flow callers outside the controlled collector;
2. confirm the production `here_traffic` registry remains disabled/unapproved;
3. confirm QStash traffic-flow scheduling remains paused;
4. determine the deliberate low-cost collection cadence and re-enable procedure;
5. only then decide whether production scheduled HERE Traffic Flow collection should be enabled.
