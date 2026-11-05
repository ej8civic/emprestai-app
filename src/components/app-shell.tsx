"use client";

import { MagnifyingGlass, SignOut } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { LimitMeter } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { trpc } from "@/lib/trpc";

const BASE_NAV = [
  { href: "/catalogo", label: "Catálogo", match: (p: string) => p.startsWith("/catalogo") },
  { href: "/meus-emprestimos", label: "Meus empréstimos", match: (p: string) => p.startsWith("/meus-emprestimos") },
];
const OPS_NAV = [
  { href: "/operacoes/emprestimos", label: "Em aberto", match: (p: string) => p.startsWith("/operacoes/emprestimos") },
  { href: "/operacoes/equipamentos/novo", label: "Cadastrar", match: (p: string) => p.startsWith("/operacoes/equipamentos") },
];

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  return (
    <form
      role="search"
      className="relative hidden w-64 md:block"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/catalogo?q=${encodeURIComponent(q.trim())}` : "/catalogo");
      }}
    >
      <MagnifyingGlass aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input
        aria-label="Buscar equipamento"
        placeholder="Buscar equipamento"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-9 w-full rounded-md border border-line-strong bg-bg pl-9 pr-3 text-sm placeholder:text-subtle hover:border-subtle focus-visible:border-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turbo-blue/40"
      />
    </form>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = trpc.me.get.useQuery();
  const isOps = me.data?.role === "OPERACOES";
  const nav = isOps ? [...BASE_NAV, ...OPS_NAV] : BASE_NAV;

  const initials = (me.data?.name ?? "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/catalogo" aria-label="EmpresTI — início">
            <Logo />
          </Link>
          <span aria-hidden className="hidden h-5 w-px rotate-12 bg-line-strong sm:block" />
          <nav aria-label="Principal" className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {nav.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
                    item.href.startsWith("/operacoes") && !active && "text-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <SearchBox />
          {me.data && (
            <div className="hidden items-center gap-3 lg:flex" title="Itens com você">
              <span className="font-mono text-xs text-muted">
                {me.data.openCount}/{me.data.maxItems}
              </span>
              <div className="w-14">
                <LimitMeter used={me.data.openCount} max={me.data.maxItems} />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span
              className="grid size-8 place-items-center rounded-full border border-line-strong bg-surface-2 text-[11px] font-semibold"
              title={me.data ? `${me.data.name} · ${me.data.department}` : undefined}
            >
              {initials || "··"}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
              <SignOut />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 text-xs text-subtle sm:px-6">
          <span className="font-mono">EmpresTI · v1</span>
          <span className="flex items-center gap-3">
            <span>3 itens por pessoa · 14 dias de prazo</span>
            <Link href="/creditos" className="underline underline-offset-4 hover:text-fg">
              Fotos: Pixabay
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
