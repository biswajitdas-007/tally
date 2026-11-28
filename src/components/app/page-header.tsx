/** A screen's title row (v1): large heading, optional subtitle, optional action on the right. */
export function PageHeader({
  title,
  subtitle,
  action,
}: Readonly<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}>) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[2.125rem] leading-[1.1] font-semibold tracking-[-0.035em] text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-2">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
