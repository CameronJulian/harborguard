# HarborGuard Production Deployment Rollback Runbook

## Purpose

This runbook defines the controlled production rollback procedure for HarborGuard on Vercel.

A deployment rollback reroutes production traffic to a previous immutable Vercel deployment.

A Vercel rollback does NOT restore Supabase database data or reverse database migrations.

## Production Context

- Vercel project: `harborguard`
- Vercel scope: `cameronhendrick17-5055s-projects`
- Production domain: `https://www.billiskills.co.za`
- Framework: Next.js
- Node.js runtime: 24.x
- Production branch: `main`

## Verified Deployment Evidence

Current production deployment at the time of verification:

`https://harborguard-h7wt1rnu3-cameronhendrick17-5055s-projects.vercel.app`

Previous READY production deployment:

`https://harborguard-ie2idmqe7-cameronhendrick17-5055s-projects.vercel.app`

These URLs are evidence only. Always query Vercel again immediately before a real rollback.

## When To Use Rollback

Consider deployment rollback for a severe regression introduced by a newly deployed application release, including:

- critical UI failure;
- critical API failure;
- authentication failure;
- widespread production server errors;
- broken critical application workflow;
- deployment-level configuration regression;
- application outage caused by the latest release.

## Do Not Automatically Use Rollback For

- destructive or incompatible database migrations;
- database corruption;
- data-integrity incidents;
- DNS incidents;
- external-provider outages;
- compromised credentials.

Those conditions require separate recovery procedures.

## Preconditions

Before executing a production rollback:

1. Confirm the incident is production-impacting.
2. Record the current Git commit SHA.
3. Record the current Vercel production deployment ID and URL.
4. Identify a previous known-good production deployment.
5. Confirm the rollback candidate has `target = production`.
6. Confirm the rollback candidate has `readyState = READY`.
7. Determine whether database migrations occurred between the releases.
8. Confirm database backward compatibility.
9. Confirm the operator is authenticated to the correct Vercel account and scope.

## Read-Only Discovery Commands

    vercel whoami
    vercel project inspect harborguard --scope cameronhendrick17-5055s-projects
    vercel ls harborguard --scope cameronhendrick17-5055s-projects
    vercel inspect https://www.billiskills.co.za --scope cameronhendrick17-5055s-projects --format json
    vercel inspect <candidate-deployment-url> --scope cameronhendrick17-5055s-projects --format json

## Rollback Command

WARNING: The following command changes production traffic.

Do not execute it until the rollback candidate has been explicitly verified.

    vercel rollback <deployment-id-or-url> --scope cameronhendrick17-5055s-projects

For unattended execution:

    vercel rollback <deployment-id-or-url> --scope cameronhendrick17-5055s-projects --yes

## Example Only

The following is an example based on the previously verified deployment:

    vercel rollback https://harborguard-ie2idmqe7-cameronhendrick17-5055s-projects.vercel.app --scope cameronhendrick17-5055s-projects

Do not blindly reuse this deployment URL during a future incident.

## Post-Rollback Verification

Immediately after rollback:

1. Confirm Vercel reports rollback success.
2. Inspect `https://www.billiskills.co.za` again.
3. Confirm `target = production`.
4. Confirm `readyState = READY`.
5. Confirm the expected production aliases are attached.
6. Check HarborGuard readiness.
7. Test authentication.
8. Test one critical API workflow.
9. Test one critical UI workflow.
10. Check production error monitoring.
11. Confirm scheduled jobs remain present.
12. Record the rollback deployment ID, Git SHA, operator, and time.

## Abort Conditions

Do not proceed if:

- the candidate deployment is not READY;
- the candidate is not production targeted;
- database compatibility is uncertain;
- the earlier release depends on schema or data that no longer exists;
- the correct rollback target cannot be confidently identified;
- the incident is unrelated to the application deployment.

## Database Warning

Vercel deployment rollback changes application deployment routing only.

It does not automatically roll back:

- Supabase database data;
- database schema migrations;
- Supabase storage changes;
- telemetry already ingested;
- external provider state;
- emails or messages already sent.

Database restore or forward-fix procedures must be handled separately.

## Forward Recovery

After the root cause has been fixed:

1. Commit the corrective change.
2. Pass the GitHub hosted CI pipeline.
3. Allow the corrected production deployment to complete.
4. Verify production readiness and critical workflows.
5. Confirm production is running the intended corrected release.
6. Document the incident and recovery timeline.

## Current Evidence Status

HarborGuard currently has:

- authenticated Vercel CLI access;
- a verified Vercel project;
- a verified production domain;
- multiple immutable READY production deployments;
- a confirmed `vercel rollback` CLI primitive;
- a verified current deployment;
- a verified previous production deployment;
- GitHub-hosted CI protection.

No production rollback was executed while creating this runbook.
