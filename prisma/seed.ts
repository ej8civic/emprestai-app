/**
 * Seed idempotente (ADR-001). Rodar duas vezes não duplica nada.
 *
 * Cadastro é fechado: sem tela de signup, os usuários nascem aqui, no Auth do Supabase.
 * A senha de quem for criado agora é aleatória e vai para `.seed-credentials.txt`
 * (ignorado pelo git). Nada de senha em log ou commit.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { PrismaClient, type Category, type EquipmentStatus, type Role } from "@prisma/client";

const db = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

const PEOPLE: { name: string; email: string; department: string; role: Role }[] = [
  { name: "Operações", email: "operacoes@empresti.example", department: "Balcão · 2º andar", role: "OPERACOES" },
  { name: "Marina Alves", email: "marina.alves@empresti.example", department: "Design", role: "COLABORADOR" },
  { name: "Rafael Lima", email: "rafael.lima@empresti.example", department: "Engenharia", role: "COLABORADOR" },
  { name: "Camila Duarte", email: "camila.duarte@empresti.example", department: "Financeiro", role: "COLABORADOR" },
  { name: "Tiago Menezes", email: "tiago.menezes@empresti.example", department: "Comercial", role: "COLABORADOR" },
  { name: "Ana Sato", email: "ana.sato@empresti.example", department: "Marketing", role: "COLABORADOR" },
  { name: "Bruno Kato", email: "bruno.kato@empresti.example", department: "Engenharia", role: "COLABORADOR" },
  { name: "Helena Prado", email: "helena.prado@empresti.example", department: "Jurídico", role: "COLABORADOR" },
];

type Seed = {
  patrimonio: string;
  name: string;
  category: Category;
  description: string;
  status?: EquipmentStatus;
};

const EQUIPMENT: Seed[] = [
  { patrimonio: "PAT-1042", name: 'MacBook Pro 14"', category: "NOTEBOOKS", description: "Notebook corporativo para desenho e build local." },
  { patrimonio: "PAT-1188", name: "ThinkPad T14", category: "NOTEBOOKS", description: "Notebook Linux/Windows para campo e suporte." },
  { patrimonio: "PAT-0733", name: 'MacBook Air 13" M2', category: "NOTEBOOKS", description: "Notebook leve para reuniões e viagens." },
  { patrimonio: "PAT-0871", name: 'Dell UltraSharp 27"', category: "MONITORES", description: "Monitor 4K com calibração de fábrica." },
  { patrimonio: "PAT-0910", name: 'LG UltraFine 24"', category: "MONITORES", description: "Monitor 4K USB-C para estação de trabalho." },
  { patrimonio: "PAT-0802", name: 'Samsung Odyssey 27"', category: "MONITORES", description: "Monitor 144 Hz para testes de interface." },
  { patrimonio: "PAT-0233", name: "Sony A7 III", category: "CAMERAS", description: "Câmera mirrorless para fotos e vídeo institucional." },
  { patrimonio: "PAT-0640", name: "Logitech Brio 4K", category: "CAMERAS", description: "Webcam 4K para salas de reunião." },
  { patrimonio: "PAT-0455", name: "Dock USB-C Anker", category: "CABOS", description: "Dock com HDMI, Ethernet e carregamento.", status: "MAINTENANCE" },
  { patrimonio: "PAT-0290", name: "Cabo USB-C 2 m", category: "CABOS", description: "Cabo USB-C 100 W com dados 10 Gbps." },
  { patrimonio: "PAT-0519", name: "Cabo HDMI 4K 3 m", category: "CABOS", description: "Cabo HDMI 2.1 para projetor e TV." },
  { patrimonio: "PAT-0102", name: "Projetor Epson X49", category: "PROJETORES", description: "Projetor XGA para salas sem tela.", status: "MAINTENANCE" },
];

// [patrimônio, quem, retirado há N dias, prazo em N dias a partir da retirada, devolvido há N dias | null]
const LOANS: [string, string, number, number, number | null][] = [
  ["PAT-1188", "Marina Alves", 7, 14, null],
  ["PAT-0910", "Marina Alves", 4, 14, null],
  ["PAT-0233", "Rafael Lima", 2, 14, null],
  ["PAT-0802", "Ana Sato", 9, 14, null],
  ["PAT-0290", "Bruno Kato", 12, 14, null],
  ["PAT-0733", "Camila Duarte", 20, 14, null], // atrasado
  ["PAT-0640", "Tiago Menezes", 18, 14, null], // atrasado
  ["PAT-0519", "Helena Prado", 17, 14, null], // atrasado
  // histórico do PAT-1042
  ["PAT-1042", "Marina Alves", 45, 14, 33],
  ["PAT-1042", "Rafael Lima", 30, 14, 12],
];

async function ensureUser(p: (typeof PEOPLE)[number]): Promise<{ id: string; password?: string }> {
  const existing = await db.$queryRaw<{ id: string }[]>`select id::text from auth.users where email = ${p.email} limit 1`;
  if (existing[0]) return { id: existing[0].id };

  const id = randomUUID();
  const password = randomBytes(12).toString("base64url");
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
  return { id, password };
}

async function main() {
  const tenant = await db.tenant.upsert({
    where: { slug: "suporte_ti" },
    update: {},
    create: { slug: "suporte_ti", name: "Suporte de TI" },
  });

  const members = new Map<string, string>();
  const created: string[] = [];
  for (const p of PEOPLE) {
    const user = await ensureUser(p);
    const m = await db.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { name: p.name, department: p.department, role: p.role },
      create: { userId: user.id, tenantId: tenant.id, role: p.role, name: p.name, email: p.email, department: p.department },
    });
    members.set(p.name, m.id);
    if (user.password) created.push(`${p.email}\t${user.password}`);
  }

  const equipmentIds = new Map<string, string>();
  for (const e of EQUIPMENT) {
    const row = await db.equipment.upsert({
      where: { tenantId_patrimonio: { tenantId: tenant.id, patrimonio: e.patrimonio } },
      update: {},
      create: { tenantId: tenant.id, ...e },
    });
    equipmentIds.set(e.patrimonio, row.id);
  }

  // Empréstimos de exemplo só entram num tenant sem nenhum: rodar de novo não duplica.
  if ((await db.loan.count({ where: { tenantId: tenant.id } })) === 0) {
    for (const [pat, who, loanedDaysAgo, days, returnedDaysAgo] of LOANS) {
      const loanedAt = ago(loanedDaysAgo);
      await db.loan.create({
        data: {
          tenantId: tenant.id,
          equipmentId: equipmentIds.get(pat)!,
          membershipId: members.get(who)!,
          loanedAt,
          dueAt: new Date(loanedAt.getTime() + days * DAY),
          returnedAt: returnedDaysAgo === null ? null : ago(returnedDaysAgo),
        },
      });
    }
  }

  if (created.length > 0) {
    appendFileSync(".seed-credentials.txt", created.join("\n") + "\n");
    console.log(`Seed ok. ${created.length} usuário(s) novo(s); senhas em .seed-credentials.txt`);
  } else {
    console.log("Seed ok. Nenhum usuário novo.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
