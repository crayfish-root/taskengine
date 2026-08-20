import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkflowStatusData {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
  isTerminal: boolean;
  isDelayFlag: boolean;
}

export function WorkflowStepper({ statuses }: { statuses: WorkflowStatusData[] }) {
  const sorted = [...statuses].sort((a, b) => a.order - b.order);
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {sorted.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium"
            )}
            style={{
              color: s.color,
              borderColor: `${s.color}33`,
              background: `${s.color}14`,
            }}
          >
            {s.label}
            {s.isTerminal && <CheckCircle2 className="h-3 w-3" />}
            {s.isDelayFlag && <AlertTriangle className="h-3 w-3" />}
          </span>
          {i < sorted.length - 1 && <span className="mx-1 h-px w-4 bg-border" />}
        </div>
      ))}
    </div>
  );
}
