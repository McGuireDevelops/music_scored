import { useState, useRef, useCallback, useEffect } from "react";

export type StudentReviewStatus = "waiting" | "active" | "completed" | "skipped";

export interface ReviewStudent {
  id: string;
  displayName: string;
  status: StudentReviewStatus;
}

export interface UseReviewTimerOptions {
  totalDurationMinutes: number;
  students: Array<{ id: string; displayName: string }>;
}

export interface UseReviewTimerReturn {
  studentQueue: ReviewStudent[];
  currentStudent: ReviewStudent | null;
  timePerStudentSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  hasStarted: boolean;
  isFinished: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  nextStudent: () => void;
  skipStudent: (studentId: string) => void;
  reorderStudents: (reordered: ReviewStudent[]) => void;
}

export function useReviewTimer({
  totalDurationMinutes,
  students,
}: UseReviewTimerOptions): UseReviewTimerReturn {
  const [queue, setQueue] = useState<ReviewStudent[]>(() =>
    students.map((s) => ({ ...s, status: "waiting" as const }))
  );
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const waitingCount = queue.filter((s) => s.status === "waiting").length +
    queue.filter((s) => s.status === "active").length;
  const timePerStudentSeconds = waitingCount > 0
    ? Math.floor((totalDurationMinutes * 60) / students.length)
    : 0;
  const remainingSeconds = Math.max(0, timePerStudentSeconds - elapsedSeconds);

  const currentStudent = currentIndex >= 0 ? queue[currentIndex] ?? null : null;
  const isFinished =
    hasStarted && queue.every((s) => s.status === "completed" || s.status === "skipped");

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [clearTimer]);

  const advanceToNextWaiting = useCallback(
    (fromQueue: ReviewStudent[]): number => {
      const nextIdx = fromQueue.findIndex((s) => s.status === "waiting");
      return nextIdx;
    },
    []
  );

  const start = useCallback(() => {
    if (queue.length === 0) return;
    const nextIdx = advanceToNextWaiting(queue);
    if (nextIdx === -1) return;

    setQueue((prev) =>
      prev.map((s, i) => (i === nextIdx ? { ...s, status: "active" as const } : s))
    );
    setCurrentIndex(nextIdx);
    setElapsedSeconds(0);
    setIsRunning(true);
    setIsPaused(false);
    setHasStarted(true);
    startTimer();
  }, [queue, advanceToNextWaiting, startTimer]);

  const pause = useCallback(() => {
    clearTimer();
    setIsPaused(true);
    setIsRunning(false);
  }, [clearTimer]);

  const resume = useCallback(() => {
    setIsPaused(false);
    setIsRunning(true);
    startTimer();
  }, [startTimer]);

  const nextStudent = useCallback(() => {
    setQueue((prev) => {
      const updated = prev.map((s, i) =>
        i === currentIndex && s.status === "active"
          ? { ...s, status: "completed" as const }
          : s
      );
      const nextIdx = updated.findIndex((s) => s.status === "waiting");
      if (nextIdx === -1) {
        clearTimer();
        setIsRunning(false);
        setCurrentIndex(-1);
        return updated;
      }
      const withNext = updated.map((s, i) =>
        i === nextIdx ? { ...s, status: "active" as const } : s
      );
      setCurrentIndex(nextIdx);
      setElapsedSeconds(0);
      if (!isRunning && !isPaused) startTimer();
      setIsRunning(true);
      setIsPaused(false);
      return withNext;
    });
  }, [currentIndex, clearTimer, isRunning, isPaused, startTimer]);

  const skipStudent = useCallback(
    (studentId: string) => {
      setQueue((prev) => {
        const updated = prev.map((s) =>
          s.id === studentId && s.status === "waiting"
            ? { ...s, status: "skipped" as const }
            : s
        );
        if (currentStudent?.id === studentId) {
          const nextIdx = updated.findIndex((s) => s.status === "waiting");
          if (nextIdx === -1) {
            clearTimer();
            setIsRunning(false);
            setCurrentIndex(-1);
          } else {
            const withNext = updated.map((s, i) =>
              i === nextIdx ? { ...s, status: "active" as const } : s
            );
            setCurrentIndex(nextIdx);
            setElapsedSeconds(0);
            return withNext;
          }
        }
        return updated;
      });
    },
    [currentStudent, clearTimer]
  );

  const reorderStudents = useCallback((reordered: ReviewStudent[]) => {
    setQueue(reordered);
    const activeIdx = reordered.findIndex((s) => s.status === "active");
    if (activeIdx !== -1) setCurrentIndex(activeIdx);
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  // Sync when the students prop changes (e.g. enrollments load late)
  useEffect(() => {
    setQueue((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const newStudents = students.filter((s) => !existingIds.has(s.id));
      if (newStudents.length === 0 && prev.length === students.length) return prev;
      return [
        ...prev.filter((s) => students.some((st) => st.id === s.id)),
        ...newStudents.map((s) => ({ ...s, status: "waiting" as const })),
      ];
    });
  }, [students]);

  return {
    studentQueue: queue,
    currentStudent,
    timePerStudentSeconds,
    remainingSeconds,
    elapsedSeconds,
    isRunning,
    isPaused,
    hasStarted,
    isFinished,
    start,
    pause,
    resume,
    nextStudent,
    skipStudent,
    reorderStudents,
  };
}
