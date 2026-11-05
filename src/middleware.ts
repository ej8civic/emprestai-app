import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { csp } from "@/lib/csp";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NODE_ENV !== "production");
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", policy);
  headers.set("x-request-id", crypto.randomUUID());

  let res = NextResponse.next({ request: { headers } });

  // Renovação de sessão em toda rota (ADR-001).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) req.cookies.set(name, value);
          res = NextResponse.next({ request: { headers } });
          for (const { name, value, options } of list) res.cookies.set(name, value, { ...options, httpOnly: true });
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!signedIn && !isPublic && !pathname.startsWith("/api/")) {
    const redirect = NextResponse.redirect(new URL("/login", req.url));
    redirect.headers.set("content-security-policy", policy);
    return redirect;
  }
  if (signedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/catalogo", req.url));
  }

  res.headers.set("content-security-policy", policy);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
