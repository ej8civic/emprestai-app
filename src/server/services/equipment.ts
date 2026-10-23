import type { Category, EquipmentStatus, Prisma, PrismaClient } from "@prisma/client";
import type { EquipmentState } from "@/lib/labels";

type Db = PrismaClient | Prisma.TransactionClient;

export function stateOf(status: EquipmentStatus, hasOpenLoan: boolean): EquipmentState {
  if (status === "MAINTENANCE") return "maintenance";
  if (status === "RETIRED") return "retired";
  return hasOpenLoan ? "loaned" : "available";
}

export async function listEquipment(
  db: Db,
  tenantId: string,
  input: { category?: Category; onlyAvailable?: boolean; q?: string; cursor?: string; limit: number },
) {
  const where: Prisma.EquipmentWhereInput = {
    tenantId,
    status: input.onlyAvailable ? "AVAILABLE" : { not: "RETIRED" },
    ...(input.category && { category: input.category }),
    ...(input.onlyAvailable && { loans: { none: { returnedAt: null } } }),
    ...(input.q && {
      OR: [
        { name: { contains: input.q, mode: "insensitive" } },
        { patrimonio: { contains: input.q, mode: "insensitive" } },
      ],
    }),
  };
  const rows = await db.equipment.findMany({
    where,
    include: {
      loans: { where: { returnedAt: null }, take: 1, include: { membership: { select: { name: true } } } },
    },
    orderBy: { patrimonio: "asc" },
    take: input.limit + 1,
    ...(input.cursor && { cursor: { id: input.cursor } }),
  });
  const next = rows.length > input.limit ? rows.pop() : undefined;
  return {
    items: rows.map((e) => {
      const open = e.loans[0];
      return {
        id: e.id,
        patrimonio: e.patrimonio,
        name: e.name,
        category: e.category,
        state: stateOf(e.status, Boolean(open)),
        holderName: open?.membership.name ?? null,
        dueAt: open?.dueAt ?? null,
      };
    }),
    nextCursor: next?.id,
  };
}

export async function equipmentCounts(db: Db, tenantId: string) {
  const [total, available] = await Promise.all([
    db.equipment.count({ where: { tenantId, status: { not: "RETIRED" } } }),
    db.equipment.count({ where: { tenantId, status: "AVAILABLE", loans: { none: { returnedAt: null } } } }),
  ]);
  return { total, available };
}

export async function getEquipment(db: Db, tenantId: string, patrimonio: string) {
  const e = await db.equipment.findUnique({
    where: { tenantId_patrimonio: { tenantId, patrimonio } },
    include: {
      loans: { orderBy: { loanedAt: "desc" }, take: 6, include: { membership: { select: { name: true } } } },
    },
  });
  if (!e) return null;
  const open = e.loans.find((l) => l.returnedAt === null);
  const lastReturn = e.loans.find((l) => l.returnedAt !== null);
  return {
    id: e.id,
    patrimonio: e.patrimonio,
    name: e.name,
    category: e.category,
    description: e.description,
    pickupLocation: e.pickupLocation,
    serial: e.serial,
    state: stateOf(e.status, Boolean(open)),
    holderName: open?.membership.name ?? null,
    dueAt: open?.dueAt ?? null,
    lastReturnAt: lastReturn?.returnedAt ?? null,
    history: e.loans.map((l) => ({ id: l.id, loanedAt: l.loanedAt, dueAt: l.dueAt, returnedAt: l.returnedAt })),
  };
}
