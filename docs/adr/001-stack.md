# ADR-001: Stack

## Decisões

| Item | Escolha |
|---|---|
| Arquitetura | Monolito |
| Aplicação | Next.js (App Router), front e servidor no mesmo projeto |
| Repositório | Único |
| Deploy | Um projeto na Vercel |
| Camada de servidor | Route Handlers do Next, sem servidor separado |
| Linguagem | TypeScript em modo `strict` |
| Renderização | Client Components como padrão para telas com dados |
| Estado de servidor | TanStack Query via `@trpc/react-query` |
| Estado de cliente | `useState` e Context; sem biblioteca de store |
| Formulários | React Hook Form + `zodResolver` |
| Estilização | Tailwind CSS |
| Componentes | shadcn/ui |
| Padrão de API | tRPC |
| Endpoint | Route Handler em `app/api/trpc/[trpc]/route.ts` |
| Organização | `src/server/api/routers/<dominio>.ts`, um router por domínio |
| Camadas | Router (procedimento) → Service → Prisma |
| Validação de entrada | Zod no `.input()` de todo procedimento |
| Serialização | superjson |
| Contexto de request | Sessão, `tenant_id`, `role` e cliente Prisma montados no `createContext` |
| Server Actions | Não usadas |
| Fonte da verdade | O `AppRouter` do tRPC |
| Consumo no cliente | `RouterInputs` e `RouterOutputs` inferidos, sem tipo escrito à mão |
| Versionamento | Nenhum |
| Formato de erro | `TRPCError` com código, tratado por `errorFormatter` |
| Paginação de listas | Cursor, via `useInfiniteQuery` |
| Consumidor externo | Fora de escopo |
| Tempo real | Fora de escopo |
| Banco | PostgreSQL gerenciado pelo Supabase |
| ORM | Prisma |
| Dono do schema | Prisma Migrate (único) |
| RLS, policies e triggers | SQL bruto dentro das migrations do Prisma |
| Instância do Prisma | Singleton global, para sobreviver ao hot reload |
| Conexão de runtime | Supavisor, porta 6543, `?pgbouncer=true&connection_limit=1` |
| Conexão de migration | `directUrl`, porta 5432 |
| Seed | `prisma/seed.ts`, idempotente, cria o tenant `suporte_ti` |
| Modelo de multi-tenancy | Tenant discriminado por coluna, banco único |
| Coluna | `tenant_id` em toda tabela de domínio |
| Vínculo usuário–tenant | Tabela `memberships (user_id, tenant_id, role)` |
| Primeiro tenant | `suporte_ti`, criado no seed |
| Origem do tenant | Resolvido no `createContext` a partir da sessão, nunca do input |
| Aplicação do filtro | `tenantProcedure` injeta o `tenant_id` no service |
| Provedor de identidade | Supabase Auth, e-mail e senha |
| Cadastro | Fechado, somente por convite de administrador |
| Integração com o Next | `@supabase/ssr` |
| Sessão no navegador | Cookie `httpOnly`, escrito pelo `@supabase/ssr` |
| Renovação de sessão | Middleware do Next em toda rota |
| Autorização | Middlewares do tRPC: `protectedProcedure`, `tenantProcedure`, `adminProcedure` |
| RLS | Habilitado em todas as tabelas, deny by default |
| Papel do RLS | Defesa em profundidade, não autorização primária |
| Runner | Vitest, único para servidor e componentes |
| Componentes (teste) | Testing Library |
| Integração de banco | Testcontainers com Postgres real |
| Teste de procedimento | `createCaller` do tRPC, chamando o router direto |
| E2E de interface | Playwright |
| Teste obrigatório de isolamento | Um caso por procedimento: tenant A não enxerga dado de tenant B |
| Meta de cobertura | Sem percentual; caminhos críticos obrigatórios |
| Hospedagem | Vercel, um projeto |
| Plano | Hobby |
| Região das functions | Padrão do Hobby (Estados Unidos) |
| Região do Supabase | `sa-east-1` (São Paulo) |
| Limite de execução | 60s por request |
| Fila e agendamento | Fora de escopo; tudo roda dentro do request |
| Configuração | Variáveis de ambiente validadas com Zod no boot |
| Log | Log estruturado em JSON, com `request_id` e `tenant_id` |
| Rastreamento de erro | Sentry |
| CI | GitHub Actions |
| Migration em deploy | `prisma migrate deploy` em job do GitHub Actions, antes do deploy |
| Cabeçalhos HTTP | Configurados em `next.config.js` |
| CSP | Restritiva, sem `unsafe-inline` |
| Rate limit | Por IP e por usuário, com contador no Postgres |
| Segredos | Environment variables da Vercel; nada com prefixo `NEXT_PUBLIC_` |
| `service_role` key do Supabase | Somente em código de servidor |
| Auditoria | Tabela append-only com ator, tenant, ação e recurso |
| Lint e formatação | ESLint + Prettier |
| Hook de pré-commit | lint-staged + husky, apenas lint e formatação |
| Convenção de commit | Nenhuma automação; mensagem escrita pela pessoa |

## Justificativa

- **Arquitetura** — não há equipe separada para front e back nem necessidade de escalar as partes de forma independente; separar criaria dois deploys, dois CI e uma fronteira HTTP para manter sem ganho.
- **Aplicação** — o servidor mora dentro do mesmo projeto do front, então a chamada de dados não atravessa domínio nem exige CORS.
- **Repositório** — o tipo do procedimento e o tipo consumido na tela são o mesmo símbolo TypeScript; em repositórios separados isso viraria arquivo gerado.
- **Deploy** — "monolito" é de código, não de processo: na Vercel cada rota vira uma function; o que é único é o codebase e o deploy, não o runtime.
- **Camada de servidor** — Route Handlers do Next, sem servidor separado.
- **Linguagem** — sem `strict` o tipo que vem do tRPC não pega os casos de nulo, que são exatamente os que quebram em produção.
- **Renderização** — misturar Server Components buscando dados direto no Prisma com tRPC buscando pelo cliente cria dois caminhos de acesso a dado, com duas checagens de permissão para manter em sincronia. Um caminho só é mais fácil de auditar.
- **Estado de servidor** — cache, revalidação e estado de loading já vêm resolvidos e tipados a partir do procedimento; escrever isso por tela é a maior fonte de bug repetido.
- **Estado de cliente** — depois do TanStack Query sobra pouco estado de cliente (filtro, modal, wizard), e isso cabe em `useState`.
- **Formulários** — o mesmo schema Zod que valida a entrada do procedimento valida o formulário, então a regra é escrita uma vez.
- **Estilização** — o design vem do Figma e precisa ser reproduzido de perto; biblioteca com visual próprio brigaria com isso.
- **Componentes** — copia o componente para dentro do repositório em vez de esconder atrás de API de biblioteca, então customizar não vira luta contra a dependência.
- **Padrão de API** — já era a decisão; mantida. Com front e servidor no mesmo TypeScript, o tipo do retorno chega na tela sem geração de código nem contrato escrito à mão.
- **Endpoint** — Route Handler em `app/api/trpc/[trpc]/route.ts`.
- **Organização** — organizar por camada técnica faz cada feature nova espalhar arquivo em pastas distantes; por domínio, a feature inteira fica junta.
- **Camadas** — o procedimento cuida de entrada, contexto e permissão; a regra de negócio no service é o que dá para testar sem montar contexto de tRPC.
- **Validação de entrada** — é o que o tRPC usa para tipar a entrada; sem ele o procedimento aceita `unknown` e a validação vira `if` manual.
- **Serialização** — sem transformer, `Date` e `Decimal` chegam como string na tela e cada componente refaz a conversão.
- **Contexto de request** — resolver sessão e tenant no `createContext` evita que cada procedimento repita a leitura do cookie, que é onde alguém esquece e abre buraco.
- **Server Actions** — seria um segundo caminho de mutação, com outra forma de validar e outra de checar permissão; um caminho só é mais fácil de auditar.
- **Fonte da verdade** — mudar o retorno de um procedimento quebra o build da tela que o consome, na hora, sem passo de geração.
- **Consumo no cliente** — declarar interface de resposta à mão recria a duplicação que o tRPC existe para eliminar.
- **Versionamento** — cliente e servidor sobem no mesmo deploy, então nunca existem duas versões em produção ao mesmo tempo.
- **Formato de erro** — dá formato único de erro para a tela tratar sem ler string de mensagem.
- **Paginação de listas** — offset fica lento e duplica registro quando a lista recebe escrita concorrente; e o `useInfiniteQuery` já espera cursor.
- **Consumidor externo** — se um dia aparecer app mobile ou integração de terceiro, tRPC não serve e será preciso expor REST ao lado.
- **Tempo real** — function serverless não mantém conexão aberta; atualização de tela é polling do TanStack Query.
- **Banco** — já era a decisão; mantida. Traz Auth e Storage sem eu operar servidor de banco. Projeto ocioso no plano gratuito pode ser pausado depois de alguns dias sem uso; em semestre com intervalo entre entregas, vale confirmar o comportamento atual antes de uma apresentação.
- **ORM** — já era a decisão; mantida. Tipagem gerada a partir do schema é o que evita divergência entre modelo e código, e alimenta o tipo que o tRPC devolve.
- **Dono do schema** — Prisma Migrate e Supabase CLI gerenciando o mesmo banco se sobrescrevem; ter dois donos de schema é como o ambiente diverge de produção sem ninguém notar.
- **RLS, policies e triggers** — o Prisma não modela RLS, policy nem trigger, então esses objetos precisam entrar na mesma linha do tempo versionada, não como script solto aplicado à mão pelo painel do Supabase.
- **Instância do Prisma** — em desenvolvimento o Next recarrega o módulo a cada alteração e, sem singleton, cada recarga abre um cliente novo até esgotar a conexão.
- **Conexão de runtime** — obrigatório em serverless, não recomendação: a Vercel escala instâncias em paralelo e cada uma abrindo pool próprio esgota a conexão do projeto.
- **Conexão de migration** — `directUrl`, porta 5432.
- **Seed** — seed que só funciona em banco vazio não serve para ambiente de teste que roda várias vezes.
- **Modelo de multi-tenancy** — schema por tenant multiplicaria cada migration pelo número de tenants; para o escopo do projeto o isolamento lógico basta.
- **Coluna** — tabela sem a coluna não tem como ser protegida por policy e vira o buraco por onde o dado vaza.
- **Vínculo usuário–tenant** — a mesma pessoa pode atuar em mais de uma área com papel diferente em cada; papel gravado no usuário não representa isso.
- **Primeiro tenant** — a estrutura existe desde o primeiro schema mesmo com um único tenant, porque adicionar `tenant_id` depois exige backfill e revisão de toda query que toca a tabela.
- **Origem do tenant** — se o cliente manda o tenant no input do procedimento, trocar o valor é toda a exploração necessária.
- **Aplicação do filtro** — depender de cada service lembrar do `where: { tenantId }` é depender de ninguém esquecer nunca.
- **Provedor de identidade** — já era a decisão; mantida. Não há domínio corporativo para federar, então SSO fica fora de escopo.
- **Cadastro** — sem domínio de e-mail para filtrar, cadastro aberto deixa qualquer pessoa que descubra a URL criar conta num sistema que guarda inventário de infraestrutura.
- **Integração com o Next** / **Sessão no navegador** — como front e servidor estão na mesma origem, o cookie funciona mesmo em `*.vercel.app`, e o token nunca fica legível por JavaScript. É a vantagem concreta do monolito nesse projeto.
- **Renovação de sessão** — sem ele o token expira no meio da navegação e o usuário é deslogado sem motivo aparente.
- **Autorização** — as regras são "está logado", "pertence ao tenant" e "é administrador"; encadear três middlewares resolve isso sem introduzir uma camada de definição de política para aprender.
- **Papel do RLS** — o Prisma conecta com um role dono das tabelas, que bypassa RLS por padrão. Fazer as policies valerem exigiria abrir transação com `SET LOCAL role` e `SET LOCAL request.jwt.claims` a cada request, com custo de transação por chamada e atrito com o pooler.
- **RLS** — se uma credencial vazar ou um procedimento esquecer o middleware, a policy é a última barreira entre tenants. Deny by default garante que tabela nova nasce fechada.
- **Runner** — já era a decisão; mantida. Com um projeto só, um runner só cobre servidor e tela, com a mesma config do build.
- **Componentes (teste)** — Testing Library.
- **Integração de banco** — mockar o Prisma testa o mock, não o banco. Constraint, cascade, transação e policy de RLS só falham contra Postgres de verdade.
- **Teste de procedimento** — testa o procedimento com contexto montado à mão, incluindo middleware de sessão e tenant, sem subir servidor HTTP.
- **E2E de interface** — os fluxos que travam a operação (login, abertura de chamado, cadastro de ativo) precisam ser testados no navegador.
- **Teste obrigatório de isolamento** — vazamento entre tenants é a falha mais cara desse sistema e a mais fácil de introduzir sem perceber; precisa ser verificada por teste, não por revisão.
- **Meta de cobertura** — meta de cobertura produz teste escrito para subir número; caminho crítico é critério verificável.
- **Hospedagem** — o Next é o caso nativo da plataforma, então build, preview e roteamento funcionam sem adapter nem configuração extra.
- **Plano** — o Hobby cobre uso pessoal não-comercial, que é o caso: projeto de disciplina, sem cobrança e sem ninguém sendo pago para escrever o código. Se o sistema sair do contexto acadêmico, o plano precisa mudar antes.
- **Região das functions** — São Paulo é oferecida apenas no Pro; no Hobby as functions rodam nos EUA e cada query paga ida e volta transatlântica. Em contexto de demonstração é aceitável, mas é o primeiro item a mudar se o projeto for usado de verdade.
- **Região do Supabase** — `sa-east-1` (São Paulo).
- **Limite de execução** — vira o teto de qualquer operação: importação de planilha de ativos e relatório grande precisam ser desenhados em lotes que caibam nesse tempo.
- **Fila e agendamento** — não há volume assíncrono conhecido; a consequência é que envio de e-mail e integração externa rodam dentro do request e seguram a resposta.
- **Configuração** — falhar na subida é melhor que `undefined` virando comportamento silencioso em produção. Vale separar as variáveis de servidor das expostas ao cliente, porque `NEXT_PUBLIC_` vai para o bundle.
- **Log** — investigar incidente em sistema multi-tenant sem poder filtrar por tenant é procurar no escuro.
- **Rastreamento de erro** — Sentry.
- **CI** — GitHub Actions.
- **Migration em deploy** — em serverless várias instâncias sobem em paralelo e tentariam migrar ao mesmo tempo.
- **Cabeçalhos HTTP** — cabeçalho de segurança ausente é achado previsível e barato de evitar; no Next não é preciso middleware para isso.
- **CSP** — o cookie é `httpOnly`, mas um XSS ainda faz request autenticado em nome do usuário; a CSP é o que impede.
- **Rate limit** — contador em memória não funciona em serverless, porque cada instância tem o seu e o limite nunca é atingido.
- **Segredos** — Environment variables da Vercel; nada com prefixo `NEXT_PUBLIC_`.
- **`service_role` key do Supabase** — essa chave ignora RLS; num arquivo que o bundle do cliente alcança, ela dá acesso total ao banco para qualquer visitante. A fronteira entre servidor e cliente no Next é fácil de cruzar por engano com um import.
- **Auditoria** — sistema de TI precisa responder quem mudou o quê; retrofitar log de auditoria depois não recupera o passado.
- **Lint e formatação** — com repositório único, uma config só vale para tudo.
- **Hook de pré-commit** — barra o erro trivial antes do CI sem interferir na mensagem de commit.
- **Convenção de commit** — a mensagem é responsabilidade de quem commita; validação automática de formato seria cerimônia sem changelog gerado para justificar.

## Alternativas descartadas

| Alternativa | Motivo do descarte |
|---|---|
| Front e API em projetos separados | Criaria fronteira HTTP, CORS e dois deploys sem equipe separada para justificar |
| REST com OpenAPI gerado | Passo de geração e cliente versionado que o tRPC dispensa dentro de um projeto só |
| GraphQL | Custo de schema, resolver e cache não se paga no volume de telas atual |
| Server Actions para mutação | Segundo caminho de mutação, com outra validação e outra checagem de permissão |
| Server Components buscando dado direto no Prisma | Segundo caminho de leitura, com a checagem de tenant duplicada em outro lugar |
| RLS como autorização primária | O Prisma bypassa RLS por padrão; fazer valer exigiria transação com `SET LOCAL` a cada request |
| Acesso a dado pelo cliente do Supabase em vez do Prisma | Deixaria RLS como autorização, mas espalharia o acesso a dado em dois caminhos e tiraria o tipo do Prisma de dentro do tRPC |
| Cadastro aberto por e-mail | Sem domínio corporativo para filtrar, qualquer pessoa com a URL criaria conta |
| SSO corporativo (OIDC/SAML) | Não há e-mail corporativo para federar |
| Sessão em `localStorage` pelo `supabase-js` | Legível por XSS, e desnecessário: mesma origem permite cookie `httpOnly` |
| Supabase CLI como dono das migrations | Dois donos de schema no mesmo banco se sobrescrevem |
| CASL ou biblioteca de política | As regras cabem em três middlewares de tRPC; a camada extra seria conceito a mais para aprender |
| Zustand ou Redux | O estado de cliente que sobra depois do TanStack Query é pequeno demais |
| Biblioteca de componentes fechada (MUI, Mantine) | O design vem do Figma e precisaria ser imposto por cima do visual da biblioteca |
| Fila (BullMQ, pg-boss) | Sem volume assíncrono conhecido, e worker de vida longa não roda na Vercel |
| Schema ou banco por tenant | Multiplicaria cada migration pelo número de tenants sem exigência que justifique |
| Prisma mockado nos testes | Testa o mock; constraint, transação e policy não são exercitadas |

## Consequências

### O que fica mais fácil

- Mudar o retorno de um procedimento quebra o build da tela que o consome, na hora, sem passo de geração.
- Sessão segura sem esforço: mesma origem permite cookie `httpOnly` sem domínio próprio e sem CORS.
- Uma feature inteira cabe em um PR, num repositório só.
- Menos infraestrutura para montar: um projeto na Vercel, um CI, um runner de teste.
- Deploy atômico: tela e servidor sobem juntos, então nunca há versão do cliente falando com servidor de outra versão.

### O que fica mais difícil

- Escalar as partes de forma independente: front e servidor sobem sempre juntos.
- Segurar a fronteira servidor/cliente: um import errado leva chave secreta para o bundle, e o compilador não avisa em todos os casos.
- Aproveitar Server Components: a decisão de buscar tudo por tRPC descarta o principal recurso do App Router.
- Latência: com as functions nos EUA e o banco em São Paulo, cada query paga a travessia.
- Cold start: a primeira invocação depois de ociosidade paga a inicialização.
- Qualquer operação precisa caber em 60s, o que obriga a desenhar importação e relatório em lotes.
- Envio de e-mail e integração externa seguram a resposta do request.
- Manter middlewares e RLS coerentes exige disciplina — policy desatualizada dá falsa sensação de proteção.

### O que isso impede de fazer depois sem custo

- Atender consumidor não-TypeScript (app mobile nativo, integração de terceiro, webhook tipado): tRPC não serve e seria preciso expor REST ao lado.
- Qualquer funcionalidade com conexão aberta (notificação em tempo real, streaming de log): a Vercel não suporta WebSocket.
- Processamento longo (importação grande, varredura de rede): estoura o limite de execução.
- Trabalho agendado ou assíncrono: exige fila e um lugar para o worker rodar, que não é a Vercel.
- Separar o servidor do front depois: o acoplamento de tipo entre tela e router é justamente o que torna a separação trabalhosa.
- Trocar Prisma por outro ORM: as migrations e o SQL de RLS estão dentro do Prisma Migrate.
- Sair do Supabase: Auth, banco e políticas estão acoplados ao projeto.
- Adicionar `tenant_id` a uma tabela criada sem ele: exige backfill e revisão de toda query que a toca.
- Federar com identidade corporativa depois: exige migrar os usuários já cadastrados por e-mail e senha.

O plano Hobby só vale enquanto o projeto for didático. Se a empresa passar a usar o sistema, é preciso migrar para Pro antes.

## O que este ADR não decide

- Modelagem de domínio, entidades e relacionamentos.
- Design system, tokens e identidade visual.
- Papéis e matriz de permissão dentro de cada tenant.
- Provisionamento de tenant: quem cria, como se convida usuário.
- Provedor de e-mail transacional e demais integrações.
- Estratégia de backup, retenção e plano de recuperação.
- Ambientes (quantos, como são promovidos) e política de branch.
- Feature flags.
- Observabilidade além de log e erro (métrica, tracing distribuído).
- LGPD: base legal, política de retenção e fluxo de exclusão de dados.
- SLO, meta de latência e orçamento de custo.

## Proposta de emenda (2026-11-05) — aguarda decisão do time

Autorizada pelo dono do projeto só para esta sessão; o agente propõe e não decide.

- **`sharp` como `devDependency`**, usada apenas por `skills/imagens-equipamentos` para redimensionar fotos para 800×600 na máquina de quem prepara os dados. Não entra no bundle nem no servidor.
- **Fotos de equipamento** em bucket público `equipment-images` do Supabase Storage. O envio é feito só por pessoa, com a chave `service_role` fora do alcance do agente.
- **Fonte das fotos**: Pixabay (Pixabay Content License, chave gratuita), escolhida pelo dono porque a Pexels não emite chave nova. As fotos são baixadas e hospedadas no nosso bucket, sem hotlink.
