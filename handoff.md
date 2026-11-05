# Handoff

1. **Onde parei** — specs 003 e 004 prontas e verificadas (PRONTA nas duas). Falta só o passo humano T9 (seção 6) e a tag.
2. **Commitado** — `main` no remoto `ejcivic` (github.com/ej8civic/emprestai-app), até o commit `67a8507` (verificar com `git log`). Nada pendente, só o `ENTREGA.md` e este arquivo desta rodada.
3. **Banco local** — não existe banco local configurado; os testes sobem Postgres em Testcontainers (Docker ligado).
4. **Publicado** — produção: https://emprestai-app.vercel.app (Vercel pela integração Git; `main` publica). O GitHub Actions roda testes e `prisma migrate deploy` no Supabase `ggigxandixmotjktibgt`; a migration `add_equipment_images` já foi aplicada. **Os dados de produção ainda são os de demonstração antigos** (8 usuários, 8 empréstimos, 12 itens PAT-xxxx, sem fotos).
5. **NÃO fazer**
   - Não rodar seed, upload, migrate, `vercel` nem ler `.env`: `.claude/settings.json` bloqueia, e a regra da prática é "o agente não escreve em produção".
   - Não editar `prisma/migrations/*` já aplicadas. Mudança de schema = migration nova, com o DDL mostrado antes (`rules/migration.md`). A `harden` está **proposta e não aprovada**.
   - Não escrever ADR: o `docs/adr/001-stack.md` tem só uma "Proposta de emenda" (sharp, bucket, Pixabay) para o time decidir; o ADR-002 segue contrariado pelo redesign.
   - Não pôr `unsafe-inline` na CSP; o diálogo é `<dialog>` nativo.
   - Não rodar `e2e/smoke.mjs` nem `e2e/live-check.mjs` (dados antigos) em produção; `live-check-fluxo.mjs` ESCREVE e só a pessoa roda, com `teste@`.
   - Não tocar na conta do professor (`marcelo.grilo@institutojef.org.br`): precisa chegar à correção com zero empréstimos.
6. **T9, feito por uma pessoa, nesta ordem** — `pratica-sa-051126/scripts/reset-producao.sql` no SQL Editor; `upload.mjs` (`SUPABASE_SERVICE_ROLE_KEY` e `CONFIRM_PROD=sim` no terminal); `PROFESSOR_PASSWORD=... CONFIRM_PROD=sim npm run db:seed`; depois `e2e/live-check-dados.mjs`, `live-check-catalogo.mjs`, `live-check-fluxo.mjs`.
7. **Também de uma pessoa** — fechar o cadastro no painel do Supabase; decidir a `harden`; `git tag entrega-pratica && git push origin entrega-pratica` (só depois do T9).
8. **Verificar** — `npx vitest run` (61 testes), `npx tsc --noEmit` e `npm run build` passam. Os três scripts `live-check-*` **nunca foram executados**.
9. **Decisões a confirmar** — CA-49 (colaborador não vê quem está com o item) e o `.claude/settings.json` foram iniciativa do agente; ver seção 2 do `ENTREGA.md`.
10. **Próximo passo** — rode o T9 e me diga o resultado dos três `live-check-*`.
