"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input, Select } from "@/components/ui/input";
import { ORG_LEVEL } from "@/lib/status";

interface FilterOption {
  id: string;
  name: string;
}

export function UsersFilterBar({ departments, teams }: { departments: FilterOption[]; teams: FilterOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/org/users?${params.toString()}`);
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) updateParam("q", q || null);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email, title…"
        className="w-full max-w-xs"
      />
      <Select
        value={searchParams.get("departmentId") ?? ""}
        onChange={(e) => updateParam("departmentId", e.target.value || null)}
        className="w-auto"
      >
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>
      <Select value={searchParams.get("teamId") ?? ""} onChange={(e) => updateParam("teamId", e.target.value || null)} className="w-auto">
        <option value="">All teams</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
      <Select value={searchParams.get("level") ?? ""} onChange={(e) => updateParam("level", e.target.value || null)} className="w-auto">
        <option value="">All levels</option>
        {Object.entries(ORG_LEVEL).map(([key, meta]) => (
          <option key={key} value={key}>
            {meta.label}
          </option>
        ))}
      </Select>
      <Select value={searchParams.get("active") ?? ""} onChange={(e) => updateParam("active", e.target.value || null)} className="w-auto">
        <option value="">Active + inactive</option>
        <option value="true">Active only</option>
        <option value="false">Inactive only</option>
      </Select>
    </div>
  );
}
