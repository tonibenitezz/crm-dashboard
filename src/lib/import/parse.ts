/**
 * Utilidades para leer los CSV exportados de Airtable.
 * El export mezcla formatos: fechas D/M/Y en Booking Calls y KPI Setter
 * pero M/D/Y en Cierres, y separadores decimales `.` y `,` en la misma
 * columna. Cada parser aquí es explícito sobre lo que asume.
 */

/** CSV con comillas dobles y saltos de línea dentro de campos. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // quita BOM

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift();
  if (!header) return [];
  const keys = header.map((h) => h.trim());

  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

/**
 * Fechas de Airtable. `order` distingue Booking Calls (día primero) de
 * Cierres (mes primero); no se puede inferir porque "10/8/2025" es válido
 * en ambas lecturas.
 */
export function parseDate(
  value: string,
  order: "dmy" | "mdy",
): Date | null {
  const v = value.trim();
  if (!v) return null;

  const m = v.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(am|pm))?$/i,
  );
  if (!m) return null;

  const [, a, b, year, hh, mm, ampm] = m;
  const day = order === "dmy" ? Number(a) : Number(b);
  const month = order === "dmy" ? Number(b) : Number(a);

  let hour = hh ? Number(hh) : 12; // sin hora, mediodía evita saltos de día por zona horaria
  if (ampm) {
    const pm = ampm.toLowerCase() === "pm";
    if (hour === 12) hour = pm ? 12 : 0;
    else if (pm) hour += 12;
  }

  const date = new Date(Date.UTC(Number(year), month - 1, day, hour, mm ? Number(mm) : 0));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function toIsoDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/**
 * Importes: "$4000", "$500,00", "€1000,00", "$0.00", "4,0".
 * Cuando aparecen `.` y `,`, manda el último como decimal. Con una sola
 * coma seguida de exactamente dos dígitos, es decimal; si no, millares.
 */
export function parseMoney(value: string): number | null {
  const v = value.replace(/[^\d.,-]/g, "").trim();
  if (!v) return null;

  const lastDot = v.lastIndexOf(".");
  const lastComma = v.lastIndexOf(",");

  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandsSep = decimalSep === "." ? "," : ".";
    normalized = v.split(thousandsSep).join("").replace(decimalSep, ".");
  } else if (lastComma >= 0 || lastDot >= 0) {
    // Un solo separador: con 3 dígitos detrás son millares ("3.666", "1,000"),
    // con 1 o 2 son decimales ("4,0", "350.00"). Los importes del negocio son
    // euros enteros, así que ".666" nunca es una fracción real.
    const pos = lastComma >= 0 ? lastComma : lastDot;
    const sep = v[pos];
    const decimals = v.length - pos - 1;
    normalized = decimals === 3 ? v.split(sep).join("") : v.replace(sep, ".");
  } else {
    normalized = v;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function parseInteger(value: string): number {
  const n = parseMoney(value);
  return n === null ? 0 : Math.round(n);
}

/** Normaliza un nombre para casar "Toni Benítez", "Toni" y "TONI ". */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const CLOSING_STATUS: Record<string, string> = {
  "para cerrar": "para_cerrar",
  seguimiento: "seguimiento",
  closed: "closed",
  "bad feed (no califica)": "no_califica",
};

/** El campo de Airtable lleva emoji delante: "📞 Para Cerrar". */
export function parseClosingStatus(value: string): string {
  const clean = normalizeName(value.replace(/[^\p{L}\p{N}\s()]/gu, " "));
  for (const [key, mapped] of Object.entries(CLOSING_STATUS)) {
    if (clean.includes(key)) return mapped;
  }
  return "para_cerrar";
}

const PAYMENT_KIND: Record<string, string> = {
  "full pay": "full_pay",
  "plan de pago completo": "plan_completo",
  "cuotas / financiacion": "cuotas",
};

export function parsePaymentKind(value: string): string {
  return PAYMENT_KIND[normalizeName(value)] ?? "full_pay";
}

/** "Comprobante" trae `nombre.png (https://...)`; nos quedamos con la URL. */
export function parseAttachmentUrl(value: string): string | null {
  const m = value.match(/\((https?:\/\/[^)]+)\)/);
  return m ? m[1] : null;
}
