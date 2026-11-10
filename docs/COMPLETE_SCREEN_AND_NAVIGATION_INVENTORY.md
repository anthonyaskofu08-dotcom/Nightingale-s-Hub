# Complete Screen and Navigation Inventory

**Current shell:** `next/src/app/App.tsx` with shared responsive sidebar/topbar. Authenticated portal selection comes from active role assignments. The portal selector is only shown in the unauthenticated demo. Navigation is a usability layer; backend RLS and function authorization remain mandatory.

**Status note:** existing Stage 1-connected screens are marked integrated in code, not staging-verified. Newly added entries are skeletons with workflow and integration boundaries.

## Shared identity and shell

| Screen | Audience | Status | Notes |
|---|---|---|---|
| Sign in / registration / recovery | All eligible users | FRONTEND IMPLEMENTED | Stage 1 Auth forms; server-backed identity operations where configured. |
| Invitation linking | Invited institutional student | INTEGRATED | `/invitation`; links an authenticated identity to an official record through an Edge Function. |
| Secure session loading | Signed-in user | FRONTEND IMPLEMENTED | Restores Supabase session and resolves active role assignments. |
| Pending / denied account access | Applicant or inactive user | FRONTEND IMPLEMENTED | Does not grant a role from client metadata. |
| Responsive app shell | All portals | FRONTEND IMPLEMENTED | Keyboard Escape close, focus movement and mobile drawer. |
| Notifications | All portals | SKELETON CREATED | Inbox, preferences and delivery remain unimplemented. |
| Profile | Student, lecturer/tutor, institution admin | INTEGRATED / SKELETON | Profile editing differs by role; verify persistence and field authorization in staging. |

## Student portal

Independent and institution-enrolled learners share the learning shell. Institutional membership adds scoped institution context; it is not a prerequisite for independent learning.

| Screen | Status | Intended workflow |
|---|---|---|
| Overview | FRONTEND IMPLEMENTED | Continue learning, programme context and summary metrics. Current demo figures are sample data. |
| Nursing Catalogue / Academic Library | FRONTEND IMPLEMENTED | Browse programme, level, subject, topic and sample resource hierarchy. Not connected to governed resource storage. |
| Learning Resource | FRONTEND IMPLEMENTED | Read demo content and learning visuals. No authoritative clinical content claim. |
| Examination Centre | SKELETON CREATED | Practice and exam entry, rules, attempts, marking and review. |
| Assignment Research Centre | SKELETON CREATED | Private brief, milestones, sources, outline and citations. |
| Clinical Case Studies | SKELETON CREATED | Scenario, assessment, nursing priorities, reasoning and feedback. |
| Pharmacology Centre | SKELETON CREATED | Reviewed drug classes, safety, calculations and quizzes. |
| Anatomy and Physiology Lab | SKELETON CREATED | Body systems, diagrams, explanations and quizzes. |
| AI Nursing Tutor | SKELETON CREATED | Source-aware study assistance with safety and privacy controls. |
| Nightingale Publications | SKELETON CREATED | Browse approved publications, attribution, licences and entitled reading access. |
| Nightingale Shorts | SKELETON CREATED | Browse moderated short lessons with captions, source credits and related learning. |
| Student Progress Centre | SKELETON CREATED | Learning history, assessment trends and study goals. |
| Saved Resources | FRONTEND IMPLEMENTED | Session-local demonstration bookmarks. Persistence is not connected. |
| My Study Materials | FRONTEND IMPLEMENTED | Local file selection demonstration only; no upload or storage. |
| Academic Workspace | INTEGRATED / FRONTEND IMPLEMENTED | Private notes/profile workspace uses authenticated Supabase operations where configured; stage behavior requires verification. |
| Learning Activity | FRONTEND IMPLEMENTED | Current summary is demonstration data; no real progress persistence. |
| Subscription and Access | SKELETON CREATED | Owner-approved plans, entitlements, payments and history. No prices or payment collection. |

## Lecturer and tutor portal

| Screen | Status | Intended workflow |
|---|---|---|
| Overview | FRONTEND IMPLEMENTED | Assigned subjects and sample activity. |
| My Subjects | FRONTEND IMPLEMENTED | Show only active authorized subjects. Current authenticated query requires staging verification. |
| Learning Resources | FRONTEND IMPLEMENTED | Organize teaching resources by academic scope; current demo is not persisted. |
| Educational Materials | FRONTEND IMPLEMENTED | Local file selection demo; no upload. |
| Question Bank Management | SKELETON CREATED | Scoped authoring, review, tags, versions and explanations. |
| Examination Preparation | SKELETON CREATED | Assessment blueprint, rules and learner preview. |
| Assignment Support | SKELETON CREATED | Approved learner guidance and scoped feedback. |
| Student Activity | FRONTEND IMPLEMENTED | Sample aggregate only; real access requires class and purpose constraints. |
| Teaching Activity History | SKELETON CREATED | Audited resource revisions and scoped support events. |
| Notifications / Profile | SKELETON / INTEGRATED | Delivery/preferences and field-level profile rules remain to be verified. |

## Institution administrator portal

| Screen | Status | Intended workflow |
|---|---|---|
| Institution Dashboard | INTEGRATED | Institution-scoped profile and aggregate counts. |
| Institution Profile | INTEGRATED | Edit allowed profile fields; review and institution name remain governed. |
| Programmes | INTEGRATED | Manage offerings from the shared published catalogue. |
| Learning Levels | INTEGRATED | Read active platform catalogue values. |
| Academic Years / Intakes | SKELETON CREATED | Institution periods and cohorts; schema not yet present. |
| Students / Lecturers and Tutors | INTEGRATED | Scoped records and authorized management entry points. |
| Official Records | INTEGRATED | Verify, correct, import and audit official records; unsupported PDF/OCR stays unavailable. |
| Invitations / Access Codes | INTEGRATED / SKELETON | Invitation lifecycle is implemented in Stage 1; general access-code generation remains a separate design and is not represented as live. |
| Institution Analytics | SKELETON CREATED | Minimized, scope-safe aggregate reporting. |
| Institution Announcements | SKELETON CREATED | Audience-targeted notices with audit history. |
| Subscription and Payments | SKELETON CREATED | Billing state distinct from misconduct/compliance suspension. |

## Global administrator portal

| Screen | Status | Intended workflow |
|---|---|---|
| Platform Overview | FRONTEND IMPLEMENTED | Existing governance dashboard and registration counts. |
| Institution Review | INTEGRATED | Verification, approval/rejection and separate publication actions. |
| Institution Management | SKELETON CREATED | Directory, compliance suspension and reinstatement. |
| User Management | SKELETON CREATED | Privileged lifecycle actions through audited server operations only. |
| Academic Catalogue | INTEGRATED | Manage owner-approved programme and learning-level entries. |
| Global Academic Library | SKELETON CREATED | Rights, versions, editorial review and publication. |
| Knowledge Engine | SKELETON CREATED | Quarantine, text extraction/OCR, classification, duplicate signal and indexing. |
| Resource Approval / Content Moderation | SKELETON CREATED | Human decisions, corrections, appeals, withdrawal and takedown. |
| Nightingale Publications / Shorts | SKELETON CREATED | Contributor rights, editorial review, moderation and reader access. |
| Platform Analytics | SKELETON CREATED | Privacy-conscious operational aggregates. |
| Audit Log / Administrator Activity | BACKEND IMPLEMENTED / SKELETON | Stage 1 event writers exist; read-only cross-module viewer is not implemented. |
| Platform Announcements | SKELETON CREATED | Targeted notices with delivery and correction history. |
| Support and Exceptional Cases | SKELETON / INTEGRATED | General support is unimplemented; exceptional institutional recovery review is implemented in code. |
| System Configuration | DOCUMENTED | Provider/deployment settings stay in controlled operations tooling; no UI writes to secrets. |

## Shared screen states

- Loading: retain context, show a labelled progress state, prevent duplicate submission and preserve user input.
- Empty: explain why there are no records and show only an authorized next action.
- Error: present a safe, actionable message and correlation reference; do not expose secrets or raw database errors.
- Restricted: explain the missing role/scope without leaking whether foreign records exist.
- Unavailable: state the missing dependency and keep the rest of the portal usable.
- Success: confirm the operation and refresh from the authoritative backend.

New module shells render a clear empty state and integration boundary. Existing network-backed screens have mixed loading handling and need a consistent pass before production.
