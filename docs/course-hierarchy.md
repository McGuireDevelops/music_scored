# Course Creation Hierarchy

This document describes the content hierarchy used for course creation in Learning Scores.

## Hierarchy

- **Curriculum** – An overarching grouping of courses. Owned by a teacher (`teacherId`), with an ordered list of linked course IDs (`courseIds`). Managed via the Curriculum Builder at `/teacher/curricula`.
- **Course** – A collection of modules. Implemented as **Class** in the app (`classes` collection, `classId` in references). Built via the Course Builder (single-page inline experience).
- **Module** – A collection of lessons, assignments, quizzes, and documents. Modules belong to a course (class).
- **Lesson** – A collection of text, video, images, and documents. Lessons belong to a module.
- **Assignment** – A task based on a lesson or module. Assignments belong to a module and may optionally reference a specific lesson.

## Quizzes

Quizzes can be created and assigned at three levels:

- **Lesson quiz** – Attached to a specific lesson (`lessonId`).
- **Module quiz** – End-of-module quiz (`moduleId`).
- **Course quiz** – Final course quiz (class-level; `classId` only, no `moduleId`/`lessonId`).

## Documents

Documents are uploads of PDFs, Word files, videos, audio, and images. They can be attached to:

- **Lesson** – Via the lesson’s `mediaRefs` (types include `document` for PDF/Word in addition to video, audio, score, image).
- **Module** – Via the module’s `documentRefs` array (module-level resources).

## Terminology

The codebase uses **Class** (e.g. `classId`, `classes` collection) where the product concept is **Course**. For user-facing copy or documentation, “Course” can be used interchangeably with “Class”.

See [packages/firebase/src/data-model.md](../packages/firebase/src/data-model.md) for Firestore collections and field details.
