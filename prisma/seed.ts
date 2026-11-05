/**
 * Seed idempotente (ADR-001, spec 003). Rodar duas vezes não duplica nada e nunca cria empréstimo.
 *
 * Cadastro é fechado: sem tela de signup, os usuários nascem aqui, no Auth do Supabase.
 * A conta do professor usa a senha de `PROFESSOR_PASSWORD` (só no ambiente de quem roda).
 * As outras contas recebem senha aleatória, gravada em `.seed-credentials.txt` (ignorado pelo git).
 * Nada de senha em log ou commit.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { exigirConfirmacaoDeProducao, runSeed, type ItemDaLista, type Manifesto } from "./seed-lib";

const SKILL = "pratica-sa-051126/skills/imagens-equipamentos";
const db = new PrismaClient();

async function main() {
  exigirConfirmacaoDeProducao(process.env.DATABASE_URL, process.env);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL ausente");
  const lista = JSON.parse(readFileSync(`${SKILL}/references/equipamentos.json`, "utf8")) as ItemDaLista[];
  const arquivoManifesto = `${SKILL}/out/manifest.json`;
  const manifesto = existsSync(arquivoManifesto) ? (JSON.parse(readFileSync(arquivoManifesto, "utf8")) as Manifesto) : undefined;

  const { credenciais } = await runSeed(db, { lista, manifesto, supabaseUrl, professorPassword: process.env.PROFESSOR_PASSWORD });

  if (credenciais.length > 0) {
    appendFileSync(".seed-credentials.txt", credenciais.join("\n") + "\n");
    console.log(`Seed ok. ${credenciais.length} usuário(s) novo(s); senhas em .seed-credentials.txt`);
  } else {
    console.log("Seed ok. Nenhum usuário novo.");
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
