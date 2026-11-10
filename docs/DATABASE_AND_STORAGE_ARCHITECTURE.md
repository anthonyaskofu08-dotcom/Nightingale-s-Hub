# Database and Storage Architecture

This is the target architecture and current implementation boundary. Existing Stage 1 migrations in `next/supabase/migrations/` are the only database implementation present. No new module tables are claimed as deployed. Prepare future schema as reviewed migrations; apply to staging only after the owner confirms project/environment and then run the authorization matrix.

## Implemented Stage 1 domain

The current migrations establish Auth-linked profiles, institutions and onboarding/review evidence, scoped memberships and role assignments, programmes and learning levels, student enrolments, tutor authorizations, reusable institutional student/tutor records, invitations and setup tokens, record corrections/history, import staging, rate-limit state and audit events. Four ordered migrations are present (identity/records, hardening, completion hardening, recovery/linking/rate cleanup). Edge Functions mediate privileged changes. Stage 1 source exists; migration execution and staging behavior must be verified separately.

## Target domain groups

| Domain | Core records (proposed) | Key controls |
|---|---|---|
| Identity and institutions | profiles, role_assignments, institutions, registrations, verification_records, memberships, programme_offerings, enrolments, academic_years, intakes | Auth user FK; institution scope; verified lifecycle transitions; separate compliance, publication and billing status. |
| Official records | institutional_records, record_versions, corrections, import_jobs, import_rows, invitations, setup_tokens, access_code_batches, access_codes, redemptions | Normalize identifiers; unique scoped hashes; immutable audit history; transactional claim/redemption; no silent role changes. |
| Academic catalogue | disciplines, programmes, learning_levels, subjects, topics, curriculum_outcomes | Platform-curated stable keys; active/version state; institution offering references rather than duplicated curricula. |
| Resource library | resources, resource_versions, ownership_claims, rights_evidence, audience_grants, review_decisions, bookmarks | Separate private, institution/teaching and official Nightingale categories; explicit audience; provenance and licence state. |
| Knowledge processing | processing_jobs, extracted_pages, classifications, similarity_candidates, index_documents | Quarantine first; idempotent job state; extraction provenance; similarity is advisory; index only permitted reviewed material. |
| Assessment | question_banks, questions, question_versions, choices, blueprints, assessment_windows, attempts, responses, results | Separate practice and official assessment; shuffle/attempt rules server-side; immutable attempt snapshot; prevent answer leakage. |
| Clinical learning | case_studies, case_versions, case_steps, reviewed_feedback, pharmacology_items, anatomy_assets | Named clinical reviewers and source/version records; educational boundary; correction and withdrawal trail. |
| Progress and support | learning_events, goals, milestones, tutor_threads, retrieval_sources, assignment_workspaces, citations | Own-user default; purpose-limited cohort aggregates; source provenance; data retention and deletion rules. |
| Publishing and community | publication_submissions, contributors, rights_records, editorial_reviews, shorts, reports, takedowns, announcements | Rights evidence; editor separation; audience and licence checks; appeal/withdrawal history. |
| Finance | plans, institution_contracts, payment_events, invoices, refunds, entitlements | Provider-signed webhook verification, idempotency, append-only financial events, auditable entitlement derivation. |
| Operations | audit_events, admin_activity, support_cases, notification_events, provider_health | No client writes to audit; minimize PII; retain correlation IDs; access and exports audited. |

## Storage layout and access

Use private buckets only for private learner work, institution materials and unpublished official submissions. A public bucket is permitted only for assets explicitly reviewed and licensed for public distribution. Store object metadata separately: bucket/path, owner, institution (nullable), resource/version, media type, byte size, checksum, scan state, rights state, visibility and retention timestamp. Object paths are identifiers, not authorization. RLS-backed metadata plus short-lived signed URLs or an authorized Edge Function must control reads and downloads.

Uploads should use a quarantine path and size/type allowlist; verify file signatures rather than trusting extensions; scan for malware; record checksum; prevent overwrite of another user's path; and transition through `quarantined -> validated -> processing -> review -> available` or an explicit failure/rejection state. Delete/revoke signed access on withdrawal, account closure or policy change. Keep originals immutable when creating new versions.

Supported future types include PDF, Word, PowerPoint, Excel, CSV, images and reviewed additional formats. Scanned files require OCR with page-level confidence and source attribution. Unsupported formats must return a clear unavailable state. Do not execute embedded macros or treat extracted text as trusted instructions.

## API and processing contracts

- Edge Functions authenticate caller JWTs and independently verify role, institution scope, input schema, ownership and workflow transition.
- Use transactional database functions for multi-row claims, invitation redemption, code redemption, imports and entitlements.
- Use idempotency keys for retried requests and provider webhooks; rate limit by account and trusted network context.
- Background jobs are leased, retry-bounded and observable; record safe error codes rather than secrets or document contents.
- AI retrieval only receives content whose current grant allows the requesting user; return source IDs/versions and refuse unsupported clinical assertions.
- Payment webhook payloads are verified using provider signatures; the browser never sets payment state or entitlements.
- Notifications contain minimal details and link to an authorized screen; sensitive content is fetched after authentication.

## RLS and migration checklist

For every table and storage object: enable RLS, revoke broad defaults, grant minimum commands, implement own-user/institution scope via trusted active role helpers, and test anonymous/role/scope combinations. Add FKs, unique/check constraints, indexes for policy predicates and safe cascade behavior. Add rollback notes, transaction boundaries, data classification, retention and seed provenance to each migration. Never apply migrations to production without explicit approval; staging migrations are not yet applied by this assignment.
