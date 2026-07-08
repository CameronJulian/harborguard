\# HarborGuard v2 Architecture Plan



\## Goal



Refactor HarborGuard from a feature-rich but page-heavy SaaS into a modular, scalable, enterprise-grade fleet security platform.



\## Main Principles



1\. Pages should compose features, not contain business logic.

2\. Shared UI should live in components/ui.

3\. Data loading should move into hooks and services.

4\. API routes should be protected consistently.

5\. Command Center should be split into focused modules.

6\. Fleet, Dispatch, Incidents, Reports, and AI should each have clear boundaries.



\## Target Command Center Structure



app/command-center/

├── page.tsx

├── hooks/

│   ├── useCommandCenterFleet.ts

│   ├── useCommandCenterNotifications.ts

│   ├── useCommandCenterThreats.ts

│   ├── useCommandCenterOperations.ts

│   └── useCommandCenterRealtime.ts

├── sections/

│   ├── CommandCenterHeader.tsx

│   ├── CommandCenterOverview.tsx

│   ├── CommandCenterMapSection.tsx

│   ├── CommandCenterFleetSection.tsx

│   ├── CommandCenterAISection.tsx

│   ├── CommandCenterNotificationsSection.tsx

│   └── CommandCenterOperationsSection.tsx



\## Target Service Layer



lib/services/

├── fleet.service.ts

├── command-center.service.ts

├── notifications.service.ts

├── route-safety.service.ts

├── incidents.service.ts

├── dispatch.service.ts

└── reports.service.ts



\## Refactor Order



1\. Create blueprint and folders.

2\. Extract shared utilities.

3\. Extract Command Center service functions.

4\. Extract Command Center hooks.

5\. Extract Command Center sections.

6\. Reduce command-center/page.tsx to orchestration only.

7\. Standardize APIs.

8\. Standardize UI components.

9\. Add tests and monitoring.

