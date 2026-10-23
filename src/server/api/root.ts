import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createCallerFactory, router } from "@/server/api/trpc";
import { equipmentRouter } from "@/server/api/routers/equipment";
import { loanRouter } from "@/server/api/routers/loan";
import { meRouter } from "@/server/api/routers/me";

export const appRouter = router({
  equipment: equipmentRouter,
  loan: loanRouter,
  me: meRouter,
});

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export const createCaller = createCallerFactory(appRouter);
