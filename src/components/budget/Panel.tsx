import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("glass rounded-2xl p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="label-caps">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel>
      <div className="label-caps">{label}</div>
      <div className="mt-2 font-mono text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-[12px] text-muted-foreground">{hint}</div>}
    </Panel>
  );
}

export function Progress({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "safe" | "primary" | "warn" | "danger";
}) {
  const bar = { safe: "bg-safe", primary: "bg-primary", warn: "bg-warn", danger: "bg-danger" }[
    tone
  ];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", bar)}
        style={{ width: `${Math.min(100, value * 100)}%` }}
      />
    </div>
  );
}
