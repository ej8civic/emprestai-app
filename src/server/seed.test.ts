import { readFileSync } from "node:fs";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { exigirConfirmacaoDeProducao, runSeed, PROFESSOR_EMAIL, type ItemDaLista, type Manifesto } from "../../prisma/seed-lib";
import { startTestDb, type TestDb } from "@/test/db";

const DADOS = "prisma/data";
const lista = JSON.parse(readFileSync(`${DADOS}/equipamentos.json`, "utf8")) as ItemDaLista[];
const manifesto = JSON.parse(readFileSync(`${DADOS}/imagens/manifest.json`, "utf8")) as Manifesto;
const SENHA = "senha-so-de-teste-9";
const URL_BASE = "https://projeto.supabase.co";

let t: TestDb;
beforeAll(async () => {
  t = await startTestDb();
});
afterAll(() => t?.stop());

const contar = async () => ({
  equipamentos: await t.db.equipment.count(),
  vinculos: await t.db.membership.count(),
  usuarios: Number((await t.pg<{ n: string }>("select count(*)::text n from auth.users"))[0]?.n),
  identidades: Number((await t.pg<{ n: string }>("select count(*)::text n from auth.identities"))[0]?.n),
  emprestimos: await t.db.loan.count(),
});

// A lista da prática, escrita à mão: o teste não pode herdar um erro do arquivo que ele confere.
const ESPERADOS: [string, string, string, string][] = [
  ["TI-0001", "Notebook 14 polegadas", "NOTEBOOKS", "AVAILABLE"],
  ["TI-0002", "Notebook 15 polegadas", "NOTEBOOKS", "AVAILABLE"],
  ["TI-0003", "Notebook 13 polegadas", "NOTEBOOKS", "AVAILABLE"],
  ["TI-0004", "Notebook 15 polegadas", "NOTEBOOKS", "MAINTENANCE"],
  ["TI-0005", "Monitor 24 polegadas", "MONITORES", "AVAILABLE"],
  ["TI-0006", "Monitor 27 polegadas", "MONITORES", "AVAILABLE"],
  ["TI-0007", "Monitor 22 polegadas", "MONITORES", "MAINTENANCE"],
  ["TI-0008", "Cabo HDMI 2 m", "CABOS", "AVAILABLE"],
  ["TI-0009", "Cabo USB-C 1 m", "CABOS", "AVAILABLE"],
  ["TI-0010", "Cabo de rede 3 m", "CABOS", "MAINTENANCE"],
  ["TI-0011", "Webcam Full HD", "CAMERAS", "AVAILABLE"],
  ["TI-0012", "Câmera compacta", "CAMERAS", "AVAILABLE"],
];

describe("seed (spec 003)", () => {
  it("test_ca_36_rodar_duas_vezes_nao_duplica_nada", async () => {
    const primeira = await runSeed(t.db, { lista, manifesto, supabaseUrl: URL_BASE, professorPassword: SENHA });
    const depois1 = await contar();
    const segunda = await runSeed(t.db, { lista, manifesto, supabaseUrl: URL_BASE, professorPassword: SENHA });
    const depois2 = await contar();

    expect(depois1).toEqual({ equipamentos: 12, vinculos: 3, usuarios: 3, identidades: 3, emprestimos: 0 });
    expect(depois2).toEqual(depois1);
    expect(primeira.credenciais).toHaveLength(2); // operacoes@ e teste@; a do professor não volta
    expect(segunda.credenciais).toEqual([]);
  });

  it("test_ca_30_os_12_equipamentos_da_lista_e_so_eles", async () => {
    const linhas = await t.db.equipment.findMany({ orderBy: { patrimonio: "asc" }, include: { tenant: true } });
    expect(linhas.map((l) => [l.patrimonio, l.name, l.category, l.status])).toEqual(ESPERADOS);
    expect(new Set(linhas.map((l) => l.tenant.slug))).toEqual(new Set(["suporte_ti"]));
  });

  it("test_ca_31_manutencao_so_em_ti_0004_ti_0007_e_ti_0010", async () => {
    const manutencao = await t.db.equipment.findMany({ where: { status: "MAINTENANCE" }, orderBy: { patrimonio: "asc" } });
    expect(manutencao.map((m) => m.patrimonio)).toEqual(["TI-0004", "TI-0007", "TI-0010"]);
    expect(await t.db.equipment.count({ where: { status: "AVAILABLE" } })).toBe(9);
  });

  it("test_ca_32_image_url_aponta_para_o_bucket_publico_de_cada_item", async () => {
    for (const l of await t.db.equipment.findMany()) {
      expect(l.imageUrl).toBe(`${URL_BASE}/storage/v1/object/public/equipment-images/${l.patrimonio}.jpg`);
    }
  });

  it("test_ca_35_credito_de_cada_imagem_fica_no_banco", async () => {
    for (const l of await t.db.equipment.findMany()) {
      const c = manifesto.itens[l.patrimonio]!;
      expect([l.imageSource, l.imageAuthor, l.imageLicense, l.imageSourceUrl]).toEqual([c.fonte, c.autor, c.licenca, c.paginaOrigem]);
      expect(l.imageSource).toBe("Pixabay");
    }
  });

  it("test_ca_37_professor_entra_com_a_senha_de_fora_e_nao_ha_senha_no_codigo", async () => {
    const [u] = await t.pg<{ id: string; ok: boolean }>(
      `select id::text, encrypted_password = extensions.crypt('${SENHA}', encrypted_password) as ok from auth.users where email = '${PROFESSOR_EMAIL}'`,
    );
    expect(u?.ok).toBe(true);
    const m = await t.db.membership.findFirstOrThrow({ where: { email: PROFESSOR_EMAIL }, include: { tenant: true } });
    expect([m.role, m.tenant.slug, m.userId]).toEqual(["COLABORADOR", "suporte_ti", u!.id]);
    for (const arquivo of ["prisma/seed.ts", "prisma/seed-lib.ts"]) {
      expect(readFileSync(arquivo, "utf8")).not.toMatch(/Inovacao2026/i);
    }
  });

  it("test_ca_37_sem_senha_o_seed_recusa_criar_o_professor", async () => {
    const outro = await startTestDb();
    try {
      await expect(runSeed(outro.db, { lista, supabaseUrl: URL_BASE })).rejects.toThrow(/PROFESSOR_PASSWORD/);
    } finally {
      await outro.stop();
    }
  });

  it("test_ca_38_o_seed_nao_cria_nenhum_emprestimo", async () => {
    expect(await t.db.loan.count()).toBe(0);
    const professor = await t.db.membership.findFirstOrThrow({ where: { email: PROFESSOR_EMAIL } });
    expect(await t.db.loan.count({ where: { membershipId: professor.id } })).toBe(0);
  });

  it("test_ca_39_seed_recusa_banco_remoto_sem_confirm_prod", () => {
    const remoto = "postgresql://u:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
    expect(() => exigirConfirmacaoDeProducao(remoto, {})).toThrow(/CONFIRM_PROD/);
    expect(() => exigirConfirmacaoDeProducao(remoto, { CONFIRM_PROD: "talvez" })).toThrow(/CONFIRM_PROD/);
    expect(() => exigirConfirmacaoDeProducao(remoto, { CONFIRM_PROD: "sim" })).not.toThrow();
    expect(() => exigirConfirmacaoDeProducao("postgresql://u:p@localhost:5432/db", {})).not.toThrow();
    expect(() => exigirConfirmacaoDeProducao("postgresql://u:p@127.0.0.1:55432/db", {})).not.toThrow();
  });
});

describe("reset-producao.sql (spec 003)", () => {
  const sql = readFileSync("pratica-sa-051126/scripts/reset-producao.sql", "utf8");
  const rodar = async (url: string) => {
    const c = new Client({ connectionString: url });
    await c.connect();
    try {
      await c.query(sql);
    } finally {
      await c.end();
    }
  };

  it("test_ca_36_reset_zera_a_demonstracao_e_preserva_o_tenant_e_recusa_conta_real", async () => {
    const r = await startTestDb();
    try {
      await runSeed(r.db, { lista, manifesto, supabaseUrl: URL_BASE, professorPassword: SENHA });
      // O professor não é de demonstração: o reset precisa abortar sem apagar nada.
      await expect(rodar(r.url)).rejects.toThrow(/não são de demonstração/);
      expect(await r.db.equipment.count()).toBe(12);

      // Tira a conta real e roda de novo: só sobra o tenant.
      await r.pg(`delete from auth.identities where user_id in (select id from auth.users where email = '${PROFESSOR_EMAIL}')`);
      await r.pg(`delete from memberships where email = '${PROFESSOR_EMAIL}'`);
      await r.pg(`delete from auth.users where email = '${PROFESSOR_EMAIL}'`);
      await rodar(r.url);
      expect([await r.db.equipment.count(), await r.db.membership.count(), await r.db.loan.count(), await r.db.tenant.count()]).toEqual([0, 0, 0, 1]);
      expect(await r.pg("select id from auth.users")).toEqual([]);

      // Depois do reset o seed recria tudo.
      await runSeed(r.db, { lista, manifesto, supabaseUrl: URL_BASE, professorPassword: SENHA });
      expect(await r.db.equipment.count()).toBe(12);
    } finally {
      await r.stop();
    }
  });
});
