import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed, PROFESSOR_EMAIL, type ItemDaLista, type Manifesto } from "../../prisma/seed-lib";
import { startTestDb, type TestDb } from "@/test/db";

const SKILL = "pratica-sa-051126/skills/imagens-equipamentos";
const lista = JSON.parse(readFileSync(`${SKILL}/references/equipamentos.json`, "utf8")) as ItemDaLista[];
const manifesto = JSON.parse(readFileSync(`${SKILL}/out/manifest.json`, "utf8")) as Manifesto;
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
});
