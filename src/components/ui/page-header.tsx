export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">{eyebrow}</p>
        )}
        <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-foreground">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-muted max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
