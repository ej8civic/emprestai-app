"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

const schema = z.object({
  email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setFormError(undefined);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setFormError(body?.error ?? "Não foi possível entrar.");
      return;
    }
    router.replace("/catalogo");
    router.refresh();
  }

  return (
    <div data-screen-label="01 Login" className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative isolate hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
        <div aria-hidden className="glow-turbo absolute inset-x-0 top-1/4 -z-10 h-[420px] opacity-70" />
        <Logo className="text-base" />
        <div className="flex max-w-lg flex-col gap-6">
          <span className="eyebrow">Empréstimo de equipamentos</span>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tighter">
            Quem está com
            <br />
            <span className="text-turbo">o quê.</span>
          </h1>
          <p className="max-w-sm text-base text-muted">Pedido e devolução sem planilha.</p>
          <div className="rule-fade" />
          <dl className="flex gap-12">
            <div className="flex flex-col gap-1">
              <dt className="eyebrow">Por pessoa</dt>
              <dd className="font-mono text-3xl font-medium tracking-tight">3 itens</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="eyebrow">Prazo padrão</dt>
              <dd className="font-mono text-3xl font-medium tracking-tight">14 dias</dd>
            </div>
          </dl>
        </div>
        <span className="font-mono text-xs text-subtle">Operações · v1</span>
      </section>

      <section className="flex items-center justify-center px-6 py-14">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full max-w-sm flex-col gap-6">
          <Logo className="lg:hidden" />
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
            <p className="text-sm text-muted">E-mail e senha do convite.</p>
          </div>
          <Field label="E-mail" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="nome@empresa.com"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </Field>
          <Field label="Senha" error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
          </Field>
          {formError && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Entrando…" : "Entrar"} <ArrowRight />
          </Button>
          <div className="rule-fade" />
          <p className="text-center text-xs text-subtle">Sem acesso? Fale com Operações.</p>
        </form>
      </section>
    </div>
  );
}
