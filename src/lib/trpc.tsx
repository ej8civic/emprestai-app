"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import * as React from "react";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: false } },
        queryCache: new QueryCache({
          onError(error) {
            // Sessão expirou no meio da navegação.
            if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") {
              window.location.assign("/login");
            }
          },
        }),
      }),
  );
  const [client] = React.useState(() =>
    trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })] }),
  );
  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

/** Mensagem de erro de procedimento pronta para a tela. */
export function errorMessage(e: unknown): string {
  if (e instanceof TRPCClientError) return e.message;
  return "Algo deu errado. Tente de novo.";
}
