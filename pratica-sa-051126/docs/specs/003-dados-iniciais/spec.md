# Spec 003 — Dados iniciais

Fonte de negócio: `docs/PRD.md`. Pedido: briefing "dados iniciais" da prática (`.claude/specs/pratica-sdd-subagentes.html`).
Stack: `docs/adr/001-stack.md` (com a emenda proposta no fim dele). Estado: **aguardando aprovação**.

## Escopo

Produção passa a ter 12 equipamentos (TI-0001 a TI-0012) com foto e a conta do professor, sem empréstimos.
A skill `imagens-equipamentos` prepara as fotos; uma pessoa as envia e roda o seed em produção.

## Fora de escopo

Tela de catálogo nova, cadastro de equipamento pela interface, importação de planilha, qualquer empréstimo.

## Critérios de aceitação

- **CA-30** Existem exatamente os 12 equipamentos da lista da prática (patrimônio, nome, categoria), no tenant `suporte_ti`.
- **CA-31** Situação: TI-0004, TI-0007 e TI-0010 em manutenção; os outros 9 disponíveis.
- **CA-32** Cada equipamento tem `image_url` apontando para um objeto de bucket público do Supabase Storage, que abre sem login.
- **CA-33** Toda imagem tem 800×600. Isso é verificado por script, não por inspeção.
- **CA-34** Nenhuma foto aparece em dois equipamentos (mesmo hash de conteúdo e mesmo id de origem).
- **CA-35** Cada imagem guarda fonte, autor, licença e URL de origem, no banco (`image_*`) e no manifesto.
- **CA-36** O seed é idempotente: duas execuções não duplicam equipamento, usuário, vínculo nem objeto no Storage.
- **CA-37** `marcelo.grilo@institutojef.org.br` existe no Auth, com papel COLABORADOR no tenant `suporte_ti`, entra pelo login e tem zero empréstimos. A senha vem de `PROFESSOR_PASSWORD`; não existe em código, seed, log ou git.
- **CA-38** O seed não cria nenhum empréstimo.
- **CA-39** O agente consegue preparar as imagens, mas não consegue enviá-las ao Storage de produção nem rodar o seed em produção: o envio exige `SUPABASE_SERVICE_ROLE_KEY`, que só existe no ambiente da pessoa, e o script recusa rodar sem `CONFIRM_PROD=sim`.
- **CA-3A** Nenhuma foto com pessoa, marca ou logo legível, texto ou tela com conteúdo. A revisão visual fica no manifesto (aprovada ou reprovada, com motivo).

## Decisões (conflitos e lacunas)

| tema | o pedido | o que existia | decisão | por quê |
|---|---|---|---|---|
| fonte das fotos | só Pexels | Pexels não emite chave nova (página de chave, 2026-11-05) | **Openverse**, API pública, filtrada por licença CC0, domínio público e CC BY | não exige chave; licença e autor vêm em cada resultado |
| manutenção | briefing: TI-0004 e TI-0007 | lista: TI-0004, TI-0007 e TI-0010 | os três da lista | a lista é "use exatamente esta"; decidido pelo dono |
| formato do patrimônio | TI-0001 | `schemas.ts` aceita só `PAT-0000` | aceitar `AA-0000` a `AAAA-0000` | os 12 da prática não passam no formato antigo; PAT continua válido |
| `sharp` | briefing manda instalar | `rules/restrictions.md`: biblioteca fora do ADR-001 exige proposta | `devDependency`, só no script local; exceção autorizada pelo dono nesta sessão, emenda proposta no ADR-001 | garante 800×600 por código; não vai para o servidor |
| senha do professor | escrita no arquivo do seed | `rules/secrets.md`: nenhuma senha em código | variável `PROFESSOR_PASSWORD` | segue a rule; o README diz como rodar; decidido pelo dono |
| dados de demonstração | não diz | produção tem 8 usuários e 8 empréstimos | limpar e recriar, por `scripts/reset-producao.sql` rodado pela pessoa | decisão do dono; a produção chega à correção sem empréstimos |
| outras contas | não diz | seed anterior criava 8 usuários | só o professor, `operacoes@` e `teste@empresti.example`, com senha aleatória em `.seed-credentials.txt` | precisa de conta própria para testar e de Operações; o professor fica intacto |
| schema | não diz | `equipment` não tem imagem | migration aditiva com 5 colunas `image_*` anuláveis, DDL aprovado pelo dono | `rules/migration.md` |
| créditos | "registrado" | — | colunas em `equipment`, sem tabela separada | uma foto por equipamento, sem reuso |
