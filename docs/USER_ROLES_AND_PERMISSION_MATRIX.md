# User Roles and Permission Matrix

Authorization is enforced by Postgres RLS and server-side Edge Functions. Hiding a screen is not a security boundary. An authenticated user may hold multiple roles; each request must resolve the active institution and purpose. The UI uses one selected portal at a time.

| Capability / data | Independent student | Institutional student | Lecturer | Tutor | Institution administrator | Global administrator |
|---|---|---|---|---|---|---|
| Own profile and session | Read/update allowed fields | Read/update allowed fields | Read/update allowed fields | Read/update allowed fields | Read/update allowed fields | Read/update own fields |
| Published public catalogue | Read | Read | Read | Read | Read | Curate |
| Private personal materials/notes | Own only | Own only | Own only | Own only | Own only | No routine content access |
| Institution resources | Only explicitly granted access | Own active institution and programme grants | Assigned institution/subject only | Assigned institution/subject only | Manage own institution | Governance access by audited task |
| Official institutional record | None until verified link | Own linked record and permitted fields | No default access | Own authorized tutor record | Manage own institution records | Review/audit as explicitly authorized |
| Student learning history | Own | Own | Minimized assigned cohort view only | Only explicit assigned support scope | Aggregate/institution purpose only | Aggregate/governance; exceptional access audited |
| Question bank / assessments | Attempt published assessments | Attempt eligible published assessments | Author/manage assigned subjects | Only if separately authorized | Configure institution policy; no answer disclosure by default | Platform governance only |
| Institution setup and programmes | None | None | None | None | Own institution, published catalogue offerings | Review platform-wide; separate approval/publish/suspend |
| Role assignment and global privilege | None | None | None | None | Cannot self-promote or grant privileged global roles | Controlled operator workflow; audited and MFA protected |
| Content publication | Submit/report own contribution | Submit/report own contribution | Propose within assignment | Propose within assignment | Govern own institution materials | Approve official Nightingale content and moderation decisions |
| Billing and entitlements | Own plan and history | Own plan if applicable | No financial visibility by default | No financial visibility by default | Own institution billing only | Audited finance reporting, least privilege |
| Audit events | No direct read | No direct read | Own allowed activity if defined | Own allowed activity if defined | Own institution-scoped audit view if implemented | Read-only platform governance view when implemented |

## Role notes

- **Independent student:** registration and core study access do not require institution membership.
- **Institutional student:** access derives from an active, verified institution relationship and programme/level scope.
- **Lecturer:** subject and cohort access is scoped to active assignments; no general institution directory access.
- **Tutor:** distinct from lecturer where the institution policy requires it; subject authorization is explicitly audited.
- **Institution administrator:** may manage only institutions granted through the reviewed approval workflow. Cannot assign self or others global privileges.
- **Global administrator:** provisioned through controlled operator procedures, protected with MFA, and audited. Exceptional access must have a reason and narrow duration.
- **Institution registration representative:** an onboarding applicant, not an administrator until verification and approval create an institution-scoped assignment.

## Required policy tests

Test anonymous, independent student, institutional student in own and foreign institution, lecturer in assigned and unassigned subject, tutor in assigned and unassigned subject, institution administrator in own and foreign institution, and global administrator. Include role revocation, suspended institution, expired membership, duplicate membership, account linking and direct API access. Verify both positive and negative results; do not rely on frontend navigation tests alone.
