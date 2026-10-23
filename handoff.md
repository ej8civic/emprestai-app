# Handoff

1. **Onde parei** — spec 002, T7: criar o banco Supabase e aplicar migration + seed. T1–T6 prontas e verificadas.
2. **Commitado** — nada. Tudo no working tree da `main` (`git status`). `.env` foi tirado do índice (`git rm --cached`).
3. **Banco local** — nada aplicado. Containers `empresti-db` e `empresti-auth` (Docker) estão parados; só serviram de teste.
4. **Publicado** — nada. Sem projeto Supabase e sem projeto Vercel.
5. **NÃO fazer**
   - Não usar o `.env`: o projeto `vmlnbyldrcfzvxgcrdrc` foi apagado (o DNS não resolve).
   - O `.env` entrou no git no commit `5dc2065` com a senha do banco. Trocar a senha do projeto antigo, se ainda existir algum.
   - Não escrever ADR: `docs/adr/002-layout.md` está contrariado pelo redesign Vercel/Turborepo; o time decide a ADR nova.
   - Não pôr `unsafe-inline` na CSP. Radix não serve (usa `style.cssText`); o diálogo é `<dialog>` nativo.
   - Não reaproveitar `.seed-credentials.local-dev.txt`: são senhas do banco de teste local.
6. **Verificado local** — `npx tsc --noEmit` limpo; `npx vitest run` 28/28 (Docker ligado); `node e2e/smoke.mjs` 19/19, sem violação de CSP.
7. **Exceção desta sessão** — a pessoa autorizou, só para esta tarefa, deploy na Vercel e uso do Supabase remoto (contraria `rules/restrictions.md`, que segue valendo).
8. **Próximo passo** — com um projeto Supabase novo (região `sa-east-1`): preencher `.env.local`, rodar `npx prisma migrate deploy` e `npm run db:seed`, criar o projeto na Vercel, pôr as 4 variáveis (`.env.example`) em production e preview, e fazer o deploy.
