// Spec 003 em produção, SOMENTE LEITURA: não pede, não devolve, não cadastra nada.
//
//   BASE_URL=https://... PROFESSOR_PASSWORD=... node e2e/live-check-dados.mjs
//
// CA-32  as 12 imagens abrem pela URL pública, sem login, em JPEG 800x600 e todas diferentes.
// CA-37  marcelo.grilo@institutojef.org.br entra pelo login do sistema e tem zero empréstimos.
// CA-30  o catálogo, visto pelo professor, lista os 12 equipamentos.
// A senha vem do ambiente de quem roda e nunca é impressa.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import sharp from "sharp";

const base = process.env.BASE_URL;
const senha = process.env.PROFESSOR_PASSWORD;
if (!base || !senha) throw new Error("Defina BASE_URL e PROFESSOR_PASSWORD");
const email = "marcelo.grilo@institutojef.org.br";

function urlDoProjeto() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const m = existsSync(".env") && readFileSync(".env", "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL="?([^"\r\n]+)"?/m);
  if (!m) throw new Error("NEXT_PUBLIC_SUPABASE_URL ausente");
  return m[1].replace(/\/$/, "");
}

const problemas = [];
const ok = (m) => console.log(`ok   ${m}`);

// CA-32 · imagens públicas, sem nenhuma credencial.
const supabase = urlDoProjeto();
const hashes = new Set();
for (let i = 1; i <= 12; i++) {
  const pat = `TI-${String(i).padStart(4, "0")}`;
  const r = await fetch(`${supabase}/storage/v1/object/public/equipment-images/${pat}.jpg`);
  if (!r.ok) {
    problemas.push(`CA-32 ${pat}: HTTP ${r.status}`);
    continue;
  }
  const bytes = Buffer.from(await r.arrayBuffer());
  const meta = await sharp(bytes).metadata();
  if (!/image\/jpeg/.test(r.headers.get("content-type") ?? "")) problemas.push(`CA-32 ${pat}: content-type ${r.headers.get("content-type")}`);
  if (meta.width !== 800 || meta.height !== 600) problemas.push(`CA-32 ${pat}: ${meta.width}x${meta.height}`);
  hashes.add(createHash("sha256").update(bytes).digest("hex"));
}
if (hashes.size !== 12) problemas.push(`CA-32: ${hashes.size} imagens distintas, esperado 12`);
else if (!problemas.some((p) => p.startsWith("CA-32"))) ok("CA-32 12 imagens abrem sem login, JPEG 800x600, todas diferentes");

// CA-37 e CA-30 · login do professor pelo sistema.
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${base}/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await page.waitForURL("**/catalogo", { timeout: 30000 });
  ok("CA-37 o professor entra pelo login do sistema");

  await page.getByText("12 equipamentos").waitFor({ timeout: 15000 });
  ok("CA-30 o catálogo lista os 12 equipamentos");

  await page.goto(`${base}/meus-emprestimos`);
  await page.getByText("0 de 3 itens").first().waitFor({ timeout: 15000 });
  ok("CA-37 o professor tem zero empréstimos");
} catch (e) {
  problemas.push(`CA-37/CA-30: ${String(e.message).split("\n")[0].replaceAll(senha, "***")}`);
} finally {
  await browser.close();
}

console.log(problemas.length ? `\n${problemas.length} problema(s):\n- ${problemas.join("\n- ")}` : "\nTudo certo.");
process.exit(problemas.length ? 1 : 0);
