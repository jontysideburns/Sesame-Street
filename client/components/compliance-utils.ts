export function complianceStatusTone(status: string) {
  if (status.includes("overdue") || status.includes("late_pending")) return "critical";
  if (status.includes("grace") || status.includes("approaching")) return "warning";
  if (status.includes("fulfilled") || status.includes("committed")) return "good";
  return "neutral";
}

export function complianceLabel(value: string | null) {
  if (!value) return "Unassigned";
  return value.replaceAll("_", " ");
}
