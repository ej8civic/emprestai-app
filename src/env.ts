import { z } from "zod";

// Falha na subida em vez de `undefined` silencioso em produção (ADR-001).
const server = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
});

const client = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export const publicEnv = client.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export function serverEnv() {
  return server.parse(process.env);
}
