import { describe, expect, it } from "vitest";
import { csp } from "@/lib/csp";

describe("CSP (spec 004)", () => {
  it("test_ca_40_img_src_aceita_o_storage_do_projeto_e_nada_de_unsafe_inline", () => {
    const p = csp("abc", "https://projeto.supabase.co", false);
    expect(p).toContain("img-src 'self' data: blob: https://projeto.supabase.co;");
    expect(p).not.toContain("unsafe-inline");
    expect(p).not.toContain("https:;"); // nenhum curinga de imagem
  });

  it("test_ca_40_sem_url_valida_do_projeto_img_src_fica_so_com_o_proprio_site", () => {
    expect(csp("abc", undefined, false)).toContain("img-src 'self' data: blob:;");
    expect(csp("abc", "isso-nao-e-url", false)).toContain("img-src 'self' data: blob:;");
  });
});
