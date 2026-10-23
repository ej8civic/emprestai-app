# Spec 002 — Backend, banco e deploy

Fonte de negócio: `docs/PRD.md`. Stack: `docs/adr/001-stack.md`. Substitui o "front estático com mock" da spec 001.

## Escopo

Login real (Supabase Auth), dados reais (Postgres + Prisma, tenant `suporte_ti`), as seis telas ligadas ao `AppRouter` do tRPC, deploy na Vercel.
Redesign visual (ver "Design" abaixo) pedido junto: troca de paleta e componentes, mesmas seis telas e mesmas rotas da spec 001.

## Fora de escopo (continua no ADR-001, não feito)

Sentry, GitHub Actions + `prisma migrate deploy` no CI, rate limit por IP/usuário, ESLint/Prettier/husky, convite de usuário pela interface (cadastro é fechado; usuários nascem no seed), E2E dentro do CI.

## Critérios de aceitação

- **CA-20** Sem sessão, toda rota exceto `/login` redireciona a `/login`; sessão em cookie `httpOnly`.
- **CA-21** Pedido de empréstimo: prazo 14 dias; 4º item recusado; atraso bloqueia; item em manutenção ou emprestado não é pedido.
- **CA-22** Dois pedidos simultâneos do mesmo item: só um vence (índice parcial único).
- **CA-23** Só Operações usa cadastro, lista de em aberto e devolução de terceiros; colaborador devolve só o que é seu.
- **CA-24** Tenant sai da sessão; um caso de teste de isolamento por procedimento.
- **CA-25** RLS ligado e com policy em toda tabela; `audit_log` é append-only.
- **CA-26** CSP com nonce, sem `unsafe-inline`; nenhuma violação no console nas seis telas.
- **CA-27** Variáveis validadas com Zod no boot; `.env` fora do git.

## Design

Direção: Vercel / Turborepo. Preto puro, linhas de 1px, Geist Sans/Mono, CTA branco, gradiente vermelho→azul só na marca e no destaque do login, navegação no topo no lugar da sidebar. Só modo escuro. Tokens em `src/app/globals.css`.
**Isto contraria `docs/adr/002-layout.md`** (paleta navy, Open Sans, sidebar 236px). Quem decide a nova ADR é o time; ver `handoff.md`.
