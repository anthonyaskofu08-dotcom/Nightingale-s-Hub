# Implementation and Testing Status

**Snapshot:** 10 November 2026. Update this file whenever a module status or verification result changes. Status vocabulary is defined in `MASTER_OUTSTANDING_WORK_LOGBOOK.md`.

## Status by subsystem

| Subsystem | Status | Current evidence | Not yet verified |
|---|---|---|---|
| Original static demo | FRONTEND IMPLEMENTED | `App.js`, `Index.Html`, `Style.Css` retained and modified for accessibility/mobile behavior. | Cross-browser and manual mobile acceptance. |
| React shell | FRONTEND IMPLEMENTED | `next/src/app/App.tsx`, portal Sidebar/Topbar, role resolution and session handling. | Screen-reader and real-device coverage; URL routing beyond invitation path. |
| Stage 1 identity | BACKEND IMPLEMENTED / INTEGRATED | Four migrations, Auth forms, role resolution, Edge Functions and source-contract tests. | Staging SQL/RLS/Auth/function execution, failure/race conditions and full role matrix. |
| Institution review/records | BACKEND IMPLEMENTED / INTEGRATED | Review, scoped management, invitations, import and recovery workflows exist in code. | Staging end-to-end flows and security audit. |
| Catalogue/resource demo | FRONTEND IMPLEMENTED | Search/filter and example hierarchy/visual assets. | Authoritative curriculum, resource repository and rights-aware persistence. |
| New student modules | SKELETON CREATED | Examination, research, cases, pharmacology, anatomy, tutor, progress, notices and subscription navigation/workspace boundaries. | All persistence, services, content, security and module tests. |
| New lecturer modules | SKELETON CREATED | Question bank, exam prep, assignment support and history navigation/workspace. | Scoped authoring, data model, review and backend tests. |
| New institution modules | SKELETON CREATED | Academic years, intakes, notices, analytics and subscription navigation/workspace. | Business rules, schema and RLS. |
| New global administration modules | SKELETON CREATED | Users, institutions, library, knowledge engine, moderation, publishing, analytics, audit, support and settings navigation/workspace. | Privileged server contracts, immutable audit viewer and role tests. |
| Storage and Knowledge Engine | DOCUMENTED | Target quarantine, rights, versions, OCR/extraction and retrieval architecture. | Provider decisions, buckets, jobs, implementation and validation. |
| Finance and entitlements | DOCUMENTED | Payment verification, events and entitlement architecture. | Prices, provider, refund policy and implementation. |
| Production deployment | DOCUMENTED | Separation, secret handling, CSP, monitoring and release gates in roadmap. | Hosting decisions, production configuration and release review. |

## Checks performed during this assignment

- `npm.cmd test`: passed, 3 test files and 15 tests, including two navigation coverage checks.
- `npm.cmd run build`: passed TypeScript project build and Vite production bundle (147 modules transformed).
- `git diff --check`: run after the final staged review; whitespace findings are corrected before commit.
- Sensitive-file scan: `.env.local` remains ignored; dependencies and build output remain ignored; staged-path review is required before every commit.
- Supabase staging checks: NOT RUN. The local checks do not validate PostgreSQL migrations, Auth, RLS, Edge Functions, storage, provider configuration or cross-tenant behavior.
- Browser/device/accessibility checks: NOT RUN in this assignment. A successful production build does not verify mobile rendering or assistive-technology behavior.

## Required test layers

1. TypeScript and production Vite build.
2. Vitest unit and source-contract tests; add navigation completeness checks for portal-to-screen mapping.
3. Manual keyboard, focus, screen-reader and responsive checks on mobile/tablet/desktop.
4. Stage 1 SQL and Edge Function tests against a disposable local/staging database; no production writes.
5. RLS matrix across anonymous, student pathways, lecturer/tutor assignment and own/foreign institution administrator/global admin.
6. Upload/download, quarantine, rights, withdrawal and processing retry tests before storage release.
7. Assessment replay/timing, answer secrecy, AI source authorization, webhook signature/idempotency and audit completeness tests before their modules are enabled.

## Known constraints

- Current demo records and learning figures are fictional; demo actions may be session-local.
- `next/.env.local` is local and ignored. It is not included in Git. Frontend config may contain only a public publishable/anon key; server secrets belong only in provider-managed Edge Function configuration.
- Supabase migrations are repository files; this snapshot does not claim that they are applied to staging.
- OCR, AI, payment processing, real content publication and production deployment are not implemented.
