import * as React from "react";
import { cn } from "@/lib/cn";
import type { EquipmentState } from "@/lib/labels";
import { STATE_LABEL } from "@/lib/labels";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-line bg-surface", className)} {...props} />;
}

const tone = {
  available: "text-success border-success/30 bg-success/10",
  loaned: "text-muted border-line-strong bg-surface-2",
  maintenance: "text-warn border-warn/30 bg-warn/10",
  retired: "text-subtle border-line-strong bg-surface-2",
  late: "text-danger border-danger/30 bg-danger/10",
  ok: "text-success border-success/30 bg-success/10",
} as const;

export function Pill({ kind, children }: { kind: keyof typeof tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium",
        tone[kind],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function StatePill({ state }: { state: EquipmentState }) {
  return <Pill kind={state}>{STATE_LABEL[state]}</Pill>;
}

export function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "h-8 rounded-full border px-3.5 text-[13px] transition-colors",
        active
          ? "border-fg bg-fg font-medium text-bg"
          : "border-line-strong text-muted hover:border-subtle hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

/** Indicador de limite: N de 3 itens. */
export function LimitMeter({ used, max }: { used: number; max: number }) {
  return (
    <div className="flex gap-1.5" role="img" aria-label={`${used} de ${max} itens`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cn("h-1 flex-1 rounded-full", i < used ? "bg-fg" : "bg-line-strong")} />
      ))}
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
      <span className="font-medium">{title}</span>
      {sub && <span className="text-sm text-muted">{sub}</span>}
    </div>
  );
}
