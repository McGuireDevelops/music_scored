# Sana Learn vs Learning Scores – Feature Comparison

Product positioning and feature mapping vs [Sana Learn](https://sanalabs.com/products/sana-learn/) (enterprise AI LMS). Use this for positioning, sales, and roadmap decisions.

---

## Learning Scores positioning

**Learning Scores** is a **human teacher–led**, professional film music learning platform. The experience is driven by teachers: they own curriculum, lessons, rubrics, quizzes, assignments, live lessons, and feedback. AI is an assist for teachers only (analysis drafts, lesson summaries) and is not shown to learners as a tutor.

### Human teacher–led vs AI-led

| | Learning Scores | Sana Learn |
|---|-----------------|------------|
| **Model** | Human teachers lead learning; AI supports teachers only. | “AI at its core”; “1:1 learning – a personal tutor at every learner’s fingertips”; “just-in-time answers.” |
| **AI role** | Teacher-only: analysis drafts, lesson summaries. Never replaces instruction. | Learner-facing AI tutor and Q&A. |
| **Intent** | We are not building an AI-led experience; we are building a teacher-led one. | Learning can be heavily AI-driven. |

Our “gaps” on learner-facing AI tutor and just-in-time Q&A are **intentional** differentiators, not missing features.

---

## Feature mapping: Sana Learn → Learning Scores

| Sana Learn | Learning Scores | Match |
|------------|-----------------|-------|
| **Learning management** – courses, enrollments, scheduling | **Classes, curriculum, modules, AccessGrants** – time-released or mastery-based modules; student access via AccessGrants. No automated enrollment rules. | Partial |
| **Content creation / authoring** | **Lessons** (video, audio, score, text), **MediaReference** in lessons/assignments/rubrics; **RubricBuilder**, **QuizBuilder**, **QuizEditPage**. Teacher-only AI: **generateLessonSummary**. | Strong |
| **Virtual classroom / live sessions** | **LiveLesson** – scheduledAt, duration, cohortIds, chapterMarkers. Feature-flagged via TeacherFeatureFlags.liveLessons. | Partial |
| **1:1 learning / AI tutor** | **AI analysis** – teacher-only (requestAnalysis, saveAnalysisSnapshot); stored in analysisSnapshots; never merged with grading. No student-facing tutor; by design. | Intentional difference |
| **Just-in-time learning** – instant search and answers | Answers and guidance from teacher and course content, not an AI Q&A layer. | Intentional difference |
| **Learning analytics / dashboards** | **Class reports** – useClassReport, useAssignmentReport, useStudentReport; StatCard, ProgressBar, StatusBadge; assignment/quiz summaries, completion rate. | Partial |
| **Automated enrollments / programs** | Access is grant-based only; no rule-based auto-enrollment. | Gap – could add rules (e.g. by cohort) if useful. |
| **Certifications / credentials** | **Certificates** – CertificateTemplate, CertificateDesigner, completion criteria (modules, assignments, quizzes, manual), Certification, ClassCompletion. | Strong |
| **Collaborative / social learning** | **Community** – threads (critique, discussion, reference, announcement); **Portfolio**. | Partial |
| **Integrations (HRIS, CRM, SSO)** | Firebase Auth; Stripe Connect for paid classes. No HRIS/CRM/SSO. | Gap – add if targeting enterprise. |
| **Branding / white-label** | **TeacherProfile** – logoUrl, faviconUrl, primaryColor, accentColor, tenantName. | Strong |
| **Quizzes and assessments** | **Quizzes** – structured question types (roman numeral, Nashville, chord, pitch-class, etc.); **Rubrics** with axes, criteria, partial satisfaction, edit history; **Assignments** with rubric-based feedback. | Strong – domain-rich (film music). |
| **Mobile** | **Expo app** – auth, role-based class list, dashboard. | Partial |

---

## Where we align strongly

- **Human teacher–led model**: Teachers own curriculum, assessment, and feedback; AI assists teachers only. Clear contrast to Sana’s AI-first, learner-facing tutor.
- **Content and authoring**: Lessons, MediaReference, rubrics, quizzes, assignments – plus teacher-only AI (analysis, lesson summary).
- **Credentials**: Certificate templates, completion criteria, certifications.
- **Teacher branding**: White-label via TeacherProfile.
- **Reporting**: Class-, assignment-, and student-level reports and completion.

---

## Gaps or different emphasis

- **Human teacher–led (intentional)**: Sana’s “1:1 AI tutor” and “just-in-time AI answers” are not goals for Learning Scores. Our platform is teacher-led; this is a positioning strength, not a gap.
- **Enrollment automation**: No rule-based Programs; access is manual AccessGrants. Could add rules (e.g. by cohort) if useful while staying teacher-led.
- **Integrations**: No HRIS, CRM, or SAML/SSO. Add if targeting enterprise.
- **Collaborative authoring**: Single-teacher authoring; no real-time multi-user course editing or “create from PDF” automation like Sana.

---

## Recommended priorities (from plan)

Choose one to prioritize next, depending on product goals:

1. **Just-in-time search** – Optional: add search over lesson/class content (no AI Q&A) if you want faster discovery while staying teacher-led.
2. **Enrollment rules** – Auto-create AccessGrants by cohort or completion rules; keeps access control teacher-/admin-defined.
3. **Shareable dashboards** – Expand reporting into exportable or shareable dashboards for stakeholders.

---

## Differentiator to keep

- **Human teacher–led** experience – teachers lead; AI assists only.
- **Domain depth** – film music, MediaReference, structured rubrics and quizzes.
- **Teacher-only AI** – analysis and summaries support teachers; we are not an AI-first or enterprise general LMS like Sana.

Do not dilute this positioning when adding features.
