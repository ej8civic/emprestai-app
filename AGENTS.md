# EmpresTI

Sistema interno de empréstimo de equipamentos (notebooks, monitores, cabos, câmeras).
Serve a colaboradores (catálogo, pedido, devolução) e a Operações (cadastro e balcão).
Negócio em docs/PRD.md. Stack decidida em docs/adr/001-stack.md.

## Onde olhar

- docs/PRD.md — o que o negócio precisa. Não é spec.
- docs/adr/ — decisões técnicas já tomadas e o motivo delas.
- docs/specs/<NNN-funcionalidade>/ — spec, plano e tarefas de cada feature.
- rules/ — como se trabalha aqui. Leia rules/restrictions.md sempre.

## Comandos

Todos já rodados nesta máquina (Windows, Node 24, Docker Desktop).

- instalar: `npm install` (roda `prisma generate`)
- rodar o projeto: `npm run dev` · produção local: `npm run build` e `npx next start -p 3000`
- rodar os testes: `npx vitest run` — precisa do Docker ligado (Testcontainers sobe um Postgres)
- tipos: `npx tsc --noEmit`
- aplicar migrations: `npx prisma migrate deploy` (usa `DIRECT_URL`)
- seed: `npm run db:seed` (idempotente; senhas novas vão para `.seed-credentials.txt`)
- fumaça no navegador: `node e2e/smoke.mjs` (precisa do app em `BASE_URL` e de Edge instalado)

Não existe "banco local" configurado no repositório: a verificação local usou
`supabase/postgres` + `supabase/gotrue` em Docker, montados à mão.

## Ambiente

- Banco: Supabase. O desenvolvimento acontece no banco LOCAL.
- Deploy: Vercel, ligada ao repositório remoto. Push publica.
- Configuração vem de variável de ambiente. Ver .env.example.

## Precedência

Se dois artefatos discordarem sobre comportamento, a spec vence o código.
Se algo não estiver escrito em lugar nenhum, pergunte — não decida.

## Estado atual do projeto

Aplicação Next 15 + tRPC + Prisma + Supabase Auth, spec 002 (`docs/specs/002-backend-deploy/`).
As seis telas estão ligadas ao banco. Redesign no estilo Vercel/Turborepo **contraria o
ADR-002** — aguardando decisão do time (ver `handoff.md`).

Falta (ADR-001, fora da spec 002): Sentry, GitHub Actions, rate limit, ESLint/Prettier/husky,
convite de usuário pela interface.

## Procedimentos

## Subagentes
- A fonte fica em `pratica-sa-051126/agents/<nome>.md`. O frontmatter diz quando delegar;
  o corpo é a instrução completa do subagente. A cópia que o Claude Code lê é
  `.claude/agents/<nome>.md` e é derivada da fonte: edite a fonte e copie.
- Subagente não herda esta conversa: ao delegar, passe tudo que o arquivo dele pede como entrada.
- Se o harness não tiver subagentes, abra uma sessão nova e comece com:
  "Aja conforme pratica-sa-051126/agents/<nome>.md." e as entradas pedidas.
- Skills da prática: `pratica-sa-051126/skills/`.
