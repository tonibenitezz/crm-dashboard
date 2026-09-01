"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase, getCurrentMember } from "@/lib/supabase/server";
import { notifyNewDeal } from "@/lib/integrations/slack";
import { monthToDate } from "@/lib/format";

const money = z.coerce.number().min(0).max(1_000_000);

const DealSchema = z.object({
  deal_name: z.string().min(1, "Escribe el nombre del cliente").max(200),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  country: z.string().max(80).optional(),
  closed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  program_id: z.string().uuid().optional().or(z.literal("")),
  closer_id: z.string().uuid().optional().or(z.literal("")),
  setter_id: z.string().uuid().optional().or(z.literal("")),
  booking_id: z.string().uuid().optional().or(z.literal("")),
  source: z.string().max(80).optional(),
  payment_method: z.string().max(80).optional(),
  payment_kind: z.enum(["full_pay", "plan_completo", "cuotas"]),
  ticket: money,
  cash_now: money,
  installments: z.coerce.number().int().min(1).max(12),
  currency: z.string().length(3).default("EUR"),
  notes: z.string().max(2000).optional(),
});

export type FormState = { error?: string; ok?: string } | null;

const blank = (v: string | undefined) => (v && v.length ? v : null);

export async function createDeal(_prev: FormState, formData: FormData): Promise<FormState> {
  const member = await getCurrentMember();
  if (!member) return { error: "Sesión caducada. Vuelve a entrar." };

  const parsed = DealSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los campos." };
  const v = parsed.data;

  if (v.cash_now > v.ticket) {
    return { error: "El cobrado no puede superar el ticket." };
  }
  if (v.payment_kind === "full_pay" && v.cash_now !== v.ticket) {
    return { error: "En un pago único, el cobrado tiene que ser igual al ticket." };
  }

  const db = await createServerSupabase();

  // El lead puede no existir: un cierre puede venir de fuera de Calendly.
  let leadId: string | null = null;
  if (v.email) {
    const { data: existing } = await db.from("leads").select("id").ilike("email", v.email).maybeSingle();
    if (existing) {
      leadId = existing.id;
      await db.from("leads").update({ status: "cerrado" }).eq("id", existing.id);
    } else {
      const { data: created, error } = await db
        .from("leads")
        .insert({
          email: v.email, full_name: v.deal_name, phone: blank(v.phone),
          country: blank(v.country), source: blank(v.source),
          setter_id: blank(v.setter_id), status: "cerrado",
        })
        .select("id").single();
      if (error) return { error: `No se pudo crear el lead: ${error.message}` };
      leadId = created.id;
    }
  }

  const { data: deal, error } = await db
    .from("deals")
    .insert({
      booking_id: blank(v.booking_id),
      lead_id: leadId,
      closer_id: blank(v.closer_id) ?? member.id,
      setter_id: blank(v.setter_id),
      program_id: blank(v.program_id),
      deal_name: v.deal_name,
      closed_at: v.closed_at,
      country: blank(v.country),
      source: blank(v.source),
      payment_method: blank(v.payment_method),
      payment_kind: v.payment_kind,
      ticket: v.ticket,
      currency: v.currency,
      notes: blank(v.notes),
      created_by: member.id,
      status: "cerrado",
    })
    .select("id")
    .single();

  if (error) return { error: `No se pudo guardar el cierre: ${error.message}` };

  const paymentsError = await createInstallments(db, deal.id, v);
  if (paymentsError) return { error: paymentsError };

  if (v.booking_id) {
    await db.from("bookings")
      .update({ closing_status: "closed", status: "completada" })
      .eq("id", v.booking_id);
  }

  await announce(db, deal.id, v);

  revalidatePath("/cierres");
  revalidatePath("/");
  return { ok: `Cierre de ${v.deal_name} guardado y avisado por Slack.` };
}

type Db = Awaited<ReturnType<typeof createServerSupabase>>;
type DealValues = z.infer<typeof DealSchema>;

/**
 * El primer pago es lo cobrado hoy; el resto se reparte a partes iguales
 * cada 30 días, y queda pendiente hasta que alguien lo marque cobrado.
 */
async function createInstallments(db: Db, dealId: string, v: DealValues): Promise<string | null> {
  type PaymentRow = {
    deal_id: string; installment_number: number; amount: number; currency: string;
    due_on: string; paid_at: string | null; method: string | null;
    status: "cobrado" | "pendiente";
  };

  const rows: PaymentRow[] = [
    {
      deal_id: dealId, installment_number: 1, amount: v.cash_now, currency: v.currency,
      due_on: v.closed_at, paid_at: v.closed_at, method: blank(v.payment_method),
      status: "cobrado",
    },
  ];

  const remaining = v.ticket - v.cash_now;
  const rest = v.installments - 1;
  if (remaining > 0 && rest > 0) {
    const each = Math.round((remaining / rest) * 100) / 100;
    for (let i = 0; i < rest; i++) {
      const due = new Date(`${v.closed_at}T00:00:00Z`);
      due.setUTCDate(due.getUTCDate() + 30 * (i + 1));
      rows.push({
        deal_id: dealId, installment_number: i + 2,
        // La última cuota absorbe el redondeo para que la suma cuadre con el ticket.
        amount: i === rest - 1 ? Math.round((remaining - each * (rest - 1)) * 100) / 100 : each,
        currency: v.currency, due_on: due.toISOString().slice(0, 10),
        paid_at: null, method: blank(v.payment_method),
        status: "pendiente",
      });
    }
  }

  const { error } = await db.from("payments").insert(rows);
  return error ? `El cierre se guardó pero fallaron las cuotas: ${error.message}` : null;
}

/** Un fallo de Slack no debe tirar abajo un cierre ya guardado. */
async function announce(db: Db, dealId: string, v: DealValues) {
  try {
    const [{ data: closer }, { data: setter }, { data: program }] = await Promise.all([
      v.closer_id
        ? db.from("team_members").select("full_name, slack_user_id").eq("id", v.closer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      v.setter_id
        ? db.from("team_members").select("full_name, slack_user_id").eq("id", v.setter_id).maybeSingle()
        : Promise.resolve({ data: null }),
      v.program_id
        ? db.from("programs").select("name").eq("id", v.program_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const month = monthToDate();
    const { data: cashRows } = await db
      .from("v_cash_by_day").select("cash")
      .gte("metric_date", month.from).lte("metric_date", month.to);
    const monthCash = (cashRows ?? []).reduce((sum, r) => sum + Number(r.cash ?? 0), 0);

    await notifyNewDeal({
      id: dealId,
      dealName: v.deal_name,
      ticket: v.ticket,
      currency: v.currency,
      cashNow: v.cash_now,
      program: program?.name ?? null,
      paymentMethod: v.payment_method ?? null,
      closer, setter, monthCash,
    });
  } catch (err) {
    console.error("[slack] no se pudo avisar del cierre", dealId, err);
  }
}

export async function markPaymentPaid(paymentId: string) {
  const db = await createServerSupabase();
  await db
    .from("payments")
    .update({ status: "cobrado", paid_at: new Date().toISOString().slice(0, 10) })
    .eq("id", paymentId);
  revalidatePath("/cierres");
  revalidatePath("/");
}
