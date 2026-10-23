# Plano 002

Restringido por: ADR-001 (inteiro), spec 002.

1. Schema Prisma + migration SQL à mão (DDL do `migrate diff` + RLS, índice parcial, trigger de auditoria). Sem shadow DB: `auth.uid()` não existe nele.
2. Regras do PRD em funções puras (`server/domain/loan-rules.ts`).
3. tRPC: `createContext` (sessão → membership → tenant), `protectedProcedure` → `tenantProcedure` → `adminProcedure`; services; routers.
4. Auth: `@supabase/ssr`, middleware (renova sessão, CSP com nonce), login/logout em Route Handler para o cookie sair `httpOnly`.
5. UI: tokens, componentes, as seis telas sobre `trpc`.
6. Testes: regras puras; procedimentos + RLS contra Postgres real (Testcontainers); fumaça de navegador (`e2e/smoke.mjs`).
7. Seed idempotente; deploy.

Decisão tomada no plano: diálogo sobre `<dialog>` nativo, não Radix. O Radix cria elementos com `style.cssText`, que a CSP sem `unsafe-inline` bloqueia.
