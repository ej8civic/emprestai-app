-- Spec 003 · limpar os dados de demonstração da produção, antes de rodar o seed.
--
-- QUEM RODA: uma pessoa, no SQL Editor do Supabase (projeto de produção). O agente não executa este arquivo.
-- O QUE FAZ: apaga empréstimos, auditoria, equipamentos e vínculos, e os usuários de demonstração
--            (@empresti.example). Mantém o tenant `suporte_ti`.
-- SEGURANÇA: aborta, sem apagar nada, se existir qualquer usuário que NÃO seja de demonstração
--            (por exemplo o professor ou uma conta real). Nesse caso, avalie à mão.
-- ATENÇÃO:   `audit_log` é append-only por trigger de linha; TRUNCATE não dispara esse trigger e apaga o
--            histórico de auditoria de demonstração. É a única forma de zerar a tabela e é intencional aqui.
--
-- Depois: `PROFESSOR_PASSWORD=... CONFIRM_PROD=sim npm run db:seed`, e o envio das imagens (upload.mjs).

begin;

do $$
begin
  if exists (select 1 from auth.users where email not like '%@empresti.example') then
    raise exception 'Há usuários que não são de demonstração; nada foi apagado. Confira auth.users antes de continuar.';
  end if;
end
$$;

truncate table loans, audit_log, equipment, memberships restart identity cascade;

delete from auth.identities where user_id in (select id from auth.users where email like '%@empresti.example');
delete from auth.users where email like '%@empresti.example';

-- Conferência: tudo zerado, tenant preservado.
select
  (select count(*) from loans)       as emprestimos,
  (select count(*) from equipment)   as equipamentos,
  (select count(*) from memberships) as vinculos,
  (select count(*) from auth.users)  as usuarios,
  (select count(*) from tenants)     as tenants;

commit;
