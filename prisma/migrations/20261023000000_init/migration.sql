-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COLABORADOR', 'OPERACOES');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('NOTEBOOKS', 'MONITORES', 'CAMERAS', 'CABOS', 'PROJETORES');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'RETIRED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "patrimonio" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "serial" TEXT,
    "pickup_location" TEXT NOT NULL DEFAULT 'Balcão 2º andar',
    "description" TEXT,
    "notes" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "loaned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "returned_at" TIMESTAMPTZ(6),

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "memberships_tenant_id_idx" ON "memberships"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_tenant_id_key" ON "memberships"("user_id", "tenant_id");

-- CreateIndex
CREATE INDEX "equipment_tenant_id_status_idx" ON "equipment"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_tenant_id_patrimonio_key" ON "equipment"("tenant_id", "patrimonio");

-- CreateIndex
CREATE INDEX "loans_tenant_id_returned_at_idx" ON "loans"("tenant_id", "returned_at");

-- CreateIndex
CREATE INDEX "loans_membership_id_returned_at_idx" ON "loans"("membership_id", "returned_at");

-- CreateIndex
CREATE INDEX "loans_equipment_id_idx" ON "loans"("equipment_id");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_created_at_idx" ON "audit_log"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Um item só pode ter um empréstimo em aberto (corrida entre dois pedidos simultâneos)
CREATE UNIQUE INDEX "loans_one_open_per_equipment" ON "loans" ("equipment_id") WHERE "returned_at" IS NULL;

-- Auditoria é append-only
CREATE FUNCTION "audit_log_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log é append-only';
END;
$$;
CREATE TRIGGER "audit_log_no_update_delete"
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "audit_log_append_only"();

-- RLS: deny by default em toda tabela. Defesa em profundidade (ADR-001):
-- o Prisma conecta como dono e ignora RLS; a policy vale para qualquer acesso via API do Supabase.
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "equipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "loans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memberships_select_own" ON "memberships"
  FOR SELECT TO authenticated USING ("user_id" = auth.uid());

CREATE POLICY "tenants_select_member" ON "tenants"
  FOR SELECT TO authenticated
  USING ("id" IN (SELECT "tenant_id" FROM "memberships" WHERE "user_id" = auth.uid()));

CREATE POLICY "equipment_select_tenant" ON "equipment"
  FOR SELECT TO authenticated
  USING ("tenant_id" IN (SELECT "tenant_id" FROM "memberships" WHERE "user_id" = auth.uid()));

CREATE POLICY "loans_select_tenant" ON "loans"
  FOR SELECT TO authenticated
  USING ("tenant_id" IN (SELECT "tenant_id" FROM "memberships" WHERE "user_id" = auth.uid()));

CREATE POLICY "audit_log_select_none" ON "audit_log"
  FOR SELECT TO authenticated USING (false);
