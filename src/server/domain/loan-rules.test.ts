import { describe, expect, it } from "vitest";
import { canBorrow, dueDateFrom, elapsedRatio, isDueSoon, LOAN_DAYS, MAX_ITEMS } from "./loan-rules";

const now = new Date("2026-09-28T12:00:00Z");
const day = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(now.getTime() + n * day);

describe("regras de empréstimo (PRD)", () => {
  it("test_prd_prazo_padrao_14_dias", () => {
    expect(dueDateFrom(now)).toEqual(inDays(LOAN_DAYS));
    expect(LOAN_DAYS).toBe(14);
  });

  it("test_prd_limite_3_itens", () => {
    expect(canBorrow([{ dueAt: inDays(5) }, { dueAt: inDays(6) }], now)).toEqual({ ok: true });
    const three = Array.from({ length: MAX_ITEMS }, () => ({ dueAt: inDays(5) }));
    expect(canBorrow(three, now)).toEqual({ ok: false, reason: "LIMIT" });
  });

  it("test_prd_atraso_bloqueia_novo_emprestimo", () => {
    expect(canBorrow([{ dueAt: inDays(-1) }], now)).toEqual({ ok: false, reason: "OVERDUE" });
  });

  it("test_prd_atraso_vence_limite_na_razao", () => {
    const three = [{ dueAt: inDays(-2) }, { dueAt: inDays(3) }, { dueAt: inDays(4) }];
    expect(canBorrow(three, now)).toEqual({ ok: false, reason: "OVERDUE" });
  });

  it("vence em 3 dias inclui hoje e exclui atrasado", () => {
    expect(isDueSoon({ dueAt: inDays(3) }, now)).toBe(true);
    expect(isDueSoon({ dueAt: inDays(4) }, now)).toBe(false);
    expect(isDueSoon({ dueAt: inDays(-1) }, now)).toBe(false);
  });

  it("razão do prazo fica entre 0 e 1", () => {
    expect(elapsedRatio({ loanedAt: now, dueAt: inDays(14) }, inDays(7))).toBeCloseTo(0.5);
    expect(elapsedRatio({ loanedAt: now, dueAt: inDays(14) }, inDays(30))).toBe(1);
    expect(elapsedRatio({ loanedAt: now, dueAt: inDays(14) }, inDays(-5))).toBe(0);
  });
});
