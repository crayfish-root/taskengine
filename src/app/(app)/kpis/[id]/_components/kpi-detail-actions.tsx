"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, MenuItem } from "@/components/ui/dropdown-menu";
import { EditKpiButton, KpiFormValues } from "../../_components/kpi-form-modal";
import { LogReadingButton } from "../../_components/log-reading-modal";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export function KpiDetailActions({
  kpi,
  departments,
  projects,
  users,
}: {
  kpi: KpiFormValues;
  departments: { id: string; name: string }[];
  projects: { id: string; name: string; code: string }[];
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!confirm(`Delete "${kpi.name}"? This removes all of its history too.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/kpis/${kpi.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/kpis");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <LogReadingButton kpiId={kpi.id!} unit={kpi.unit} />
      <DropdownMenu trigger={<Button variant="secondary" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>} align="end">
        {(close) => (
          <>
            <EditKpiButton
              kpi={kpi}
              departments={departments}
              projects={projects}
              users={users}
              trigger={
                <MenuItem onClick={close}>
                  <Pencil className="h-3.5 w-3.5" /> Edit KPI
                </MenuItem>
              }
            />
            <MenuItem
              danger
              onClick={() => {
                close();
                remove();
              }}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete KPI
            </MenuItem>
          </>
        )}
      </DropdownMenu>
    </div>
  );
}
