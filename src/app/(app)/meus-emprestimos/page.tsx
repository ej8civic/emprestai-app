"use client";

import { Plus } from "@phosphor-icons/react";
import Link from "next/link";
import * as React from "react";
import { EquipmentIcon } from "@/components/equipment-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, LimitMeter, PageHead, Pill } from "@/components/ui/primitives";
import { formatDM } from "@/lib/date";
import { CATEGORY_LABEL } from "@/lib/labels";
import { errorMessage, trpc } from "@/lib/trpc";

export default function MyLoansPage() {
  const utils = trpc.useUtils();
  const mine = trpc.loan.mine.useQuery();
  const me = trpc.me.get.useQuery();
  const [error, setError] = React.useState<string>();
  const giveBack = trpc.loan.return.useMutation({
    onSuccess: () => Promise.all([utils.loan.invalidate(), utils.me.get.invalidate(), utils.equipment.invalidate()]),
    onError: (e) => setError(errorMessage(e)),
  });
  const now = Date.now();

  return (
    <div data-screen-label="04 Meus empréstimos" className="flex flex-col gap-8">
      <PageHead
        eyebrow="Colaborador"
        title="Meus empréstimos"
        action={
          <Link href="/catalogo" className={buttonVariants({ variant: "primary" })}>
            Pegar emprestado <Plus />
          </Link>
        }
      />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">Comigo agora</h2>
            <p className="text-sm text-muted">
              {me.data ? `${me.data.openCount} de ${me.data.maxItems} itens · ${me.data.overdue ? "item em atraso" : "nenhum em atraso"}` : "Carregando…"}
            </p>
          </div>
          <div className="w-44">{me.data && <LimitMeter used={me.data.openCount} max={me.data.maxItems} />}</div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {mine.isLoading ? (
          <div className="h-28 animate-pulse rounded-xl border border-line bg-surface" aria-busy />
        ) : mine.data && mine.data.open.length > 0 ? (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {mine.data.open.map((l) => {
              const late = l.dueAt.getTime() < now;
              const total = l.dueAt.getTime() - l.loanedAt.getTime();
              const elapsed = Math.min(100, Math.max(0, Math.round(((now - l.loanedAt.getTime()) / total) * 100)));
              return (
                <li key={l.id} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-[auto_1fr_200px_auto]">
                  <EquipmentIcon category={l.category} />
                  <div className="flex min-w-0 flex-col">
                    <strong className="truncate font-medium">{l.name}</strong>
                    <span className="font-mono text-xs text-subtle">
                      {l.patrimonio} · {CATEGORY_LABEL[l.category]}
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>Prazo</span>
                      <strong className={late ? "font-medium text-danger" : "font-medium text-fg"}>
                        {formatDM(l.dueAt)}
                        {late && " · atrasado"}
                      </strong>
                    </div>
                    <progress className={late ? "bar late" : "bar"} max={100} value={late ? 100 : elapsed} aria-label="Prazo consumido" />
                  </div>
                  <Button
                    className="col-span-2 sm:col-span-1"
                    disabled={giveBack.isPending}
                    onClick={() => {
                      setError(undefined);
                      giveBack.mutate({ loanId: l.id });
                    }}
                  >
                    Devolver
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty title="Nenhum item com você." sub="Escolha um equipamento no catálogo." />
        )}
      </section>

      <div className="rule-fade" />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Histórico</h2>
        {mine.data && mine.data.history.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="eyebrow hidden grid-cols-[1.6fr_1fr_1fr_130px] gap-4 bg-surface px-5 py-3 sm:grid">
              <span>Item</span>
              <span>Retirada</span>
              <span>Devolução</span>
              <span>Situação</span>
            </div>
            <ul className="divide-y divide-line">
              {mine.data.history.map((h) => (
                <li key={h.id} className="grid grid-cols-2 items-center gap-x-4 gap-y-1 px-5 py-3.5 text-[13px] sm:grid-cols-[1.6fr_1fr_1fr_130px]">
                  <span className="col-span-2 font-medium sm:col-span-1">{h.name}</span>
                  <span className="font-mono text-muted">{formatDM(h.loanedAt)}</span>
                  <span className="font-mono text-muted">{formatDM(h.returnedAt)}</span>
                  <span>
                    <Pill kind={h.late ? "maintenance" : "ok"}>{h.late ? "Atraso" : "No prazo"}</Pill>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhuma devolução ainda.</p>
        )}
      </section>
    </div>
  );
}
