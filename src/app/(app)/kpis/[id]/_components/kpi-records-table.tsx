"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export interface KpiRecordRow {
  id: string;
  value: number;
  periodStart: string | Date;
  periodEnd: string | Date;
  note: string | null;
  updatedBy: { name: string };
}

export function KpiRecordsTable({ kpiId, records, unit }: { kpiId: string; records: KpiRecordRow[]; unit: string }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(recordId: string) {
    if (!confirm("Remove this reading? This can't be undone.")) return;
    setDeletingId(recordId);
    const res = await fetch(`/api/kpis/${kpiId}/records/${recordId}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) router.refresh();
  }

  if (records.length === 0) {
    return <p className="text-[13px] text-muted">No readings logged yet.</p>;
  }

  const sorted = [...records].sort((a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime());

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="text-[11.5px] uppercase tracking-[0.04em] text-muted-2">
            <th className="pb-2 font-medium">Period</th>
            <th className="pb-2 font-medium">Value</th>
            <th className="pb-2 font-medium">Note</th>
            <th className="pb-2 font-medium">Logged by</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="border-t border-border-soft">
              <td className="py-2.5 pr-3 whitespace-nowrap text-muted">
                {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
              </td>
              <td className="py-2.5 pr-3 font-medium whitespace-nowrap">
                {r.value.toLocaleString()} {unit}
              </td>
              <td className="py-2.5 pr-3 text-muted max-w-[280px] truncate">{r.note ?? "—"}</td>
              <td className="py-2.5 pr-3 whitespace-nowrap text-muted">{r.updatedBy.name}</td>
              <td className="py-2.5 text-right">
                <button
                  onClick={() => remove(r.id)}
                  disabled={deletingId === r.id}
                  className="rounded-[8px] p-1.5 text-muted-2 hover:bg-danger-soft hover:text-danger transition-colors disabled:opacity-40"
                  aria-label="Delete reading"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
