import { TabLinks } from "@/components/ui/tabs";

export function OrgSubnav({ active }: { active: "chart" | "users" | "teams" | "departments" }) {
  return (
    <TabLinks
      active={active}
      tabs={[
        { key: "chart", label: "Org Chart", href: "/org" },
        { key: "users", label: "Users", href: "/org/users" },
        { key: "teams", label: "Teams", href: "/org/teams" },
        { key: "departments", label: "Departments", href: "/org/departments" },
      ]}
    />
  );
}
