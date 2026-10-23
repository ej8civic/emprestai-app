import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/env";

/** Cliente de servidor: o cookie de sessão é sempre httpOnly (ADR-001). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, { ...options, httpOnly: true });
        } catch {
          // Server Component: o middleware já renova a sessão.
        }
      },
    },
  });
}
