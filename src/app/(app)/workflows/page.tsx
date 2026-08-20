import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Workflow } from "lucide-react";
import { WorkflowCard } from "./_components/workflow-card";
import { NewWorkflowButton } from "./_components/workflow-form-modal";

export default async function WorkflowsPage() {
  const workflows = await prisma.workflow.findMany({
    include: {
      statuses: { orderBy: { order: "asc" } },
      _count: { select: { projects: true } },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Tracking"
        title="Workflows"
        description="Configurable status pipelines projects can use in place of the default set."
        actions={<NewWorkflowButton />}
      />

      {workflows.length === 0 ? (
        <EmptyState icon={Workflow} title="No workflows yet" description="Create a workflow to define a custom status pipeline for projects." />
      ) : (
        <div className="space-y-4">
          {workflows.map((w) => (
            <WorkflowCard key={w.id} workflow={w} />
          ))}
        </div>
      )}
    </div>
  );
}
