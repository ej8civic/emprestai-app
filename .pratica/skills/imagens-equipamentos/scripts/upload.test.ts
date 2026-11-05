import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error módulo .mjs sem tipos
import { enviar, exigirTravas } from "./upload.mjs";

const out = path.resolve(__dirname, "../../../../prisma/data/imagens");

type Chamada = { url: string; method: string; headers: Record<string, string> };
function falso(respostas: Partial<Record<string, number>> = {}) {
  const chamadas: Chamada[] = [];
  const fetchFn = async (url: string, init: { method: string; headers?: Record<string, string> }) => {
    chamadas.push({ url, method: init.method, headers: init.headers ?? {} });
    const status = respostas[`${init.method} ${url}`] ?? 200;
    return { ok: status < 400, status, text: async () => "" } as Response;
  };
  return { chamadas, fetchFn };
}
const ambiente = { SUPABASE_SERVICE_ROLE_KEY: "chave-so-de-teste", CONFIRM_PROD: "sim", NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" };

describe("upload.mjs (spec 003)", () => {
  it("test_ca_39_sem_a_chave_service_role_nada_e_enviado", async () => {
    const { chamadas, fetchFn } = falso();
    await expect(enviar({ env: { ...ambiente, SUPABASE_SERVICE_ROLE_KEY: "" }, out, fetchFn })).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(chamadas).toEqual([]);
  });

  it("test_ca_39_sem_confirm_prod_sim_nada_e_enviado", async () => {
    const { chamadas, fetchFn } = falso();
    expect(() => exigirTravas({ ...ambiente, CONFIRM_PROD: "" })).toThrow(/CONFIRM_PROD/);
    await expect(enviar({ env: { ...ambiente, CONFIRM_PROD: "talvez" }, out, fetchFn })).rejects.toThrow(/CONFIRM_PROD/);
    expect(chamadas).toEqual([]);
  });

  it("test_ca_39_dry_run_nao_precisa_de_chave_e_nao_faz_nenhum_pedido", async () => {
    const { chamadas, fetchFn } = falso();
    const r = await enviar({ env: {}, out, fetchFn, dryRun: true });
    expect(r.planejados).toHaveLength(12);
    expect(chamadas).toEqual([]);
  });

  it("test_ca_36_enviar_duas_vezes_usa_os_mesmos_12_objetos_com_upsert", async () => {
    const a = falso();
    const b = falso();
    const r1 = await enviar({ env: ambiente, out, fetchFn: a.fetchFn });
    const r2 = await enviar({ env: ambiente, out, fetchFn: b.fetchFn });
    expect(r1.enviados).toEqual(r2.enviados);
    expect(new Set(r1.enviados).size).toBe(12);
    const posts = a.chamadas.filter((c) => c.url.includes("/storage/v1/object/equipment-images/"));
    expect(posts).toHaveLength(12);
    expect(posts.every((c) => c.headers["x-upsert"] === "true")).toBe(true);
  });

  it("test_ca_32_url_publica_que_nao_abre_derruba_o_envio", async () => {
    const { fetchFn } = falso({ "HEAD https://x.supabase.co/storage/v1/object/public/equipment-images/TI-0003.jpg": 400 });
    await expect(enviar({ env: ambiente, out, fetchFn })).rejects.toThrow(/TI-0003.*URL pública/);
  });

  it("test_ca_39_o_script_nao_le_a_chave_de_arquivo_nenhum", () => {
    const fonte = readFileSync(path.resolve(__dirname, "upload.mjs"), "utf8");
    expect(fonte).not.toMatch(/loadEnvFile|dotenv/);
    expect(fonte).not.toMatch(/SERVICE_ROLE_KEY="?\s*\S{20,}/);
  });
});
