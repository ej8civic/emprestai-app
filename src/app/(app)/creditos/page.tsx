"use client";

import { Empty, PageHead } from "@/components/ui/primitives";
import { trpc } from "@/lib/trpc";

export default function CreditsPage() {
  const credits = trpc.equipment.credits.useQuery();

  return (
    <div data-screen-label="Créditos das fotos" className="flex flex-col gap-8">
      <PageHead
        eyebrow="Sobre"
        title="Créditos das fotos"
        sub="As fotos dos equipamentos vêm da Pixabay, sob a Pixabay Content License, e ficam hospedadas neste sistema."
      />
      <p className="text-sm text-muted">
        Banco de imagens:{" "}
        <a href="https://pixabay.com" target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-fg">
          pixabay.com
        </a>
      </p>

      {credits.isError ? (
        <Empty title="Não foi possível carregar os créditos." sub="Atualize a página." />
      ) : credits.isLoading ? (
        <div className="h-48 animate-pulse rounded-xl border border-line bg-surface" aria-busy />
      ) : credits.data?.length === 0 ? (
        <Empty title="Nenhuma foto cadastrada." sub="Os equipamentos sem foto mostram só o ícone." />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {credits.data?.map((c) => (
            <li key={c.patrimonio} className="grid gap-1 px-4 py-3 text-[13px] sm:grid-cols-[88px_1fr_auto] sm:items-center sm:gap-4">
              <span className="font-mono text-subtle">{c.patrimonio}</span>
              <span>
                {c.name} · foto de <strong className="font-medium">{c.author}</strong> ({c.license})
              </span>
              {c.sourceUrl && (
                <a href={c.sourceUrl} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-fg">
                  Ver na Pixabay
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
