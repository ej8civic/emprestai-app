# Plano 003

Restrições: ADR-001 (Prisma dono do schema, Supabase Storage, seed idempotente em `prisma/seed.ts`), `rules/migration.md`, `rules/secrets.md`, `rules/restrictions.md`.

1. **Migration** `add_equipment_images`: DDL aprovado (5 colunas anuláveis em `equipment`). Aplicada em produção só pelo CI do `main`.
2. **Schema e validação**: `schema.prisma` ganha os campos; `schemas.ts` aceita `AA-0000`.
3. **Skill `imagens-equipamentos`** (`pratica-sa-051126/skills/imagens-equipamentos/`):
   - `SKILL.md`: fluxo e regras curtas. `references/contrato.md`: o contrato e os critérios da revisão visual. `references/pixabay.md`: parâmetros da API.
   - `scripts/prepare.mjs`: busca na Pixabay (`image_type=photo`, `safesearch=true`, `per_page=20`; limite de 100 pedidos por minuto), baixa candidatas, calcula hash, descarta duplicadas, redimensiona com `sharp` para 800×600 (cover, JPEG), grava `out/images/TI-xxxx.jpg` e `out/manifest.json` (fonte, autor, licença, URL, hash, `revisao`).
   - `scripts/verify.mjs`: confere dimensões, unicidade, créditos e `revisao: aprovada` em todas. É o que prova o CA-33 e o CA-34.
   - `scripts/upload.mjs`: envia ao bucket `equipment-images` com `upsert` e atualiza `image_*`. Roda só com `SUPABASE_SERVICE_ROLE_KEY` e `CONFIRM_PROD=sim`.
4. **Seed**: `prisma/seed.ts` cria os 12 TI-xxxx, o professor (senha de `PROFESSOR_PASSWORD`) e as duas contas de apoio, sem empréstimos. Lê `out/manifest.json` para gravar `image_*`.
5. **Reset**: `scripts/reset-producao.sql`, rodado pela pessoa no SQL Editor: apaga os dados de demonstração, inclusive os `auth.users` dos 8 usuários antigos.
6. **Variáveis**: `PIXABAY_API_KEY`, `PROFESSOR_PASSWORD` e `SUPABASE_SERVICE_ROLE_KEY` só no `.env.local` da pessoa (o app não as usa em runtime, então não vão para a Vercel). `.env.example` lista as três sem valor.
7. **Testes**: seed idempotente e zero empréstimos (Testcontainers); `verify.mjs` coberto por teste com imagens de fixture.

Riscos: a Pixabay não filtra pessoa nem logo, então a revisão visual é obrigatória; a chave é sua e fica só no `.env.local`; a qualidade das fotos exige revisão visual minha e conferência sua.
