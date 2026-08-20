// Pure tree-building/filtering helpers for the org chart. No React here so the
// server component (org/page.tsx) can shape data before handing it to the client tree.

export interface RawOrgUser {
  id: string;
  name: string;
  title: string | null;
  level: string;
  avatarColor: string | null;
  avatarEmoji: string | null;
  active: boolean;
  managerId: string | null;
  departmentName: string | null;
  openTaskCount: number;
}

export interface OrgTreeNode extends RawOrgUser {
  children: OrgTreeNode[];
  downstreamCount: number;
}

const LEVEL_ORDER = ["CIO", "DIRECTOR", "HEAD_OF_DEPARTMENT", "MANAGER", "LEAD", "STAFF"];

export function buildOrgTree(users: RawOrgUser[]): OrgTreeNode[] {
  const byId = new Map<string, OrgTreeNode>();
  for (const u of users) byId.set(u.id, { ...u, children: [], downstreamCount: 0 });

  const roots: OrgTreeNode[] = [];
  for (const u of users) {
    const node = byId.get(u.id)!;
    const manager = u.managerId ? byId.get(u.managerId) : undefined;
    if (manager) manager.children.push(node);
    else roots.push(node);
  }

  function countDownstream(node: OrgTreeNode): number {
    let total = node.children.length;
    for (const child of node.children) total += countDownstream(child);
    node.downstreamCount = total;
    return total;
  }
  roots.forEach(countDownstream);

  function sortChildren(node: OrgTreeNode) {
    node.children.sort(
      (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || a.name.localeCompare(b.name)
    );
    node.children.forEach(sortChildren);
  }
  roots.forEach(sortChildren);
  roots.sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || a.name.localeCompare(b.name));

  return roots;
}

/** Keeps a node if it matches the query itself, or has a descendant that does. */
export function filterOrgTree(nodes: OrgTreeNode[], query: string): OrgTreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  function walk(node: OrgTreeNode): OrgTreeNode | null {
    const selfMatch =
      node.name.toLowerCase().includes(q) ||
      (node.title ?? "").toLowerCase().includes(q) ||
      (node.departmentName ?? "").toLowerCase().includes(q);
    const children = node.children.map(walk).filter((n): n is OrgTreeNode => n !== null);
    if (!selfMatch && children.length === 0) return null;
    return { ...node, children };
  }

  return nodes.map(walk).filter((n): n is OrgTreeNode => n !== null);
}
