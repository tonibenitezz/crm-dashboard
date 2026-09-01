export function fmtMoney(amount: number | null | undefined, currency = "EUR") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** Cifras grandes de las stat tiles: 12,4 k en vez de 12.400. */
export function fmtCompactMoney(amount: number | null | undefined, currency = "EUR") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    notation: Math.abs(amount) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(amount) >= 10_000 ? 1 : 0,
  }).format(amount);
}

export function fmtNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-ES").format(value);
}

export function fmtPercent(ratio: number | null | undefined, digits = 0) {
  if (ratio == null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(ratio);
}

export function fmtRatio(value: number | null | undefined, suffix = "×") {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

export function fmtDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export function fmtDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export function fmtDayMonth(value: string | Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "short", timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

/** Rango [desde, hasta] en ISO para los últimos `days` días, hoy incluido. */
export function lastNDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function monthToDate(): { from: string; to: string } {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}
