const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

/** `dd/mmm` no fuso de São Paulo (layout.md: datas curtas). */
export function formatDM(date: Date): string {
  const p = parts.formatToParts(date);
  const day = p.find((x) => x.type === "day")?.value ?? "01";
  const month = Number(p.find((x) => x.type === "month")?.value ?? "1");
  return `${day}/${MONTHS[month - 1]}`;
}
