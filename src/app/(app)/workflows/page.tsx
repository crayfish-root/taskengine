import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ELEVATED_LEVELS } from "@/lib/org";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Workflow } from "lucide-react";
import { WorkflowCard } from "./_components/workflow-card";
import { NewWorkflowButton } from "./_components/workflow-form-modal";

export default async function WorkflowsPage() {
  const [user, workflows] = await Promise.all([
    getCurrentUser(),
    prisma.workflow.findMany({
      include: {
        statuses: { orderBy: { order: "asc" } },
        _count: { select: { projects: true } },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);
  const canManage = !!user && ELEVATED_LEVELS.has(user.level);

  return (
    <div>
      <PageHeader
        eyebrow="Tracking"
        title="Workflows"
        description="Configurable status pipelines projects can use in place of the default set."
        actions={canManage ? <NewWorkflowButton /> : undefined}
      />

      {workflows.length === 0 ? (
        <EmptyState icon={Workflow} title="No workflows yet" description="Create a workflow to define a custom status pipeline for projects." />
      ) : (
        <div className="space-y-4">
          {workflows.map((w) => (
            <WorkflowCard key={w.id} workflow={w} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}
