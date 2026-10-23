import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Mensagem única: não revela se o e-mail existe.
  if (error) return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  return NextResponse.json({ ok: true });
}
