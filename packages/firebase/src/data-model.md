# Firestore Data Model

## Collections and Relationships

| Collection | Key Fields | Notes |
|------------|------------|-------|
| `users` | uid, email, displayName, role (student/teacher/admin) | One doc per user |
| `accessGrants` | userId, type, scope, validFrom, validTo, paymentRef? | Top-level for listing |
| `users/{uid}/accessGrants/{classId}` | validFrom, validTo | Per-class grant; Cloud Functions only write |
| `classes` | teacherId, name, description, isPublic?, isPaid?, certificateTemplateId?, completionCriteria? | Teacher-owned |
| `classes/{id}/cohorts` | name, limit? | Subcollection |
| `classes/{id}/enrollments` | userId, cohortId?, status | Subcollection; enrollmentId = userId |
| `curricula` | classId | Linked to class |
| `modules` | classId, curriculumId?, name, releaseMode, releasedAt?, order? | Time-released or mastery-based |
| `lessons` | classId, moduleId, ownerId, title, type, content?, mediaRefs? | Recorded lessons |
| `liveLessons` | classId, ownerId, title, scheduledAt, duration?, cohortIds? | Scheduled live |
| `assignments` | classId, moduleId, ownerId, title, brief, deadline?, rubricId? | Per module |
| `assignments/{id}/submissions` | userId, mediaRefs?, decisionLog?, submittedAt | One per student |
| `rubrics` | ownerId, name, axes[], version, editHistory[] | Teacher-defined |
| `rubrics/{id}/editHistory` | timestamp, changedBy, changes | Subcollection |
| `feedback` | userId, teacherId, submissionId, assignmentId, rubricId, criterionResults[] | Linked to submission |
| `quizzes` | classId, moduleId?, ownerId, title | Per class/module |
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
| `teacherProfiles` | userId, displayName?, bio?, headline? | Public marketing |

## Storage Layout

- `assignments/{assignmentId}/submissions/{submissionId}/` – Student submissions (audio/video/score/PDF)
- `analysisSnapshots/` – AI analysis outputs (teacher-only)
- `classes/{classId}/` – Lesson media, DAW templates, example sessions
- `users/{userId}/feedback/` – Voice/video feedback uploads

## Access Model

- **AccessGrant**: Presence of valid `users/{uid}/accessGrants/{classId}` grants class access. Payment writes grants; access path never reads payment docs.
- **Roles**: student, teacher, admin. Enforced in Firestore/Storage rules.
- **Quiz attempts**: Stored as `quizzes/{quizId}/attempts/{attemptId}` (subcollection), not top-level `quizAttempts`.
