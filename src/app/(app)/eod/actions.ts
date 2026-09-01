"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase, getCurrentMember, isManager } from "@/lib/supabase/server";

const count = z.coerce.number().int().min(0).max(10_000);

const EodSchema = z.object({
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  setter_id: z.string().uuid().optional().or(z.literal("")),
  inbound_conversations: count,
  inbound_replies: count,
  outbound_conversations: count,
  outbound_replies: count,
  calendly_links_sent: count,
  calls_booked: count,
  follow_ups: count,
  follow_up_replies: count,
  mood: z.string().max(280).optional(),
  trained: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type FormState = { error?: string; ok?: string } | null;

export async function saveEod(_prev: FormState, formData: FormData): Promise<FormState> {
  const member = await getCurrentMember();
  if (!member) return { error: "Sesión caducada. Vuelve a entrar." };

  const parsed = EodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los campos." };
  }
  const { setter_id, trained, ...values } = parsed.data;

  // Solo un manager puede rellenar el EOD de otra persona.
  const targetSetter = setter_id && isManager(member) ? setter_id : member.id;

  // Las respuestas nunca pueden superar a las conversaciones: si pasa, es
  // un error de tecleo y conviene avisar antes de guardar un dato imposible.
  if (values.inbound_replies > values.inbound_conversations) {
    return { error: "Las respuestas inbound no pueden superar las conversaciones abiertas." };
  }
  if (values.outbound_replies > values.outbound_conversations) {
    return { error: "Las respuestas outbound no pueden superar las conversaciones." };
  }
  if (values.follow_up_replies > values.follow_ups) {
    return { error: "Las respuestas de seguimiento no pueden superar los seguimientos." };
  }

  const db = await createServerSupabase();
  const { error } = await db.from("eod_reports").upsert(
    {
      ...values,
      setter_id: targetSetter,
      trained: trained === "on" ? true : trained === "no" ? false : null,
    },
    { onConflict: "setter_id,report_date" },
  );

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/eod");
  revalidatePath("/");
  return { ok: "EOD guardado. Si ya habías enviado hoy, se ha actualizado." };
}
