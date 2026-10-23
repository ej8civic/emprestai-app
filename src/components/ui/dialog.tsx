"use client";

import * as React from "react";

/**
 * Diálogo modal sobre o <dialog> nativo: foco preso, ESC e backdrop vêm do navegador.
 * Nada injeta <style> nem style="" em runtime, o que a CSP sem `unsafe-inline` (ADR-001) exige.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const id = React.useId();

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.documentElement.classList.toggle("overflow-hidden", open);
    return () => document.documentElement.classList.remove("overflow-hidden");
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      // ESC e dialog.close() disparam `close`; mantém o estado do React em sincronia.
      onClose={() => onOpenChange(false)}
      // Clique fora do conteúdo cai no próprio <dialog> (o padding é zero).
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-xl border-0 bg-surface p-0 text-fg shadow-pop backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p id={`${id}-desc`} className="text-sm text-muted">
          {description ?? title}
        </p>
        {children}
      </div>
    </dialog>
  );
}
