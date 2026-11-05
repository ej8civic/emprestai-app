// Spec 004 em produção, SOMENTE LEITURA (nenhum pedido, nenhuma devolução). Roda com a conta de teste, nunca com a do professor.
//
//   BASE_URL=https://... TESTE_PASSWORD=... [SHOTS=pasta] node e2e/live-check-catalogo.mjs
//
// CA-40  o catálogo mostra os 12 equipamentos, cada um com foto (carregou de verdade), nome, categoria e situação.
// CA-41  item em manutenção (TI-0004, TI-0007, TI-0010) não oferece o pedido e diz por quê.
// CA-47  o rodapé tem "Fotos: Pixabay" e /creditos lista a foto de cada equipamento.
// CA-49  o catálogo não mostra o nome de quem está com um item.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.env.BASE_URL;
const senha = process.env.TESTE_PASSWORD;
if (!base || !senha) throw new Error("Defina BASE_URL e TESTE_PASSWORD");
const shots = process.env.SHOTS ?? "e2e-shots";
mkdirSync(shots, { recursive: true });

const problemas = [];
const ok = (m) => console.log(`ok   ${m}`);
const confere = (cond, m) => (cond ? ok(m) : problemas.push(m));
let passo = "início";

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on("console", (m) => {
    if (m.type() === "error" || /content security policy/i.test(m.text())) problemas.push(`[${passo}] console: ${m.text().slice(0, 160)}`);
  });
  page.on("pageerror", (e) => problemas.push(`[${passo}] pageerror: ${e.message.slice(0, 160)}`));

  passo = "login";
  await page.goto(`${base}/login`);
  await page.getByLabel("E-mail").fill("teste@empresti.example");
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await page.waitForURL("**/catalogo", { timeout: 30000 });

  passo = "catálogo";
  await page.getByText("12 equipamentos").waitFor({ timeout: 15000 });
  const imgs = page.locator("main img");
  await imgs.first().waitFor();
  const n = await imgs.count();
  // As fotos são lazy: rola até o fim para o navegador carregar todas antes de contar.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForFunction(() => [...document.querySelectorAll("main img")].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 20000 }).catch(() => {});
  const carregadas = await imgs.evaluateAll((els) => els.filter((i) => i.complete && i.naturalWidth === 800 && i.naturalHeight === 600).length);
  confere(n === 12, `CA-40 12 fotos no catálogo (vi ${n})`);
  confere(carregadas === 12, `CA-40 as 12 fotos carregaram em 800x600 (vi ${carregadas})`);
  for (const nome of ["Notebook 14 polegadas", "Monitor 27 polegadas", "Cabo HDMI 2 m", "Webcam Full HD"]) {
    confere(await page.getByText(nome, { exact: true }).first().isVisible(), `CA-40 aparece "${nome}"`);
  }
  confere((await page.getByText("Na assistência").count()) === 3, "CA-40 três itens mostram a situação de manutenção");
  confere((await page.getByText(/Com [A-ZÀ-Ú]/).count()) === 0, "CA-49 o catálogo não mostra o nome de quem está com um item");
  await page.screenshot({ path: path.join(shots, "catalogo-12-fotos.png"), fullPage: true });

  passo = "manutenção";
  for (const pat of ["TI-0004", "TI-0007", "TI-0010"]) {
    await page.goto(`${base}/catalogo/${pat}`);
    await page.getByText("Na assistência. Não está disponível.").waitFor();
    const botoes = await page.getByRole("button", { name: /Solicitar empréstimo/ }).count();
    confere(botoes === 0, `CA-41 ${pat} não oferece o botão de pedido e diz "Na assistência"`);
  }

  passo = "créditos";
  await page.goto(`${base}/catalogo`);
  await page.getByRole("link", { name: "Fotos: Pixabay" }).click();
  await page.waitForURL("**/creditos");
  await page.getByText("Créditos das fotos").waitFor();
  await page.getByText("TI-0012").waitFor();
  confere((await page.getByRole("link", { name: "Ver na Pixabay" }).count()) === 12, "CA-47 /creditos lista a foto dos 12 equipamentos");
  await page.screenshot({ path: path.join(shots, "creditos.png") });
} catch (e) {
  problemas.push(`[${passo}] ${String(e.message).split("\n")[0].replaceAll(senha, "***")}`);
} finally {
  await browser.close();
}

console.log(problemas.length ? `\n${problemas.length} problema(s):\n- ${problemas.join("\n- ")}` : "\nTudo certo.");
process.exit(problemas.length ? 1 : 0);
