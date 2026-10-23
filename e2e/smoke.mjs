// Fumaça de interface (ADR-001: Playwright para os fluxos que travam a operação).
// Uso: BASE_URL=http://localhost:3000 SHOTS=<pasta> node e2e/smoke.mjs
// Credenciais vêm de .seed-credentials.txt; nada é impresso.
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const shots = process.env.SHOTS ?? "e2e-shots";
mkdirSync(shots, { recursive: true });

const creds = Object.fromEntries(
  readFileSync(".seed-credentials.txt", "utf8")
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split("\t")),
);

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
const problems = [];
let step = "início";
const ok = (msg) => console.log(`ok   ${msg}`);
const fail = (msg) => {
  problems.push(msg);
  console.log(`FAIL ${msg}`);
};
const expect = (cond, msg) => (cond ? ok(msg) : fail(msg));

async function session(viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    // 401 (senha errada) e 409 (patrimônio repetido) são provocados de propósito pelo próprio teste.
    if (/status of (401|409)/.test(m.text())) return;
    if (m.type() === "error" || /content security policy/i.test(m.text())) problems.push(`[${step}] console: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => problems.push(`[${step}] pageerror: ${e.message.slice(0, 200)}`));
  return page;
}
const shot = (page, name) => page.screenshot({ path: path.join(shots, `${name}.png`) });

async function login(page, email) {
  await page.goto(`${base}/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(creds[email]);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await page.waitForURL("**/catalogo");
}

// --- Colaborador
step = "login";
const p = await session();
await p.goto(`${base}/login`);
await p.waitForSelector('[data-screen-label="01 Login"]');
await shot(p, "01-login");
await p.getByLabel("E-mail").fill("marina.alves@empresti.example");
await p.getByLabel("Senha").fill("senha-errada");
await p.getByRole("button", { name: /Entrar/ }).click();
await p.getByText("E-mail ou senha incorretos.").waitFor();
ok("login com senha errada mostra erro");
await login(p, "marina.alves@empresti.example");
ok("login redireciona para /catalogo");

step = "catálogo";
await p.waitForSelector('[data-screen-label="02 Catálogo"]');
await p.getByText("disponíveis agora").waitFor();
await shot(p, "02-catalogo");
expect((await p.getByRole("link", { name: /Solicitar →/ }).count()) > 0, "catálogo lista itens disponíveis");
expect((await p.getByText("Na assistência · peça").count()) > 0, "manutenção aparece sem ação de pedir");
await p.getByRole("button", { name: "Monitores" }).click();
await p.waitForTimeout(600);
expect((await p.getByText("Notebooks · ").count()) === 0, "chip Monitores filtra de verdade");
await p.getByRole("button", { name: "Todos" }).click();

step = "detalhe";
await p.getByRole("link", { name: /Dell UltraSharp/ }).click();
await p.waitForSelector('[data-screen-label="03 Detalhe do item"]');
await p.getByRole("button", { name: /Solicitar empréstimo/ }).waitFor();
await shot(p, "03-detalhe");
await p.getByRole("button", { name: /Solicitar empréstimo/ }).click();
await p.getByText("Confirmar empréstimo").waitFor();
expect(await p.getByText("Este pedido leva a 3 de 3 itens.").isVisible(), "diálogo avisa que é o 3º item");
await shot(p, "03b-dialogo");
await p.getByRole("button", { name: "Confirmar" }).click();
await p.waitForURL("**/meus-emprestimos");

step = "meus empréstimos";
await p.waitForSelector('[data-screen-label="04 Meus empréstimos"]');
await p.getByText("3 de 3 itens").first().waitFor();
await shot(p, "04-meus-emprestimos");
ok("pedido confirmado leva a /meus-emprestimos com 3 de 3");

step = "limite";
await p.goto(`${base}/catalogo/PAT-1042`);
await p.getByText("Limite de 3 itens atingido.").waitFor();
expect(await p.getByRole("button", { name: /Solicitar empréstimo/ }).isDisabled(), "com 3 itens o botão Solicitar fica desabilitado");
await shot(p, "03c-bloqueado");

step = "devolução";
await p.goto(`${base}/meus-emprestimos`);
await p.getByRole("button", { name: "Devolver" }).last().click();
await p.getByText("2 de 3 itens").first().waitFor();
ok("devolver reduz para 2 de 3");

step = "colaborador em rota de operações";
await p.goto(`${base}/operacoes/emprestimos`);
await p.getByText("Só Operações vê esta tela.").waitFor();
ok("colaborador não vê a tela de Operações");

step = "logout";
await p.getByRole("button", { name: "Sair" }).click();
await p.waitForURL("**/login");
await p.goto(`${base}/catalogo`);
await p.waitForURL("**/login");
ok("sair encerra a sessão");
await p.context().close();

// --- Operações
step = "operações";
const o = await session();
await login(o, "operacoes@empresti.example");
await o.goto(`${base}/operacoes/emprestimos`);
await o.waitForSelector('[data-screen-label="05 Operações — empréstimos em aberto"]');
await o.getByText("Em atraso").first().waitFor();
await o.waitForTimeout(500);
await shot(o, "05-operacoes");
expect((await o.getByText("Atrasado", { exact: true }).count()) === 3, "Operações vê os 3 atrasos do seed");
await o.getByRole("button", { name: "Em atraso" }).click();
await o.waitForTimeout(600);
expect((await o.getByText("No prazo", { exact: true }).count()) === 0, "filtro Em atraso esconde quem está no prazo");

step = "cadastro";
await o.goto(`${base}/operacoes/equipamentos/novo`);
await o.waitForSelector('[data-screen-label="06 Cadastrar equipamento"]');
await o.getByRole("button", { name: "Cadastrar", exact: true }).click();
await o.getByText("Informe o nome.").waitFor();
ok("formulário vazio mostra erro de validação");
await o.getByLabel("Nome").fill('iPad Pro 11"');
await o.getByLabel("Patrimônio").fill("pat-4321");
await o.getByLabel("Categoria").selectOption("NOTEBOOKS");
await o.waitForTimeout(200);
expect(await o.getByText("PAT-4321").first().isVisible(), "prévia acompanha o formulário");
await shot(o, "06-cadastro");
await o.getByRole("button", { name: "Cadastrar", exact: true }).click();
await o.getByText("PAT-4321 cadastrado.").waitFor();
ok("cadastro grava e confirma");
await o.getByLabel("Nome").fill("Outro");
await o.getByLabel("Patrimônio").fill("PAT-4321");
await o.getByRole("button", { name: "Cadastrar", exact: true }).click();
await o.getByText("Esse patrimônio já está cadastrado.").waitFor();
ok("patrimônio repetido é recusado");
await o.goto(`${base}/catalogo?q=4321`);
await o.getByText('iPad Pro 11"').waitFor();
ok("busca do cabeçalho encontra o item novo");
await o.context().close();

// --- Mobile
step = "mobile";
const m = await session({ width: 390, height: 844 });
await login(m, "marina.alves@empresti.example");
await m.getByText("disponíveis agora").waitFor();
await shot(m, "07-mobile-catalogo");
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
expect(overflow <= 0, `sem rolagem horizontal no celular (excesso ${overflow}px)`);
await m.goto(`${base}/meus-emprestimos`);
await m.getByText("Comigo agora").waitFor();
await m.getByText("Prazo", { exact: true }).first().waitFor();
await shot(m, "08-mobile-emprestimos");
await m.context().close();

await browser.close();
console.log(problems.length ? `\n${problems.length} problema(s):\n- ${problems.join("\n- ")}` : "\nTudo certo.");
process.exit(problems.length ? 1 : 0);
