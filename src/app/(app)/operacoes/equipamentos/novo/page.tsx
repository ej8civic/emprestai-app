"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { EquipmentIcon } from "@/components/equipment-icon";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Card, Empty, StatePill } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { formatDM } from "@/lib/date";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/labels";
import { createEquipmentInput, type CreateEquipmentInput } from "@/lib/schemas";
import { errorMessage, trpc } from "@/lib/trpc";

const STATUS = [
  { value: "AVAILABLE", label: "Disponível" },
  { value: "MAINTENANCE", label: "Em manutenção" },
  { value: "RETIRED", label: "Fora de uso" },
] as const;

const DEFAULTS: CreateEquipmentInput = {
  name: "",
  category: "NOTEBOOKS",
  patrimonio: "",
  serial: "",
  pickupLocation: "Balcão 2º andar",
  status: "AVAILABLE",
  notes: "",
};

export default function NewEquipmentPage() {
  const utils = trpc.useUtils();
  const recent = trpc.equipment.recent.useQuery();
  const [message, setMessage] = React.useState<{ ok: boolean; text: string }>();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateEquipmentInput>({ resolver: zodResolver(createEquipmentInput), defaultValues: DEFAULTS });
  const v = useWatch({ control });

  const create = trpc.equipment.create.useMutation({
    // Sem await: a lista atualiza em segundo plano e o formulário não espera por ela.
    onSuccess: () => {
      void utils.equipment.invalidate();
      void utils.loan.stats.invalidate();
    },
    onError: (e) => {
      if (e.data?.code === "CONFLICT") setError("patrimonio", { message: e.message });
      else setMessage({ ok: false, text: errorMessage(e) });
    },
  });

  const forbidden = recent.error?.data?.code === "FORBIDDEN";
  const previewState = v.status === "MAINTENANCE" ? "maintenance" : v.status === "RETIRED" ? "retired" : "available";

  // Limpa o formulário antes de avisar: quem digita logo após salvar não perde o que digitou.
  // "Cadastrar e adicionar outro" mantém categoria e local.
  const submit = (keep: boolean) =>
    handleSubmit(async (values) => {
      setMessage(undefined);
      const saved = await create.mutateAsync(values).catch(() => null);
      if (!saved) return;
      reset(keep ? { ...DEFAULTS, category: values.category, pickupLocation: values.pickupLocation } : DEFAULTS);
      setMessage({ ok: true, text: `${saved.patrimonio} cadastrado.` });
    });

  if (forbidden) return <Empty title="Só Operações cadastra equipamento." />;

  return (
    <div data-screen-label="06 Cadastrar equipamento" className="flex flex-col gap-8">
      <nav aria-label="Trilha" className="flex items-center gap-2 text-[13px] text-muted">
        <Link href="/operacoes/emprestimos" className="hover:text-fg">
          Operações
        </Link>
        <CaretRight aria-hidden className="size-3 text-subtle" />
        <span className="text-fg">Cadastrar equipamento</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit(false)} noValidate className="flex max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-semibold tracking-tight">Cadastrar equipamento</h1>
            <p className="text-sm text-muted">Um registro por unidade física</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nome" error={errors.name?.message} className="sm:col-span-2">
              <Input placeholder='Ex.: MacBook Pro 14"' aria-invalid={Boolean(errors.name)} {...register("name")} />
            </Field>
            <Field label="Categoria" error={errors.category?.message}>
              <Select {...register("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Patrimônio" error={errors.patrimonio?.message}>
              <Input placeholder="PAT-0000" className="font-mono" aria-invalid={Boolean(errors.patrimonio)} {...register("patrimonio")} />
            </Field>
            <Field label="Número de série" error={errors.serial?.message}>
              <Input placeholder="Número de série" className="font-mono" {...register("serial")} />
            </Field>
            <Field label="Local de retirada" error={errors.pickupLocation?.message}>
              <Input placeholder="Balcão 2º andar" {...register("pickupLocation")} />
            </Field>

            <fieldset className="flex flex-col gap-2 sm:col-span-2">
              <legend className="mb-2 text-[13px] font-medium text-muted">Situação inicial</legend>
              <div role="radiogroup" className="inline-flex w-fit overflow-hidden rounded-md border border-line-strong">
                {STATUS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={v.status === s.value}
                    onClick={() => setValue("status", s.value)}
                    className={cn(
                      "h-10 border-l border-line-strong px-4 text-sm transition-colors first:border-l-0",
                      v.status === s.value ? "bg-fg font-medium text-bg" : "text-muted hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-subtle">Em manutenção não aparece no catálogo.</span>
            </fieldset>

            <Field label="Observações" error={errors.notes?.message} className="sm:col-span-2">
              <Textarea placeholder="Observações sobre o equipamento" {...register("notes")} />
            </Field>
          </div>

          {message && (
            <p role={message.ok ? "status" : "alert"} className={cn("text-sm", message.ok ? "text-success" : "text-danger")}>
              {message.text}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="lg" disabled={create.isPending}>
              Cadastrar
            </Button>
            <Button type="button" size="lg" disabled={create.isPending} onClick={submit(true)}>
              Cadastrar e adicionar outro
            </Button>
          </div>
        </form>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-5">
            <span className="eyebrow">Prévia no catálogo</span>
            <div className="flex min-h-40 flex-col gap-4 rounded-xl border border-line bg-bg p-5">
              <div className="flex items-start justify-between gap-3">
                <EquipmentIcon category={v.category ?? "NOTEBOOKS"} />
                <StatePill state={previewState} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium tracking-tight">{v.name || "Nome do equipamento"}</span>
                <span className="font-mono text-xs text-subtle">
                  {CATEGORY_LABEL[v.category ?? "NOTEBOOKS"]} · {v.patrimonio?.toUpperCase() || "PAT-0000"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <span className="eyebrow">Últimos cadastros</span>
            {recent.data && recent.data.length > 0 ? (
              <ul className="divide-y divide-line">
                {recent.data.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <span className="truncate">{r.name}</span>
                    <span className="font-mono text-xs text-subtle">{formatDM(r.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhum cadastro ainda.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
