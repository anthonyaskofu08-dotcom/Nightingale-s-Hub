# Master Outstanding Work Logbook

**Purpose:** single ordered record of platform delivery, evidence and dependencies. This logbook describes current repository work; it does not imply that documented or skeleton workflows are integrated.

**Status vocabulary:** NOT STARTED · DOCUMENTED · SKELETON CREATED · FRONTEND IMPLEMENTED · BACKEND IMPLEMENTED · INTEGRATED · TESTED · COMPLETE. A higher status applies only to the named scope and evidence; it does not promote dependent features automatically.

## Current baseline

- The original static demo remains in `App.js`, `Index.Html` and `Style.Css`.
- `next/` contains the React, TypeScript and Vite application, the Stage 1 Supabase migrations and Edge Functions, and a role-aware demonstration shell.
- Stage 1 identity and institutional-record implementation is present. Local build and 13 tests have passed. The migrations have not been applied in this repository session, and live RLS, Auth, Edge Function and staging workflows have not been verified.
- Student, lecturer, institution administrator and global administrator screens now include expanded module navigation and honest front-end skeletons. New skeletons do not persist records or call unimplemented services.
- The current Supabase client requires the public URL and publishable/anon key from local environment configuration. No service-role secret belongs in the frontend or Git.

## Work log

| ID | Workstream | Current status | Evidence / boundary | Next dependency |
|---|---|---|---|---|
| R-01 | Branch backup and repository hygiene | TESTED | `1f82d3e` is the authorized branch baseline; `.env.local`, dependencies and build output are ignored. | Continue reviewed commit/push cadence. |
| D-01 | Product blueprint and architecture | DOCUMENTED | Existing blueprint and roadmap, reconciled with this assignment and linked inventories. | Owner decisions listed in the roadmap. |
| D-02 | Roles, navigation, permission and screen inventories | DOCUMENTED | Matrix and inventory cover the four portal shells and independent/institutional student paths. | Review names, policies and MVP boundary with owner. |
| UI-01 | Responsive role-aware application shell | FRONTEND IMPLEMENTED | React navigation selects portal by active role; demo portal switch is demo-only. | Browser, keyboard, screen-reader and device review. |
| UI-02 | Existing Stage 1 identity and institution administration | INTEGRATED | Auth and selected screens call Stage 1 Supabase functions/tables in code. | Apply only to approved staging, then test role/RLS and end-to-end flows. |
| UI-03 | Student learning and advanced modules | SKELETON CREATED | New screens describe pathways, exams, research, cases, pharmacology, anatomy, AI, progress, notifications and subscription. | Implement each module against approved data contracts and tests. |
| UI-04 | Lecturer and tutor workspace | SKELETON CREATED | Question banks, assessment prep, assignment support and history entry points added; existing assigned subjects/resources preserved. | Add scoped authoring APIs, storage and review workflows. |
| UI-05 | Institution management expansion | SKELETON CREATED | Academic years, intakes, announcements, analytics and subscription entry points added; existing profile/programmes/records/codes remain. | Confirm business rules and add schema/functions with RLS tests. |
| UI-06 | Global administration expansion | SKELETON CREATED | User/institution oversight, library, moderation, publishing, analytics, audit, support and settings entry points added. | Design privileged APIs and operator audit controls. |
| BE-01 | Identity and official records | BACKEND IMPLEMENTED | Four ordered SQL migrations and Stage 1 Edge Functions are present. | PostgreSQL validation, staging deployment and full security matrix. |
| BE-02 | Content, knowledge processing, assessments, finance and notices | DOCUMENTED | Required entities, ownership boundaries and service contracts are described. | Product/provider decisions, migrations, Edge Functions and integration tests. |
| ST-01 | Local automated verification | TESTED | Vite production build passed; existing Vitest suite passed 13 tests before this assignment. | Re-run after current changes; add tests for navigation coverage. |
| ST-02 | Supabase integration and authorization | NOT STARTED | No current-session staging connection or migration execution evidence. | Approved credentials/config and access to the staging project; never use production. |
| DP-01 | Production deployment preparation | DOCUMENTED | Environment separation, release gates, backup and monitoring requirements are in roadmap. | Hosting/domain/provider decisions and security review. |

## Ordered backlog

### P0 — Verify Stage 1 in staging

1. Confirm staging project ownership and environment separation.
2. Review and apply the four Stage 1 migrations in order in staging only.
3. Deploy the Edge Functions and configure server-side secrets through the Supabase secret store.
4. Run migration, Auth, role, RLS, rate-limit, invitation, recovery and import regression tests from `STAGE_1_IMPLEMENTATION.md`.
5. Record actual staging results and defects; do not mark Stage 1 complete based only on local source tests.

### P1 — Library foundation

1. Approve resource categories, accepted formats, rights workflow, retention, private buckets and scanning approach.
2. Add ownership, versions, grants, review decisions and processing jobs through migrations and narrowly scoped functions.
3. Implement private upload, preview and download with authorization tests.
4. Add extraction/OCR behind quarantine and human review; similarity is advisory and never establishes ownership.

### P2 — Learning and assessment

Build the reviewed academic catalogue and resources first, then question banks, practice, timed assessments, cases, pharmacology, anatomy and progress. Separate formative practice from official assessments and retain source/version attribution.

### P3 — Assignment and AI support

Choose a provider and data policy, then implement retrieval from permission-checked, reviewed sources; source-aware answers; assignment planning; citation verification; safety evaluation; cost controls and abuse handling.

### P4 — Governance, publishing and finance

Implement moderation, publications, Shorts, announcements and analytics with rights records, editorial decisions, takedown history and accessible delivery. Decide prices, refund rules, payment provider and entitlement transitions before accepting payments.

### P5 — Release readiness

Complete RLS cross-tenant review, accessibility and mobile testing, security headers/CSP, backups/restore exercise, operational monitoring, incident response, performance review and owner acceptance before production release.

## Owner decisions and external dependencies

- Official programme, learning-level, subject, curriculum and Tutor authorization catalogues.
- Institution verification and evidence policy; suspension/reinstatement policy; retention/deletion policy.
- Hosting/domain, production origins, Auth email sender, redirect allowlist and operational contacts.
- File size/type limits, malware scanning, OCR/text extraction providers and lawful retention periods.
- AI provider, approved knowledge corpus, clinical review process and prohibited use policy.
- Subscription plans/prices, institutional fees, payment provider, refunds and tax/accounting process.
- Notification channels and consent/preferences.

## Completion rule

Mark a module COMPLETE only after its required behavior, authorization, data handling, error/empty/loading states, audit needs and automated or documented acceptance tests pass. This assignment creates a coherent navigation and front-end skeleton; it does not make the platform production-ready.
