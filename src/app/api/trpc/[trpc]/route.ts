import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/api/root";
import { createContext } from "@/server/api/trpc";
import { log } from "@/server/log";

export const maxDuration = 60;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ headers: req.headers }),
    onError({ error, path }) {
      if (error.code === "INTERNAL_SERVER_ERROR") log("error", "trpc.internal", { path, message: error.message });
    },
  });

export { handler as GET, handler as POST };
