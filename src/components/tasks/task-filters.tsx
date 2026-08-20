"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SegmentedControl } from "@/components/ui/tabs";
import { Select } from "@/components/ui/input";
import { TASK_STATUS, PRIORITY } from "@/lib/status";

export function TaskViewToggle({ options }: { options: { label: string; value: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get("view") ?? options[0].value;

  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={(v) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", v);
        router.push(`${pathname}?${params.toString()}`);
      }}
    />
  );
}

export function TaskFilters({
  projects,
  assignees,
}: {
  projects: { id: string; name: string; code: string }[];
  assignees: { id: string; name: string }[];
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

  const overdueOnly = searchParams.get("overdue") === "1";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select className="w-auto min-w-[130px]" value={searchParams.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
        <option value="">All statuses</option>
        {Object.entries(TASK_STATUS).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </Select>
      <Select className="w-auto min-w-[120px]" value={searchParams.get("priority") ?? ""} onChange={(e) => setParam("priority", e.target.value)}>
        <option value="">All priorities</option>
        {Object.entries(PRIORITY).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </Select>
      <Select className="w-auto min-w-[160px]" value={searchParams.get("project") ?? ""} onChange={(e) => setParam("project", e.target.value)}>
        <option value="">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} · {p.name}
          </option>
        ))}
      </Select>
      <Select className="w-auto min-w-[150px]" value={searchParams.get("assignee") ?? ""} onChange={(e) => setParam("assignee", e.target.value)}>
        <option value="">Any assignee</option>
        {assignees.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={() => setParam("overdue", overdueOnly ? "" : "1")}
        className={
          overdueOnly
            ? "rounded-[10px] bg-danger px-3 py-[7px] text-[12.5px] font-medium text-white"
            : "rounded-[10px] border border-border px-3 py-[7px] text-[12.5px] font-medium text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
        }
      >
        Overdue only
      </button>
    </div>
  );
}
