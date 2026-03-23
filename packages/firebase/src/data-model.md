# Firestore Data Model

## Course Creation Hierarchy

- **Curriculum** – Teacher-owned grouping of courses. Collection `curricula` has `teacherId`, `name`, `description?`, `courseIds[]`. Teachers link multiple courses into an overarching curriculum via the Curriculum Builder.
- **Course** – Implemented as **Class** (`classes` collection). Course = Class in code (`classId` everywhere).
- **Module** – Collection of lessons and assignments; belongs to a class, optionally to a curriculum.
- **Lesson** – Collection of text, video, images, documents; belongs to a module. `mediaRefs` support audio, video, score, image, and document (PDF/Word).
- **Assignment** – Task based on a lesson or module; has `classId`, `moduleId`, optional `lessonId`.
- **Quizzes** – Assignable to lesson, module, or course: `classId` (required), optional `moduleId`, optional `lessonId`.
- **Documents** – PDF, Word, video, audio, images. Attachable to a **lesson** (via `mediaRefs`) or to a **module** (via `documentRefs` on module).

## Collections and Relationships

| Collection | Key Fields | Notes |
|------------|------------|-------|
| `users` | uid, email, displayName, role (student/teacher/admin), createdAt?, lastActiveAt? | One doc per user; `lastActiveAt` updated on sign-in (throttled) for retention analytics |
| `accessGrants` | userId, type, scope, validFrom, validTo, paymentRef? | Top-level for listing |
| `paymentLedger` | teacherId, classId, userId, amount, currency, paidAt, stripeSessionId, paymentIntentId? | Doc id = Stripe Checkout session id; written on `checkout.session.completed`; teacher read for revenue analytics |
| `users/{uid}/accessGrants/{classId}` | validFrom, validTo | Per-class grant; Cloud Functions only write |
| `classes` | teacherId, name, description, isPublic?, isPaid?, certificateTemplateId?, completionCriteria? | Teacher-owned (Course = Class) |
| `classes/{id}/cohorts` | name, limit? | Subcollection |
| `classes/{id}/enrollments` | userId, cohortId?, status, enrolledAt?, updatedAt? | Subcollection; enrollmentId = userId; `enrolledAt` set on first enroll |
| `curricula` | teacherId, name, description?, courseIds[], createdAt, updatedAt | Teacher-owned; links multiple courses (classes) into overarching curriculum |
| `programTimelines` | teacherId, scope (`class` \| `curriculum`), scopeId, title?, weekCount, anchorDate (UTC ms = start of week 1), segments[], milestones[], createdAt, updatedAt | Teacher-only Gantt-style program map; doc id convention `class_{classId}` or `curriculum_{curriculumId}` |
| `modules` | classId, curriculumId?, name, order?, documentRefs?, **progression** (see below), legacy `releaseMode` / `releasedAt` | documentRefs: PDF/Word/video/audio/image for module-level |
| `modules/{id}/manualReleaseStudents/{userId}` | optional `releasedAt` | Per-student manual release when module `progressionMode` is `manual` |
| `lessons` | classId, moduleId, ownerId, title, type, content?, summary?, mediaRefs?, version?, **progression** (see below) | mediaRefs: video/audio/score/image/document (PDF/Word) |
| `lessons/{id}/manualReleaseStudents/{userId}` | optional `releasedAt` | Per-student manual release when lesson `progressionMode` is `manual` |

### Module and lesson progression

Teachers set `progressionMode`: `open` | `scheduled` | `automatic` | `manual`.

- **open** — no time or manual gate.
- **scheduled** — `availableFrom` (UTC ms); legacy `releaseMode: time-released` + `releasedAt` maps to this.
- **automatic** — `autoInterval` (`daily` / `weekly` / `monthly` / `quarterly` / `yearly`), `autoAnchor` (`course_start` | `enrollment`), and when anchor is `course_start`, `autoStartAt` (UTC ms). Drip uses sibling order index (modules in class, lessons in module). **Server rules:** enrolled students may read documents in `automatic` mode without evaluating the schedule in rules; the app enforces drip in the UI until a future Cloud Function writes denormalized unlock times.
- **manual** — hidden until `manualReleasedToClass` and/or a doc exists under `manualReleaseStudents/{userId}`.

A lesson is shown only if its **module** and the **lesson** both pass their progression checks (client + rules where implemented).
| `lessons/{id}/lessonVersions` | version, title, content, summary, mediaRefs, timestamp | Version history when teacher saves as new version |
| `lessonPlacements` | moduleId, classId, order, linkType, lessonId?, sourceLessonId?, sourceClassId? | Attached/cloned lessons; linkType: owned, attached, cloned |
| `liveLessons` | classId, ownerId, title, scheduledAt, duration?, cohortIds? | Scheduled live |
| `liveLessons/{id}/teacherPlanItems` | order, title, lessonId?, externalUrl?, notes? | Teacher-only session running order for teach mode; not visible to students |
| `assignments` | classId, moduleId, lessonId?, ownerId, title, brief, deadline?, rubricId? | Per module; optional lessonId for lesson-based task |
| `assignments/{id}/submissions` | userId, mediaRefs?, decisionLog?, submittedAt | One per student |
| `rubrics` | ownerId, name, axes[], version, editHistory[] | Teacher-defined |
| `rubrics/{id}/editHistory` | timestamp, changedBy, changes | Subcollection |
| `feedback` | userId, teacherId, submissionId, assignmentId, rubricId, criterionResults[] | Linked to submission |
| `quizzes` | classId, moduleId?, lessonId?, ownerId, title | Attach to lesson (lessonId), module (moduleId), or course (classId only) |
| `quizzes/{id}/questions` | type, payload, mediaRef? | Subcollection |
| `quizzes/{id}/attempts` | userId, answers[], score?, maxScore?, completedAt | Subcollection |
| `analysisSnapshots` | source, sourceId, createdBy, confidence?, timestamp, editedByTeacher, payload | Teacher-only |
| `communities` | classId, ownerId, name, cohortIds? | Class-scoped |
| `communities/{id}/threads` | authorId, type, title, content, isAnonymous? | critique/discussion/reference/announcement |
| `portfolioItems` | userId, classId, submissionIds[], feedbackIds? | Student-controlled |
| `certifications` | userId, issuedBy, classId, criteriaMet[], issuedAt, revokedAt? | Teacher-issued |
| `certificateTemplates` | classId, ownerId, name, layout, placeholders[], createdAt, updatedAt | Teacher-created; used for auto-issue |
| `classCompletions` | userId, classId, completedAt, criteriaMet[], certificateId? | Student completion tracking |
| `playlists` | classId, moduleId?, ownerId, type, name, description?, order | Per-class: reading/watch/game/music |
| `playlists/{id}/items` | title, subtype?, author?, link?, notes?, requirement, order | mandatory or recommended |
| `users/{uid}/playlistItemProgress` | playlistId, playlistItemId, classId, status, addedToDoAt?, updatedAt | Student todo/in_progress/done |
| `teacherProfiles` | userId, displayName?, bio?, headline?, logoUrl?, faviconUrl?, primaryColor?, accentColor?, tenantName? | Public marketing; white-label branding |

## Storage Layout

- `assignments/{assignmentId}/submissions/{submissionId}/` – Student submissions (audio/video/score/PDF)
- `analysisSnapshots/` – AI analysis outputs (teacher-only)
- `classes/{classId}/` – Lesson media, DAW templates, example sessions
- `classes/{classId}/modules/{moduleId}/documents/` – Module-level documents (PDF, Word, video, audio, images)
- `users/{userId}/feedback/` – Voice/video feedback uploads
- `tenants/{teacherId}/` – White-label branding (logo, favicon); teacher write, public read

## Access Model

- **AccessGrant**: Presence of valid `users/{uid}/accessGrants/{classId}` grants class access. Payment writes grants; access path never reads payment docs.
- **Roles**: student, teacher, admin. Enforced in Firestore/Storage rules.
- **Quiz attempts**: Stored as `quizzes/{quizId}/attempts/{attemptId}` (subcollection), not top-level `quizAttempts`.
- **Optional fields** (`lessonId` on quiz/assignment, `documentRefs` on module): Same access as parent document; no additional rule changes. Module document uploads use Storage path under `classes/{classId}/` (already allowed for class teacher write, authenticated read).
