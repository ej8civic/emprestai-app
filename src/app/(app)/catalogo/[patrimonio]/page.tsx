"use client";

import { ArrowRight, CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { EquipmentIcon } from "@/components/equipment-icon";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card, Empty, LimitMeter, StatePill } from "@/components/ui/primitives";
import { formatDM } from "@/lib/date";
import { CATEGORY_LABEL } from "@/lib/labels";
import { errorMessage, trpc } from "@/lib/trpc";

const DAY = 24 * 60 * 60 * 1000;

export default function EquipmentDetailPage() {
  const { patrimonio } = useParams<{ patrimonio: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const item = trpc.equipment.get.useQuery({ patrimonio });
  const me = trpc.me.get.useQuery();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const request = trpc.loan.request.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.me.get.invalidate(), utils.equipment.invalidate(), utils.loan.invalidate()]);
      router.push("/meus-emprestimos");
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (item.isLoading) return <div className="h-96 animate-pulse rounded-xl border border-line bg-surface" aria-busy />;
  if (!item.data) return <Empty title="Equipamento não encontrado." sub="Volte ao catálogo." />;
  const e = item.data;

  // Prazo mostrado ao pedir: 14 dias a partir de agora (o servidor recalcula na confirmação).
  const dueIfRequested = formatDM(new Date(Date.now() + 14 * DAY));
  const used = me.data?.openCount ?? 0;
  const max = me.data?.maxItems ?? 3;

  const blocked =
    e.request.allowed ? null : e.request.reason === "OVERDUE" ? "Bloqueado por atraso." : e.request.reason === "LIMIT" ? "Limite de 3 itens atingido." : null;

  return (
    <div data-screen-label="03 Detalhe do item" className="flex flex-col gap-8">
      <nav aria-label="Trilha" className="flex items-center gap-2 text-[13px] text-muted">
        <Link href="/catalogo" className="hover:text-fg">
          Catálogo
        </Link>
        <CaretRight aria-hidden className="size-3 text-subtle" />
        <span>{CATEGORY_LABEL[e.category]}</span>
        <CaretRight aria-hidden className="size-3 text-subtle" />
        <span className="text-fg">{e.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          <div className="relative isolate grid h-64 place-items-center overflow-hidden rounded-xl border border-line bg-surface">
            <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
            <div aria-hidden className="glow-turbo absolute inset-0 -z-10 opacity-40" />
            <EquipmentIcon category={e.category} className="size-20 rounded-2xl [&_svg]:size-9" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[32px] font-semibold tracking-tight">{e.name}</h1>
            <StatePill state={e.state} />
          </div>
          {e.description && <p className="max-w-prose text-muted">{e.description}</p>}

          <div className="rule-fade" />
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              ["Categoria", CATEGORY_LABEL[e.category]],
              ["Patrimônio", e.patrimonio],
              ["Local", e.pickupLocation],
              ["Última devolução", e.lastReturnAt ? formatDM(e.lastReturnAt) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <dt className="eyebrow">{k}</dt>
                <dd className="text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Histórico</h2>
            {e.history.length === 0 ? (
              <p className="text-sm text-muted">Nenhum empréstimo registrado.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {e.history.map((h) => (
                  <li key={h.id} className="grid grid-cols-[72px_1fr_auto] items-center gap-4 px-4 py-3 text-[13px]">
                    <span className="font-mono text-subtle">{formatDM(h.returnedAt ?? h.loanedAt)}</span>
                    <span>{h.returnedAt ? "Devolução" : "Empréstimo"}</span>
                    <span className={h.returnedAt && h.returnedAt > h.dueAt ? "text-warn" : "text-success"}>
                      {h.returnedAt ? (h.returnedAt > h.dueAt ? "Com atraso" : "No prazo") : `Prazo ${formatDM(h.dueAt)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-5 p-6">
            <h2 className="text-base font-semibold tracking-tight">Solicitar empréstimo</h2>
            {e.state === "available" ? (
              <>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Retirada</span>
                  <strong className="font-medium">{e.pickupLocation}</strong>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Prazo padrão</span>
                  <strong className="font-medium">14 dias</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Devolver até</span>
                  <span className="font-mono text-2xl font-medium tracking-tight">{dueIfRequested}</span>
                </div>
                <Button variant="primary" size="lg" disabled={!e.request.allowed} onClick={() => { setError(undefined); setOpen(true); }}>
                  Solicitar empréstimo <ArrowRight />
                </Button>
                <p className="text-xs text-subtle">{blocked ?? "Retirada no balcão de Operações."}</p>
              </>
            ) : (
              <p className="text-sm text-muted">
                {e.state === "loaned" && `Com ${e.holderName} até ${e.dueAt ? formatDM(e.dueAt) : "—"}.`}
                {e.state === "maintenance" && "Na assistência. Não está disponível."}
                {e.state === "retired" && "Fora de uso."}
              </p>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-base font-semibold tracking-tight">Seus itens</h2>
            <span className="font-mono text-2xl font-medium tracking-tight">
              {used} de {max}
            </span>
            <LimitMeter used={used} max={max} />
            <p className="text-xs text-subtle">
              {me.data?.overdue ? "Há item em atraso. Novo empréstimo bloqueado." : "Nenhum item em atraso."}
            </p>
          </Card>
        </aside>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Confirmar empréstimo"
        description={`O prazo começa na confirmação. Devolver até ${dueIfRequested}.`}
      >
        <div className="rounded-md border border-line bg-bg px-3 py-2.5 text-[13px] text-muted">
          {`Este pedido leva a ${used + 1} de ${max} itens.`}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="primary" disabled={request.isPending} onClick={() => request.mutate({ patrimonio: e.patrimonio })}>
            {request.isPending ? "Confirmando…" : "Confirmar"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
