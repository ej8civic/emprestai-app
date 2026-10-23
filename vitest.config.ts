import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` lança fora do bundler do Next; no teste o servidor roda em Node puro.
      "server-only": path.resolve(__dirname, "src/test/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    testTimeout: 120_000,
    hookTimeout: 180_000,
    // Variáveis só para o `env.ts` não falhar na importação; nenhum teste fala com o Supabase.
    env: {
      DATABASE_URL: "postgresql://unused",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test",
    },
  },
});
