# Tabelas do verificador-spec

Quatro rodadas, copiadas como o verificador as devolveu (sem edição). Em todas, o verificador foi aberto como agente novo, com a instrução "Aja conforme `pratica-sa-051126/agents/verificador-spec.md`" (plano B do `AGENTS.md`: nesta sessão o Claude Code não listou o subagente, que só é lido ao iniciar).

## Spec 003 · rodada 1 · NÃO PRONTA (commits a8563a6..f63d985)

| CA | evidência (arquivo:linha do teste) | status | observação |
|---|---|---|---|
| CA-30 | `src/server/seed.test.ts:56` (`test_ca_30_os_12_equipamentos_da_lista_e_so_eles`); `src/server/api/procedures.test.ts:147` (formato `AA-0000`) | ATENDIDO | Os 12 itens (patrimônio, nome, categoria) são comparados com uma lista escrita à mão, e todos estão no tenant `suporte_ti`. |
| CA-31 | `src/server/seed.test.ts:62` | ATENDIDO | Manutenção só em TI-0004, TI-0007 e TI-0010; 9 disponíveis. |
| CA-32 | `src/server/seed.test.ts:68`; `pratica-sa-051126/skills/imagens-equipamentos/scripts/upload.test.ts:54` | SEM TESTE | Os testes provam o formato da `image_url` e a checagem HEAD do `upload.mjs` com `fetch` simulado. Nenhum teste ou script em `e2e/` abre a URL pública real sem login. Isso depende do passo humano em produção (T9). |
| CA-33 | `pratica-sa-051126/skills/imagens-equipamentos/scripts/verify.test.ts:42` | ATENDIDO | `verify.mjs` lê as dimensões do arquivo. O teste usa imagens de fixture, não as 12 reais. |
| CA-34 | `pratica-sa-051126/skills/imagens-equipamentos/scripts/verify.test.ts:51` | ATENDIDO | Recusa foto repetida por hash e por id de origem. |
| CA-35 | `src/server/seed.test.ts:74`; `pratica-sa-051126/skills/imagens-equipamentos/scripts/verify.test.ts:61` | ATENDIDO | Fonte, autor, licença e URL de origem estão no banco e no manifesto. |
| CA-36 | `src/server/seed.test.ts:44` e `:131`; `pratica-sa-051126/skills/imagens-equipamentos/scripts/upload.test.ts:42` | ATENDIDO | Duas execuções do seed não duplicam equipamento, usuário, vínculo nem identidade. O upload usa os mesmos 12 objetos com `upsert`. |
| CA-37 | `src/server/seed.test.ts:82` e `:94` | SEM TESTE | O teste prova o hash da senha, o papel COLABORADOR, o tenant, a ausência de senha no código e a recusa do seed sem `PROFESSOR_PASSWORD`. O trecho "entra pelo login" e o login no link da Vercel não têm teste nem script `e2e/` que cite o CA. Isso depende do passo humano (T9). |
| CA-38 | `src/server/seed.test.ts:103` | ATENDIDO | O seed cria 0 empréstimos, e o professor tem 0. |
| CA-39 | `src/server/seed.test.ts:109`; `pratica-sa-051126/skills/imagens-equipamentos/scripts/upload.test.ts:22`, `:28`, `:35`, `:59` | ATENDIDO | As travas (`SUPABASE_SERVICE_ROLE_KEY` e `CONFIRM_PROD=sim`) recusam sem fazer nenhum pedido. Que o agente consegue preparar as imagens com `PIXABAY_API_KEY` não tem teste. |
| CA-3A | `pratica-sa-051126/skills/imagens-equipamentos/scripts/verify.test.ts:72` | ATENDIDO | O teste prova só que o registro `revisao: aprovada` é obrigatório. Que as fotos não têm pessoa, marca ou texto não é verificável por script e depende da revisão humana. |

Checks: npx vitest run → passou (5 arquivos, 49 testes)
Checks: npx tsc --noEmit → passou
Checks: npx next build → passou
Testes alterados por você: nenhum
Fora de escopo: `.claude/settings.json` (regras `deny` novas, não pedidas pela spec); `src/app/(app)/operacoes/equipamentos/novo/page.tsx` (placeholder `PAT-0000` virou `TI-0000`); `.claude/skills/imagens-equipamentos/SKILL.md` (cópia da skill). Os dois primeiros não estão no escopo da spec nem no plano. As contas `operacoes@` e `teste@empresti.example` estão na tabela de decisões da spec.
Veredito: NÃO PRONTA — CA-32 e CA-37 estão SEM TESTE (abrir a URL pública sem login; login do professor), dependem do passo humano T9 e não têm script em `e2e/` que os cite.

Correção feita pelo agente principal (o verificador não corrige): `e2e/live-check-dados.mjs` e três linhas novas na tabela de decisões da spec 003 — commit 85fef74.

## Spec 003 · rodada 2 · PRONTA (commits a8563a6..85fef74)

| CA | evidência (arquivo:linha do teste) | status | observação |
|---|---|---|---|
| CA-30 | `src/server/seed.test.ts:56` (`test_ca_30_os_12_equipamentos_da_lista_e_so_eles`); `src/server/api/procedures.test.ts:147` (formato `TI-0001`); `e2e/live-check-dados.mjs:59` (catálogo com 12, em produção) | ATENDIDO | Os testes cobrem os 12 itens e o tenant `suporte_ti`. A conferência em produção é do script e2e, rodado por uma pessoa na T9. |
| CA-31 | `src/server/seed.test.ts:62` | ATENDIDO | Manutenção só em TI-0004, TI-0007 e TI-0010; 9 disponíveis. |
| CA-32 | `src/server/seed.test.ts:68` (`image_url`); `pratica-sa-051126/skills/imagens-equipamentos/scripts/upload.test.ts:54`; `e2e/live-check-dados.mjs:29-46` (abre sem login, JPEG 800x600, 12 hashes distintos) | ATENDIDO | O script e2e cita o CA e foi escrito para a prova em produção, mas nunca foi rodado. A abertura sem login no bucket público ainda depende da T9 (pessoa). |
| CA-33 | `pratica-sa-051126/skills/imagens-equipamentos/scripts/verify.test.ts:42` | ATENDIDO | `verify.mjs` lê as dimensões do arquivo e recusa tamanho diferente de 800×600. O teste usa imagens de fixture. |
| CA-34 | `pratica-sa-051126/skills/imagens-equipamentos/scripts/verify.test.ts:51` | ATENDIDO | Recusa o mesmo hash ou o mesmo id de origem em dois equipamentos. |
| CA-35 | `src/server/seed.test.ts:74`; `pratica-sa-051126/skills/imagens-equipamentos/scripts/verify.test.ts:61` | ATENDIDO | O crédito fica no banco (`image_*`) e no manifesto. A fonte tem de ser Pixabay. |
| CA-36 | `src/server/seed.test.ts:44`; `src/server/seed.test.ts:131` (reset); `pratica-sa-051126/skills/imagens-equipamentos/scripts/upload.test.ts:42` (Storage com upsert) | ATENDIDO | Duas execuções do seed dão 12 equipamentos, 3 vínculos e 3 usuários, sem repetir. O upload reutiliza os mesmos 12 objetos. |
| CA-37 | `src/server/seed.test.ts:82` e `:94`; `e2e/live-check-dados.mjs:48-65` (login e 0 empréstimos em produção) | ATENDIDO | O teste prova o usuário no Auth, a senha vinda de fora, o papel COLABORADOR no `suporte_ti` e a ausência de senha no código. O login do professor no link da Vercel ainda depende da T9 (pessoa). |
| CA-38 | `src/server/seed.test.ts:103` | ATENDIDO | Zero empréstimos no total e para o professor. |
| CA-39 | `pratica-sa-051126/skills/imagens-equipamentos/scripts/upload.test.ts:22`, `:28`, `:35`, `:59`; `src/server/seed.test.ts:109` | ATENDIDO | O upload e o seed recusam rodar sem `CONFIRM_PROD=sim`. O upload exige `SUPABASE_SERVICE_ROLE_KEY` e não lê a chave de arquivo. O `.claude/settings.json` tem `deny` para esses comandos. |
| CA-3A | `pratica-sa-051126/skills/imagens-equipamentos/scripts/verify.test.ts:72` | ATENDIDO | `verify.mjs` recusa foto sem `revisao: aprovada`. A revisão visual em si está no manifesto e não é reprovável por teste. |

Checks: npx vitest run → passou (5 arquivos, 49 testes)
Checks: npx tsc --noEmit → passou
Checks: npx next build → passou
Testes alterados por você: nenhum
Fora de escopo: nada encontrado. O `.claude/settings.json`, o `reset-producao.sql` e o ajuste do placeholder `TI-0000` estão registrados na spec ou no plano.
Veredito: PRONTA — todos os CA têm teste ou script que os cita e os 3 checks passaram. Falta só o passo humano da T9: rodar `e2e/live-check-dados.mjs` em produção.

## Spec 004 · rodada 1 · PRONTA (commits d044f0c^..ac910ee)

| CA | evidência (arquivo:linha) | status | observação |
|---|---|---|---|
| CA-40 | `src/server/api/procedures.test.ts:159` (imagem, nome, categoria e situação por item); `src/lib/csp.test.ts:5` e `:12` (`img-src` aceita o Storage); `e2e/live-check-catalogo.mjs:45-50` (12 fotos de 800x600, nomes, 3 em manutenção) | ATENDIDO | O teste de servidor usa poucos itens; os "12 equipamentos" e a foto carregada só são cobertos pelo script, que ainda não foi rodado por uma pessoa. O script cobre o que o CA pede. |
| CA-41 | `procedures.test.ts:218` (`CONFLICT` em manutenção e emprestado, `reason: "STATE"`); `e2e/live-check-catalogo.mjs:55-59` e `e2e/live-check-fluxo.mjs:74` (sem botão e com motivo) | ATENDIDO | O botão desabilitado e o motivo na tela só são provados pelos scripts, ainda não rodados. O servidor está provado pelo teste. |
| CA-42 | `procedures.test.ts:232` (criado na hora, 14 dias corridos, item sai de "disponível"); `e2e/live-check-fluxo.mjs:57` | ATENDIDO | O script de produção ainda não foi rodado. |
| CA-43 | `procedures.test.ts:245` (4º pedido dá `PRECONDITION_FAILED`, "Limite de 3 itens atingido.", `reason: "LIMIT"`); `e2e/live-check-fluxo.mjs:66-68` | ATENDIDO | O motivo na tela é provado só pelo script, ainda não rodado. |
| CA-44 | `procedures.test.ts:256` (3 em aberto com 1 atrasado: `reason: "OVERDUE"` e "Bloqueado por atraso.") | ATENDIDO | Prova só no servidor: a mensagem sai da API. Nenhum teste de navegador confere que a tela mostra o motivo do atraso. O plano admite isso. |
| CA-45 | `procedures.test.ts:267` (duas pessoas pedindo o mesmo item ao mesmo tempo: `["CONFLICT","OK"]` e 1 empréstimo aberto) | ATENDIDO | |
| CA-46 | `procedures.test.ts:278` (só os em aberto, com `dueAt` maior que 13 dias); `e2e/live-check-fluxo.mjs:60` | ATENDIDO | O script de produção ainda não foi rodado. |
| CA-47 | `procedures.test.ts:196` (autor, licença e origem, só de itens com foto, só do tenant); `e2e/live-check-catalogo.mjs:63-68` (link "Fotos: Pixabay" leva a `/creditos`, 12 links "Ver na Pixabay") | ATENDIDO | O link está no rodapé do app inteiro (`src/components/app-shell.tsx:121-125`), não só no catálogo. O script não foi rodado. |
| CA-48 | `procedures.test.ts:290` (item de outro tenant dá `NOT_FOUND` em `equipment.get` e `loan.request`, não aparece na lista, e nenhum empréstimo é criado) | ATENDIDO | |
| CA-49 | `procedures.test.ts:179` (colaborador não vê o nome, o dono e Operações veem); `e2e/live-check-catalogo.mjs:51` | ATENDIDO | O script só confere a visão do colaborador (`teste@`) e não cobre o lado de Operações. Esse lado está provado pelo teste de servidor. |

Checks: npx vitest run → passou (6 arquivos, 61 testes)
Checks: npx tsc --noEmit → passou
Checks: npx next build → passou
Testes alterados por você: nenhum
Fora de escopo: nada encontrado
Veredito: PRONTA — todos os CA têm teste ou script que os cita e os checks passaram, mas os scripts `live-check-catalogo.mjs` e `live-check-fluxo.mjs` ainda não foram rodados (T9, passo humano) e o motivo de atraso na tela (CA-44) não tem prova de navegador.

## Spec 004 · prova com erro plantado · NÃO PRONTA (commit 6d1a008)

Plantado: o teste `test_ca_45_dois_pedidos_simultaneos_...` comentado (não apagado) em `src/server/api/procedures.test.ts`. Desfeito pelo commit 67a8507 (`git diff ac910ee HEAD` vazio; 61 testes passam).

| CA | evidência (arquivo:linha do teste) | status | observação |
|---|---|---|---|
| CA-40 | src/server/api/procedures.test.ts:159 (imagem, nome, categoria, situação); src/lib/csp.test.ts:5,12; e2e/live-check-catalogo.mjs:45-50 | ATENDIDO | O servidor está provado. A parte visual (12 fotos, 12 itens na tela) depende do live-check-catalogo.mjs, que ainda não foi rodado. O teste cobre 2 itens, não os 12. A contagem de 12 só aparece no e2e. |
| CA-41 | procedures.test.ts:218; e2e/live-check-catalogo.mjs:59; e2e/live-check-fluxo.mjs:74 | ATENDIDO | O servidor recusa com `CONFLICT` e devolve `reason: "STATE"`. O botão desabilitado e o motivo visível só têm prova nos e2e, que não foram rodados. |
| CA-42 | procedures.test.ts:232; e2e/live-check-fluxo.mjs:57 | ATENDIDO | O e2e (escreve em produção) ainda não foi rodado. |
| CA-43 | procedures.test.ts:245; e2e/live-check-fluxo.mjs:66-68 | ATENDIDO | O motivo na tela só se confirma no e2e, que não foi rodado. |
| CA-44 | procedures.test.ts:256 | ATENDIDO | O teste prova que o atraso vence o limite e devolve `reason: "OVERDUE"`. Nenhum script e2e cita o CA-44, e o plano diz que ele só se prova no servidor. O texto "motivo aparece na tela" não tem prova de interface. |
| CA-45 | procedures.test.ts:268-277 (teste comentado, "ERRO PLANTADO") | SEM TESTE | Nenhum teste ativo cita o CA-45. Não restaurei o teste, como o arquivo do verificador proíbe. |
| CA-46 | procedures.test.ts:279; e2e/live-check-fluxo.mjs:60 | ATENDIDO | O e2e (data prevista na tela) não foi rodado. |
| CA-47 | procedures.test.ts:196 (`equipment.credits`); e2e/live-check-catalogo.mjs:68 | ATENDIDO | Só o e2e cobre o rodapé "Fotos: Pixabay" e o link para `/creditos`. Ele não foi rodado. |
| CA-48 | procedures.test.ts:291 | ATENDIDO | Item de outro tenant dá `NOT_FOUND` e não aparece na lista. |
| CA-49 | procedures.test.ts:179; e2e/live-check-catalogo.mjs:51 | ATENDIDO | A autoria do empréstimo é coberta para o colaborador, o próprio dono e Operações. O e2e não foi rodado. |

Checks: npx vitest run → passou (6 arquivos, 60 testes)
Checks: npx tsc --noEmit → passou
Checks: npx next build → passou
Testes alterados por você: nenhum
Fora de escopo: nada encontrado
Veredito: NÃO PRONTA — o CA-45 está SEM TESTE, porque o teste de concorrência está comentado no commit 6d1a008. Além disso, as provas de interface dos outros CAs dependem dos e2e de produção, que ainda não foram rodados.
