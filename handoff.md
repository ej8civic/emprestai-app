# Handoff

1. **Onde parei** — spec 002 completa (T1–T8). Falta só fechar o signup e aprovar o DDL `harden` (item 6).
2. **Commitado** — `main` no remote `ejcivic` (github.com/ej8civic/emprestai-app).
3. **Banco remoto** — projeto Supabase "school stuff" (`ggigxandixmotjktibgt`, us-east-1). Migration `20261023000000_init` aplicada; seed rodado (1 tenant, 8 usuários, 12 itens, 8 empréstimos). Login real testado.
4. **Publicado** — https://emprestai-app.vercel.app (projeto Vercel `emprestai-app`, conta pessoal, deploy por upload da CLI; sem git conectado). Variáveis em production e preview; DATABASE_URL e DIRECT_URL como sensíveis.
5. **NÃO fazer**
   - Não editar a migration `init`: já está no banco. Mudança de schema = migration nova, com o DDL mostrado antes (`rules/migration.md`).
   - Não escrever ADR: `docs/adr/002-layout.md` está contrariado pelo redesign; o time decide.
   - Não pôr `unsafe-inline` na CSP. O diálogo é `<dialog>` nativo porque o Radix usa `style.cssText`.
   - Não confundir `.seed-credentials.txt` (banco remoto) com `.seed-credentials.local-dev.txt` (teste local). Ambos ignorados pelo git.
   - Senha do banco tem `@`: na URL vai como `%40`.
6. **Pendências de segurança no Supabase**
   - Signup está ABERTO (`disable_signup:false`); o ADR-001 exige fechado. Só pelo painel: Authentication > Sign In / Providers.
   - `_prisma_migrations` sem RLS e `audit_log_append_only` sem `search_path`: migration `harden` proposta, aguardando aprovação do DDL.
   - Proteção contra senha vazada: painel (depende do plano).
7. **Verificado** — `tsc` limpo; `vitest` 28/28; `e2e/smoke.mjs` 19/19 (stack local); `e2e/live-check.mjs` 7/7 na URL pública (só leitura; NÃO rodar o smoke completo em produção: ele cadastra e empresta de verdade); bundle do cliente sem segredo.
8. **Exceção desta sessão** — deploy e Supabase remoto autorizados só para esta tarefa (`rules/restrictions.md` segue valendo).
9. **Próximo passo** — fechar o signup no painel do Supabase; aprovar o DDL `harden`; depois conectar o repositório na Vercel para o push publicar (hoje o deploy é manual: `npx vercel deploy --prod`).
