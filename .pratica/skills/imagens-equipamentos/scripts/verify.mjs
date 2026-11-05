// Confere prisma/data/imagens/manifest.json e images/ contra o contrato (references/contrato.md).
// Uso: node verify.mjs [pastaOut]   (padrão: prisma/data/imagens)   Sai com código 1 se houver qualquer problema.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const dados = path.join(aqui, "..", "..", "..", "..", "prisma", "data");
export const LISTA = path.join(dados, "equipamentos.json");
const LARGURA = 800;
const ALTURA = 600;

export async function verificar(out = path.join(dados, "imagens"), lista = LISTA) {
  const problemas = [];
  const esperados = JSON.parse(readFileSync(lista, "utf8")).map((e) => e.patrimonio);
  const arquivoManifesto = path.join(out, "manifest.json");
  if (!existsSync(arquivoManifesto)) return [`manifest.json não existe em ${out}`];
  const itens = JSON.parse(readFileSync(arquivoManifesto, "utf8")).itens ?? {};

  for (const pat of Object.keys(itens)) {
    if (!esperados.includes(pat)) problemas.push(`${pat}: não está na lista da prática`);
  }
  const hashes = new Map();
  const origens = new Map();
  for (const pat of esperados) {
    const it = itens[pat];
    if (!it) {
      problemas.push(`${pat}: sem imagem no manifesto`);
      continue;
    }
    // CA-33: dimensões lidas do arquivo, não do manifesto.
    const arquivo = path.join(out, it.arquivo ?? "");
    if (!it.arquivo || !existsSync(arquivo)) {
      problemas.push(`${pat}: arquivo ausente`);
    } else {
      const bytes = readFileSync(arquivo);
      const meta = await sharp(bytes).metadata();
      if (meta.width !== LARGURA || meta.height !== ALTURA) {
        problemas.push(`${pat}: ${meta.width}x${meta.height}, esperado ${LARGURA}x${ALTURA}`);
      }
      const sha = createHash("sha256").update(bytes).digest("hex");
      if (sha !== it.sha256) problemas.push(`${pat}: sha256 do manifesto não bate com o arquivo`);
      // CA-34: mesma foto em dois equipamentos, por conteúdo e por id de origem.
      if (hashes.has(sha)) problemas.push(`${pat}: mesma imagem de ${hashes.get(sha)}`);
      hashes.set(sha, pat);
    }
    if (it.idOrigem != null) {
      if (origens.has(it.idOrigem)) problemas.push(`${pat}: mesmo id de origem de ${origens.get(it.idOrigem)}`);
      origens.set(it.idOrigem, pat);
    }
    // CA-35: crédito completo e só Pixabay.
    for (const campo of ["autor", "paginaOrigem", "licenca", "idOrigem"]) {
      if (it[campo] == null || it[campo] === "") problemas.push(`${pat}: crédito sem ${campo}`);
    }
    if (it.fonte !== "Pixabay") problemas.push(`${pat}: fonte "${it.fonte}", só Pixabay é aceita`);
    if (it.paginaOrigem && !/^https:\/\/pixabay\.com\//.test(it.paginaOrigem)) {
      problemas.push(`${pat}: paginaOrigem fora de pixabay.com`);
    }
    // CA-3A: a revisão visual precisa ter sido feita e aprovada.
    if (it.revisao !== "aprovada") problemas.push(`${pat}: revisão visual "${it.revisao}", precisa ser "aprovada"`);
  }
  return problemas;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const problemas = await verificar(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  if (problemas.length) {
    console.error(problemas.map((p) => `- ${p}`).join("\n"));
    console.error(`\n${problemas.length} problema(s).`);
    process.exit(1);
  }
  console.log("OK: 12 imagens");
}
