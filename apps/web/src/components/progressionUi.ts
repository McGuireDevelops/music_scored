import type { ProgressAutoInterval, ProgressionMode } from "@learning-scores/shared";

export function msToDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function datetimeLocalToMs(s: string): number {
  return new Date(s).getTime();
}

export const MODE_OPTIONS: { value: ProgressionMode; label: string }[] = [
  { value: "open", label: "Open — students progress freely" },
  { value: "scheduled", label: "Scheduled — unlock at date & time" },
  { value: "automatic", label: "Automatic — drip by daily / weekly / …" },
  { value: "manual", label: "Manual — you release to class and/or students" },
];

export const INTERVAL_OPTIONS: { value: ProgressAutoInterval; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly (90 days)" },
  { value: "yearly", label: "Yearly" },
];
