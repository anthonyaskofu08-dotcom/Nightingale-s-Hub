# Nightingale's Hub — Technical Architecture and Roadmap

**Implementation status update — 10 November 2026:** The owner authorized the complete development assignment, frontend skeletons, documentation, tests and commits/pushes to `nightingales-hub-improvements`. The initial backup `1f82d3e` is on that remote branch. Stage 1 implementation remains in `docs/STAGE_1_IMPLEMENTATION.md` and `next/`. Production deployment, production data mutation and production migration application remain outside scope.

**Status:** React + TypeScript + Vite is approved and implemented as the active frontend shell. New platform areas are marked as skeletons until their backend contracts, permissions and tests are complete.
**Branch reviewed:** `nightingales-hub-improvements`
**Architecture boundary:** A future, dedicated Nightingale's Hub Supabase project. ScratchKE is out of scope and must remain separate.

## 1. Executive summary

Nightingale's Hub is currently a small static browser demo, not an implemented learning platform. Its three application files provide a useful starting point for navigation and visual direction, but they do not include a build system, application framework, server, database, authentication, or backend integration. The current branch also contains the earlier approved responsive/accessibility frontend edits in its working tree.

The approved target is a modular web application with:

- **Frontend:** React + TypeScript + Vite, with route-level modules and shared components. Migrate in manageable stages rather than rebuilding all at once.
- **Backend:** a new, owner-approved Supabase project dedicated to Nightingale's Hub, using Auth, PostgreSQL, private Storage, RLS and narrowly scoped Edge Functions.
- **Domain design:** normalized identity/institution relationships, a reusable academic catalogue, governed resources, separate practice and official assessment records, and module-specific extension tables where structured data is genuinely needed.
- **Security:** deny by default; database policies and server functions enforce authorization. Frontend role checks are only for user experience.
- **Delivery:** establish and review the architecture before connecting services; deliver institutional identity and access first, then learning resources, assessment, academic support, and commercial expansion.

At the time of the initial review, no migration, Supabase connection, package installation, code change, deployment or push had been performed. Current evidence is maintained in the implementation status and work logbook.

## 2. Repository audit and product gap

### What exists

At the initial audit, the repository had only `Index.Html`, `Style.Css` and `App.js` (plus Git metadata). The React app, documents, assets, tests, environment template, backend functions and migrations were added later.

The current static UI contains:

- An Overview page with fixed sample progress figures, a Heart Failure continue-learning card and subject shortcuts.
- A Nursing Catalogue containing an in-memory subject list and client-side text filtering.
- A Topic Learning view with generic Diploma/BScN outlines; the content does not change to match the subject.
- My Study Materials, which only selects a local file and displays its name. It does not upload or persist a file.
- Practice Centre buttons that show demo alerts.
- Placeholder Nightingale Shorts and Publications sections.
- Sidebar navigation that switches visible sections in the browser.

The existing UI is a prototype, and the previous Phase 1 branch edits improve its file references, mobile drawer and accessibility. Those edits are already present in the working tree and were not changed during this architecture-only task.

### What is incomplete or absent

The current repository has Stage 1 identity, onboarding, institution administration and official-record implementation in source, plus a React/Vite shell and local-only learning demonstrations. The remaining product gaps include a governed persistent learning library, processed uploads, question and assessment systems, clinical content, progress persistence, AI services, assignment workflows, publication governance, finance, cross-module analytics, production configuration and operational monitoring.

The frontend can connect to the configured Supabase project for Stage 1 and selected workspace screens. Most learning content, progress, library, assessment and publishing screens remain demonstrations or skeletons; sample statistics and topic outlines are not real student data or authoritative clinical learning content.

### Immediate technical implications

1. Preserve the current visual design, Nightingale's Hub branding, pages, responsive behaviour and all working demo interactions throughout frontend migration.
2. Replace sample metrics with clearly labelled demo content until authenticated, persisted data exists.
3. The frontend stack is approved. Hosting provider, domain and supported browser versions remain to be decided before implementation.
4. Create a separate Supabase project only after owner approval and account/project ownership are settled.
5. No real personal, institutional, clinical or payment data should be entered into the current demo.

The master development assignment authorizes repository source changes, documentation, tests, safe migration preparation and commits/pushes on the named branch. It does not authorize production deployment, production data changes or production migration application.

## 3. Proposed system architecture

```text
Browser (responsive React/TypeScript application)
  ├─ Public pages and authenticated role-aware workspaces
  ├─ Supabase Auth session (public/anon key only)
  └─ Supabase client ── Postgres with RLS / private Storage
                            └─ Edge Functions for privileged workflows
                                 ├─ access-code redemption
                                 ├─ invitation/role changes and institution review
                                 ├─ upload authorization and document processing orchestration
                                 ├─ AI requests and retrieval
                                 └─ payment initiation and verified webhook handling
```

The browser may call ordinary, RLS-protected data operations. It must never receive a service-role key, payment secret, AI provider key, or other privileged credential. Edge Functions must verify the caller, validate input, enforce authorization and perform sensitive multi-step operations. Database functions should be narrowly scoped and avoid becoming a general bypass around RLS.

Supabase is the proposed system of record for identity linkage, academic data, entitlements, learning activity, and metadata. Private documents reside in private Storage buckets; PostgreSQL stores their ownership, provenance, permissions and processing state. Third-party AI, email, OCR, malware scanning and payment services are provider choices requiring owner review.

### Environment separation

Use independent local/development, staging and production configuration and Supabase projects where budget and operating needs allow. Do not reuse ScratchKE credentials, databases, storage, auth configuration or deployment secrets. Keep `.env` files with secrets out of Git; provide only a placeholder environment example after stack approval. Establish backups, migration review, logging, alerting and recovery procedures before production data is stored.

## 4. Frontend module structure

The app should be organised by product domain, not as one large page or a set of isolated mini-apps. Introduce this structure gradually while the existing application remains usable. Preserve its existing brand, pages, responsive behaviour and working functionality at every stage. Suggested future structure (names are illustrative):

```text
src/
  app/                 app shell, router, route guards, global providers
  components/          accessible shared controls, dialogs, forms, tables
  design/              tokens, typography, spacing, icon and responsive rules
  modules/
    identity/          registration, login, recovery, profile
    dashboard/         role-specific home and progress summaries
    institutions/      registration, review state, administration, programmes
    learning/          discipline/programme catalogue, resources, search
    assessments/       question banks, practice, official assessments and results
    cases/             clinical case-study player and authoring
    pharmacology/      reviewed drug content and calculation activities
    anatomy/           anatomy/physiology visual learning and quizzes
    assignments/       workspaces, instruction analysis, research and citations
    tutor/             AI learning assistant and conversation controls
    workspace/         private files, generated study aids and bookmarks
    publications/      approved publications and licence metadata
    billing/           subscription display and transaction history
    admin/             platform governance and audit review
  services/            typed data-access functions, no privileged secrets
  types/               shared domain types and generated DB types
  styles/              global responsive styles
```

Route examples: `/`, `/learn`, `/learn/:subject/:topic`, `/practice`, `/assessments`, `/cases`, `/assignments`, `/workspace`, `/institution`, `/lecturer`, `/admin`. Routes must be guarded for experience and convenience, but authorization remains server-side. The app shell should expose only routes relevant to the signed-in user's capabilities while still handling denied requests safely.

Build shared navigation, responsive page layouts, accessible form fields, loading/empty/error states and confirmation patterns once. Use design tokens consistent with clinical blue, white, navy and teal. Keep labels and focus behavior consistent. Do not present placeholder controls as operational features.

## 5. Supabase data model proposal

This is a domain model proposal, not a migration plan. It intentionally groups related concepts rather than creating a table for every bullet in the blueprint. Prefer UUID primary keys, UTC timestamps, foreign keys, check constraints, unique constraints and indexes on foreign keys and common filters. Add `created_at`/`updated_at` where useful; immutable event records need not be updated. Use soft deletion only where recovery/audit requirements justify it. Apply a migration and data-retention review before implementation.

### 5.1 Identity, roles and institutions

| Table | Purpose and key fields | Relationships and access |
|---|---|---|
| `profiles` | App profile keyed by `id` referencing `auth.users.id`; display name, preferred name, locale, optional contact fields, onboarding state, timestamps. Keep only necessary personal data. | A user may have memberships and role assignments. A user reads/updates allowed own profile fields; privileged fields are server-controlled. |
| `role_assignments` | A user's role and scope: `user_id`, role key, optional `institution_id`, status, `granted_by`, `granted_at`, `revoked_at`. | References profile and optionally institution. Users cannot create or promote their own assignments. Global admin assignments require a controlled operator path and audit event. |
| `institutions` | Canonical institution record: name, type, location fields, official contact, lifecycle/review status, publication status, suspension metadata, creator and timestamps. Keep suspension reason separate from billing state. | Parent for memberships, programme offerings, access-code batches, resources and subscriptions. Public fields may be read only when approved/published; private fields require institution/global admin scope. |
| `institution_registrations` | Submitted onboarding snapshot and review workflow: applicant, institution details, submitted/decision timestamps, status, reviewer, decision reason. | Belongs to a registration representative and may be linked to a resulting institution. Applicant reads own submission; assigned global reviewers decide it. |
| `institution_verification_records` | Verification document/reference, type, storage object, reviewer, status and timestamps. | Belongs to registration/institution. Access restricted to applicant as appropriate and designated global reviewers. Store sensitive verification files privately. |
| `institution_memberships` | User's current or historical relationship to an institution: role in institution, status, start/end, invited/created by. | Join profile to institution. Users see their own; institution administrators and global admins see only authorized institutional membership data. |
| `programmes` | Reusable academic programme catalogue item: discipline, code, name, award/description, active state. Initially includes Diploma and BScN; avoid embedding one institution's enrollment in the catalogue. | Belongs to a discipline; used by offerings, enrolments and resources. Curated platform catalogue read by users; edits restricted to global academic governance. |
| `institution_programme_offerings` | Institution-specific programme offering: institution, programme, local title/code, status, dates and configuration. | Joins institution to programme. Institution administrators manage only their institution's offerings after publication/authorization. |
| `student_enrolments` | Student's programme/level relationship: student, institution, programme offering, learning level, status, start/end, enrollment source. | References profile, offering and level. Student reads own; institution staff access only learners within authorized offering and purpose. |
| `access_code_batches` | Issuance batch metadata: issuer, institution, offering, level, expiry, per-code/use policy, label and status. Do not store plaintext batch codes. | Parent to individual code records. Institution admin manages batches for own institution; global admin may audit. |
| `access_codes` | One-time or limited-use code record: batch, cryptographic hash, expiry, max uses, usage count, revocation state. | Unique hash and batch foreign key. Never expose hash or plaintext to ordinary clients. Redemption only through a transactional server function. |
| `access_code_redemptions` | Append-only redemption record: code, user, enrolment created, redeemed timestamp and outcome/idempotency reference. | Unique constraints prevent duplicate redemption where policy says one use per student; row is private to authorized audit/administration paths. |

**Institution status model:** keep institution compliance/review state (for example, pending, approved, suspended, rejected) separate from publication state and from the subscription's billing state. A lapsed payment must not automatically imply misconduct suspension. Enforce state transitions through server functions and audit every administrative transition.

**Access-code redemption:** an Edge Function should authenticate the student, normalize the submitted code, hash it using a server-held secret or suitable cryptographic design, lock/check the code row in a transaction, verify state/expiry/remaining uses, validate target offering/level, create membership and enrolment, record redemption and increment usage atomically. Return only a safe outcome. Do not permit querying the code table from the browser. Exact code entropy, rotation and batch sizes need operational review.

### 5.2 Academic catalogue and governed content

| Table | Purpose and key fields | Relationships and access |
|---|---|---|
| `disciplines` | Top-level subject area with name, description, status and sort order. | Parent for programmes; platform-curated reads; global academic editors write. |
| `learning_levels` | Shared level definitions such as Diploma and BScN, with stable key and ordering. | Referenced by resources and enrolments; curated by global academic governance. |
| `subjects` | Subject within a discipline/programme scope, with title, code and status. | Referenced by topics; reads follow catalogue publication and audience permissions. |
| `topics` | Hierarchical learning concepts with `subject_id`, nullable `parent_topic_id`, title, description and order. | Self-referencing tree under subject; constrain against cycles in service/validation. |
| `learning_resources` | Resource metadata: title, summary, type, subject/topic, level, status, author, review state, licence and publication timestamps. | Resource may have multiple files, owners and permissions. Publicly readable only when approved and licence permits. |
| `resource_files` | File/version metadata: resource, storage bucket/path, original filename, media type, size, checksum, version, processing state. | References `learning_resources`; private object access mediated by RLS-backed metadata and short-lived signed URLs. |
| `resource_ownership` | Ownership/provenance records: resource, owner type/id, rights basis, attribution, licence, evidence reference and dates. | Owner may be platform, institution, author, student or third party. No ownership transfer from similarity detection. Restricted writes and auditable changes. |
| `resource_permissions` | Explicit scope grants for a resource: institution/programme/role/user, permission type, validity and grantor. | Supports controlled access beyond publication. Policy must ensure an explicit grant does not bypass owner/legal status. |
| `resource_revisions` | Review and publication history: version, reviewer, decisions, notes, source/provenance changes. | Append-only or immutable after decision; reviewers and global admins only. |
| `resource_bookmarks` | User-resource saved item with created time. | Unique `(user_id, resource_id)`; user controls own rows; referenced resource still must be readable. |
| `resource_views` | Optional recent-view activity with user, resource and timestamp. | Own activity for student; staff aggregate only where authorized and disclosed. Retention/analytics policy required. |
| `learning_activity` | Progress events such as viewed, completed, quiz/practice event reference, duration where justified. | User-scoped insert/read; authoritative assessment records remain in their own tables. Avoid trusting client-supplied scores. |

Use general `learning_resources` for notes, videos, diagrams, reference links and reviewed explanations. Add structured domain tables only when a use case requires fields that generic resources cannot model (for example, drug monographs or case steps). Track source citation, reviewer, version, intended level and educational disclaimer for clinical resources.

### 5.3 Questions, practice, examinations and cases

| Table | Purpose and key fields | Relationships and access |
|---|---|---|
| `question_banks` | Curated bank scope: programme, level, subject/topic, owner institution, status and review state. | Contains questions; owner institution or global curator manages. Students do not receive answer keys through bank reads. |
| `questions` | Prompt, type, difficulty, rationale, source/review metadata, status and author. | Belongs to a bank; questions may have choices and tags. Restrict answer/rationale access during secured assessment attempts. |
| `question_choices` | Choice text, display order and correctness marker/feedback. | Child of question. Correctness is never exposed in a client query before allowed feedback time. |
| `assessments` | Practice quiz or formal assessment definition: type, title, owner, time rules, availability, scoring policy, status, assessment mode. | Authoring scoped to lecturer/institution/global role. Explicit `practice` versus `official` mode; official grade data restricted. |
| `assessment_questions` | Ordered question assignment with points and optional randomized settings. | Join assessment to question; validate that sources are authorized and version behavior is understood. |
| `assessment_assignments` | Which users/cohort/offering may take an assessment, schedule and attempt policy. | Institution-scoped lecturer/admin writes; students read their own assignments. |
| `assessment_attempts` | User, assessment, mode snapshot, start/submit time, status, attempt number and server-computed score state. | A student's own attempts; staff access only for authorized classes and official assessment purposes. Enforce attempt windows server-side. |
| `assessment_answers` | Attempt/question response, selected choice or response text, server grading status, awarded score and feedback. | Child of attempt. Protect answer key and other students' work. Human grading is limited to assigned lecturers. |
| `assessment_results` | Final result snapshot, grade state, marker and release state. | Official results visible to student only according to release policy; authorised institution staff and auditors only. Keep practice results visibly separate. |
| `case_studies` | Reviewed educational scenario metadata, programme/level/topic, learning objectives, author, reviewer, version and disclaimer. | Approved public/authorized reads; authoring is scoped and clinical review required. |
| `case_steps` | Sequential scenario information and decision point references. | Child of case study; only released step content should be returned to the learner. |
| `case_options` | Option text, safe feedback and scoring rubric for a step; answer keys protected. | Child of case step; access through controlled case-session function to avoid leaking future answers. |
| `case_attempts` | User, case/version, current step, state and completion time. | Own attempts; educators see authorized learner activity only when configured. |
| `case_responses` | Step response, selected option/text, feedback released, score and timestamp. | Child of own attempt; staff access follows class scope. |

The client should never determine official scoring or release grades. Server-side grading must be deterministic and versioned. Essay and other human-marked work needs an explicit rubric, marker assignment and release state. Practice activity must not silently enter official grade records.

### 5.4 Pharmacology, anatomy and progress extensions

| Table | Purpose and key fields | Relationships and access |
|---|---|---|
| `drug_monographs` | Reviewed drug reference: generic name, classification, mechanisms, indications, contraindications, safety notes, version, source references, reviewer and review date. | Linked to resources/topics; read only when approved; edits/reviews restricted to qualified content governance. Never treat AI output as canonical. |
| `drug_monograph_sources` | Source citation, version/date, link or licence, and relevant section. | Child of monograph; reviewers maintain provenance; public display according to rights. |
| `anatomy_concepts` | Structured anatomical/physiological entities with system, parent, names, explanation and order. | Hierarchical and linked to generic resources/diagrams; curated by content editors. |
| `learning_achievements` | Optional achievement definitions and criteria, not user-earned state. | Platform curated; read-only to students. |
| `user_achievements` | User achievement awarded by a trusted server process, with evidence reference and date. | User reads own; institution view only if explicitly permitted. No client self-awarding. |

Dashboard progress should initially be assembled from authoritative activity/assessment records or carefully designed aggregates. Do not store duplicate score values as an independent source of truth. Consider materialized summaries only after read-volume and privacy requirements are understood.

### 5.5 Assignment research, private workspace and AI

| Table | Purpose and key fields | Relationships and access |
|---|---|---|
| `assignment_workspaces` | Student-owned assignment lifecycle: title, course/context, status, due date if supplied, created/updated time. | User-private by default; institutional assignment sharing only through an explicit relationship and permission. |
| `assignment_documents` | Original instruction/document metadata, private storage path, checksum, extracted text state and retention. | Child of workspace; owner-only unless explicitly shared. Access via signed URL after server authorization. |
| `assignment_requirements` | Parsed task verbs, word limit, referencing style, required sections, instructions and confidence/source span. | Child of workspace/document; clearly marked machine-extracted and editable/confirmable by student. |
| `assignment_sections` | Student outline/draft sections, order, content, revision and timestamps. | Private workspace scope; do not use as model training without explicit policy/consent. |
| `research_sources` | Source metadata, DOI/URL, author/title/date, source type and verification state. | Workspace-scoped; distinguish verified metadata from user-provided text. Respect source licences. |
| `assignment_citations` | Citation instance/format, source link, location/claim and style. | Belongs to section/source; user-owned, with generated citations marked for verification. |
| `study_materials` | User-private uploads not yet promoted to a governed learning resource: owner, metadata, storage key, classification and processing status. | Owner-only by default; no institutional/global visibility without permission/legal basis. |
| `generated_study_aids` | Generated summaries, flashcards, questions or notes with source references, model/version and review state. | Private to requesting user unless explicitly shared; clearly marked generated and not authoritative. |
| `ai_conversations` | User's AI workspace, module/context, retention setting and timestamps. | User-only by default; limited audited support access only if defined. Consider not persisting sensitive prompts by default. |
| `ai_messages` | Conversation messages, role, content or safe reference, model/version, source IDs, safety state and timestamp. | Inherits conversation permissions; redact/minimize logs and set retention. Never include credentials. |
| `ai_usage_events` | Minimal quota/cost/safety metadata: user, function, token/use count, provider/model and outcome. | Backend-only writes; user sees own usage only if product policy supports it; admin reporting aggregated. |

Document text should not be duplicated across tables without a retention reason. Extracted text, embeddings and AI prompts are sensitive derivatives of the source document and inherit its access, retention and deletion rules.

### 5.6 Institutional commercial records and governance

| Table | Purpose and key fields | Relationships and access |
|---|---|---|
| `subscription_plans` | Owner-defined plan identifiers, feature entitlements and lifecycle; price/currency fields remain unset until business decisions are approved. | Global commercial admin writes; public display only when approved. No invented tiers or prices. |
| `subscriptions` | Payer scope (user/institution), plan, provider reference, lifecycle status, period dates and cancellation state. | Institution admins see their institution's record; users see own. Server/webhook controls status. Keep billing state separate from institution disciplinary status. |
| `payment_transactions` | Internal idempotent transaction: payer, amount/currency only once owner defines them, provider reference, purpose and status. | Server-only writes; payer and authorized finance/global admins read scoped data. Never trust browser success. |
| `payment_webhook_events` | Provider event ID, signature verification result, received/processed state and minimal payload reference. | Server-only; unique provider event ID prevents duplicate processing; secrets and sensitive payloads protected. |
| `receipts` | Receipt identifier, transaction, issue date and document reference. | Payer reads own/institution receipt; finance roles manage. Details depend on tax/accounting decisions. |
| `audit_events` | Append-only security/governance record: actor, action, target, scope, time, outcome and safe metadata. | Client cannot edit/delete; read restricted to authorized security/global administrators. Never log secrets or raw private document content. |
| `administrative_actions` | Reviewable action record for institution state, role grants, moderation or content decisions, including reason and reviewer. | Restricted inserts through trusted functions; read scoped to authorized oversight. May be unified with `audit_events` if one model meets audit needs. |
| `content_reports` | Optional report/rights/safety review queue: reporter, resource, reason, status and resolution. | Reporter sees own report status; reviewers see assigned cases; action history audited. |

Billing provider, prices, tier design, commissions, renewal policy, refund policy, tax handling and currency are deliberately unresolved business decisions.

## 6. Roles and permissions matrix

This is a capability summary; each action must also be constrained by institution, programme, class, resource ownership and record status. “Own” means the authenticated user's record. Backend policies/functions are authoritative.

| Capability | Independent student | Institutional student | Lecturer | Tutor | Institution admin | Registration representative | Global admin |
|---|---|---|---|---|---|---|---|
| Read published catalogue/resources | Yes | Yes, plus authorized institutional content | Yes | Yes, as authorized | Yes, within institution/admin needs | Public/own onboarding only | Yes |
| Manage own profile/private workspace | Own | Own | Own | Own | Own | Own | Own |
| Join institution by access code | Not applicable unless changing pathway | Redeem valid code for self | No | No | Generate/manage codes for own institution | No by default | Oversight/support through audited process |
| View learner records | Own only | Own only | Assigned/authorized classes | Only explicitly assigned learners/services | Own institution, minimum required fields | Own registration submission | Platform-wide for defined operational purpose, audited |
| Create/edit learning resources | Personal private materials only | Personal private materials only | Authorized scope; ownership/rights recorded | Authorized scope; ownership/rights recorded | Institution resources/permissions | No | Platform-governed content; not automatic ownership of others' work |
| Author assessments | Personal practice where supported | Personal practice | Assigned courses/programmes | Only explicitly authorized | Assign/manage institutional scope if policy permits | No | Platform-level governance, not routine class authoring |
| Mark official assessments | No | No | Assigned assessments only | Only explicitly delegated | Oversight/status only unless also separately assigned lecturer | No | Exceptional audited oversight; policy-defined |
| View grades | Own practice and released results | Own practice and released official results | Assigned learners/assessment | Only where delegated | Authorized institutional reporting | No | Audited operational need only |
| Manage institution/programmes/users | No | No | No | No | Own institution, within approved offerings | Own registration and verification process only | All institutions; review/suspend/reinstate with reasons |
| Grant privileged/global roles | No | No | No | No | No global roles; scoped admin grants only if policy allows | No | Controlled platform process, audited |
| Manage billing | Own subscription/receipts when launched | Own subscription/receipts when launched | No | No | Own institution billing record | Registration/payment status only if approved | Platform commercial operations |
| Manage platform configuration/audit | No | No | No | No | Institution-level records only | Own submission | Authorized global admin/security roles |

Roles should be assigned by trusted backend workflows. A user can hold more than one scoped role, but conflict-of-interest rules and scope must be explicit. Tutor access should be time-bound and narrowly scoped. Registration representatives should not gain institution-admin powers merely by submitting an application. Global administrator powers should use a controlled assignment process, MFA and audit review.

## 7. RLS and backend security strategy

1. **Default deny.** Enable RLS on every table exposed to the Supabase API. No policy means no access. Do not rely on frontend route guards.
2. **Trusted role source.** Use protected `role_assignments` and verified institution relationships. Do not trust user-editable `user_metadata`, request body role values or client claims for privilege. Avoid broad JWT claims that become stale after a role revocation.
3. **Helper functions.** Add small, reviewed SQL helpers such as `is_global_admin()`, `is_active_institution_admin(institution_id)` and `can_read_resource(resource_id)` using safe `SECURITY DEFINER` configuration, fixed `search_path`, minimal grants and tests. Prefer RLS subqueries when they are clear and performant.
4. **Tenant isolation.** Every institution-owned row must carry or resolve an institution scope. Policies compare it to an active membership/role assignment. Cross-institution reads are prohibited unless the record is explicitly published for shared access.
5. **User-owned records.** Private workspace, assignment, conversation and study-material policies bind to `auth.uid()` and require explicit sharing for any other principal. Storage policies mirror the corresponding metadata access.
6. **Sensitive workflow through functions.** Role grants, institution approval, access-code redemption, official grade release, secure uploads, AI requests and payment transitions use Edge Functions or narrow SQL RPCs. Verify JWT, current role/scope, payload, state transitions and idempotency server-side.
7. **Separate sensitive answer keys.** Do not expose correct answers, unreleased grades or future clinical case steps in general client-readable rows. Return only the material for the current authorized activity via controlled queries/functions.
8. **Storage access.** Keep buckets private. Authorize based on a database row and role scope, then issue short-lived signed URLs. Never use guessable public paths as authorization.
9. **Audit.** Record privileged changes and failed sensitive operations without recording secrets, access codes in plaintext, full documents or unnecessary personal data. Restrict audit reads and prevent client mutation.
10. **Operational safeguards.** Use server-side input validation, rate limits, anti-automation controls where appropriate, dependency review, secret rotation, backups, monitoring and incident procedures. Define data retention/deletion and account-deletion behavior before launch.

RLS policy complexity itself is a risk. Each policy should have a written intended scope and automated tests for allowed and denied users, including cross-institution attempts, inactive membership, revoked code, suspended institution and stale role. Service-role use bypasses RLS and must be limited to trusted server environments; any use requires explicit review and audit.

## 8. File storage and document-processing architecture

### Storage layout

- Private buckets by access class, such as `student-private`, `institution-private` and `governed-resources`; exact buckets remain subject to policy review.
- Store opaque UUID-based object paths, not email addresses, student names or untrusted filenames.
- Store metadata/ownership in `study_materials`, `resource_files` or `assignment_documents`; database authorization is the source of access decisions.
- Use private buckets by default. A public/open resource is a separate, explicitly rights-cleared publication decision.

### Upload lifecycle

1. Authenticated client requests an upload authorization for a known purpose and target record.
2. Edge Function checks user, role, ownership/tenant scope, file size/type policy and quota; it creates a pending metadata row and returns a short-lived signed upload URL or uses a controlled upload endpoint.
3. File lands in a quarantine/pending state. Verify actual file signature/type, size and checksum server-side; do not rely only on HTML `accept` or claimed MIME type.
4. Run malware scanning and safe parsing in an isolated processor. Apply archive/decompression limits, parser timeouts and resource limits. Reject or quarantine unsupported/suspicious files.
5. Extract text/metadata only after checks. Keep original immutable; write derived text, previews and embeddings to private locations with linked version and provenance.
6. Show processing status and actionable errors. Signed download access is created only after checking metadata policy.
7. On deletion/retention expiry, remove original and derived artifacts consistently, recording only a minimal audit event where required.

OCR/document parsing provider, supported file types/limits, malware scanning service, retention periods, data residency, maximum upload size and whether files may be sent to third parties are unresolved. Do not send private files to an AI/OCR vendor without an owner-approved data-flow and privacy review.

### Document similarity and governance

Similarity detection should compare only documents the processing service is authorized to process. It can flag possible overlap to reviewers but cannot grant ownership, publish content or merge documents. Record source document, rights basis, creator, license, derived version and reviewer decision. Respect confidential and institution-specific source partitions. Review false positives and document deletion effects before enabling cross-tenant comparisons.

## 9. AI integration architecture

- Route all model calls through a server-side AI gateway (Edge Function or separately approved service). The browser never holds a provider secret.
- Authenticate the user and check role, feature entitlement, rate/usage limits and allowed task before processing. Keep assignment support, study generation and tutor contexts distinct.
- Retrieve only resources that the current user is authorized to read. Apply tenant/ownership filters before retrieval; embeddings/vector search must not weaken the underlying resource policy.
- Return cited source references where retrieval is used. Display generated content as assistance, include uncertainty/limitations, and distinguish it from reviewed teaching content.
- For clinical/pharmacology answers, use reviewed sources and a constrained learning context; include educational-only messaging. The model is not an approved clinical reference and cannot replace supervision.
- Do not promote generated output into canonical library content without qualified human review, source/rights checks and versioned approval.
- Minimize prompt and response storage. Establish explicit retention, user controls, vendor data use/training terms and opt-in requirements before sending private documents externally.
- Log model/version, request category, safety outcome and usage metadata needed for operations; avoid raw prompt logging by default. Protect any conversation records with user-level RLS.
- Define prompt-injection handling for uploaded documents and retrieved text. Treat document content as untrusted data, not instructions to the system.

AI provider, model, pricing/quotas, regional processing, permitted data, logging policy, citation source providers and human-review process require owner approval. No real AI capability is present now.

## 10. Payments and subscriptions architecture

Use a provider adapter boundary so commercial policy is not hard-coded into frontend screens. A later secure flow should:

1. Receive a payment/subscription intent from an authenticated user or institution administrator.
2. Verify eligibility and owner-approved plan/amount/currency server-side.
3. Create a pending transaction with an idempotency key.
4. Initiate checkout through the selected provider from a trusted backend.
5. Treat signed provider webhooks, verified server-to-server, as the authoritative payment result; validate signature, provider event ID, amount, currency and transaction relationship.
6. Process webhook events idempotently and update subscription/entitlement state transactionally.
7. Expose only scoped status and receipts to the payer; never accept a browser redirect or success message as proof.
8. Keep subscription/payment failure separate from institution compliance suspension. Expiry should change entitlement according to an owner-approved grace/access policy, not silently delete data.

Provider, prices, subscription tiers, billing intervals, institutional fee, currencies, taxes, commission, refund/cancellation rules, grace periods and feature entitlements are unresolved owner decisions. No provider or commercial terms are assumed here.

## 11. Operational, quality and governance requirements

- **Clinical governance:** identify qualified nursing/pharmacology reviewers, review cadence, source standards, correction process and content withdrawal procedure.
- **Academic integrity:** communicate permitted AI use; preserve provenance and citations; provide learner guidance instead of presenting generated assignment text as verified scholarship.
- **Privacy and legal review:** have qualified local counsel/privacy expertise review Kenyan obligations, international expansion obligations, controller/processor roles, consent, cross-border processing, retention and data-subject handling before production collection. This document does not provide legal advice.
- **Accessibility:** target WCAG 2.2 AA as a design goal; test keyboard, screen-reader, contrast, zoom, reduced motion and mobile touch targets.
- **Reliability:** define backups, restore tests, service monitoring, incident response and support process. Set availability and recovery targets with the owner before launch.
- **Performance:** optimize for mobile networks, compressed/lazy-loaded media, paginated lists, cached public catalogue data and bounded queries. Do not cache private data across accounts.
- **Observability:** separate operational logs, security audit events and analytics. Minimize personal data and redact secrets.
- **Testing:** unit-test domain rules; integration-test database/RLS and Edge Functions; run authorization matrix tests; test uploads and webhook replay; perform mobile/browser/accessibility checks before releases.
- **Content quality:** version reviewed content and question banks; record sources and reviewers; provide a correction/report route.

## 12. Dependency graph and implementation gates

```text
Owner decisions + scope + stack
       ├─> design system, routes, project configuration
       └─> dedicated Supabase project (after explicit approval)
              ├─> Auth + profiles + trusted role assignments
              │      └─> institution onboarding/review
              │             └─> programmes + access codes + enrolments
              ├─> academic catalogue + resource ownership/permissions
              │      └─> private storage + document processing
              │             ├─> Learning Centre
              │             ├─> independent workspace
              │             └─> retrieval foundation for AI/assignments
              ├─> question banks + assessment security
              │      └─> practice, official assessment, results + progress
              ├─> clinical review/content governance
              │      └─> cases + pharmacology + anatomy/physiology
              ├─> AI provider/data policy + entitlements
              │      └─> tutor + assignment research + study generation
              └─> provider/business policy
                     └─> subscriptions + verified payment processing
```

**Gate A:** The frontend stack is approved. Confirm hosting, environments and accessibility baseline before implementation.
**Gate B:** Approve dedicated Supabase project ownership, data model, roles, policies and threat model before creating migrations or connecting credentials.
**Gate C:** Pass RLS/cross-tenant tests before storing institutional or student data.
**Gate D:** Approve file types, privacy/retention, scanning and third-party document processing before accepting real uploads.
**Gate E:** Approve AI provider, source corpus, data handling, cost controls and clinical review before enabling AI.
**Gate F:** Approve commercial terms/provider and webhook threat review before collecting payments.
**Gate G:** Complete user acceptance, accessibility, backup/restore and operational readiness before launch.

## 13. Recommended roadmap

The phases below refine the blueprint's six phases. Each phase has a review gate; later modules should not be started until the required foundations are tested.

### Phase 0 — Product and technical decisions

- Confirm MVP audience and first end-to-end user journey.
- Record React + TypeScript + Vite as the approved frontend direction; decide hosting target and supported browsers.
- Decide accessibility target and content review ownership.
- Define institution verification process and distinguish approval/publication/suspension/billing state.
- Confirm independent-student scope versus institutional onboarding for the first release.
- Approve dedicated Supabase project creation plan, environments and ownership.
- Resolve data classification, initial retention, support, privacy and clinical governance questions.

**Exit:** signed architecture decisions and threat/data-flow review. No live student data yet.

### Phase 1 — Foundation and architecture

- Migrate the existing UI gradually into React + TypeScript + Vite; do not perform a complete rebuild.
- Keep the existing application usable throughout the transition. Preserve its visual design, branding, pages, responsive behaviour and all working functionality; do not remove or break existing features.
- Migrate and test functionality in manageable stages before moving on to the next stage.
- Establish shared design system, responsive shell, routing, typed module boundaries and environment configuration.
- Implement accessible loading, empty, error and unavailable states; label demo data accurately.
- Create reviewed data model, migration conventions, local development instructions and automated test strategy.
- After explicit owner approval, create/configure the dedicated Nightingale's Hub Supabase environments and Auth foundations.
- Implement profiles and protected role assignment, with RLS tests before exposing user data.

**Exit:** a deployed test environment (only after separate deployment authorization), authenticated test account, deny-by-default policy verification and no ScratchKE connection.

### Phase 2 — Institutional infrastructure

- Institution registration and private verification documents.
- Global review, approval, publication, suspension and reinstatement workflows with audit records.
- Institution-scoped administrator, programme offerings, lecturers and membership management.
- Secure access-code batches, individual code hashes, expiry/revocation/use limits, atomic redemption and enrolment.
- Independent student registration pathway.
- Subscription status foundations, without invented pricing or payment activation.

**Exit:** cross-institution denial tests, code replay/race tests, role escalation tests and approved operational policies.

### Phase 3 — Learning Centre and content governance

- Academic catalogue: discipline, programme, learning level, subject, topic and subtopic.
- Resource metadata, ownership/provenance, licence/review status, search and bookmarks.
- Private uploads, quarantine, validation, malware scanning, processing status and deletion workflow.
- Institution/private/platform resource access policies and recently viewed resources.
- Pilot approved content with source attribution and qualified review.

**Exit:** upload abuse, ownership, deletion, signed-link expiry and tenant-boundary tests pass.

### Phase 4 — Learning and assessment

- Question-bank authoring/review and controlled answer-key access.
- Practice quizzes with explanations, clearly isolated from official grades.
- Official assessment assignment, timing, attempts, server-side scoring, human marking and grade release.
- Clinical case studies with step-wise disclosure and educational simulation labels.
- Pharmacology and anatomy/physiology reviewed content.
- Progress summaries built from authoritative events and released results.

**Exit:** assessment integrity, result authorization, clinical-content review and progress accuracy acceptance.

### Phase 5 — AI academic support

- AI gateway, authorization, quotas, privacy/retention settings and source-grounded retrieval.
- Nursing Tutor with level-appropriate explanations and uncertainty/source display.
- Assignment document extraction and editable requirement analysis.
- Saved assignment workspace, research-source evaluation, outline and citation support.
- Generated study aids with provenance, no automatic promotion to reviewed content.
- Red-team prompt-injection and sensitive-data testing.

**Exit:** owner-approved provider/data terms, clinical/academic review, measurable quality checks and abuse/cost controls.

### Phase 6 — Commercialisation and expansion

- Confirm business model and provider; implement server-verified payment workflows.
- Independent and institution billing/receipts/subscription lifecycle.
- Tutor services, approved publication library and analytics with consent/privacy review.
- Additional healthcare disciplines and locale/curriculum adapters.
- International expansion after jurisdiction and curriculum review.

**Exit:** finance/legal approval, webhook replay/fraud tests, support/refund process and market-specific readiness.

## 14. Risks and mitigations

| Risk | Why it matters | Proposed mitigation |
|---|---|---|
| Scope is much larger than current prototype | Attempting all modules at once creates unfinished and disconnected features. | Select one MVP journey; deliver behind dependency gates and avoid fake/placeholder claims. |
| Incorrect authorization or tenant leakage | Student files, grades and institutional content are sensitive. | Deny-by-default RLS, server workflows, tenant-scoped schema, adversarial tests and independent review. |
| Privilege escalation | Client role flags can be altered. | Protected role assignments; no self-service privileged roles; audited grants/revocation. |
| Clinical/medication misinformation | Incorrect content can cause harm if mistaken for practice guidance. | Qualified review, source/version records, educational-only framing, correction process and no unreviewed AI as canonical source. |
| Copyright or unclear resource ownership | Similarity does not grant redistribution rights. | Provenance/licence records, permission workflow, restricted uploads and human review before publication. |
| Private documents sent to vendors | OCR/AI processing may expose personal or institutional information. | Data-flow approval, opt-in/notice, minimization, contractual review, retention limits and provider alternatives. |
| Access-code sharing/replay | Codes could enroll unauthorized users or exceed capacity. | High-entropy codes, hashed storage, transactional redemption, expiry/revocation, usage limits and audit. |
| Payment state spoofing | Browser callbacks can be forged or replayed. | Verified signed webhooks, idempotency, amount reconciliation and server-only entitlements. |
| Performance on mobile networks | Large documents and unbounded requests impede access. | Lightweight shell, responsive assets, pagination, lazy loading and performance budgets. |
| Legal/privacy mismatch | Product spans minors/learners, institutions, health-adjacent content and cross-border services. | Qualified local and destination-market legal/privacy review before data collection or expansion. |
| Service/configuration confusion with ScratchKE | Accidental reuse risks data and credential contamination. | Dedicated project, separate secrets, explicit environment naming and repository checks. |
| No operational ownership defined | Reviews, support, incidents and data deletion need accountable people. | Assign content, security, privacy, finance and support owners before production. |

## 15. Unresolved owner decisions

### Product and release scope

1. What is the first release's primary journey: independent learner study, institution onboarding, or a deliberately narrow combination?
2. Which existing demo sections must remain visible in the first operational release, and which may be labelled “coming later” while preserving navigation?
3. What is the initial institution verification evidence/process and who performs review?
4. Which Kenyan nursing curricula, awarding bodies and Diploma/BScN level definitions should the initial catalogue follow? Who is the academic reviewer?

### Technology and operations

5. What hosting provider, domain and supported browser versions are preferred? The frontend technology direction (React + TypeScript + Vite) is approved.
6. Who owns/administers the dedicated Nightingale's Hub Supabase organization and project? What budget and environment strategy are available?
7. What uptime, backup retention, recovery point/time and support response expectations are needed?
8. Who will maintain production, review security alerts and handle account/data deletion requests?

### Identity and governance

9. Which identity attributes are necessary at registration? Is date of birth or government identification truly required for any user group?
10. Who may grant institution admin and lecturer roles, and what verification/approval is required?
11. What should happen to institutional students' access, records and private work when an institution is suspended, subscription expires, or a student leaves?
12. How are tutor-student relationships established, time-limited and revoked?

### Content and privacy

13. Which content licences and third-party sources are approved? Who can authorize publication and derivative/consolidated resources?
14. Who reviews pharmacology, dosage calculations, clinical case studies and AI-generated educational guidance?
15. What are retention and deletion periods for accounts, private files, extracted text, assignment drafts, AI conversations, audit records and payment records?
16. May private documents be processed by external OCR/AI services? If so, which data classes, vendors, consent and regional processing constraints are acceptable?
17. What institution-level analytics may lecturers/admins see, and how should student privacy and notice be handled?
18. Engage qualified Kenyan privacy/legal review to confirm applicable duties and any cross-border requirements before production; who is the accountable reviewer?

### AI and commercial model

19. Which AI provider/model, source providers, monthly budget, usage quotas and fallback behavior are acceptable?
20. What citations, academic-integrity controls and prohibited assignment assistance should be enforced?
21. What institution fees, student prices, tiers, currencies, billing periods, grace periods, refund/cancellation rules and payment provider should apply? These remain unset until decided.
22. Who handles payment reconciliation, receipts, tax/accounting review, disputes and provider webhook incidents?

### Access codes and assessments

23. Should access codes be single-use by default, and what code expiry, batch size, resend, revocation and reissue rules should apply?
24. Which learner attributes (programme, learning level, cohort/year, campus) must the code bind, and can an enrolment be transferred?
25. What distinction, retention, moderation/appeal and release policy applies to practice versus official assessment results?
26. Which question formats, exam timing rules, proctoring expectations and assessment accommodations are required initially?

## 16. Approval boundary

The owner authorizes repository implementation, documentation, tests and commits/pushes on `nightingales-hub-improvements`. Production deployment, production data mutation and production migration application are not authorized. Migration execution must remain within the approved staging boundary and is not claimed by this repository assignment.

## 17. Assignment index

- Product vision: `docs/NIGHTINGALES_HUB_MASTER_BLUEPRINT.md`
- Work queue: `docs/MASTER_OUTSTANDING_WORK_LOGBOOK.md`
- Screens and navigation: `docs/COMPLETE_SCREEN_AND_NAVIGATION_INVENTORY.md`
- Roles and permissions: `docs/USER_ROLES_AND_PERMISSION_MATRIX.md`
- Database and storage: `docs/DATABASE_AND_STORAGE_ARCHITECTURE.md`
- Dependencies: `docs/MODULE_DEPENDENCY_MAP.md`
- Testing status: `docs/IMPLEMENTATION_AND_TESTING_STATUS.md`
- Session report: `docs/CODEX_HANDOVER_REPORT.md`
