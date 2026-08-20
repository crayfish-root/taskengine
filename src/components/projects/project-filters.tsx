"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/input";
import { PROJECT_STATUS, PRIORITY } from "@/lib/status";

export function ProjectFilters({
  departments,
  owners,
}: {
  departments: { id: string; name: string }[];
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="w-auto min-w-[130px]"
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {Object.entries(PROJECT_STATUS).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </Select>
      <Select
        className="w-auto min-w-[120px]"
        value={searchParams.get("priority") ?? ""}
        onChange={(e) => setParam("priority", e.target.value)}
      >
        <option value="">All priorities</option>
        {Object.entries(PRIORITY).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </Select>
      <Select
        className="w-auto min-w-[150px]"
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
        className="w-auto min-w-[150px]"
        value={searchParams.get("owner") ?? ""}
        onChange={(e) => setParam("owner", e.target.value)}
      >
        <option value="">All owners</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
