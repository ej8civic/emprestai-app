// Verificação SOMENTE LEITURA contra um ambiente publicado: não pede, não devolve, não cadastra.
// Uso: BASE_URL=https://... SHOTS=<pasta> node e2e/live-check.mjs   (credenciais em .seed-credentials.txt)
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.env.BASE_URL;
if (!base) throw new Error("Defina BASE_URL");
const shots = process.env.SHOTS ?? "e2e-shots";
mkdirSync(shots, { recursive: true });
const creds = Object.fromEntries(
  readFileSync(".seed-credentials.txt", "utf8").trim().split(/\r?\n/).map((l) => l.split("\t")),
);

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
const problems = [];
const ok = (m) => console.log(`ok   ${m}`);
let step = "início";

async function session() {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on("console", (m) => {
    if (/status of (401|409)/.test(m.text())) return;
    if (m.type() === "error" || /content security policy/i.test(m.text())) problems.push(`[${step}] console: ${m.text().slice(0, 180)}`);
  });
  page.on("pageerror", (e) => problems.push(`[${step}] pageerror: ${e.message.slice(0, 180)}`));
  return page;
}
async function login(page, email) {
  await page.goto(`${base}/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(creds[email]);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await page.waitForURL("**/catalogo", { timeout: 30000 });
}
const shot = (p, n) => p.screenshot({ path: path.join(shots, `live-${n}.png`) });

step = "anônimo";
const a = await session();
await a.goto(`${base}/catalogo`);
await a.waitForURL("**/login");
ok("anônimo é mandado para /login");
await a.getByLabel("E-mail").fill("marina.alves@empresti.example");
await a.getByLabel("Senha").fill("senha-errada");
await a.getByRole("button", { name: /Entrar/ }).click();
await a.getByText("E-mail ou senha incorretos.").waitFor();
ok("senha errada é recusada");

step = "colaborador";
await login(a, "marina.alves@empresti.example");
await a.getByText("disponíveis agora").waitFor();
await a.getByText("12 equipamentos").waitFor();
await shot(a, "catalogo");
ok("catálogo lê 12 equipamentos do banco");
await a.getByRole("link", { name: /Dell UltraSharp/ }).click();
await a.getByRole("button", { name: /Solicitar empréstimo/ }).waitFor();
ok("detalhe de item disponível abre");
await a.goto(`${base}/meus-emprestimos`);
await a.getByText("2 de 3 itens").first().waitFor();
await shot(a, "meus-emprestimos");
ok("Marina está com 2 de 3 itens");
await a.goto(`${base}/operacoes/emprestimos`);
await a.getByText("Só Operações vê esta tela.").waitFor();
ok("colaborador é barrado em Operações");
await a.getByRole("button", { name: "Sair" }).click().catch(() => {});
await a.context().close();

step = "operações";
const o = await session();
await login(o, "operacoes@empresti.example");
await o.goto(`${base}/operacoes/emprestimos`);
await o.getByText("Empréstimos em aberto").first().waitFor();
await o.getByText("Atrasado", { exact: true }).first().waitFor();
await shot(o, "operacoes");
const late = await o.getByText("Atrasado", { exact: true }).count();
if (late === 3) ok("Operações vê os 3 atrasos");
else problems.push(`esperava 3 atrasos, vi ${late}`);
await o.context().close();

await browser.close();
console.log(problems.length ? `\n${problems.length} problema(s):\n- ${problems.join("\n- ")}` : "\nTudo certo.");
process.exit(problems.length ? 1 : 0);
