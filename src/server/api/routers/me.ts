import { router, tenantProcedure } from "@/server/api/trpc";
import { borrowDecision } from "@/server/services/loans";
import { MAX_ITEMS } from "@/server/domain/loan-rules";

export const meRouter = router({
  get: tenantProcedure.query(async ({ ctx }) => {
    const { open, overdue } = await borrowDecision(ctx.db, ctx.tenantId, ctx.membership.id, new Date());
    const m = ctx.membership;
    return {
      name: m.name,
      email: m.email,
      department: m.department,
      role: m.role,
      openCount: open,
      maxItems: MAX_ITEMS,
      overdue,
    };
  }),
});
