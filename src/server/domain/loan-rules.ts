// Regras que Operações já decidiu (docs/PRD.md). Funções puras: sem banco, sem relógio global.
export const MAX_ITEMS = 3;
export const LOAN_DAYS = 14;
export const DUE_SOON_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export type OpenLoan = { dueAt: Date };

export type BorrowDecision =
  | { ok: true }
  | { ok: false; reason: "LIMIT" | "OVERDUE" };

export function isOverdue(loan: OpenLoan, now: Date): boolean {
  return loan.dueAt.getTime() < now.getTime();
}

export function dueDateFrom(now: Date): Date {
  return new Date(now.getTime() + LOAN_DAYS * DAY_MS);
}

/** Atraso bloqueia antes do limite: é a razão que Operações precisa ver primeiro. */
export function canBorrow(open: OpenLoan[], now: Date): BorrowDecision {
  if (open.some((l) => isOverdue(l, now))) return { ok: false, reason: "OVERDUE" };
  if (open.length >= MAX_ITEMS) return { ok: false, reason: "LIMIT" };
  return { ok: true };
}

export function isDueSoon(loan: OpenLoan, now: Date): boolean {
  const left = loan.dueAt.getTime() - now.getTime();
  return left >= 0 && left <= DUE_SOON_DAYS * DAY_MS;
}

/** Fração do prazo já consumida, 0..1. */
export function elapsedRatio(loan: { loanedAt: Date; dueAt: Date }, now: Date): number {
  const total = loan.dueAt.getTime() - loan.loanedAt.getTime();
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - loan.loanedAt.getTime()) / total));
}
