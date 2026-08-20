"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddBlockerModal } from "./add-blocker-modal";

export function AddBlockerButton({
  projectId,
  taskId,
  taskOptions,
  ownerOptions,
}: {
  projectId?: string | null;
  taskId?: string | null;
  taskOptions?: { id: string; title: string }[];
  ownerOptions?: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Log blocker
      </Button>
      <AddBlockerModal
        open={open}
        onClose={() => setOpen(false)}
        projectId={projectId}
        taskId={taskId}
        taskOptions={taskOptions}
        ownerOptions={ownerOptions}
      />
    </>
  );
}
