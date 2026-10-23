import { cn } from "@/lib/cn";

/** Marca: anel vermelho→azul (referência ao Turborepo) com um ponto de "item emprestado". */
export function Logo({ className, withWord = true }: { className?: string; withWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id="logo-g" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff1e56" />
            <stop offset="0.55" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#0096ff" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="9.25" stroke="url(#logo-g)" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="3.25" fill="#ededed" />
      </svg>
      {withWord && <span>EmpresTI</span>}
    </span>
  );
}
