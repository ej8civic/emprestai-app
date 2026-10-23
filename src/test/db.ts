import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient, type Role } from "@prisma/client";
import { Client } from "pg";

/**
 * Postgres real em container (ADR-001: nada de Prisma mockado). O Supabase traz `auth.uid()` e os
 * roles `anon`/`authenticated`; aqui só o mínimo disso existe, para as policies da migration subirem.
 */
const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;

export type TestDb = {
  db: PrismaClient;
  url: string;
  pg: <T = Record<string, unknown>>(sql: string, setup?: string[]) => Promise<T[]>;
  stop: () => Promise<void>;
};

export async function startTestDb(): Promise<TestDb> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();

  const admin = new Client({ connectionString: url });
  await admin.connect();
  await admin.query(SUPABASE_SHIM);
  const dir = path.resolve(__dirname, "../../prisma/migrations");
  for (const name of readdirSync(dir).filter((n) => /^\d/.test(n)).sort()) {
    await admin.query(readFileSync(path.join(dir, name, "migration.sql"), "utf8"));
  }
  await admin.end();

  const db = new PrismaClient({ datasources: { db: { url } } });
  return {
    db,
    url,
    // Roda SQL numa conexão própria; `setup` serve para `set role` e claims.
    async pg(sql, setup = []) {
      const c = new Client({ connectionString: url });
      await c.connect();
      try {
        for (const s of setup) await c.query(s);
        return (await c.query(sql)).rows;
      } finally {
        await c.end();
      }
    },
    async stop() {
      await db.$disconnect();
      await container.stop();
    },
  };
}

export type Tenant = Awaited<ReturnType<typeof makeTenant>>;

let seq = 0;
const uuid = () => crypto.randomUUID();

/** Tenant com uma pessoa de Operações, uma colaboradora e dois equipamentos. */
export async function makeTenant(db: PrismaClient, slug: string) {
  const tenant = await db.tenant.create({ data: { slug, name: slug } });
  const member = (role: Role, name: string) =>
    db.membership.create({
      data: { tenantId: tenant.id, userId: uuid(), role, name, email: `${name}@${slug}.test`, department: "Teste" },
    });
  const [ops, ana] = await Promise.all([member("OPERACOES", `ops-${slug}`), member("COLABORADOR", `ana-${slug}`)]);
  const item = (n: string, status: "AVAILABLE" | "MAINTENANCE" = "AVAILABLE") =>
    db.equipment.create({
      data: { tenantId: tenant.id, patrimonio: `PAT-${String(++seq).padStart(4, "0")}`, name: n, category: "NOTEBOOKS", status },
    });
  const equipment = await Promise.all([item("Notebook A"), item("Notebook B"), item("Notebook C"), item("Notebook D")]);
  const broken = await item("Notebook quebrado", "MAINTENANCE");
  return { tenant, ops, ana, equipment, broken };
}

/** Contexto de tRPC montado à mão, como o `createContext` faria a partir da sessão. */
export function ctxFor(db: PrismaClient, membership: Awaited<ReturnType<typeof makeTenant>>["ops"]) {
  return {
    db,
    requestId: "test",
    user: { id: membership.userId } as never,
    membership,
  };
}
