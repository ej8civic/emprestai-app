// Log estruturado em JSON com request_id e tenant_id (ADR-001).
export function log(
  level: "info" | "warn" | "error",
  msg: string,
  fields: { requestId?: string; tenantId?: string } & Record<string, unknown> = {},
) {
  if (process.env.VITEST) return;
  const { requestId, tenantId, ...rest } = fields;
  const line = JSON.stringify({
    level,
    msg,
    request_id: requestId,
    tenant_id: tenantId,
    ...rest,
    ts: new Date().toISOString(),
  });
  (level === "error" ? console.error : console.log)(line);
}
