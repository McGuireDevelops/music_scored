interface TimerDisplayProps {
  remainingSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  studentName?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getTimerColor(remaining: number, total: number) {
  if (total === 0) return { ring: "text-gray-300", bg: "bg-gray-50", text: "text-gray-700" };
  const ratio = remaining / total;
  if (ratio > 0.5) return { ring: "text-green-500", bg: "bg-green-50", text: "text-green-700" };
  if (ratio > 0.2) return { ring: "text-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700" };
  return { ring: "text-red-500", bg: "bg-red-50", text: "text-red-700" };
}

export function TimerDisplay({
  remainingSeconds,
  totalSeconds,
  isRunning,
  isPaused,
  onPause,
  onResume,
  studentName,
}: TimerDisplayProps) {
  const colors = getTimerColor(remainingSeconds, totalSeconds);
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = remainingSeconds <= 60 && remainingSeconds > 0;
  const isOvertime = remainingSeconds === 0 && totalSeconds > 0 && isRunning;

  return (
    <div className={`flex flex-col items-center gap-4 rounded-2xl border p-6 ${colors.bg} border-gray-200`}>
      {studentName && (
        <p className="text-sm font-medium text-gray-500">Reviewing</p>
      )}
      {studentName && (
        <h3 className="text-lg font-semibold text-gray-900">{studentName}</h3>
      )}

      <div className="relative flex h-36 w-36 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-gray-200"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`${colors.ring} transition-[stroke-dashoffset] duration-1000 ease-linear`}
          />
        </svg>
        <span
          className={`relative text-3xl font-bold tabular-nums ${colors.text} ${
            isUrgent ? "animate-pulse" : ""
          }`}
        >
          {formatTime(remainingSeconds)}
        </span>
      </div>

      {isOvertime && (
        <p className="text-sm font-semibold text-red-600 animate-pulse">
          Time's up!
        </p>
      )}

      <div className="flex gap-2">
        {isRunning && !isPaused && (
          <button
            type="button"
            onClick={onPause}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Pause
          </button>
        )}
        {isPaused && (
          <button
            type="button"
            onClick={onResume}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Resume
          </button>
        )}
      </div>
    </div>
  );
}
