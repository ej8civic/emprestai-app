import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { adminProcedure, router, tenantProcedure } from "@/server/api/trpc";
import { CATEGORIES } from "@/lib/labels";
import { createEquipmentInput } from "@/lib/schemas";
import { equipmentCounts, equipmentCredits, getEquipment, listEquipment } from "@/server/services/equipment";
import { audit, borrowDecision } from "@/server/services/loans";

export const equipmentRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        category: z.enum(CATEGORIES).optional(),
        onlyAvailable: z.boolean().optional(),
        q: z.string().trim().max(60).optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(60).default(24),
      }),
    )
    .query(({ ctx, input }) => listEquipment(ctx.db, ctx.tenantId, input, ctx.membership)),

  counts: tenantProcedure.query(({ ctx }) => equipmentCounts(ctx.db, ctx.tenantId)),

  credits: tenantProcedure.query(({ ctx }) => equipmentCredits(ctx.db, ctx.tenantId)),

  get: tenantProcedure.input(z.object({ patrimonio: z.string().min(1).max(20) })).query(async ({ ctx, input }) => {
    const item = await getEquipment(ctx.db, ctx.tenantId, input.patrimonio, ctx.membership);
    if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Equipamento não encontrado." });
    const { decision } = await borrowDecision(ctx.db, ctx.tenantId, ctx.membership.id, new Date());
    return {
      ...item,
      request: item.state !== "available" ? { allowed: false as const, reason: "STATE" as const } : decision.ok ? { allowed: true as const } : { allowed: false as const, reason: decision.reason },
    };
  }),

  create: adminProcedure.input(createEquipmentInput).mutation(async ({ ctx, input }) => {
    try {
      const item = await ctx.db.equipment.create({
        data: {
          tenantId: ctx.tenantId,
          name: input.name,
          category: input.category,
          patrimonio: input.patrimonio.toUpperCase(),
          serial: input.serial || null,
          pickupLocation: input.pickupLocation,
          status: input.status,
          notes: input.notes || null,
        },
      });
      await audit(ctx.db, {
        tenantId: ctx.tenantId,
        actorId: ctx.user.id,
        action: "equipment.create",
        resource: "equipment",
        resourceId: item.id,
      });
      return { patrimonio: item.patrimonio };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new TRPCError({ code: "CONFLICT", message: "Esse patrimônio já está cadastrado." });
      }
      throw e;
    }
  }),

  recent: adminProcedure.query(({ ctx }) =>
    ctx.db.equipment.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, name: true, patrimonio: true, createdAt: true },
    }),
  ),
});
