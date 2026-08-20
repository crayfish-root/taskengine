import { KpiCard, KpiCardData } from "./kpi-card";

export function KpiGrid({ kpis }: { kpis: KpiCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}
