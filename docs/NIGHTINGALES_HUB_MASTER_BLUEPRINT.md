# Nightingale's Hub — Master Product Blueprint and Technical Development Specification

**Implementation status update — 10 November 2026:** The owner authorized the complete master development assignment, frontend skeletons, documentation, tests and commits/pushes to `nightingales-hub-improvements`. The baseline backup `1f82d3e` is on that remote branch. See `docs/MASTER_OUTSTANDING_WORK_LOGBOOK.md` for current status. Production deployment, production data mutation and production migration application remain outside scope.

**Working name:** Nightingale's Hub
**Tagline:** Learning with Ease.
**Initial market:** Kenya
**Initial specialisation:** Nursing education
**Future direction:** Broader healthcare education and international expansion
**Design priority:** Mobile-first, fully responsive, modern and professional.

---

## 1. Product Vision

Nightingale's Hub is intended to become a comprehensive digital learning and academic support platform for nursing students, nursing lecturers, tutors and healthcare institutions.

It should bring together learning resources, academic research, examinations, clinical reasoning, pharmacology, anatomy and physiology, AI-powered tutoring, student performance tracking and institutional learning management.

The platform should initially support Kenyan nursing education, including Diploma and Bachelor of Science in Nursing programmes.

It must be designed so that other healthcare disciplines and international education systems can be introduced later without rebuilding the entire platform.

The goal is to create a reliable, useful, accessible and sustainable educational platform rather than simply a website containing notes.

## 2. Brand and User Experience

Use the working brand:

**Nightingale's Hub — Learning with Ease.**

Visual identity:

- Clinical blue.
- White.
- Navy blue.
- Teal accents.
- Clean, modern and premium interface.
- Professional healthcare and academic appearance.
- Consistent typography, spacing, icons and navigation.

The platform must be fully responsive on smartphones, tablets, laptops and desktop computers. Prioritise mobile usability because many Kenyan students will access the platform using smartphones and mobile internet.

Preserve the existing working frontend and improve it progressively. Do not discard existing functionality simply to replace it with a new design.

### Approved frontend technology and migration direction

The approved frontend technology direction is **React + TypeScript + Vite**. Migrate gradually rather than rebuilding the application all at once. Preserve the existing visual design, Nightingale's Hub branding, pages, responsive behaviour and all currently working functionality. Do not remove or break existing features during migration. Keep the existing application usable throughout the transition, and migrate and test functionality in manageable stages.

The frontend technology decision alone did not authorize other implementation work. The current master development assignment separately authorizes repository code, documentation, tests, migration preparation and commits/pushes on the approved branch; production deployment and production data or migration changes remain excluded.

## 3. User Types and Account Roles

Design a secure role-based system supporting:

1. **Independent student** — studies without belonging to a registered institution.
2. **Institutional student** — enrolled through an institution.
3. **Lecturer** — manages learning materials, classes and assessments within authorised programmes.
4. **Tutor** — provides authorised academic support and learning services.
5. **Institution administrator** — manages the institution's programmes, lecturers, students and institutional resources.
6. **Institution registration representative** — registers an institution and manages its initial registration process.
7. **Global administrator** — manages the entire platform, institutions, users, subscriptions, content governance and platform settings.

Permissions must be enforced by the backend, not merely by hiding frontend buttons. Users must only access information and perform actions permitted by their roles and institutional relationships.

## 4. Registration and Authentication

Implement a complete authentication system using Supabase.

Required capabilities:

- Student registration.
- Lecturer registration and approval where applicable.
- Institution registration.
- Secure login and logout.
- Password recovery and reset.
- Email verification.
- User profile management.
- Role assignment and verification.
- Secure session handling.

Independent students must be able to register and use the platform without joining an institution. Institutional students must be linked to their institution through the institution-issued access-code process described below.

Never allow users to assign themselves privileged roles by modifying frontend data or registration requests.

## 5. Institution Management

Institutions must be able to register on Nightingale's Hub. Institutional onboarding should include institution details, official contact information, institution type, location, relevant programmes, registration representative, required verification information, and subscription or access-fee status.

The platform must support institutional review and publication. Once an institution has been approved and published, its authorised administrators should be able to create and manage its programmes without requiring separate publication approval for every programme.

Global administrators must be able to review institutions, approve or reject registration, publish institutions, suspend institutions for policy violations, reinstate suspended institutions, view institutional activity and manage platform-level institutional settings.

**Important distinction:** Institutional suspension for misconduct or policy violations must be separate from ordinary subscription expiry or payment failure. These must be represented by different statuses and handled through different processes.

## 6. Institution-Issued Student Access Codes

Use the previously selected approach: **Option B — institution-issued access codes.**

Institutional students should join through a code issued by their institution rather than submitting a manual joining request.

The secure access-code system must support:

- Code generation by authorised institution administrators.
- Secure storage of codes or their hashes.
- Code distribution by institutions.
- Code validation during student enrolment.
- Expiry dates, usage limits and revocation.
- Tracking of code usage.
- Linking the student to the issuing institution, correct programme and academic level.
- Prevention of unauthorised reuse.

All validation must happen securely on the backend. Do not rely on frontend-only code validation.

## 7. Learning Centre

The Learning Centre is one of the platform's core modules. It should provide an organised academic library with a structure that supports:

**Discipline → Programme → Learning Level → Subject → Topic → Subtopic → Learning Resource**

Initially, nursing programmes should include Diploma in Nursing and Bachelor of Science in Nursing. Where appropriate, Diploma and Degree students should share a common subject catalogue while receiving learning content appropriate to their respective levels.

The Learning Centre should support study notes, lecture materials, PDF documents, Word documents, presentations, images and diagrams, reference materials, downloadable resources, videos or links to approved educational media, search and filtering, bookmarks and saved resources, and recently viewed resources.

Content should be organised by subject and topic rather than presented as an unstructured collection of files.

## 8. Content Ownership and Document Governance

The platform must distinguish between:

- Official platform-owned learning resources.
- Institution-owned materials.
- Lecturer or tutor-created materials.
- Student-private documents.
- Licensed third-party materials.
- Open educational resources.

The platform should intelligently process uploaded documents and identify similar or overlapping materials. Where appropriate, it should help authorised administrators identify opportunities to create consolidated, high-quality platform learning resources.

However:

- Private student documents must remain private.
- Institutional documents must respect institutional permissions.
- Copyright and licensing must be respected.
- Similarity detection must not automatically transfer ownership.
- Content consolidation must require appropriate rights and authorisation.
- The system must preserve source attribution and provenance.

## 9. AI Nursing Tutor

Create an AI-powered nursing learning assistant to help students understand difficult concepts; ask academic questions; receive explanations at Diploma or Degree level; understand clinical procedures; revise topics; generate practice questions; understand clinical scenarios; and identify areas requiring further study.

The tutor should use reliable educational information and clearly distinguish established information from uncertainty. It must not present itself as a replacement for clinical supervision, professional judgement or official institutional guidance.

The AI tutor should eventually be expandable to other healthcare disciplines.

## 10. Assignment Research Centre

Build an Assignment Research Centre, initially optimised for nursing assignments. Students should be able to upload assignment instructions in PDF or Word format, paste assignment questions, have the system analyse instructions, identify task verbs and expected academic level, extract word limits and formatting requirements, identify required sections and referencing style, and receive a clear breakdown of what the assignment requires.

The centre should guide the student through:

1. Understanding the question.
2. Identifying the scope of the assignment.
3. Developing a research strategy.
4. Finding credible academic sources.
5. Evaluating source relevance and quality.
6. Developing an outline.
7. Planning each section.
8. Writing and improving sections.
9. Checking academic structure and coherence.
10. Reviewing references and citations.
11. Checking the final assignment against the original instructions.

Students should have saved assignment workspaces so they can return to unfinished work.

The system must prioritise verifiable academic sources, accurate referencing, proper citation practices, academic integrity, and transparent distinction between source material and AI-generated assistance. It should teach students how to complete assignments rather than encourage uncritical submission of AI-generated work.

Initially support nursing assignments, with architecture that can later support other academic disciplines.

## 11. Examination and Assessment System

Create a comprehensive examination module supporting multiple-choice, short-answer, essay, clinical scenario and case-based questions; timed and practice examinations; topic-specific quizzes; automatic marking where appropriate; lecturer marking where human assessment is required; explanations and feedback; and performance tracking.

Students should be able to practise without practice results being confused with official institutional examination grades. Lecturers should be able to create and manage authorised assessments.

Question banks should be organised by programme, learning level, subject, topic, difficulty and question type.

## 12. Clinical Case Studies

Build an interactive Clinical Case Studies Centre. Students should work through realistic educational scenarios involving patient presentation, history taking, assessment findings, vital signs, relevant investigations, possible diagnoses, nursing priorities, nursing interventions and evaluation of care.

The system should develop clinical reasoning, prioritisation and safe decision-making, with feedback explaining why an answer is appropriate or inappropriate.

Clearly identify educational simulations and avoid presenting them as real patient-specific clinical instructions.

## 13. Pharmacology Centre

Build a dedicated pharmacology learning environment that includes drug classifications, mechanisms of action, indications, contraindications, side effects, adverse reactions, nursing responsibilities, drug administration principles, dosage calculations, medication safety and relevant nursing considerations.

Provide organised drug study resources, practice questions and calculation exercises. Clinical and medication information must be carefully sourced and reviewed. Do not allow AI-generated information to become an unverified clinical reference.

## 14. Anatomy and Physiology Lab

Create an interactive Anatomy and Physiology learning centre covering body systems, organ structures, physiological processes, diagrams, visual explanations, topic-based quizzes, revision materials and interactive learning activities where feasible.

Organise content progressively to support both Diploma and Degree learners.

## 15. Student Progress Centre

Create a student performance and progress dashboard tracking relevant learning activities such as completed topics, learning resources accessed, quiz scores, examination performance, practice history, assignment progress, strengths, areas requiring improvement and learning achievements.

Provide useful progress insights and recommendations. Students should understand their own progress, while lecturers and institutions should only access student information they are authorised to view.

## 16. Independent Learner Workspace

Independent students must have access to a personal academic workspace. They should be able to upload their own learning documents and use authorised AI tools to generate summaries, multiple-choice questions, short-answer questions, essay questions, flashcards, revision notes, clinical scenarios and mock examinations.

Their private files and generated study materials must remain under their control and be protected by appropriate access policies.

## 17. Publications and Digital Library

Include a publications and academic library section supporting approved educational publications, reference materials and other authorised resources. Content must be searchable and organised.

Respect copyright, licensing and permissions. Do not assume that an uploaded publication can be redistributed.

## 18. Payments, Subscriptions and Commercial Model

The platform should eventually support independent student subscriptions, institutional access fees, institutional subscription management, premium learning features, tutor services, approved paid educational resources, payment records, receipts and transaction history, and subscription renewal and expiry.

Institutions must pay the defined access fee to use the platform's institutional services. Do not invent prices, subscription tiers, commissions or payment-provider arrangements. These are business decisions that must be confirmed by the owner before implementation.

Design payment architecture so that payment confirmation is verified securely on the backend. Do not treat a frontend success message as proof of payment.

## 19. Supabase Backend Architecture

Nightingale's Hub must have its own dedicated Supabase project. It must remain completely separate from the ScratchKE project and its databases, credentials and integrations.

Use Supabase services appropriately, including Authentication, PostgreSQL, Storage, Row Level Security, secure server-side functions, database constraints, appropriate indexes, audit records and secure transaction handling.

Prepare a database architecture that can support the entire platform. Expected data areas include, but are not limited to:

**Identity and access:** Profiles; roles; user-role assignments; institutions; institution memberships; programmes; student enrolments; access codes.

**Academic structure:** Disciplines; programmes; learning levels; subjects; topics; subtopics; learning resources; resource files; content ownership and permissions.

**Learning and assessment:** Student learning activity; bookmarks; question banks; questions; examinations; examination attempts; answers; results; feedback; clinical case studies; pharmacology resources; anatomy and physiology resources.

**Academic support:** AI tutor conversations where appropriate; assignment workspaces; assignment documents; research sources; assignment outlines and drafts; referencing information; personal study materials; generated revision resources.

**Institutional operations:** Institution registration; verification records; institution administrators; lecturers; institutional subscriptions; access-code batches and usage; institution activity.

**Commercial operations:** Subscription plans; user subscriptions; payment records; payment confirmations; transactions; receipts.

**Governance:** Audit logs; administrative actions; content ownership records; permission records; moderation and suspension records.

These are proposed data domains, not a command to create one table for every bullet. Design a normalised, maintainable schema with appropriate relationships and constraints. For every proposed table, explain its purpose, important fields, relationships and access rules.

Never expose Supabase service-role keys or other secret credentials in frontend code, public repositories or browser requests. Use RLS and secure backend functions to enforce access control.

Do not connect to or modify an existing Supabase project without explicit approval from the owner.

## 20. Security, Privacy and Data Protection

Security must be considered from the beginning. Include secure authentication, role-based permissions, RLS, private storage where appropriate, secure document access, server-side and input validation, protection against unauthorised access, audit trails for sensitive administrative actions, secure payment verification, appropriate data retention and deletion procedures, and protection of student and institutional information.

Design with applicable Kenyan data protection requirements in mind and consider relevant international obligations as the platform expands. Do not collect unnecessary personal information.

Do not expose private student documents, examination answers, institutional materials or administrative records to unauthorised users.

## 21. Administration and Platform Management

The Global Administrator dashboard should eventually provide management of users, roles, institutions, institutional publication and suspension, programmes, academic content, content ownership and governance, learning resources, question banks, assessments, subscriptions, payments, platform activity, audit logs and platform configuration.

Institution administrators must have a separate dashboard limited to their own institution. Lecturers must have a dashboard suited to their authorised academic responsibilities. Students must have dashboards appropriate to their learning pathway and account type.

## 22. Integrated Platform Experience

All modules must work together as one coherent platform. For example, a student's programme should determine the appropriate learning pathway; the Learning Centre should connect to relevant practice questions; examination performance should contribute to the Student Progress Centre; Clinical Case Studies should support clinical reasoning; the AI Nursing Tutor should assist with resources and revision; the Assignment Research Centre should save work in the student's workspace; institutional lecturers should manage authorised students and learning activities; institution administrators should manage their own programmes and users; and global administrators should oversee the whole platform.

Avoid disconnected modules with separate, inconsistent user experiences. Use reusable components, shared data structures and consistent navigation.

## 23. Development Phases

Build the platform in dependency order. The phases may be refined after the architecture review. Do not implement later phases before their dependencies are ready.

### Phase 1 — Foundation and architecture

- Audit the existing repository.
- Finalise the product architecture.
- Establish the React + TypeScript + Vite frontend structure through a gradual migration.
- Preserve the existing visual design, branding, pages, responsive behaviour and working functionality throughout the migration.
- Keep the existing application usable; migrate and test features in manageable stages without removing or breaking existing features.
- Design the authentication and profile system.
- Define roles and permissions.
- Design the Supabase database.
- Establish academic structures.
- Design institution registration and access-code processes.
- Prepare development and deployment documentation.

### Phase 2 — Institutional infrastructure

- Authentication and role-aware dashboards.
- Institution registration and approval.
- Institution administration.
- Programme management.
- Access-code generation and validation.
- Student enrolment.
- Lecturer management.
- Institutional subscription foundations.

### Phase 3 — Learning Centre

- Subject and topic catalogue.
- Learning resources.
- Document upload and storage.
- Search and filtering.
- Resource permissions.
- Content ownership and governance.
- Document processing foundations.

### Phase 4 — Learning and assessment

- Question banks.
- Practice quizzes.
- Timed examinations.
- Assessment marking.
- Clinical Case Studies.
- Pharmacology Centre.
- Anatomy and Physiology Lab.
- Student Progress Centre.

### Phase 5 — AI academic support

- AI Nursing Tutor.
- Assignment Research Centre.
- Document analysis.
- Research guidance.
- Referencing support.
- Personal study workspace.
- AI-generated revision materials.

### Phase 6 — Commercialisation and expansion

- Independent learner subscriptions.
- Institutional billing.
- Payment integrations.
- Tutor services.
- Publications.
- Advanced analytics.
- Expansion into other healthcare disciplines.
- International expansion.

## 24. Technical Working Rules for Codex

1. Treat this document as the authoritative product vision and specification.
2. Inspect the existing repository before proposing changes.
3. Preserve existing working functionality unless an approved change requires otherwise.
4. Do not confuse Nightingale's Hub with ScratchKE. They are separate projects.
5. Do not invent business decisions, fees, subscription prices or policies.
6. Do not create fake authentication, fake payments, fake AI functionality or fake file uploads and present them as real.
7. Do not put secrets in frontend code or public files.
8. Use secure backend validation and RLS.
9. Keep the application mobile-first and responsive.
10. Use React + TypeScript + Vite as the approved frontend direction and migrate gradually, preserving the existing usable application and its working features.
11. Do not modify the `main` branch.
12. Continue working on the existing branch `nightingales-hub-improvements`.
13. Do not push changes to GitHub or deploy without explicit approval.
14. Do not connect, modify or migrate a Supabase project without explicit approval.
15. Do not change backend integrations, authentication, database configuration or credentials as part of frontend migration without separate approval.
16. Explain technical decisions in language understandable to a non-programmer.
17. Identify risks, dependencies and unresolved decisions before implementation.
18. Test changes and report which checks were actually performed.
19. Never claim a feature works unless it has been implemented and tested.

## 25. Historical architecture-review instruction (superseded)

For the initial architecture review, do not start coding application features. First read and understand this specification; inspect the repository and branch; compare the implementation against the product vision; identify existing, incomplete and missing functionality; propose system and frontend architecture; design the Supabase schema, relationships, constraints, roles, permissions, RLS and backend security; explain storage/document processing, AI, and payments/subscriptions; identify dependencies; propose an ordered roadmap; and list unresolved owner decisions.

Save this specification as `docs/NIGHTINGALES_HUB_MASTER_BLUEPRINT.md` and the separate technical architecture and implementation plan as `docs/TECHNICAL_ARCHITECTURE_AND_ROADMAP.md`.

The owner authorizes repository implementation and GitHub commits/pushes on `nightingales-hub-improvements`. Preserve the original static demo and working React Stage 1 flows. Do not deploy to production, mutate production data or apply migrations to production. Keep service-role credentials in the provider secret store and never in frontend files or Git. The earlier architecture-only stop instruction applied to the initial review and is superseded by the current master development assignment.
