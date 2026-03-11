import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useClassEnrollments } from "../../hooks/useEnrollments";
import { useReviewTimer } from "../../hooks/useReviewTimer";
import { TimerDisplay } from "./TimerDisplay";
import { StudentQueue } from "./StudentQueue";
import { StudentSubmissionsPanel } from "./StudentSubmissionsPanel";

interface ReviewDashboardProps {
  classId: string;
  lessonTitle: string;
  durationMinutes: number;
  zoomStartUrl?: string;
  onExit: () => void;
}

interface StudentInfo {
  id: string;
  displayName: string;
}

function useEnrolledStudentNames(classId: string) {
  const { enrollments, loading: enrollmentsLoading } = useClassEnrollments(classId);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (enrollmentsLoading) return;
    if (enrollments.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    Promise.all(
      enrollments.map(async (e) => {
        try {
          const snap = await getDoc(doc(db, "users", e.userId));
          const data = snap.data();
          return {
            id: e.userId,
            displayName: data?.displayName || data?.email || e.userId.slice(0, 8),
          };
        } catch {
          return { id: e.userId, displayName: e.userId.slice(0, 8) };
        }
      })
    ).then((result) => {
      if (!cancelled) {
        setStudents(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enrollments, enrollmentsLoading]);

  return { students, loading: loading || enrollmentsLoading };
}

function formatMinutes(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function ReviewDashboard({
  classId,
  lessonTitle,
  durationMinutes,
  zoomStartUrl,
  onExit,
}: ReviewDashboardProps) {
  const { students, loading: studentsLoading } = useEnrolledStudentNames(classId);
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();

  const timer = useReviewTimer({
    totalDurationMinutes: durationMinutes,
    students,
  });

  const currentName = timer.currentStudent?.displayName;
  const activeStudentId = timer.currentStudent?.id ?? selectedStudentId;

  const activeStudentName =
    timer.currentStudent?.displayName ??
    timer.studentQueue.find((s) => s.id === selectedStudentId)?.displayName;

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  if (studentsLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">Loading enrolled students&hellip;</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">No students enrolled in this class yet.</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          Back to live classes
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Review Session: {lessonTitle}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Total: {formatMinutes(durationMinutes * 60)} &middot;{" "}
              Students: {students.length} &middot;{" "}
              Per student: {formatMinutes(timer.timePerStudentSeconds)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!timer.hasStarted && (
              <button
                type="button"
                onClick={timer.start}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Start Review
              </button>
            )}
            {timer.isFinished && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                All reviews complete
              </span>
            )}
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Exit Review Mode
            </button>
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left: Student Queue */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
          <StudentQueue
            students={timer.studentQueue}
            onReorder={timer.reorderStudents}
            onSkip={timer.skipStudent}
            onSelect={handleSelectStudent}
          />
        </div>

        {/* Right: Timer + Submissions */}
        <div className="space-y-6">
          {timer.hasStarted && (
            <TimerDisplay
              remainingSeconds={timer.remainingSeconds}
              totalSeconds={timer.timePerStudentSeconds}
              isRunning={timer.isRunning}
              isPaused={timer.isPaused}
              onPause={timer.pause}
              onResume={timer.resume}
              studentName={currentName}
            />
          )}

          {timer.hasStarted && !timer.isFinished && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={timer.nextStudent}
                className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Next Student &rarr;
              </button>
            </div>
          )}

          <StudentSubmissionsPanel
            studentId={activeStudentId}
            classId={classId}
            studentName={activeStudentName}
          />
        </div>
      </div>

      {/* Floating Zoom button */}
      {zoomStartUrl && (
        <a
          href={zoomStartUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Rejoin Zoom
        </a>
      )}
    </div>
  );
}
