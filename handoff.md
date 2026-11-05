# Handoff

1. **Onde parei** — specs 003 e 004 prontas, verificadas (PRONTA nas duas) e conferidas em produção. Só falta marcar a entrega (tag).
2. **Commitado** — `main` no remoto `ejcivic` (github.com/ej8civic/emprestai-app), até o commit `72f467e` (verificar com `git log`). Nada pendente.
3. **Banco local** — não existe banco local configurado; os testes sobem Postgres em Testcontainers (Docker ligado).
4. **Publicado** — https://emprestai-app.vercel.app (Vercel pela integração Git; `main` publica). O GitHub Actions roda testes e `prisma migrate deploy` no Supabase `ggigxandixmotjktibgt` (`add_equipment_images` e `harden` aplicadas). Dados: 12 itens TI-0001 a TI-0012 com foto no bucket público `equipment-images`, professor, `operacoes@`, `teste@`, 0 empréstimos. Cadastro do Auth fechado (`disable_signup` true).
5. **NÃO fazer**
   - Não rodar seed, upload, migrate, `vercel` nem ler `.env`: `.claude/settings.json` bloqueia, e a regra da prática é "o agente não escreve em produção" (foi suspensa uma vez, por instrução do dono, e restaurada).
   - Não editar `prisma/migrations/*` já aplicadas; mudança de schema = migration nova, com o DDL mostrado antes (`rules/migration.md`).
   - Não escrever ADR: `docs/adr/001-stack.md` só tem uma "Proposta de emenda" (sharp, bucket, Pixabay) para o time decidir; o ADR-002 segue contrariado pelo redesign.
   - Não pôr `unsafe-inline` na CSP; o diálogo é `<dialog>` nativo.
   - Não rodar `e2e/smoke.mjs` nem `e2e/live-check.mjs` (dados antigos) em produção; `live-check-fluxo.mjs` ESCREVE, e só com `teste@`.
   - Não tocar na conta do professor (`marcelo.grilo@institutojef.org.br`): precisa chegar à correção com zero empréstimos. Nunca confirme um pedido com ela.
6. **Dados e imagens** — a lista dos 12 e as fotos com o manifesto ficam em `prisma/data/`; o script de reset em `prisma/ops/reset-producao.sql`.
7. **Verificar** — `npx vitest run` (62 testes), `npx tsc --noEmit`, `npm run build`. Em produção: `e2e/live-check-dados.mjs`, `live-check-catalogo.mjs` (leitura) e `live-check-fluxo.mjs` (escreve) passam; o fluxo foi rodado com as fotos fora do ar, e a parte de fotos foi conferida depois no Chrome.
8. **Decisões a confirmar** — CA-49 (colaborador não vê quem está com o item) e o `.claude/settings.json` foram iniciativa do agente.
9. **Próximo passo** — marque a entrega com `git tag entrega-pratica && git push origin entrega-pratica`.
