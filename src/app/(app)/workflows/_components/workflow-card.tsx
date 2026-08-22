import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkflowStepper, WorkflowStatusData } from "./workflow-stepper";
import { WorkflowActions } from "./workflow-actions";

export interface WorkflowCardData {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  statuses: WorkflowStatusData[];
  _count: { projects: number };
}

export function WorkflowCard({ workflow, canManage }: { workflow: WorkflowCardData; canManage: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{workflow.name}</h3>
            {workflow.isDefault && <Badge tone="accent">Default</Badge>}
            {workflow._count.projects > 0 && (
              <Badge tone="neutral">
                {workflow._count.projects} project{workflow._count.projects === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          {workflow.description && <p className="mt-0.5 text-[13px] text-muted">{workflow.description}</p>}
        </div>
        {canManage && (
          <WorkflowActions
            workflow={{
              id: workflow.id,
              name: workflow.name,
              description: workflow.description ?? "",
              isDefault: workflow.isDefault,
              statuses: workflow.statuses,
            }}
            projectCount={workflow._count.projects}
          />
        )}
      </CardHeader>
      <CardContent>
        <WorkflowStepper statuses={workflow.statuses} />
      </CardContent>
    </Card>
  );
}
