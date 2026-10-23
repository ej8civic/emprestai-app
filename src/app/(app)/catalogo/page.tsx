"use client";

import { Info } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { EquipmentIcon } from "@/components/equipment-icon";
import { Button } from "@/components/ui/button";
import { Card, Chip, Empty, PageHead, StatePill } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { formatDM } from "@/lib/date";
import { CATEGORIES, CATEGORY_LABEL, type CategoryKey } from "@/lib/labels";
import { trpc } from "@/lib/trpc";
import type { RouterOutputs } from "@/server/api/root";

type Item = RouterOutputs["equipment"]["list"]["items"][number];

function footer(e: Item) {
  if (e.state === "available") return "Solicitar →";
  if (e.state === "loaned") return `Com ${e.holderName} · devolve ${e.dueAt ? formatDM(e.dueAt) : "—"}`;
  if (e.state === "maintenance") return "Na assistência · peça";
  return "Fora de uso";
}

function EquipmentCard({ e }: { e: Item }) {
  const body = (
    <Card
      className={cn(
        "flex h-full min-h-44 flex-col gap-4 p-5 transition-colors",
        e.state === "available" && "group-hover:border-subtle group-hover:bg-surface-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <EquipmentIcon category={e.category} />
        <StatePill state={e.state} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-medium tracking-tight">{e.name}</span>
        <span className="font-mono text-xs text-subtle">
          {CATEGORY_LABEL[e.category]} · {e.patrimonio}
        </span>
      </div>
      <span className={cn("mt-auto text-[13px]", e.state === "available" ? "text-fg" : "text-subtle")}>{footer(e)}</span>
    </Card>
  );
  // Só o que está disponível leva ao pedido; os outros ficam como informação.
  return e.state === "available" ? (
    <Link href={`/catalogo/${e.patrimonio}`} className="group rounded-xl">
      {body}
    </Link>
  ) : (
    <Link href={`/catalogo/${e.patrimonio}`} className="group rounded-xl opacity-80 hover:opacity-100">
      {body}
    </Link>
  );
}

function CatalogView() {
  const params = useSearchParams();
  const q = params.get("q") ?? undefined;
  const [category, setCategory] = React.useState<CategoryKey>();
  const [onlyAvailable, setOnlyAvailable] = React.useState(false);

  const counts = trpc.equipment.counts.useQuery();
  const list = trpc.equipment.list.useInfiniteQuery(
    { category, onlyAvailable, q, limit: 24 },
    { getNextPageParam: (last) => last.nextCursor },
  );
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div data-screen-label="02 Catálogo" className="flex flex-col gap-8">
      <PageHead
        eyebrow="Colaborador"
        title="Catálogo"
        sub={counts.data ? `${counts.data.total} equipamentos · ${counts.data.available} disponíveis agora` : "Carregando…"}
      />

      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
        <div className="flex flex-col gap-0.5 text-sm">
          <strong className="font-medium">Regras de empréstimo</strong>
          <span className="text-muted">
            Até 3 itens por pessoa. Prazo padrão 14 dias. Atraso impede novo pedido. Item em manutenção não aparece como
            disponível.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip active={!category} onClick={() => setCategory(undefined)}>
          Todos
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {CATEGORY_LABEL[c]}
          </Chip>
        ))}
        <span className="grow" />
        <Chip active={onlyAvailable} onClick={() => setOnlyAvailable((v) => !v)}>
          Só disponíveis
        </Chip>
      </div>

      {q && (
        <p className="text-sm text-muted">
          Busca: <span className="font-mono text-fg">{q}</span> ·{" "}
          <Link href="/catalogo" className="underline underline-offset-4 hover:text-fg">
            limpar
          </Link>
        </p>
      )}

      {list.isError ? (
        <Empty title="Não foi possível carregar o catálogo." sub="Atualize a página." />
      ) : list.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty title="Nenhum equipamento encontrado." sub="Troque o filtro ou a busca." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <EquipmentCard key={e.id} e={e} />
          ))}
        </div>
      )}

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <React.Suspense>
      <CatalogView />
    </React.Suspense>
  );
}
