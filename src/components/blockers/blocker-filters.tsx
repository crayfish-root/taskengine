"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SegmentedControl } from "@/components/ui/tabs";
import { Select } from "@/components/ui/input";
import { BLOCKER_SEVERITY, BLOCKER_STATUS } from "@/lib/status";

const VIEWS = [
  { label: "All", value: "all" },
  { label: "Blockers", value: "blockers" },
  { label: "Overdue", value: "overdue" },
];

export function BlockerFilters({
  projects,
  owners,
}: {
  projects: { id: string; name: string; code: string }[];
  owners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const view = searchParams.get("view") ?? "all";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SegmentedControl options={VIEWS} value={view} onChange={(v) => setParam("view", v === "all" ? "" : v)} />
      <div className="flex flex-wrap items-center gap-2">
        {view !== "overdue" && (
          <>
            <Select className="w-auto min-w-[120px]" value={searchParams.get("severity") ?? ""} onChange={(e) => setParam("severity", e.target.value)}>
              <option value="">All severities</option>
              {Object.entries(BLOCKER_SEVERITY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
            <Select className="w-auto min-w-[130px]" value={searchParams.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(BLOCKER_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </>
        )}
        <Select className="w-auto min-w-[160px]" value={searchParams.get("project") ?? ""} onChange={(e) => setParam("project", e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </Select>
        <Select className="w-auto min-w-[150px]" value={searchParams.get("owner") ?? ""} onChange={(e) => setParam("owner", e.target.value)}>
          <option value="">Any owner</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
