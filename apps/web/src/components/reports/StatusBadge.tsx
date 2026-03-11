interface StatusBadgeProps {
  status: "not_started" | "submitted" | "graded" | "overdue" | "complete";
  label?: string;
}

const statusConfig = {
  not_started: {
    label: "Not started",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  graded: {
    label: "Graded",
    className: "bg-report-success/10 text-green-700 border-report-success/30",
  },
  overdue: {
    label: "Overdue",
    className: "bg-report-error/10 text-red-700 border-report-error/30",
  },
  complete: {
    label: "Complete",
    className: "bg-report-success/10 text-green-700 border-report-success/30",
  },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {label ?? config.label}
    </span>
  );
}
