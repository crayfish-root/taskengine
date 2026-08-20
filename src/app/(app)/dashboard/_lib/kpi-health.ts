// Small, self-contained KPI-target helper kept local to the dashboards feature
// (deliberately duplicated rather than imported from another module's directory).

export type KpiDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";

export function isKpiOnTarget(value: number, target: number, direction: KpiDirection) {
  return direction === "HIGHER_IS_BETTER" ? value >= target : value <= target;
}
