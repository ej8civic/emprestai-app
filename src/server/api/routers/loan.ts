import { z } from "zod";
import { adminProcedure, router, tenantProcedure } from "@/server/api/trpc";
import { CATEGORIES } from "@/lib/labels";
import { myLoans, openLoans, opsStats, requestLoan, returnLoan } from "@/server/services/loans";

export const loanRouter = router({
  request: tenantProcedure
    .input(z.object({ patrimonio: z.string().min(1).max(20) }))
    .mutation(({ ctx, input }) =>
      requestLoan(
        ctx.db,
        { tenantId: ctx.tenantId, membershipId: ctx.membership.id, userId: ctx.user.id },
        input.patrimonio,
      ),
    ),

  return: tenantProcedure.input(z.object({ loanId: z.string().uuid() })).mutation(({ ctx, input }) =>
    returnLoan(
      ctx.db,
      { tenantId: ctx.tenantId, membershipId: ctx.membership.id, userId: ctx.user.id, role: ctx.membership.role },
      input.loanId,
    ),
  ),

  mine: tenantProcedure.query(({ ctx }) => myLoans(ctx.db, ctx.tenantId, ctx.membership.id)),

  open: adminProcedure
    .input(
      z.object({
        filter: z.enum(["all", "late", "week"]).default("all"),
        category: z.enum(CATEGORIES).optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(({ ctx, input }) => openLoans(ctx.db, ctx.tenantId, input)),

  stats: adminProcedure.query(({ ctx }) => opsStats(ctx.db, ctx.tenantId)),
});
