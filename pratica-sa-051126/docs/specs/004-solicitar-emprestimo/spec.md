# Spec 004 — Solicitar empréstimo

Fonte de negócio: `docs/PRD.md` (limite 3, prazo 14 dias, manutenção fora do disponível). Pedido: briefing "solicitar empréstimo".
Depende da spec 003 (sem equipamentos não há o que solicitar). Estado: **aguardando aprovação**.

## Escopo

O colaborador logado vê o catálogo com imagem, nome, categoria e situação; solicita um disponível e acompanha os seus empréstimos em aberto. O pedido cria o empréstimo na hora, sem aprovação nem fila.

## Fora de escopo

Devolução, tela de Operações, reserva futura, e-mail, renovação.

## Critérios de aceitação

- **CA-40** O catálogo mostra os 12 equipamentos, cada um com imagem, nome, categoria e situação.
- **CA-41** Só equipamento disponível pode ser solicitado. Manutenção ou emprestado: botão desabilitado e o servidor recusa (`CONFLICT`), com o motivo visível.
- **CA-42** Solicitar cria o empréstimo na hora, com devolução prevista em 14 dias corridos, e o equipamento deixa de estar disponível.
- **CA-43** Quem tem 3 empréstimos em aberto não solicita outro; o motivo aparece na tela.
- **CA-44** Quem tem empréstimo em atraso não solicita outro; o motivo aparece na tela. Atraso vence limite quando os dois valem.
- **CA-45** Dois pedidos simultâneos ao mesmo equipamento: só um empréstimo é criado.
- **CA-46** "Meus empréstimos" lista os itens em aberto, cada um com a data de devolução prevista.
- **CA-47** O catálogo mostra um crédito discreto "Fotos: Openverse" com link para `/creditos`; essa página lista autor, licença e origem de cada foto.
- **CA-48** O que o colaborador vê e faz vem do tenant da sessão; item de outro tenant não é visto nem solicitado (spec 002, CA-24, continua valendo).

## Decisões (conflitos e lacunas)

| tema | o pedido | o que existia | decisão | por quê |
|---|---|---|---|---|
| limite | 5 em aberto | PRD, ADR-002 e código: 3 | **3** | PRD é a fonte da regra; decidido pelo dono |
| prazo | 14 dias úteis | PRD e ADR-002: 14 dias | **14 dias corridos** | sem calendário de feriados decidido; decidido pelo dono |
| crédito na tela | catálogo sem rodapé nem crédito | licença CC BY exige atribuição; contrato da skill pede crédito | crédito discreto e `/creditos`; decidido pelo dono | registrado como conflito |
| relógio do atraso | não diz | — | data do servidor, exibida em `America/Sao_Paulo` | evita o bug de data do navegador visto na aula |
| item emprestado no catálogo | não diz | detalhe atual mostra quem está com o item | catálogo mostra "Emprestado" sem nome | a lista é para pedir, não para localizar pessoas |
| onde está a regra | — | spec 002 CA-21/22 já implementam | esta spec reafirma com IDs próprios e testes `test_ca_4x_...`; nenhuma regra nova | o verificador exige teste que cite o CA |
| conta de teste | — | o professor deve ficar com zero empréstimos | testes em produção usam `teste@empresti.example` | regra da prática |
