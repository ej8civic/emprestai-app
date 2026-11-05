/** CSP com nonce (ADR-001), sem `unsafe-inline`. `img-src` aceita só o Storage do projeto Supabase além do próprio site. */
export function csp(nonce: string, supabaseUrl: string | undefined, dev: boolean) {
  let storage = "";
  try {
    if (supabaseUrl) storage = ` ${new URL(supabaseUrl).origin}`;
  } catch {
    /* URL inválida: nenhuma origem extra */
  }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: blob:${storage}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
