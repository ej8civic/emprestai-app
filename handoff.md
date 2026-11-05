# Handoff

1. **Onde parei** — specs 003 e 004 prontas e verificadas (PRONTA nas duas). Falta só o passo humano T9 (seção 6) e a tag.
2. **Commitado** — `main` no remoto `ejcivic` (github.com/ej8civic/emprestai-app), até o commit `67a8507` (verificar com `git log`). Nada pendente, só o `ENTREGA.md` e este arquivo desta rodada.
3. **Banco local** — não existe banco local configurado; os testes sobem Postgres em Testcontainers (Docker ligado).
4. **Publicado** — produção: https://emprestai-app.vercel.app (Vercel pela integração Git; `main` publica). O GitHub Actions roda testes e `prisma migrate deploy` no Supabase `ggigxandixmotjktibgt`; `add_equipment_images` e `harden` aplicadas. **Dados:** reset e seed feitos (12 itens TI-xxxx, professor, `operacoes@`, `teste@`, 0 empréstimos). **As 12 fotos ainda não foram enviadas ao Storage.**
5. **NÃO fazer**
   - Não rodar seed, upload, migrate, `vercel` nem ler `.env`: `.claude/settings.json` bloqueia, e a regra da prática é "o agente não escreve em produção".
   - Não editar `prisma/migrations/*` já aplicadas. Mudança de schema = migration nova, com o DDL mostrado antes (`rules/migration.md`). A `harden` já foi aprovada e aplicada.
   - Não escrever ADR: o `docs/adr/001-stack.md` tem só uma "Proposta de emenda" (sharp, bucket, Pixabay) para o time decidir; o ADR-002 segue contrariado pelo redesign.
   - Não pôr `unsafe-inline` na CSP; o diálogo é `<dialog>` nativo.
   - Não rodar `e2e/smoke.mjs` nem `e2e/live-check.mjs` (dados antigos) em produção; `live-check-fluxo.mjs` ESCREVE e só a pessoa roda, com `teste@`.
   - Não tocar na conta do professor (`marcelo.grilo@institutojef.org.br`): precisa chegar à correção com zero empréstimos.
6. **Falta enviar as fotos** — `SUPABASE_SERVICE_ROLE_KEY=... CONFIRM_PROD=sim node pratica-sa-051126/skills/imagens-equipamentos/scripts/upload.mjs` (o agente não tem a chave); depois repetir `e2e/live-check-dados.mjs` e `live-check-catalogo.mjs`. `live-check-fluxo.mjs` já passa.
7. **Também de uma pessoa** — fechar o cadastro no painel do Supabase (`disable_signup` ainda `false`); `git tag entrega-pratica && git push origin entrega-pratica` (só depois do envio das fotos).
8. **Verificar** — `npx vitest run` (62 testes), `npx tsc --noEmit` e `npm run build` passam. Os `live-check-*` rodaram em produção; só as fotos (CA-32, CA-40) falham até o envio.
9. **Decisões a confirmar** — CA-49 (colaborador não vê quem está com o item) e o `.claude/settings.json` foram iniciativa do agente; ver seção 2 do `ENTREGA.md`.
10. **Próximo passo** — envie as 12 fotos ao Storage e rode de novo `live-check-dados.mjs` e `live-check-catalogo.mjs`.
