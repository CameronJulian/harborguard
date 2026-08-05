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
- Evaluated decoded HERE route geometry against oad_risk_segments.
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
- Added ankRoutesBySafety().
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
- Left oadblock unchanged because it remains a supported category.
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