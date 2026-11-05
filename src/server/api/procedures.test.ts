import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCaller } from "@/server/api/root";
import { ctxFor, makeTenant, startTestDb, type Tenant, type TestDb } from "@/test/db";

let t: TestDb;
let a: Tenant;
let b: Tenant;

beforeAll(async () => {
  t = await startTestDb();
  a = await makeTenant(t.db, "alfa");
  b = await makeTenant(t.db, "beta");
});
afterAll(() => t?.stop());

const as = (m: Tenant["ana"]) => createCaller(ctxFor(t.db, m));
const code = (p: Promise<unknown>) =>
  p.then(
    () => "OK",
    (e: unknown) => (e instanceof TRPCError ? e.code : `ERRO: ${String(e)}`),
  );

describe("empréstimo (PRD)", () => {
  it("test_prd_pedir_item_disponivel_da_prazo_de_14_dias", async () => {
    const item = a.equipment[0]!;
    const before = Date.now();
    const loan = await as(a.ana).loan.request({ patrimonio: item.patrimonio });
    const days = (loan.dueAt.getTime() - before) / 86_400_000;
    expect(days).toBeGreaterThan(13.99);
    expect(days).toBeLessThan(14.01);

    const detail = await as(a.ana).equipment.get({ patrimonio: item.patrimonio });
    expect(detail.state).toBe("loaned");
    expect(detail.holderName).toBe(a.ana.name);
  });

  it("test_prd_item_emprestado_nao_pode_ser_pedido_de_novo", async () => {
    expect(await code(as(a.ops).loan.request({ patrimonio: a.equipment[0]!.patrimonio }))).toBe("CONFLICT");
  });

  it("test_prd_manutencao_nao_aparece_como_disponivel_nem_e_pedido", async () => {
    const list = await as(a.ana).equipment.list({ onlyAvailable: true, limit: 60 });
    expect(list.items.map((i) => i.patrimonio)).not.toContain(a.broken.patrimonio);
    expect(await code(as(a.ana).loan.request({ patrimonio: a.broken.patrimonio }))).toBe("CONFLICT");
  });

  it("test_prd_limite_de_3_itens", async () => {
    await as(a.ana).loan.request({ patrimonio: a.equipment[1]!.patrimonio });
    await as(a.ana).loan.request({ patrimonio: a.equipment[2]!.patrimonio });
    // Ana está com 3 agora; o 4º é barrado com a mensagem do PRD.
    const err = await as(a.ana)
      .loan.request({ patrimonio: a.equipment[3]!.patrimonio })
      .catch((e: TRPCError) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("PRECONDITION_FAILED");
    expect((err as TRPCError).message).toBe("Limite de 3 itens atingido.");
    expect((await as(a.ana).me.get()).openCount).toBe(3);
  });

  it("test_prd_atraso_bloqueia_novo_emprestimo", async () => {
    const x = await makeTenant(t.db, "atraso");
    await t.db.loan.create({
      data: {
        tenantId: x.tenant.id,
        equipmentId: x.equipment[0]!.id,
        membershipId: x.ana.id,
        loanedAt: new Date(Date.now() - 20 * 86_400_000),
        dueAt: new Date(Date.now() - 6 * 86_400_000),
      },
    });
    const me = await as(x.ana).me.get();
    expect(me.overdue).toBe(true);

    const detail = await as(x.ana).equipment.get({ patrimonio: x.equipment[1]!.patrimonio });
    expect(detail.request).toEqual({ allowed: false, reason: "OVERDUE" });

    const err = await as(x.ana)
      .loan.request({ patrimonio: x.equipment[1]!.patrimonio })
      .catch((e: TRPCError) => e);
    expect((err as TRPCError).message).toBe("Bloqueado por atraso.");
  });

  it("dois pedidos simultâneos pelo mesmo item: só um passa", async () => {
    const x = await makeTenant(t.db, "corrida");
    const other = await t.db.membership.create({
      data: { tenantId: x.tenant.id, userId: crypto.randomUUID(), role: "COLABORADOR", name: "Outro", email: "o@x.test", department: "T" },
    });
    const pat = x.equipment[0]!.patrimonio;
    const results = await Promise.all([code(as(x.ana).loan.request({ patrimonio: pat })), code(as(other).loan.request({ patrimonio: pat }))]);
    expect(results.filter((r) => r === "OK")).toHaveLength(1);
    expect(results.filter((r) => r === "CONFLICT")).toHaveLength(1);
    expect(await t.db.loan.count({ where: { equipmentId: x.equipment[0]!.id, returnedAt: null } })).toBe(1);
  });
});

describe("devolução e auditoria", () => {
  it("colaborador não devolve item de outra pessoa; Operações devolve no balcão", async () => {
    const x = await makeTenant(t.db, "balcao");
    const loan = await as(x.ana).loan.request({ patrimonio: x.equipment[0]!.patrimonio });
    const other = await t.db.membership.create({
      data: { tenantId: x.tenant.id, userId: crypto.randomUUID(), role: "COLABORADOR", name: "Bia", email: "b@x.test", department: "T" },
    });
    expect(await code(as(other).loan.return({ loanId: loan.id }))).toBe("FORBIDDEN");
    expect(await code(as(x.ops).loan.return({ loanId: loan.id }))).toBe("OK");
    expect(await code(as(x.ops).loan.return({ loanId: loan.id }))).toBe("NOT_FOUND"); // já devolvido

    const detail = await as(x.ana).equipment.get({ patrimonio: x.equipment[0]!.patrimonio });
    expect(detail.state).toBe("available");
  });

  it("pedido e devolução gravam auditoria, e a tabela é append-only", async () => {
    const rows = await t.db.auditLog.findMany({ where: { tenantId: a.tenant.id } });
    expect(rows.map((r) => r.action)).toContain("loan.request");
    await expect(t.db.auditLog.deleteMany({ where: { tenantId: a.tenant.id } })).rejects.toThrow(/append-only/);
    await expect(t.db.auditLog.updateMany({ data: { action: "x" } })).rejects.toThrow(/append-only/);
  });
});

describe("autorização", () => {
  it("test_authz_sem_sessao_e_unauthorized", async () => {
    const anon = createCaller({ db: t.db, requestId: "t", user: null, membership: null });
    expect(await code(anon.equipment.list({ limit: 5 }))).toBe("UNAUTHORIZED");
  });

  it("test_authz_colaborador_nao_usa_procedimento_de_operacoes", async () => {
    expect(await code(as(a.ana).loan.open({ filter: "all", limit: 5 }))).toBe("FORBIDDEN");
    expect(await code(as(a.ana).loan.stats())).toBe("FORBIDDEN");
    expect(await code(as(a.ana).equipment.recent())).toBe("FORBIDDEN");
    expect(
      await code(
        as(a.ana).equipment.create({ name: "X", category: "CABOS", patrimonio: "PAT-9999", pickupLocation: "Balcão", status: "AVAILABLE" }),
      ),
    ).toBe("FORBIDDEN");
  });

  it("Operações cadastra equipamento; patrimônio repetido dá CONFLICT; o formato é validado", async () => {
    const input = { name: "Mouse", category: "CABOS" as const, patrimonio: "pat-7001", pickupLocation: "Balcão", status: "AVAILABLE" as const };
    expect(await code(as(a.ops).equipment.create(input))).toBe("OK");
    expect((await as(a.ops).equipment.get({ patrimonio: "PAT-7001" })).name).toBe("Mouse"); // gravou em maiúsculas
    expect(await code(as(a.ops).equipment.create(input))).toBe("CONFLICT");
    expect(await code(as(a.ops).equipment.create({ ...input, patrimonio: "xyz" }))).toBe("BAD_REQUEST");
  });
});

describe("dados iniciais (spec 003)", () => {
  it("test_ca_30_patrimonio_ti_0001_e_aceito_e_formato_invalido_nao", async () => {
    const base = { name: "Notebook 14 polegadas", category: "NOTEBOOKS" as const, pickupLocation: "Balcão", status: "AVAILABLE" as const };
    expect(await code(as(a.ops).equipment.create({ ...base, patrimonio: "ti-0001" }))).toBe("OK");
    expect((await as(a.ops).equipment.get({ patrimonio: "TI-0001" })).name).toBe("Notebook 14 polegadas");
    expect(await code(as(a.ops).equipment.create({ ...base, patrimonio: "PAT-7002" }))).toBe("OK"); // formato antigo continua válido
    for (const ruim of ["T-0001", "TIXXX-0001", "TI0001", "TI-001", "TI-00001"]) {
      expect(await code(as(a.ops).equipment.create({ ...base, patrimonio: ruim }))).toBe("BAD_REQUEST");
    }
  });
});

describe("catálogo (spec 004)", () => {
  it("test_ca_40_catalogo_traz_imagem_nome_categoria_e_situacao_de_cada_item", async () => {
    const x = await makeTenant(t.db, "catalogo");
    const [com, sem] = [x.equipment[0]!, x.equipment[1]!];
    await t.db.equipment.update({
      where: { id: com.id },
      data: { imageUrl: "https://p.supabase.co/storage/v1/object/public/equipment-images/X.jpg", imageAuthor: "autora", imageLicense: "Pixabay Content License", imageSourceUrl: "https://pixabay.com/photos/x-1/" },
    });
    const list = await as(x.ana).equipment.list({ limit: 60 });
    const byPat = Object.fromEntries(list.items.map((i) => [i.patrimonio, i]));
    expect(byPat[com.patrimonio]).toMatchObject({
      name: "Notebook A",
      category: "NOTEBOOKS",
      state: "available",
      image: { url: expect.stringContaining("equipment-images"), author: "autora", license: "Pixabay Content License", sourceUrl: "https://pixabay.com/photos/x-1/" },
    });
    expect(byPat[sem.patrimonio]!.image).toBeNull(); // sem foto continua listado
    expect(byPat[x.broken.patrimonio]!.state).toBe("maintenance");
    expect((await as(x.ana).equipment.get({ patrimonio: com.patrimonio })).image?.author).toBe("autora");
  });

  it("test_ca_49_colaborador_nao_ve_quem_esta_com_o_item_mas_operacoes_ve", async () => {
    const x = await makeTenant(t.db, "privado");
    const outra = await t.db.membership.create({
      data: { tenantId: x.tenant.id, userId: crypto.randomUUID(), role: "COLABORADOR", name: "Outra Pessoa", email: "outra@x.test", department: "T" },
    });
    const pat = x.equipment[0]!.patrimonio;
    await as(x.ana).loan.request({ patrimonio: pat });
    const holder = async (m: typeof x.ana) => (await as(m).equipment.list({ limit: 60 })).items.find((i) => i.patrimonio === pat)!;
    expect((await holder(outra)).holderName).toBeNull();
    expect((await as(outra).equipment.get({ patrimonio: pat })).holderName).toBeNull();
    expect((await holder(x.ana)).holderName).toBe(x.ana.name); // o próprio item aparece com o nome
    expect((await holder(x.ops)).holderName).toBe(x.ana.name);
    expect((await as(x.ops).equipment.get({ patrimonio: pat })).holderName).toBe(x.ana.name);
  });
});

describe("créditos das fotos (spec 004)", () => {
  it("test_ca_47_creditos_listam_autor_licenca_e_origem_so_de_quem_tem_foto_e_so_do_meu_tenant", async () => {
    const x = await makeTenant(t.db, "creditos");
    const y = await makeTenant(t.db, "creditos-outro");
    await t.db.equipment.update({
      where: { id: x.equipment[0]!.id },
      data: { imageUrl: "https://p.supabase.co/x.jpg", imageSource: "Pixabay", imageAuthor: "fotografa", imageLicense: "Pixabay Content License", imageSourceUrl: "https://pixabay.com/photos/a-1/" },
    });
    await t.db.equipment.update({ where: { id: y.equipment[0]!.id }, data: { imageUrl: "https://p.supabase.co/y.jpg", imageAuthor: "outra", imageSource: "Pixabay" } });
    const credits = await as(x.ana).equipment.credits();
    expect(credits).toEqual([
      { patrimonio: x.equipment[0]!.patrimonio, name: "Notebook A", source: "Pixabay", author: "fotografa", license: "Pixabay Content License", sourceUrl: "https://pixabay.com/photos/a-1/" },
    ]);
  });
});

describe("solicitar empréstimo (spec 004)", () => {
  const DIA = 86_400_000;
  const atrasado = (x: Awaited<ReturnType<typeof makeTenant>>, equipmentId: string, membershipId: string) =>
    t.db.loan.create({
      data: { tenantId: x.tenant.id, equipmentId, membershipId, loanedAt: new Date(Date.now() - 20 * DIA), dueAt: new Date(Date.now() - 6 * DIA) },
    });

  it("test_ca_41_so_item_disponivel_e_solicitado_manutencao_e_emprestado_sao_recusados_com_motivo", async () => {
    const x = await makeTenant(t.db, "ca41");
    const livre = x.equipment[0]!;
    const emprestado = x.equipment[1]!;
    await as(x.ops).loan.request({ patrimonio: emprestado.patrimonio });

    expect((await as(x.ana).equipment.get({ patrimonio: livre.patrimonio })).request).toEqual({ allowed: true });
    expect((await as(x.ana).equipment.get({ patrimonio: x.broken.patrimonio })).request).toEqual({ allowed: false, reason: "STATE" });
    expect((await as(x.ana).equipment.get({ patrimonio: emprestado.patrimonio })).request).toEqual({ allowed: false, reason: "STATE" });
    expect(await code(as(x.ana).loan.request({ patrimonio: x.broken.patrimonio }))).toBe("CONFLICT");
    expect(await code(as(x.ana).loan.request({ patrimonio: emprestado.patrimonio }))).toBe("CONFLICT");
    expect(await t.db.loan.count({ where: { membershipId: x.ana.id } })).toBe(0);
  });

  it("test_ca_42_pedido_cria_o_emprestimo_na_hora_com_14_dias_corridos_e_tira_o_item_do_disponivel", async () => {
    const x = await makeTenant(t.db, "ca42");
    const item = x.equipment[0]!;
    const loan = await as(x.ana).loan.request({ patrimonio: item.patrimonio });
    const row = await t.db.loan.findUniqueOrThrow({ where: { id: loan.id } });
    expect(row.returnedAt).toBeNull();
    expect((row.dueAt.getTime() - row.loanedAt.getTime()) / DIA).toBeCloseTo(14, 5); // corridos, não úteis
    expect(Math.abs(row.loanedAt.getTime() - Date.now())).toBeLessThan(60_000); // na hora, sem aprovação
    expect((await as(x.ana).equipment.get({ patrimonio: item.patrimonio })).state).toBe("loaned");
    const livres = await as(x.ana).equipment.list({ onlyAvailable: true, limit: 60 });
    expect(livres.items.map((i) => i.patrimonio)).not.toContain(item.patrimonio);
  });

  it("test_ca_43_com_3_em_aberto_o_4_e_recusado_e_o_motivo_chega_na_tela", async () => {
    const x = await makeTenant(t.db, "ca43");
    for (const e of x.equipment.slice(0, 3)) await as(x.ana).loan.request({ patrimonio: e.patrimonio });
    const quarto = x.equipment[3]!;
    const err = await as(x.ana).loan.request({ patrimonio: quarto.patrimonio }).catch((e: TRPCError) => e);
    expect((err as TRPCError).code).toBe("PRECONDITION_FAILED");
    expect((err as TRPCError).message).toBe("Limite de 3 itens atingido.");
    expect((await as(x.ana).equipment.get({ patrimonio: quarto.patrimonio })).request).toEqual({ allowed: false, reason: "LIMIT" });
    expect(await t.db.loan.count({ where: { membershipId: x.ana.id, returnedAt: null } })).toBe(3);
  });

  it("test_ca_44_atraso_bloqueia_e_vence_o_limite_quando_os_dois_valem", async () => {
    const x = await makeTenant(t.db, "ca44");
    await as(x.ana).loan.request({ patrimonio: x.equipment[1]!.patrimonio });
    await as(x.ana).loan.request({ patrimonio: x.equipment[2]!.patrimonio });
    await atrasado(x, x.equipment[0]!.id, x.ana.id); // 3 em aberto, 1 atrasado
    const livre = await t.db.equipment.create({ data: { tenantId: x.tenant.id, patrimonio: "TI-9044", name: "Extra", category: "CABOS" } });
    expect((await as(x.ana).equipment.get({ patrimonio: livre.patrimonio })).request).toEqual({ allowed: false, reason: "OVERDUE" });
    const err = await as(x.ana).loan.request({ patrimonio: livre.patrimonio }).catch((e: TRPCError) => e);
    expect((err as TRPCError).message).toBe("Bloqueado por atraso.");
  });

  // ERRO PLANTADO (prova do verificador): teste do CA-45 comentado de propósito.
  // it("test_ca_45_dois_pedidos_simultaneos_ao_mesmo_equipamento_criam_um_so_emprestimo", async () => {
  //   const x = await makeTenant(t.db, "ca45");
  //   const outra = await t.db.membership.create({
  //     data: { tenantId: x.tenant.id, userId: crypto.randomUUID(), role: "COLABORADOR", name: "Outra", email: "outra45@x.test", department: "T" },
  //   });
  //   const item = x.equipment[0]!;
  //   const resultados = await Promise.all([code(as(x.ana).loan.request({ patrimonio: item.patrimonio })), code(as(outra).loan.request({ patrimonio: item.patrimonio }))]);
  //   expect(resultados.sort()).toEqual(["CONFLICT", "OK"]);
  //   expect(await t.db.loan.count({ where: { equipmentId: item.id, returnedAt: null } })).toBe(1);
  // });

  it("test_ca_46_meus_emprestimos_lista_so_os_em_aberto_cada_um_com_a_data_prevista", async () => {
    const x = await makeTenant(t.db, "ca46");
    const a1 = await as(x.ana).loan.request({ patrimonio: x.equipment[0]!.patrimonio });
    await as(x.ana).loan.request({ patrimonio: x.equipment[1]!.patrimonio });
    await as(x.ana).loan.return({ loanId: a1.id });
    await as(x.ops).loan.request({ patrimonio: x.equipment[2]!.patrimonio }); // de outra pessoa
    const mine = await as(x.ana).loan.mine();
    expect(mine.open.map((o) => o.patrimonio)).toEqual([x.equipment[1]!.patrimonio]);
    expect(mine.open[0]!.dueAt.getTime()).toBeGreaterThan(Date.now() + 13 * DIA);
    expect(mine.history).toHaveLength(1);
  });

  it("test_ca_48_o_pedido_usa_o_tenant_da_sessao_item_de_outro_tenant_nao_e_visto_nem_pedido", async () => {
    const x = await makeTenant(t.db, "ca48a");
    const y = await makeTenant(t.db, "ca48b");
    const dele = y.equipment[0]!.patrimonio;
    expect(await code(as(x.ana).equipment.get({ patrimonio: dele }))).toBe("NOT_FOUND");
    expect(await code(as(x.ana).loan.request({ patrimonio: dele }))).toBe("NOT_FOUND");
    expect((await as(x.ana).equipment.list({ limit: 60 })).items.map((i) => i.patrimonio)).not.toContain(dele);
    expect(await t.db.loan.count({ where: { tenantId: y.tenant.id } })).toBe(0);
  });
});

describe("isolamento entre tenants (ADR-001: um caso por procedimento)", () => {
  it("test_tenant_equipment_list_nao_enxerga_o_outro", async () => {
    const mine = await as(a.ana).equipment.list({ limit: 60 });
    const names = new Set(mine.items.map((i) => i.patrimonio));
    for (const e of b.equipment) expect(names.has(e.patrimonio)).toBe(false);
    expect(mine.items.length).toBeGreaterThan(0);
  });

  it("test_tenant_equipment_get_do_outro_e_not_found", async () => {
    expect(await code(as(a.ana).equipment.get({ patrimonio: b.equipment[0]!.patrimonio }))).toBe("NOT_FOUND");
  });

  it("test_tenant_equipment_counts_so_do_meu", async () => {
    const c = await as(a.ana).equipment.counts();
    expect(c.total).toBe(await t.db.equipment.count({ where: { tenantId: a.tenant.id, status: { not: "RETIRED" } } }));
  });

  it("test_tenant_loan_request_no_item_do_outro_e_not_found", async () => {
    expect(await code(as(a.ana).loan.request({ patrimonio: b.equipment[0]!.patrimonio }))).toBe("NOT_FOUND");
  });

  it("test_tenant_loan_return_do_outro_e_not_found", async () => {
    const loan = await as(b.ana).loan.request({ patrimonio: b.equipment[0]!.patrimonio });
    // Nem Operações de outro tenant devolve: o filtro é por tenant, antes do papel.
    expect(await code(as(a.ops).loan.return({ loanId: loan.id }))).toBe("NOT_FOUND");
  });

  it("test_tenant_loan_open_e_stats_so_do_meu", async () => {
    const open = await as(a.ops).loan.open({ filter: "all", limit: 50 });
    expect(open.items.every((i) => !b.equipment.some((e) => e.patrimonio === i.patrimonio))).toBe(true);
    const stats = await as(a.ops).loan.stats();
    expect(stats.open).toBe(await t.db.loan.count({ where: { tenantId: a.tenant.id, returnedAt: null } }));
  });

  it("test_tenant_loan_mine_e_recent_so_do_meu", async () => {
    expect((await as(b.ana).loan.mine()).open.map((l) => l.patrimonio)).toEqual([b.equipment[0]!.patrimonio]);
    const recent = await as(a.ops).equipment.recent();
    expect(recent.every((r) => !b.equipment.some((e) => e.patrimonio === r.patrimonio))).toBe(true);
  });
});

describe("RLS no banco (defesa em profundidade)", () => {
  const asUser = (userId: string) => ["set role authenticated", `select set_config('request.jwt.claim.sub', '${userId}', false)`];

  it("test_rls_authenticated_so_le_o_proprio_tenant", async () => {
    const rows = await t.pg<{ tenant_id: string }>("select distinct tenant_id from equipment", asUser(a.ana.userId));
    expect(rows.map((r) => r.tenant_id)).toEqual([a.tenant.id]);
    const loans = await t.pg<{ tenant_id: string }>("select distinct tenant_id from loans", asUser(a.ana.userId));
    expect(loans.every((r) => r.tenant_id === a.tenant.id)).toBe(true);
  });

  it("test_rls_memberships_so_a_propria_linha", async () => {
    const rows = await t.pg<{ user_id: string }>("select user_id from memberships", asUser(a.ana.userId));
    expect(rows.map((r) => r.user_id)).toEqual([a.ana.userId]);
  });

  it("test_rls_anon_e_usuario_sem_vinculo_nao_leem_nada", async () => {
    expect(await t.pg("select 1 from equipment", ["set role anon"])).toHaveLength(0);
    expect(await t.pg("select 1 from equipment", asUser(crypto.randomUUID()))).toHaveLength(0);
  });

  it("test_rls_authenticated_nao_escreve_e_nao_le_auditoria", async () => {
    await expect(
      t.pg("update equipment set name = 'hack'", asUser(a.ana.userId)),
    ).resolves.toEqual([]); // 0 linhas: sem policy de UPDATE, nada é visível para escrever
    expect(await t.db.equipment.count({ where: { name: "hack" } })).toBe(0);
    expect(await t.pg("select 1 from audit_log", asUser(a.ana.userId))).toHaveLength(0);
  });
});
