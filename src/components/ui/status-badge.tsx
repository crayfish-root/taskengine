import { Badge } from "./badge";

export function StatusBadge({
  map,
  value,
  dot = true,
}: {
  map: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info" }>;
  value: string;
  dot?: boolean;
}) {
  const meta = map[value] ?? { label: value, tone: "neutral" as const };
  return (
    <Badge tone={meta.tone} dot={dot}>
      {meta.label}
    </Badge>
  );
}
