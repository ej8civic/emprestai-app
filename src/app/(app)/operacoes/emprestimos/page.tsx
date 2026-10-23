"use client";

import { Plus } from "@phosphor-icons/react";
import Link from "next/link";
import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Chip, Empty, PageHead, Pill } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { formatDM } from "@/lib/date";
import { CATEGORY_LABEL } from "@/lib/labels";
import { errorMessage, trpc } from "@/lib/trpc";
import type { RouterInputs } from "@/server/api/root";

type Filter = { filter: "all" | "late" | "week"; category?: "NOTEBOOKS" };
const FILTERS: { label: string; value: Filter }[] = [
  { label: "Todos", value: { filter: "all" } },
  { label: "Em atraso", value: { filter: "late" } },
  { label: "Vencem esta semana", value: { filter: "week" } },
  { label: CATEGORY_LABEL.NOTEBOOKS, value: { filter: "all", category: "NOTEBOOKS" } },
];

function Stat({ label, value, danger }: { label: string; value: number | undefined; danger?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border bg-surface p-5", danger && (value ?? 0) > 0 ? "border-danger/40" : "border-line")}>
      <span className="eyebrow">{label}</span>
      <strong className={cn("font-mono text-3xl font-medium tracking-tight", danger && (value ?? 0) > 0 && "text-danger")}>
        {value ?? "—"}
      </strong>
    </div>
  );
}

export default function OpenLoansPage() {
  const utils = trpc.useUtils();
  const [active, setActive] = React.useState(0);
  const [error, setError] = React.useState<string>();
  const input: Omit<RouterInputs["loan"]["open"], "cursor"> = { ...FILTERS[active]!.value, limit: 20 };

  const stats = trpc.loan.stats.useQuery();
  const list = trpc.loan.open.useInfiniteQuery(input, { getNextPageParam: (l) => l.nextCursor });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  const giveBack = trpc.loan.return.useMutation({
    onSuccess: () => Promise.all([utils.loan.invalidate(), utils.equipment.invalidate()]),
    onError: (e) => setError(errorMessage(e)),
  });

  const forbidden = list.error?.data?.code === "FORBIDDEN";

  return (
    <div data-screen-label="05 Operações — empréstimos em aberto" className="flex flex-col gap-8">
      <PageHead
        eyebrow="Operações"
        title="Empréstimos em aberto"
        sub={stats.data ? `${stats.data.open} itens fora · atualizado agora` : undefined}
        action={
          <Link href="/operacoes/equipamentos/novo" className={buttonVariants({ variant: "primary" })}>
            <Plus /> Cadastrar equipamento
          </Link>
        }
      />

      {forbidden ? (
        <Empty title="Só Operações vê esta tela." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Em aberto" value={stats.data?.open} />
            <Stat label="Vencem em 3 dias" value={stats.data?.dueSoon} />
            <Stat label="Em atraso" value={stats.data?.late} danger />
            <Stat label="Em manutenção" value={stats.data?.maintenance} />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f, i) => (
              <Chip key={f.label} active={i === active} onClick={() => setActive(i)}>
                {f.label}
              </Chip>
            ))}
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          {list.isLoading ? (
            <div className="h-64 animate-pulse rounded-xl border border-line bg-surface" aria-busy />
          ) : rows.length === 0 ? (
            <Empty title="Nenhum empréstimo neste filtro." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <div className="min-w-[820px]">
                <div className="eyebrow grid grid-cols-[1.3fr_1.2fr_90px_90px_130px_110px] gap-4 bg-surface px-5 py-3">
                  <span>Colaborador</span>
                  <span>Item</span>
                  <span>Retirada</span>
                  <span>Prazo</span>
                  <span>Situação</span>
                  <span>Ação</span>
                </div>
                <ul className="divide-y divide-line">
                  {rows.map((r) => (
                    <li
                      key={r.id}
                      className={cn(
                        "grid grid-cols-[1.3fr_1.2fr_90px_90px_130px_110px] items-center gap-4 px-5 py-3.5 text-[13px]",
                        r.late && "bg-danger/[0.04]",
                      )}
                    >
                      <div className="flex min-w-0 flex-col">
                        <strong className="truncate font-medium">{r.person}</strong>
                        <span className="truncate text-xs text-subtle">{r.department}</span>
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{r.item}</span>
                        <span className="font-mono text-xs text-subtle">{r.patrimonio}</span>
                      </div>
                      <span className="font-mono text-muted">{formatDM(r.loanedAt)}</span>
                      <span className="font-mono text-muted">{formatDM(r.dueAt)}</span>
                      <span>
                        <Pill kind={r.late ? "late" : "ok"}>{r.late ? "Atrasado" : "No prazo"}</Pill>
                      </span>
                      <Button
                        size="sm"
                        variant={r.late ? "danger" : "secondary"}
                        disabled={giveBack.isPending}
                        onClick={() => {
                          setError(undefined);
                          giveBack.mutate({ loanId: r.id });
                        }}
                      >
                        Devolver
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-subtle">
            <span className="font-mono">
              {rows.length} de {stats.data?.open ?? "—"} empréstimos
            </span>
            {list.hasNextPage && (
              <Button size="sm" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                {list.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
