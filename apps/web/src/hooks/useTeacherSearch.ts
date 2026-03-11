import { useMemo, useState, useEffect } from "react";
import { collection, getDocs, getDoc, query, where, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useTeacherClasses } from "./useTeacherClasses";
import { useTeacherLessons } from "./useTeacherLessons";
import { useTeacherAssignments } from "./useTeacherAssignments";
import { useTeacherQuizzes } from "./useTeacherQuizzes";
import { useTeacherStudents } from "./useTeacherStudents";

export type SearchResultType = "course" | "lesson" | "document" | "quiz" | "student";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

interface PlaylistWithId {
  id: string;
  classId: string;
  name: string;
  type: string;
}

function matchesSearch(text: string | null | undefined, term: string): boolean {
  if (!term.trim()) return true;
  if (!text) return false;
  return text.toLowerCase().includes(term.toLowerCase());
}

export function useTeacherSearch(teacherId: string | undefined, searchTerm: string) {
  const { classes } = useTeacherClasses(teacherId);
  const { lessons } = useTeacherLessons(teacherId);
  const { assignments } = useTeacherAssignments(teacherId);
  const { quizzes } = useTeacherQuizzes(teacherId);
  const { students } = useTeacherStudents(teacherId);

  const [playlists, setPlaylists] = useState<PlaylistWithId[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  useEffect(() => {
    if (!teacherId) {
      setPlaylists([]);
      return;
    }
    let cancelled = false;
    setPlaylistsLoading(true);
    getDocs(
      query(
        collection(db, "playlists"),
        where("ownerId", "==", teacherId)
      )
    )
      .then((snap) => {
        if (cancelled) return;
        const list: PlaylistWithId[] = snap.docs.map((d) => ({
          id: d.id,
          classId: d.data().classId ?? "",
          name: d.data().name ?? "Unnamed playlist",
          type: d.data().type ?? "reading",
        }));
        setPlaylists(list);
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      })
      .finally(() => {
        if (!cancelled) setPlaylistsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  const loading =
    playlistsLoading;

  const results = useMemo((): SearchResult[] => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    const out: SearchResult[] = [];

    for (const c of classes) {
      if (
        matchesSearch(c.name, term) ||
        matchesSearch(c.description, term)
      ) {
        out.push({
          type: "course",
          id: c.id,
          title: c.name,
          subtitle: c.description ?? undefined,
          href: `/teacher/class/${c.id}`,
        });
      }
    }

    for (const l of lessons) {
      if (
        matchesSearch(l.title, term) ||
        matchesSearch(l.summary, term) ||
        matchesSearch(l.content, term)
      ) {
        out.push({
          type: "lesson",
          id: l.id,
          title: l.title,
          subtitle: l.className ? `${l.className}${l.moduleName ? ` · ${l.moduleName}` : ""}` : undefined,
          href: `/teacher/class/${l.classId}`,
        });
      }
    }

    for (const a of assignments) {
      if (
        matchesSearch(a.title, term) ||
        matchesSearch(a.brief, term)
      ) {
        out.push({
          type: "document",
          id: a.id,
          title: a.title,
          subtitle: a.className ? `Assignment · ${a.className}` : "Assignment",
          href: `/teacher/class/${a.classId}/assignment/${a.id}`,
        });
      }
    }

    for (const p of playlists) {
      if (matchesSearch(p.name, term)) {
        out.push({
          type: "document",
          id: p.id,
          title: p.name,
          subtitle: p.type ? `${p.type} · Course` : "Playlist",
          href: `/teacher/class/${p.classId}`,
        });
      }
    }

    for (const q of quizzes) {
      if (matchesSearch(q.title, term)) {
        out.push({
          type: "quiz",
          id: q.id,
          title: q.title,
          subtitle: q.className ? `Quiz · ${q.className}` : "Quiz",
          href: `/teacher/class/${q.classId}/quiz/${q.id}/edit`,
        });
      }
    }

    for (const s of students) {
      if (
        matchesSearch(s.displayName, term) ||
        matchesSearch(s.email, term) ||
        matchesSearch(s.userId, term)
      ) {
        const courseNames = s.courses.map((c) => c.className).join(", ");
        out.push({
          type: "student",
          id: s.userId,
          title: s.displayName || s.email || s.userId,
          subtitle: courseNames || undefined,
          href: s.courses[0] ? `/teacher/class/${s.courses[0].classId}/student/${s.userId}` : `/teacher/students`,
        });
      }
    }

    return out;
  }, [
    searchTerm,
    classes,
    lessons,
    assignments,
    playlists,
    quizzes,
    students,
  ]);

  return { results, loading };
}
