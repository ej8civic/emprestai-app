// Busca, baixa e padroniza as fotos dos equipamentos (Pixabay -> 800x600). NÃO envia nada a lugar nenhum.
// Uso: node prepare.mjs [--only TI-0003 [--pick <idPixabay>] [--page 2]]      Chave: PIXABAY_API_KEY (ambiente ou .env). Nunca é impressa.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, "..");
const dados = path.join(aqui, "..", "..", "..", "..", "prisma", "data");
const out = path.join(dados, "imagens");
const lista = JSON.parse(readFileSync(path.join(dados, "equipamentos.json"), "utf8"));
const LARGURA = 800;
const ALTURA = 600;
const DIA = 24 * 60 * 60 * 1000;

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const pick = process.argv.includes("--pick") ? Number(process.argv[process.argv.indexOf("--pick") + 1]) : null;
const pagina = process.argv.includes("--page") ? Number(process.argv[process.argv.indexOf("--page") + 1]) : 1;
if ((pick || pagina > 1) && !only) throw new Error("--pick e --page exigem --only");
if (only && !lista.some((e) => e.patrimonio === only)) throw new Error(`${only} não está na lista`);

try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env"));
} catch {
  /* sem .env: vale o ambiente */
}
const chave = process.env.PIXABAY_API_KEY;
if (!chave) throw new Error("PIXABAY_API_KEY ausente (ambiente ou .env)");

mkdirSync(path.join(out, "images"), { recursive: true });
mkdirSync(path.join(out, "cache"), { recursive: true });
const arquivoManifesto = path.join(out, "manifest.json");
const manifesto = existsSync(arquivoManifesto) ? JSON.parse(readFileSync(arquivoManifesto, "utf8")) : { itens: {} };
manifesto.itens ??= {};
const salvar = () => {
  manifesto.geradoEm = new Date().toISOString();
  writeFileSync(arquivoManifesto, JSON.stringify(manifesto, null, 2) + "\n");
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const hostPixabay = (url) => {
  const h = new URL(url).hostname;
  return h === "pixabay.com" || h.endsWith(".pixabay.com");
};

// Cache de 24 h exigido pela API. A chave não entra no nome do arquivo.
async function buscar(q, page = 1) {
  const id = createHash("sha1").update(page > 1 ? `${q}#${page}` : q).digest("hex").slice(0, 16);
  const arquivo = path.join(out, "cache", `${id}.json`);
  if (existsSync(arquivo)) {
    const c = JSON.parse(readFileSync(arquivo, "utf8"));
    if (Date.now() - c.salvoEm < DIA) return c.hits;
  }
  const url = new URL("https://pixabay.com/api/");
  url.search = new URLSearchParams({
    key: chave,
    q,
    image_type: "photo",
    orientation: "horizontal",
    safesearch: "true",
    min_width: String(LARGURA),
    min_height: String(ALTURA),
    per_page: "20",
    page: String(page),
    order: "popular",
  }).toString();
  const r = await fetch(url);
  if (r.status === 429) throw new Error("Pixabay respondeu 429 (limite de 100 pedidos por minuto); espere 60 s");
  if (!r.ok) throw new Error(`Pixabay respondeu HTTP ${r.status}`);
  const hits = (await r.json()).hits ?? [];
  writeFileSync(arquivo, JSON.stringify({ salvoEm: Date.now(), hits }));
  await dormir(700);
  return hits;
}

// Ids e hashes já usados por outros equipamentos, mais as fotos reprovadas (que não voltam).
function jaUsados(exceto) {
  const ids = new Set();
  const hashes = new Set();
  for (const [pat, it] of Object.entries(manifesto.itens)) {
    for (const rep of it.reprovadas ?? []) ids.add(rep.idOrigem);
    if (pat === exceto && it.revisao === "reprovada") {
      ids.add(it.idOrigem);
    } else if (pat !== exceto) {
      ids.add(it.idOrigem);
      hashes.add(it.sha256);
    }
  }
  return { ids, hashes };
}

for (const eq of lista) {
  if (only && eq.patrimonio !== only) continue;
  const atual = manifesto.itens[eq.patrimonio];
  if (atual && atual.revisao !== "reprovada") {
    console.log(`${eq.patrimonio}: já preparado (${atual.revisao}), mantido`);
    continue;
  }
  const reprovadas = [...(atual?.reprovadas ?? [])];
  if (atual?.revisao === "reprovada") reprovadas.push({ idOrigem: atual.idOrigem, motivo: atual.motivo });
  manifesto.itens[eq.patrimonio] = { ...(atual ?? {}), revisao: "reprovada", idOrigem: atual?.idOrigem, reprovadas };
  const { ids, hashes } = jaUsados(eq.patrimonio);
  for (const rep of reprovadas) ids.add(rep.idOrigem);

  const hits = await buscar(eq.busca, pagina);
  let escolhido = null;
  for (const h of hits) {
    if (pick && h.id !== pick) continue; // candidata escolhida na revisão visual
    if (ids.has(h.id) || !h.largeImageURL || !hostPixabay(h.largeImageURL)) continue;
    const resp = await fetch(h.largeImageURL);
    if (!resp.ok) continue;
    const png = await sharp(Buffer.from(await resp.arrayBuffer()))
      .resize(LARGURA, ALTURA, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    const sha = createHash("sha256").update(png).digest("hex");
    if (hashes.has(sha)) continue;
    const rel = `images/${eq.patrimonio}.jpg`;
    writeFileSync(path.join(out, rel), png);
    escolhido = {
      arquivo: rel,
      largura: LARGURA,
      altura: ALTURA,
      sha256: sha,
      fonte: "Pixabay",
      idOrigem: h.id,
      autor: h.user,
      paginaOrigem: h.pageURL,
      licenca: "Pixabay Content License",
      termoBusca: eq.busca,
      revisao: "pendente",
      reprovadas,
    };
    break;
  }
  if (!escolhido) {
    console.error(`${eq.patrimonio}: nenhuma candidata nova para "${eq.busca}"`);
    process.exitCode = 1;
  } else {
    manifesto.itens[eq.patrimonio] = escolhido;
    console.log(`${eq.patrimonio}: foto ${escolhido.idOrigem} de ${escolhido.autor} (pendente de revisão)`);
  }
  salvar();
}
salvar();
