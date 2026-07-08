\# Command Center Decomposition Plan



\## Goal



Reduce app/command-center/page.tsx from a large monolithic page into smaller, focused modules without changing user-facing behavior.



\## Current Problem



The Command Center page currently handles:



\- Imports

\- Types

\- State

\- Data loading

\- Realtime subscriptions

\- Map rendering

\- Vehicle animation

\- Notifications

\- Route safety

\- Threat intelligence

\- AI Copilot

\- Panic actions

\- JSX layout



\## Target Structure



app/command-center/

├── page.tsx

├── hooks/

│   ├── useCommandCenterFleet.ts

│   ├── useCommandCenterNotifications.ts

│   ├── useCommandCenterOperations.ts

│   ├── useCommandCenterThreats.ts

│   ├── useCommandCenterRealtime.ts

│   └── useCommandCenterMap.ts

├── sections/

│   ├── CommandCenterHeader.tsx

│   ├── CommandCenterOverview.tsx

│   ├── CommandCenterMapSection.tsx

│   ├── CommandCenterFleetSection.tsx

│   ├── CommandCenterAISection.tsx

│   ├── CommandCenterNotificationsSection.tsx

│   └── CommandCenterOperationsSection.tsx



\## Refactor Rules



1\. Do not change UI behavior during extraction.

2\. Move one responsibility at a time.

3\. Run npm run build after every change.

4\. Commit after every successful extraction.

5\. Keep page.tsx deployable at all times.



\## First Extraction Candidates



1\. Utility functions

2\. API service functions

3\. Notification state and actions

4\. Operations summary and timeline

5\. Threat feed loading

6\. Fleet loading

7\. Map rendering

8\. AI Copilot

9\. JSX sections

