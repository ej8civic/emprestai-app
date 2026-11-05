-- Endurecimento apontado pelo advisor de segurança do Supabase (DDL aprovado pelo dono em 2026-11-05).
-- 1) A tabela de controle do Prisma ficava exposta às roles anon e authenticated. Com RLS ligado e sem
--    policy, só o dono (o Prisma, que conecta como dono) continua acessando. IF EXISTS: nos bancos de
--    teste a tabela é criada por quem monta o schema, não pelo Prisma.
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- 2) A função do trigger append-only tinha search_path mutável. Ela só levanta exceção, então um
--    search_path vazio não muda o comportamento.
ALTER FUNCTION "audit_log_append_only"() SET search_path = '';
