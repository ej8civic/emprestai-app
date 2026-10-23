import { Prisma, type Category, type PrismaClient, type Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { canBorrow, dueDateFrom, isDueSoon, isOverdue } from "@/server/domain/loan-rules";

type Db = PrismaClient | Prisma.TransactionClient;

const REASON: Record<"LIMIT" | "OVERDUE", string> = {
  LIMIT: "Limite de 3 itens atingido.",
  OVERDUE: "Bloqueado por atraso.",
};

export async function audit(
  db: Db,
  a: { tenantId: string; actorId: string; action: string; resource: string; resourceId: string },
) {
  await db.auditLog.create({ data: a });
}

export async function borrowDecision(db: Db, tenantId: string, membershipId: string, now: Date) {
  const open = await db.loan.findMany({ where: { tenantId, membershipId, returnedAt: null }, select: { dueAt: true } });
  return { open: open.length, decision: canBorrow(open, now), overdue: open.some((l) => isOverdue(l, now)) };
}

export async function requestLoan(
  db: PrismaClient,
  ctx: { tenantId: string; membershipId: string; userId: string },
  patrimonio: string,
  now = new Date(),
) {
  try {
    return await db.$transaction(async (tx) => {
      const equipment = await tx.equipment.findUnique({
        where: { tenantId_patrimonio: { tenantId: ctx.tenantId, patrimonio } },
        include: { loans: { where: { returnedAt: null }, select: { id: true } } },
      });
      if (!equipment) throw new TRPCError({ code: "NOT_FOUND", message: "Equipamento não encontrado." });
      if (equipment.status !== "AVAILABLE" || equipment.loans.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Equipamento indisponível." });
      }
      const { decision } = await borrowDecision(tx, ctx.tenantId, ctx.membershipId, now);
      if (!decision.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: REASON[decision.reason] });

      const loan = await tx.loan.create({
        data: {
          tenantId: ctx.tenantId,
          equipmentId: equipment.id,
          membershipId: ctx.membershipId,
          loanedAt: now,
          dueAt: dueDateFrom(now),
        },
      });
      await audit(tx, {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "loan.request",
        resource: "loan",
        resourceId: loan.id,
      });
      return { id: loan.id, dueAt: loan.dueAt };
    });
  } catch (e) {
    // Dois pedidos simultâneos para o mesmo item: o índice parcial barra o segundo.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new TRPCError({ code: "CONFLICT", message: "Equipamento indisponível." });
    }
    throw e;
  }
}

export async function returnLoan(
  db: PrismaClient,
  ctx: { tenantId: string; membershipId: string; userId: string; role: Role },
  loanId: string,
  now = new Date(),
) {
  const loan = await db.loan.findFirst({ where: { id: loanId, tenantId: ctx.tenantId, returnedAt: null } });
  if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Empréstimo não encontrado." });
  if (loan.membershipId !== ctx.membershipId && ctx.role !== "OPERACOES") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esse item não está com você." });
  }
  await db.$transaction([
    db.loan.update({ where: { id: loan.id }, data: { returnedAt: now } }),
    db.auditLog.create({
      data: { tenantId: ctx.tenantId, actorId: ctx.userId, action: "loan.return", resource: "loan", resourceId: loan.id },
    }),
  ]);
  return { id: loan.id };
}

export async function myLoans(db: Db, tenantId: string, membershipId: string) {
  const [open, history] = await Promise.all([
    db.loan.findMany({
      where: { tenantId, membershipId, returnedAt: null },
      orderBy: { dueAt: "asc" },
      include: { equipment: { select: { patrimonio: true, name: true, category: true } } },
    }),
    db.loan.findMany({
      where: { tenantId, membershipId, returnedAt: { not: null } },
      orderBy: { returnedAt: "desc" },
      take: 10,
      include: { equipment: { select: { name: true } } },
    }),
  ]);
  return {
    open: open.map((l) => ({
      id: l.id,
      patrimonio: l.equipment.patrimonio,
      name: l.equipment.name,
      category: l.equipment.category,
      loanedAt: l.loanedAt,
      dueAt: l.dueAt,
    })),
    history: history.map((l) => {
      const returnedAt = l.returnedAt as Date;
      return { id: l.id, name: l.equipment.name, loanedAt: l.loanedAt, returnedAt, late: returnedAt > l.dueAt };
    }),
  };
}

export type OpsFilter = "all" | "late" | "week";

export async function openLoans(
  db: Db,
  tenantId: string,
  input: { filter: OpsFilter; category?: Category; cursor?: string; limit: number },
  now = new Date(),
) {
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const rows = await db.loan.findMany({
    where: {
      tenantId,
      returnedAt: null,
      ...(input.filter === "late" && { dueAt: { lt: now } }),
      ...(input.filter === "week" && { dueAt: { gte: now, lte: weekAhead } }),
      ...(input.category && { equipment: { category: input.category } }),
    },
    orderBy: [{ dueAt: "asc" }, { id: "asc" }],
    take: input.limit + 1,
    ...(input.cursor && { cursor: { id: input.cursor } }),
    include: {
      equipment: { select: { name: true, patrimonio: true } },
      membership: { select: { name: true, department: true } },
    },
  });
  const next = rows.length > input.limit ? rows.pop() : undefined;
  return {
    items: rows.map((l) => ({
      id: l.id,
      person: l.membership.name,
      department: l.membership.department,
      item: l.equipment.name,
      patrimonio: l.equipment.patrimonio,
      loanedAt: l.loanedAt,
      dueAt: l.dueAt,
      late: isOverdue(l, now),
    })),
    nextCursor: next?.id,
  };
}

export async function opsStats(db: Db, tenantId: string, now = new Date()) {
  const [open, maintenance] = await Promise.all([
    db.loan.findMany({ where: { tenantId, returnedAt: null }, select: { dueAt: true } }),
    db.equipment.count({ where: { tenantId, status: "MAINTENANCE" } }),
  ]);
  return {
    open: open.length,
    dueSoon: open.filter((l) => isDueSoon(l, now)).length,
    late: open.filter((l) => isOverdue(l, now)).length,
    maintenance,
  };
}
