# Plano 004

Restrições: ADR-001 (tRPC, services com `tenantProcedure`, índice parcial único), ADR-002 (3 itens, 14 dias; o redesign já o contraria, ver `handoff.md`), `rules/tests.md`.

A regra já existe (`src/server/domain/loan-rules.ts`, `src/server/services/loans.ts`, `loan.request`). O trabalho é: imagem no catálogo, crédito, e provar cada CA com teste que o cite.

1. `equipment.list` e `equipment.get` devolvem `image` e escondem o nome de quem está com o item, exceto para Operações e para o próprio dono (CA-49); devolvem `image` (`url`, `author`, `license`, `sourceUrl`). `EquipmentIcon` ganha foto 4:3 e mantém o ícone quando não há foto.
2. Catálogo e detalhe mostram a imagem; "Meus empréstimos" já mostra a data prevista.
3. Rota `/creditos` (somente leitura, exige sessão) e a linha "Fotos: Pixabay" no rodapé do catálogo.
4. CSP: `img-src` passa a aceitar o host do Storage do projeto (derivado de `NEXT_PUBLIC_SUPABASE_URL`), sem `unsafe-inline`.
5. Testes `test_ca_40_...` a `test_ca_48_...`: procedures por `createCaller`; CA-40 e CA-47 também em `e2e/live-check.mjs` (somente leitura em produção).
6. Os testes `test_prd_*` que já provam a mesma regra ficam; cada CA ganha o seu teste citando o ID, sem perder cobertura.

Risco: o `e2e/smoke.mjs` completo cria empréstimos e não roda em produção. Em produção só o `live-check.mjs`; as solicitações reais são feitas por você com `teste@`.

Provas em produção (rodadas por uma pessoa na T9, nunca pelo agente):
- `e2e/live-check-catalogo.mjs` (só leitura, conta `teste@`): CA-40, CA-41 (itens em manutenção), CA-47, CA-49.
- `e2e/live-check-fluxo.mjs` (escreve; `CONFIRM_PROD=sim`; só `teste@`): CA-42, CA-43, CA-46 e CA-41 depois do pedido; devolve tudo no fim.
- O CA-44 (atraso) só se prova por teste de servidor: não há como produzir um atraso real em produção sem esperar 14 dias.
- Não foi possível rodar a interface contra um Supabase local nesta sessão; as telas novas foram conferidas por `tsc`, `build` e pelos testes de servidor e de CSP, e a primeira olhada real fica para o script de produção.
