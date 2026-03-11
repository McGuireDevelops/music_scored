interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showCount?: boolean;
  variant?: "default" | "success" | "warning" | "error";
}

const variantColors = {
  default: "bg-primary",
  success: "bg-report-success",
  warning: "bg-report-warning",
  error: "bg-report-error",
};

function getVariant(value: number, max: number): ProgressBarProps["variant"] {
  if (max === 0) return "default";
  const pct = value / max;
  if (pct >= 0.8) return "success";
  if (pct >= 0.5) return "warning";
  return "error";
}

export function ProgressBar({
  value,
  max,
  label,
  showCount = true,
  variant,
}: ProgressBarProps) {
  const resolvedVariant = variant ?? getVariant(value, max);
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="w-full">
      {(label || showCount) && (
        <div className="mb-1 flex items-center justify-between text-sm">
          {label && <span className="font-medium text-gray-700">{label}</span>}
          {showCount && (
            <span className="text-gray-500">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${variantColors[resolvedVariant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
