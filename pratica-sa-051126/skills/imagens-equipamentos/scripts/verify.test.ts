import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error módulo .mjs sem tipos
import { verificar } from "./verify.mjs";

const lista = Array.from({ length: 12 }, (_, i) => `TI-${String(i + 1).padStart(4, "0")}`);
let dir: string;

async function foto(cor: number, w = 800, h = 600) {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: cor, g: 40, b: 90 } } }).jpeg().toBuffer();
}

type Item = Record<string, unknown>;
async function montar(mexer?: (itens: Record<string, Item>, bytes: Record<string, Buffer>) => void | Promise<void>) {
  const itens: Record<string, Item> = {};
  const bytes: Record<string, Buffer> = {};
  for (const [i, pat] of lista.entries()) {
    bytes[pat] = await foto(10 + i * 15);
    itens[pat] = {
      arquivo: `images/${pat}.jpg`, largura: 800, altura: 600,
      sha256: createHash("sha256").update(bytes[pat]!).digest("hex"),
      fonte: "Pixabay", idOrigem: 1000 + i, autor: `autor${i}`,
      paginaOrigem: `https://pixabay.com/photos/x-${1000 + i}/`, licenca: "Pixabay Content License",
      termoBusca: "x", revisao: "aprovada", reprovadas: [],
    };
  }
  await mexer?.(itens, bytes);
  mkdirSync(path.join(dir, "images"), { recursive: true });
  for (const pat of Object.keys(itens)) writeFileSync(path.join(dir, `images/${pat}.jpg`), bytes[pat]!);
  writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ itens }));
  return verificar(dir) as Promise<string[]>;
}

beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), "imgs-")); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("verify.mjs (spec 003)", () => {
  it("test_ca_33_aceita_12_imagens_800x600_e_recusa_outro_tamanho", async () => {
    expect(await montar()).toEqual([]);
    const ruim = await montar(async (it, b) => {
      b["TI-0005"]! = await foto(200, 640, 480);
      it["TI-0005"]!.sha256 = createHash("sha256").update(b["TI-0005"]!).digest("hex");
    });
    expect(ruim).toEqual(["TI-0005: 640x480, esperado 800x600"]);
  });

  it("test_ca_34_recusa_mesma_foto_em_dois_equipamentos", async () => {
    const igual = await montar((it, b) => {
      b["TI-0002"]! = b["TI-0001"]!;
      it["TI-0002"]!.sha256 = it["TI-0001"]!.sha256;
    });
    expect(igual.some((p) => p.startsWith("TI-0002: mesma imagem de TI-0001"))).toBe(true);
    const origem = await montar((it) => { it["TI-0003"]!.idOrigem = it["TI-0004"]!.idOrigem; });
    expect(origem).toContain("TI-0004: mesmo id de origem de TI-0003");
  });

  it("test_ca_35_recusa_credito_incompleto_e_fonte_que_nao_e_pixabay", async () => {
    const p = await montar((it) => {
      it["TI-0001"]!.autor = "";
      it["TI-0002"]!.fonte = "Pexels";
      it["TI-0003"]!.paginaOrigem = "https://example.com/foto";
    });
    expect(p).toContain("TI-0001: crédito sem autor");
    expect(p).toContain('TI-0002: fonte "Pexels", só Pixabay é aceita');
    expect(p).toContain("TI-0003: paginaOrigem fora de pixabay.com");
  });

  it("test_ca_3a_recusa_foto_sem_revisao_aprovada", async () => {
    const p = await montar((it) => { it["TI-0006"]!.revisao = "pendente"; it["TI-0007"]!.revisao = "reprovada"; });
    expect(p).toEqual([
      'TI-0006: revisão visual "pendente", precisa ser "aprovada"',
      'TI-0007: revisão visual "reprovada", precisa ser "aprovada"',
    ]);
  });
});
