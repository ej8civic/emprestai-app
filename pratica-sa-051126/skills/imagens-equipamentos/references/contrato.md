# Contrato da skill imagens-equipamentos

Fonte: `.claude/specs/pratica-sdd-subagentes.html`, seção "Entrega 2". A fonte trocou de Pexels para Pixabay porque a Pexels não emite chave nova (decisão do dono, spec 003).

| requisito | o que precisa ser verdade |
|---|---|
| Fonte | Só a API da Pixabay, com a chave do dono. Nenhuma outra origem. |
| Direito de imagem | Nenhuma foto com pessoa, marca ou logo legível, texto ou tela com conteúdo chega ao sistema. |
| Mesmo tamanho | Todas em 800×600, garantido por código. |
| Sem repetição | Uma mesma foto não aparece em dois equipamentos. |
| Créditos | Para cada imagem: fonte, autor, licença e página de origem. |
| Armazenamento | Bucket público `equipment-images` do Supabase Storage. Repetir o processo não duplica nada (mesmo nome de objeto, `upsert`). |
| Produção | O agente prepara, mas não envia. |
| Segredos e dependências | Nenhuma chave em código ou no git. Só `sharp` além do que o ADR-001 já tem. |
| Crédito na tela | A tela que exibe as fotos mostra "Fotos: Pixabay" com link (CA-47). |

## Revisão visual (critérios)

Reprove a foto se aparecer: rosto ou parte reconhecível de pessoa (uma mão segurando é aceitável só se nada identifica); marca ou logo legível no aparelho ou na embalagem; tela ligada com conteúdo legível; texto legível; o objeto errado (monitor onde se pediu cabo); mais de um equipamento quando se pediu um; ilustração ou renderização que não parece o objeto. Registre o motivo no manifesto.

## Formato do `out/manifest.json`

```json
{
  "geradoEm": "ISO-8601",
  "itens": {
    "TI-0001": {
      "arquivo": "images/TI-0001.jpg",
      "largura": 800,
      "altura": 600,
      "sha256": "…",
      "fonte": "Pixabay",
      "idOrigem": 123456,
      "autor": "…",
      "paginaOrigem": "https://pixabay.com/…",
      "licenca": "Pixabay Content License",
      "termoBusca": "…",
      "revisao": "pendente | aprovada | reprovada",
      "motivo": "obrigatório quando reprovada",
      "reprovadas": [{ "idOrigem": 1, "motivo": "…" }]
    }
  }
}
```

`out/images/` e `out/manifest.json` entram no git (T5): são as fotos que o seed e o upload usam e a prova da revisão. `out/cache/` fica fora.
