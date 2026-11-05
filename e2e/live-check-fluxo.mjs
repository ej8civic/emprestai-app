// Spec 004 em produção, o fluxo de pedido de ponta a ponta. ESCREVE no banco: cria e devolve empréstimos.
// Só uma PESSOA roda, só com a conta teste@empresti.example. Nunca com a do professor.
//
//   BASE_URL=https://... TESTE_PASSWORD=... CONFIRM_PROD=sim [SHOTS=pasta] node e2e/live-check-fluxo.mjs
//
// CA-42  pedir um item disponível cria o empréstimo na hora e mostra a devolução em 14 dias.
// CA-46  "Meus empréstimos" lista os itens em aberto com a data prevista.
// CA-43  o 4º pedido é recusado e o motivo aparece na tela.
// CA-41  o item pedido deixa de estar disponível para quem olha em seguida.
// No fim devolve tudo o que pediu, para a conta de teste voltar a zero.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

if (process.env.CONFIRM_PROD !== "sim") throw new Error("Este script escreve em produção: use CONFIRM_PROD=sim, e só depois de ler o arquivo.");
const base = process.env.BASE_URL;
const senha = process.env.TESTE_PASSWORD;
if (!base || !senha) throw new Error("Defina BASE_URL e TESTE_PASSWORD");
const shots = process.env.SHOTS ?? "e2e-shots";
mkdirSync(shots, { recursive: true });

const problemas = [];
const ok = (m) => console.log(`ok   ${m}`);
const confere = (cond, m) => (cond ? ok(m) : problemas.push(m));
let passo = "início";
const pedidos = ["TI-0001", "TI-0005", "TI-0008"]; // disponíveis na lista da prática
const quarto = "TI-0011";

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on("pageerror", (e) => problemas.push(`[${passo}] pageerror: ${e.message.slice(0, 160)}`));

async function pedir(pat) {
  await page.goto(`${base}/catalogo/${pat}`);
  await page.getByRole("button", { name: /Solicitar empréstimo/ }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
}

try {
  passo = "login";
  await page.goto(`${base}/login`);
  await page.getByLabel("E-mail").fill("teste@empresti.example");
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await page.waitForURL("**/catalogo", { timeout: 30000 });

  passo = "estado inicial";
  await page.goto(`${base}/meus-emprestimos`);
  await page.getByText("0 de 3 itens").first().waitFor({ timeout: 15000 });
  ok("a conta de teste começa com 0 de 3 itens");

  passo = "pedidos";
  for (const [i, pat] of pedidos.entries()) {
    await pedir(pat);
    await page.waitForURL("**/meus-emprestimos", { timeout: 20000 });
    await page.getByText(`${i + 1} de 3 itens`).first().waitFor({ timeout: 15000 });
    ok(`CA-42 ${pat} pedido; agora ${i + 1} de 3 itens`);
  }
  const prazos = await page.locator("li:has-text('Prazo') strong").allTextContents();
  confere(prazos.length === 3 && prazos.every((p) => /\d{2}\/\d{2}/.test(p)), `CA-46 "Meus empréstimos" mostra a data prevista dos 3 (vi ${prazos.join(", ")})`);
  await page.screenshot({ path: path.join(shots, "meus-emprestimos-3.png") });

  passo = "limite";
  await page.goto(`${base}/catalogo/${quarto}`);
  const botao = page.getByRole("button", { name: /Solicitar empréstimo/ });
  confere(await botao.isDisabled(), "CA-43 com 3 em aberto o botão de pedido fica desabilitado");
  await page.getByText("Limite de 3 itens atingido.").waitFor();
  ok("CA-43 o motivo aparece na tela: Limite de 3 itens atingido.");
  await page.screenshot({ path: path.join(shots, "limite-3.png") });

  passo = "situação";
  await page.goto(`${base}/catalogo/${pedidos[0]}`);
  await page.getByText(/Emprestado|Com /).first().waitFor();
  confere((await page.getByRole("button", { name: /Solicitar empréstimo/ }).count()) === 0, `CA-41 ${pedidos[0]} deixou de oferecer o pedido`);
} catch (e) {
  problemas.push(`[${passo}] ${String(e.message).split("\n")[0].replaceAll(senha, "***")}`);
} finally {
  // Devolve tudo, mesmo que algo acima tenha falhado, para não deixar a conta de teste presa.
  try {
    passo = "devolução";
    await page.goto(`${base}/meus-emprestimos`);
    for (let i = 0; i < 3; i++) {
      const devolver = page.getByRole("button", { name: "Devolver" }).first();
      if (!(await devolver.isVisible().catch(() => false))) break;
      await devolver.click();
      await page.waitForTimeout(1200);
    }
    await page.getByText("0 de 3 itens").first().waitFor({ timeout: 15000 });
    ok("a conta de teste voltou a 0 de 3 itens");
  } catch (e) {
    problemas.push(`[devolução] não consegui zerar a conta de teste: ${String(e.message).split("\n")[0]}. Devolva à mão em Meus empréstimos.`);
  }
  await browser.close();
}

console.log(problemas.length ? `\n${problemas.length} problema(s):\n- ${problemas.join("\n- ")}` : "\nTudo certo.");
process.exit(problemas.length ? 1 : 0);
