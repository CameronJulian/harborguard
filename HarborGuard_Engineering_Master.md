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
