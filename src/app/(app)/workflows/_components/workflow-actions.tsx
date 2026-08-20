"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, MenuItem } from "@/components/ui/dropdown-menu";
import { EditWorkflowButton, WorkflowFormValues } from "./workflow-form-modal";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";

export function WorkflowActions({ workflow, projectCount }: { workflow: WorkflowFormValues; projectCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setDefault() {
    setBusy(true);
    const res = await fetch(`/api/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete "${workflow.name}"?`)) return;
    setBusy(true);
    const res = await fetch(`/api/workflows/${workflow.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not delete workflow");
    }
  }

  return (
    <DropdownMenu trigger={<Button variant="ghost" size="icon" disabled={busy}><MoreHorizontal className="h-4 w-4" /></Button>} align="end">
      {(close) => (
        <>
          {!workflow.isDefault && (
            <MenuItem
              onClick={() => {
                close();
                setDefault();
              }}
            >
              <Star className="h-3.5 w-3.5" /> Set as default
            </MenuItem>
          )}
          <EditWorkflowButton
            workflow={workflow}
            trigger={
              <MenuItem onClick={close}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </MenuItem>
            }
          />
          <MenuItem
            danger
            disabled={projectCount > 0}
            title={projectCount > 0 ? "In use by projects — unassign them first" : undefined}
            onClick={() => {
              close();
              remove();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </MenuItem>
        </>
      )}
    </DropdownMenu>
  );
}
