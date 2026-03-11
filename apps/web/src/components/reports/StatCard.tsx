interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "default" | "success" | "warning" | "error";
  onClick?: () => void;
}

const variantStyles = {
  default: "border-gray-200 bg-white",
  success: "border-report-success/30 bg-report-success/5",
  warning: "border-report-warning/30 bg-report-warning/5",
  error: "border-report-error/30 bg-report-error/5",
};

export function StatCard({
  label,
  value,
  subtext,
  variant = "default",
  onClick,
}: StatCardProps) {
  const className = `rounded-xl border p-5 shadow-card transition-shadow hover:shadow-cardHover ${variantStyles[variant]} ${onClick ? "cursor-pointer" : ""}`;

  return (
    <div
      className={className}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="mt-0.5 text-sm text-gray-600">{subtext}</p>}
    </div>
  );
}
