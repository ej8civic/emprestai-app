---
name: imagens-equipamentos
description: Prepara as fotos dos equipamentos do EmpresTI a partir da API da Pixabay, em 800x600, sem repetição e com crédito por imagem, e deixa tudo pronto para uma pessoa enviar ao Supabase. Use quando for criar, trocar ou conferir fotos de equipamento. Não use para logo, landing ou ilustrações, nem para enviar algo a produção.
---

# imagens-equipamentos

Raiz dos arquivos: `pratica-sa-051126/skills/imagens-equipamentos/`.
O contrato completo está em `references/contrato.md`, os parâmetros da API em `references/pixabay.md`
e a lista dos 12 equipamentos, com os termos de busca, em `references/equipamentos.json`.

## Fluxo
1. Confirme que `PIXABAY_API_KEY` existe no `.env`. Nunca imprima o valor.
2. `node <raiz>/scripts/prepare.mjs` baixa candidatas, descarta duplicadas, redimensiona para 800×600 e
   grava `out/images/` e `out/manifest.json`, com `revisao: "pendente"` em cada item.
3. Revise as fotos uma a uma, abrindo cada arquivo de `out/images/`, pelos critérios de
   `references/contrato.md`. Marque `aprovada` ou `reprovada` com motivo no manifesto.
   Reprovada: rode `prepare.mjs --only TI-000N` de novo; a foto reprovada fica em `reprovadas` e não volta.
4. `node <raiz>/scripts/verify.mjs` precisa terminar com "OK: 12 imagens".
5. PARE. O envio ao Supabase (`scripts/upload.mjs`) é feito por uma pessoa, no terminal dela.

## O que é garantido por código e o que não é
| requisito | garantido por |
|---|---|
| 800×600 | `prepare.mjs` (corte centralizado) e `verify.mjs` (lê as dimensões do arquivo) |
| sem repetição | `prepare.mjs` e `verify.mjs`: hash do conteúdo e id de origem |
| crédito por imagem | `verify.mjs` recusa item sem fonte, autor, licença e página de origem |
| só Pixabay | `prepare.mjs` só fala com `pixabay.com`; `verify.mjs` recusa outra fonte |
| nada vai a produção | `upload.mjs` exige `SUPABASE_SERVICE_ROLE_KEY` e `CONFIRM_PROD=sim`; o agente não tem a chave |
| sem pessoa, marca, texto ou tela | **revisão visual**, registrada no manifesto; `verify.mjs` só confere que foi feita |
| termo de busca bom | instrução (`equipamentos.json`) e revisão visual |

## Não faça
- Não use outra fonte de imagem, nem imagem já existente no projeto, nem gere imagem.
- Não rode `upload.mjs`, não use `SUPABASE_SERVICE_ROLE_KEY` e não toque no Storage de produção.
- Não escreva a chave da Pixabay em código, log, resposta ou commit.
- Não instale biblioteca além de `sharp` (devDependency, só para estes scripts).
- Não aprove uma foto sem abri-la.
