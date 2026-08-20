"use client";

import { Select } from "@/components/ui/input";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function KpiFilters({
  departments,
  projects,
  users,
}: {
  departments: { id: string; name: string }[];
  projects: { id: string; name: string; code: string }[];
  users: { id: string; name: string }[];
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

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Select
        className="w-auto min-w-[160px]"
        value={searchParams.get("department") ?? ""}
        onChange={(e) => setParam("department", e.target.value)}
      >
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>
      <Select
        className="w-auto min-w-[160px]"
        value={searchParams.get("project") ?? ""}
        onChange={(e) => setParam("project", e.target.value)}
      >
        <option value="">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} — {p.name}
          </option>
        ))}
      </Select>
      <Select
        className="w-auto min-w-[160px]"
        value={searchParams.get("owner") ?? ""}
        onChange={(e) => setParam("owner", e.target.value)}
      >
        <option value="">All owners</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </Select>
      {(searchParams.get("department") || searchParams.get("project") || searchParams.get("owner")) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-[12.5px] font-medium text-muted hover:text-foreground transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
