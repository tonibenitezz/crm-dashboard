/**
 * Importa el histórico de Airtable a Supabase.
 *
 *   npx tsx scripts/import-airtable.ts ./data/airtable [--dry-run]
 *
 * Idempotente: se apoya en `airtable_record_id` y en las claves únicas,
 * así que se puede volver a lanzar sin duplicar nada.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  parseAttachmentUrl,
  parseClosingStatus,
  parseCsv,
  parseDate,
  parseInteger,
  parseMoney,
  parsePaymentKind,
  normalizeName,
  toIsoDate,
} from "../src/lib/import/parse";

const DIR = process.argv[2] ?? "./data/airtable";
const DRY_RUN = process.argv.includes("--dry-run");

/**
 * El export trae los importes con `$` aunque el negocio factura en euros
 * (España, transferencia y SeQura). Se importa como EUR; cambiar aquí si
 * alguna venta fue realmente en dólares.
 */
const CURRENCY = "EUR";

/** Plantilla inicial. Los alias absorben las variantes del export. */
const TEAM = [
  { full_name: "Toni Benítez", email: "toni@example.com", role: "admin",
    aliases: ["toni benitez", "toni"], commission_rate: 0 },
  { full_name: "Alberto de Mario", email: "alberto@example.com", role: "closer",
    aliases: ["soy alberto de mario", "alberto", "alberto de mario"], commission_rate: 0 },
  { full_name: "Daniela", email: "daniela@example.com", role: "setter",
    aliases: ["daniela"], commission_rate: 0.05 },
  { full_name: "Angela", email: "angela@example.com", role: "setter",
    aliases: ["angela"], commission_rate: 0.05 },
];

type Row = Record<string, string>;

function findFile(dir: string, needle: string): string {
  const match = readdirSync(dir).find(
    (f) => f.toLowerCase().includes(needle) && f.toLowerCase().endsWith(".csv"),
  );
  if (!match) throw new Error(`No encuentro ningún CSV que contenga "${needle}" en ${dir}`);
  return join(dir, match);
}

function readCsv(dir: string, needle: string): Row[] {
  return parseCsv(readFileSync(findFile(dir, needle), "utf8"));
}

const warnings: string[] = [];
function warn(msg: string) {
  if (!warnings.includes(msg)) warnings.push(msg);
}

// ---------------------------------------------------------------- equipo
async function seedTeam(db: SupabaseClient) {
  for (const member of TEAM) {
    const { error } = await db.from("team_members").upsert(member, { onConflict: "email" });
    if (error) throw error;
  }
  const { data, error } = await db.from("team_members").select("id, full_name, role, aliases");
  if (error) throw error;

  const byAlias = new Map<string, { id: string; role: string }>();
  for (const m of data ?? []) {
    byAlias.set(normalizeName(m.full_name), { id: m.id, role: m.role });
    for (const alias of m.aliases ?? []) byAlias.set(normalizeName(alias), { id: m.id, role: m.role });
  }
  return byAlias;
}

function lookup(byAlias: Map<string, { id: string }>, name: string, label: string) {
  const key = normalizeName(name);
  if (!key) return null;
  const hit = byAlias.get(key);
  if (!hit) {
    warn(`${label} sin correspondencia en el equipo: "${name}" (se importa sin asignar)`);
    return null;
  }
  return hit.id;
}

async function loadPrograms(db: SupabaseClient) {
  const { data, error } = await db.from("programs").select("id, name");
  if (error) throw error;
  return new Map((data ?? []).map((p) => [normalizeName(p.name), p.id as string]));
}

// ---------------------------------------------------------------- leads
/** Crea el lead si no existe y devuelve su id, cacheado por email. */
async function leadResolver(db: SupabaseClient) {
  const cache = new Map<string, string>();

  return async function resolve(fields: {
    email: string;
    full_name?: string | null;
    phone?: string | null;
    whatsapp_url?: string | null;
    instagram_handle?: string | null;
    country?: string | null;
    current_revenue?: string | null;
    source?: string | null;
    setter_id?: string | null;
    status?: string;
  }): Promise<string | null> {
    const email = fields.email?.toLowerCase().trim();
    if (!email) return null;
    if (cache.has(email)) return cache.get(email)!;

    const { data: existing } = await db
      .from("leads").select("id").ilike("email", email).maybeSingle();

    if (existing) {
      cache.set(email, existing.id);
      // Rellena solo los huecos: no pisa datos ya presentes.
      const patch = Object.fromEntries(
        Object.entries(fields).filter(([k, v]) => k !== "email" && v != null && v !== ""),
      );
      if (Object.keys(patch).length) await db.from("leads").update(patch).eq("id", existing.id);
      return existing.id;
    }

    const { data, error } = await db
      .from("leads").insert({ ...fields, email }).select("id").single();
    if (error) throw error;
    cache.set(email, data.id);
    return data.id;
  };
}

// ---------------------------------------------------------------- agendas
async function importBookings(
  db: SupabaseClient,
  dir: string,
  team: Map<string, { id: string }>,
  resolveLead: Awaited<ReturnType<typeof leadResolver>>,
) {
  const rows = readCsv(dir, "booking");
  let imported = 0, skipped = 0;

  for (const r of rows) {
    const recordId = r["Record ID"];
    // "Fecha de agenda" es la llamada; "Evento" es cuándo se reservó. Ambas D/M/Y.
    const scheduledAt = parseDate(r["Fecha de agenda"], "dmy");
    const bookedAt = parseDate(r["Evento"] ?? r["Evento "], "dmy");

    if (!recordId || !scheduledAt) {
      warn(`Agenda descartada por fecha ilegible: "${r["Nombre"]}" (${r["Fecha de agenda"]})`);
      skipped++;
      continue;
    }

    const setterId = lookup(team, r["Setter"], "Setter");
    const leadId = await resolveLead({
      email: r["Email"],
      full_name: r["Nombre"] || null,
      phone: r["Contacto calendly"] || null,
      whatsapp_url: r["📲 Contacto Lead"] || null,
      instagram_handle: r["Instagram"] || null,
      current_revenue: r["Facturación Actual"] || null,
      setter_id: setterId,
      status: "agendado",
    });

    const eventUri = r["Enlace de evento"] || null;
    const payload = {
      lead_id: leadId,
      closer_id: lookup(team, r["Closer"], "Closer"),
      setter_id: setterId,
      calendly_event_uri: eventUri,
      scheduled_at: scheduledAt.toISOString(),
      booked_at: (bookedAt ?? scheduledAt).toISOString(),
      status: "agendada",
      closing_status: parseClosingStatus(r["Closing Status"]),
      invitee_name: r["Nombre"] || null,
      invitee_email: r["Email"]?.toLowerCase() || null,
      phone: r["Contacto calendly"] || null,
      whatsapp_url: r["📲 Contacto Lead"] || null,
      instagram_handle: r["Instagram"] || null,
      current_revenue: r["Facturación Actual"] || null,
      call_notes: r["Notas de llamada"] || null,
      follow_up_setter: r["Follow up Setter"] || null,
      utm_source: r["UTM Source"] || null,
      utm_medium: r["UTM Medium"] || null,
      utm_content: r["UTM Content"] || null,
      airtable_record_id: recordId,
    };

    if (DRY_RUN) { imported++; continue; }
    const { error } = await db
      .from("bookings").upsert(payload, { onConflict: "airtable_record_id" });
    if (error) throw new Error(`Agenda ${recordId}: ${error.message}`);
    imported++;
  }
  return { imported, skipped, total: rows.length };
}

// ---------------------------------------------------------------- cierres
async function importDeals(
  db: SupabaseClient,
  dir: string,
  team: Map<string, { id: string }>,
  programs: Map<string, string>,
  resolveLead: Awaited<ReturnType<typeof leadResolver>>,
) {
  const rows = readCsv(dir, "cierres");
  let imported = 0, skipped = 0;

  for (const [index, r] of rows.entries()) {
    // Ojo: Cierres usa M/D/Y, al revés que Booking Calls.
    const closedAt = parseDate(r["📆 Fecha de cierre"], "mdy");
    const ticket = parseMoney(r["Ticket"]);

    if (!closedAt || ticket === null) {
      warn(`Cierre descartado por fecha o ticket ilegible: "${r["Deal Nombre"]}"`);
      skipped++;
      continue;
    }

    const email = r["Email Cliente"]?.toLowerCase() || "";
    const closerId = lookup(team, r["Closer"], "Closer");
    const setterId = lookup(team, r["Setter"], "Setter");

    const leadId = await resolveLead({
      email,
      full_name: r["Deal Nombre"] || null,
      phone: r["Contacto cliente"] || null,
      country: r["País"] || null,
      source: r["Fuente Manual"] || null,
      setter_id: setterId,
      status: "cerrado",
    });

    // Enlaza con la agenda de la que salió, por email.
    let bookingId: string | null = null;
    if (email) {
      const { data: booking } = await db
        .from("bookings").select("id")
        .ilike("invitee_email", email)
        .lte("scheduled_at", closedAt.toISOString())
        .order("scheduled_at", { ascending: false })
        .limit(1).maybeSingle();
      bookingId = booking?.id ?? null;
    }

    const paymentKind = parsePaymentKind(r["Tipo de pago"]);
    const recordId = `cierre-${index}-${email || r["Deal Nombre"]}`;

    const payload = {
      booking_id: bookingId,
      lead_id: leadId,
      closer_id: closerId,
      setter_id: setterId,
      program_id: programs.get(normalizeName(r["Programa"])) ?? null,
      deal_name: r["Deal Nombre"] || null,
      closed_at: toIsoDate(closedAt),
      country: r["País"] || null,
      source: r["Fuente Manual"] || null,
      payment_method: r["Forma de pago"] || null,
      payment_kind: paymentKind,
      ticket,
      currency: CURRENCY,
      deposit_amount: parseMoney(r["Monto de reserva"] ?? ""),
      commission_closer: parseMoney(r["Comisión Closer"]) ?? 0,
      commission_setter: parseMoney(r["Comisión Setter"]) ?? 0,
      status: "cerrado",
      airtable_record_id: recordId,
    };

    if (DRY_RUN) { imported++; continue; }

    const { data: deal, error } = await db
      .from("deals").upsert(payload, { onConflict: "airtable_record_id" })
      .select("id").single();
    if (error) throw new Error(`Cierre "${r["Deal Nombre"]}": ${error.message}`);

    await importPayments(db, deal.id, r, closedAt, ticket, paymentKind);
    if (bookingId) {
      await db.from("bookings").update({ closing_status: "closed", status: "completada" })
        .eq("id", bookingId);
    }
    imported++;
  }
  return { imported, skipped, total: rows.length };
}

/**
 * Genera las cuotas. El export no dice si un pago se cobró, solo si hay
 * comprobante adjunto: se usa eso como señal y se deja el resto pendiente.
 */
async function importPayments(
  db: SupabaseClient,
  dealId: string,
  r: Row,
  closedAt: Date,
  ticket: number,
  paymentKind: string,
) {
  const proofs = [
    parseAttachmentUrl(r["Comprobante"] ?? ""),
    parseAttachmentUrl(r["Comprobante 2ª"] ?? ""),
    parseAttachmentUrl(r["Comprobante 3ª"] ?? ""),
  ];
  const dueDates = [
    parseDate(r["Primer vencimiento de pago"] ?? "", "mdy"),
    parseDate(r["Segundo vencimiento de pago"] ?? "", "mdy"),
    parseDate(r["Tercera vencimiento de pago"] ?? "", "mdy"),
  ];
  const amounts =
    paymentKind === "full_pay"
      ? [ticket]
      : [
          parseMoney(r["Monto del primer pago"] ?? "") ?? ticket,
          parseMoney(r["Monto del segundo pago"] ?? ""),
          parseMoney(r["Monto del tercer pago"] ?? ""),
        ].filter((a): a is number => a !== null && a > 0);

  for (const [i, amount] of amounts.entries()) {
    const paid = i === 0 ? Boolean(proofs[0]) : Boolean(proofs[i]);
    const { error } = await db.from("payments").upsert(
      {
        deal_id: dealId,
        installment_number: i + 1,
        amount,
        currency: CURRENCY,
        due_on: toIsoDate(i === 0 ? closedAt : dueDates[i] ?? null),
        paid_at: paid ? toIsoDate(i === 0 ? closedAt : dueDates[i] ?? closedAt) : null,
        method: r["Forma de pago"] || null,
        proof_url: proofs[i],
        status: paid ? "cobrado" : "pendiente",
      },
      { onConflict: "deal_id,installment_number" },
    );
    if (error) throw new Error(`Cuota ${i + 1} de ${dealId}: ${error.message}`);
  }
}

// ---------------------------------------------------------------- EOD
async function importEod(db: SupabaseClient, dir: string, team: Map<string, { id: string }>) {
  const rows = readCsv(dir, "setter");
  let imported = 0, skipped = 0;

  // El export trae días repetidos por setter; la clave única (setter, fecha)
  // los colapsa, así que nos quedamos con la última aparición.
  const deduped = new Map<string, Row>();
  for (const r of rows) {
    const date = parseDate(r["Fecha"], "dmy");
    const setterId = r["Setter"] ? lookup(team, r["Setter"], "Setter") : null;
    if (!date || !setterId) { skipped++; continue; }
    const key = `${setterId}|${toIsoDate(date)}`;
    if (deduped.has(key)) warn(`EOD duplicado en el export: ${r["Setter"]} ${r["Fecha"]} (me quedo con el último)`);
    deduped.set(key, r);
  }

  for (const [key, r] of deduped) {
    const [setterId, reportDate] = key.split("|");
    const payload = {
      setter_id: setterId,
      report_date: reportDate,
      inbound_conversations: parseInteger(r["Convers Abiertas Inb"]),
      inbound_replies: parseInteger(r["Respuestas Inb"]),
      outbound_conversations: parseInteger(r["Convers Out"]),
      outbound_replies: parseInteger(r["Respuestas Out"]),
      calendly_links_sent: parseInteger(r["Calendly pasados"]),
      calls_booked: parseInteger(r["Llamadas agendadas"]),
      follow_ups: parseInteger(r["Seguimiento"]),
      follow_up_replies: parseInteger(r["Respuestas seguimiento"]),
      mood: r["Emoción del día"] || null,
      trained: r["¿Entrenaste?"] ? /^s[ií]$/i.test(r["¿Entrenaste?"].trim()) : null,
    };
    if (DRY_RUN) { imported++; continue; }
    const { error } = await db
      .from("eod_reports").upsert(payload, { onConflict: "setter_id,report_date" });
    if (error) throw new Error(`EOD ${key}: ${error.message}`);
    imported++;
  }
  return { imported, skipped, total: rows.length };
}

// ---------------------------------------------------------------- main
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");

  const db = createClient(url, key, { auth: { persistSession: false } });

  console.log(`Importando desde ${DIR}${DRY_RUN ? "  (dry run: no escribe nada)" : ""}\n`);

  const team = await seedTeam(db);
  const programs = await loadPrograms(db);
  const resolveLead = await leadResolver(db);

  const bookings = await importBookings(db, DIR, team, resolveLead);
  console.log(`Agendas   ${bookings.imported}/${bookings.total} importadas, ${bookings.skipped} descartadas`);

  const deals = await importDeals(db, DIR, team, programs, resolveLead);
  console.log(`Cierres   ${deals.imported}/${deals.total} importados, ${deals.skipped} descartados`);

  const eod = await importEod(db, DIR, team);
  console.log(`EOD       ${eod.imported}/${eod.total} importados, ${eod.skipped} descartados`);

  if (warnings.length) {
    console.log(`\nAvisos (${warnings.length}):`);
    for (const w of warnings) console.log(`  · ${w}`);
  }
}

main().catch((err) => {
  console.error("\nImportación abortada:", err.message);
  process.exit(1);
});
