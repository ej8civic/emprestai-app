// ENVIA as imagens preparadas ao bucket público `equipment-images` do Supabase. Quem roda é uma PESSOA.
//
//   SUPABASE_SERVICE_ROLE_KEY=<chave> CONFIRM_PROD=sim node upload.mjs [--dry-run]
//
// Travas (CA-39): sem a chave e sem CONFIRM_PROD=sim, nada acontece. A chave `service_role` só é lida do
// ambiente do terminal; este script NÃO lê `.env`, então ela não deve ficar em arquivo do projeto.
// Repetir não duplica: o nome do objeto é o patrimônio e o envio usa upsert.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verificar } from "./verify.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const BUCKET = "equipment-images";

export function exigirTravas(env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente: só uma pessoa envia ao Supabase.");
  if (env.CONFIRM_PROD !== "sim") throw new Error("CONFIRM_PROD=sim ausente: confirme que o destino é o projeto de produção.");
}

// Só esta variável é lida do .env: é pública e não é segredo.
function urlDoProjeto(env, raiz) {
  if (env.NEXT_PUBLIC_SUPABASE_URL) return env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const arq = path.join(raiz, ".env");
  if (existsSync(arq)) {
    const m = readFileSync(arq, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL="?([^"\r\n]+)"?/m);
    if (m) return m[1].replace(/\/$/, "");
  }
  throw new Error("NEXT_PUBLIC_SUPABASE_URL ausente (ambiente ou .env)");
}

export async function enviar({ env = process.env, out = path.join(aqui, "..", "out"), raiz = process.cwd(), fetchFn = fetch, dryRun = false } = {}) {
  const problemas = await verificar(out);
  if (problemas.length) throw new Error(`verify.mjs reprovou:\n- ${problemas.join("\n- ")}`);
  const manifesto = JSON.parse(readFileSync(path.join(out, "manifest.json"), "utf8"));
  const pats = Object.keys(manifesto.itens).sort();
  if (dryRun) return { enviados: [], planejados: pats.map((p) => `${BUCKET}/${p}.jpg`) };

  exigirTravas(env);
  const base = urlDoProjeto(env, raiz);
  const chave = env.SUPABASE_SERVICE_ROLE_KEY;
  const auth = { Authorization: `Bearer ${chave}`, apikey: chave };

  const b = await fetchFn(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, allowed_mime_types: ["image/jpeg"] }),
  });
  if (!b.ok && !/already exists|Duplicate/i.test(await b.text())) throw new Error(`criar bucket: HTTP ${b.status}`);

  const enviados = [];
  for (const pat of pats) {
    const arquivo = path.join(out, manifesto.itens[pat].arquivo);
    const r = await fetchFn(`${base}/storage/v1/object/${BUCKET}/${pat}.jpg`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: readFileSync(arquivo),
    });
    if (!r.ok) throw new Error(`${pat}: HTTP ${r.status}`);
    // CA-32: a URL pública abre sem nenhuma credencial.
    const pub = await fetchFn(`${base}/storage/v1/object/public/${BUCKET}/${pat}.jpg`, { method: "HEAD" });
    if (!pub.ok) throw new Error(`${pat}: URL pública respondeu HTTP ${pub.status}`);
    enviados.push(`${BUCKET}/${pat}.jpg`);
  }
  return { enviados, planejados: enviados };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const r = await enviar({ dryRun: process.argv.includes("--dry-run") });
    console.log(r.enviados.length ? `OK: ${r.enviados.length} imagens enviadas e abertas pela URL pública` : `Dry-run: enviaria ${r.planejados.length} imagens`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
