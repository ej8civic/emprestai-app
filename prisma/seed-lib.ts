/**
 * Núcleo do seed (spec 003). Separado de `seed.ts` para os testes rodarem contra um Postgres de teste.
 *
 * Idempotente: duas execuções não duplicam equipamento, usuário nem vínculo. Não cria empréstimo.
 * A senha do professor vem de fora (`PROFESSOR_PASSWORD`); nenhuma senha mora neste arquivo.
 */
import { randomBytes, randomUUID } from "node:crypto";
import type { Category, EquipmentStatus, PrismaClient, Role } from "@prisma/client";

export type ItemDaLista = {
  patrimonio: string;
  nome: string;
  categoria: "notebook" | "monitor" | "cabo" | "camera";
  situacao: "disponivel" | "manutencao";
};

export type Manifesto = {
  itens: Record<string, { fonte: string; autor: string; paginaOrigem: string; licenca: string }>;
};

export type Pessoa = { name: string; email: string; department: string; role: Role; fixedPassword?: string };

const CATEGORIA: Record<ItemDaLista["categoria"], Category> = {
  notebook: "NOTEBOOKS",
  monitor: "MONITORES",
  cabo: "CABOS",
  camera: "CAMERAS",
};
const SITUACAO: Record<ItemDaLista["situacao"], EquipmentStatus> = {
  disponivel: "AVAILABLE",
  manutencao: "MAINTENANCE",
};

export const PROFESSOR_EMAIL = "marcelo.grilo@institutojef.org.br";
export const BUCKET = "equipment-images";

const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);

/** CA-39: contra um banco que não é local, o seed só roda com CONFIRM_PROD=sim, dito por uma pessoa. */
export function exigirConfirmacaoDeProducao(databaseUrl: string | undefined, env: Record<string, string | undefined>) {
  if (!databaseUrl) throw new Error("DATABASE_URL ausente");
  const host = new URL(databaseUrl).hostname;
  if (!HOSTS_LOCAIS.has(host) && env.CONFIRM_PROD !== "sim") {
    throw new Error("O banco não é local: confirme com CONFIRM_PROD=sim. Esse passo é de uma pessoa, não do agente.");
  }
}

export function pessoas(professorPassword: string | undefined): Pessoa[] {
  return [
    { name: "Marcelo Grilo", email: PROFESSOR_EMAIL, department: "Professor", role: "COLABORADOR", fixedPassword: professorPassword },
    { name: "Operações", email: "operacoes@empresti.example", department: "Balcão · 2º andar", role: "OPERACOES" },
    { name: "Conta de teste", email: "teste@empresti.example", department: "Testes", role: "COLABORADOR" },
  ];
}

async function ensureUser(db: PrismaClient, p: Pessoa): Promise<{ id: string; password?: string }> {
  const existing = await db.$queryRaw<{ id: string }[]>`select id::text from auth.users where email = ${p.email} limit 1`;
  if (existing[0]) return { id: existing[0].id };

  const password = p.fixedPassword ?? (p.email === PROFESSOR_EMAIL ? undefined : randomBytes(12).toString("base64url"));
  if (!password) throw new Error("PROFESSOR_PASSWORD ausente: a conta do professor ainda não existe e precisa de senha.");
  const id = randomUUID();
  await db.$executeRaw`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', ${id}::uuid, 'authenticated', 'authenticated', ${p.email},
      extensions.crypt(${password}, extensions.gen_salt('bf', 10)), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, ${JSON.stringify({ name: p.name })}::jsonb, now(), now(),
      '', '', '', ''
    )`;
  await db.$executeRaw`
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), ${id}::uuid, ${id}, ${JSON.stringify({ sub: id, email: p.email, email_verified: true })}::jsonb,
      'email', now(), now(), now()
    )`;
  // Só as contas com senha aleatória voltam para o chamador; a do professor já é conhecida de quem rodou.
  return { id, password: p.fixedPassword ? undefined : password };
}

export async function runSeed(
  db: PrismaClient,
  opts: { lista: ItemDaLista[]; manifesto?: Manifesto; supabaseUrl: string; professorPassword?: string },
): Promise<{ credenciais: string[] }> {
  const tenant = await db.tenant.upsert({
    where: { slug: "suporte_ti" },
    update: {},
    create: { slug: "suporte_ti", name: "Suporte de TI" },
  });

  const credenciais: string[] = [];
  for (const p of pessoas(opts.professorPassword)) {
    const user = await ensureUser(db, p);
    await db.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { name: p.name, department: p.department, role: p.role },
      create: { userId: user.id, tenantId: tenant.id, role: p.role, name: p.name, email: p.email, department: p.department },
    });
    if (user.password) credenciais.push(`${p.email}\t${user.password}`);
  }

  for (const item of opts.lista) {
    const credito = opts.manifesto?.itens[item.patrimonio];
    // Só as colunas de imagem são reescritas numa nova execução; situação e nome não, para não desfazer o uso real.
    const imagem = credito
      ? {
          imageUrl: `${opts.supabaseUrl}/storage/v1/object/public/${BUCKET}/${item.patrimonio}.jpg`,
          imageSource: credito.fonte,
          imageAuthor: credito.autor,
          imageLicense: credito.licenca,
          imageSourceUrl: credito.paginaOrigem,
        }
      : {};
    await db.equipment.upsert({
      where: { tenantId_patrimonio: { tenantId: tenant.id, patrimonio: item.patrimonio } },
      update: imagem,
      create: {
        tenantId: tenant.id,
        patrimonio: item.patrimonio,
        name: item.nome,
        category: CATEGORIA[item.categoria],
        status: SITUACAO[item.situacao],
        ...imagem,
      },
    });
  }

  return { credenciais };
}
