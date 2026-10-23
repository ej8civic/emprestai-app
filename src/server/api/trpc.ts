import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";
import { db } from "@/server/db";
import { log } from "@/server/log";
import { supabaseServer } from "@/lib/supabase/server";

export async function createContext(opts: { headers: Headers }) {
  const requestId = opts.headers.get("x-request-id") ?? crypto.randomUUID();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;

  // O tenant sai da sessão, nunca do input (ADR-001).
  const membership = user ? await db.membership.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }) : null;
  return { db, requestId, user, membership };
}
export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        fieldErrors: error.cause instanceof ZodError ? z.flattenError(error.cause).fieldErrors : null,
      },
    };
  },
});

const logged = t.middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now();
  const result = await next();
  log(result.ok ? "info" : "warn", "trpc", {
    requestId: ctx.requestId,
    tenantId: ctx.membership?.tenantId,
    path,
    type,
    ok: result.ok,
    ms: Date.now() - start,
  });
  return result;
});

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure.use(logged);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Entre para continuar." });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Injeta tenant_id e o vínculo; todo service recebe o tenant daqui. */
export const tenantProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.membership) throw new TRPCError({ code: "FORBIDDEN", message: "Sem acesso a nenhuma área." });
  return next({ ctx: { ...ctx, membership: ctx.membership, tenantId: ctx.membership.tenantId } });
});

/** Operações: cadastro e balcão. */
export const adminProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (ctx.membership.role !== "OPERACOES") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Só Operações pode fazer isso." });
  }
  return next();
});
