"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

export async function markContacted(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const undo = formData.get("undo") === "1";
  if (!id) return;

  const db = await createServerSupabase();
  const { data: sub } = await db
    .from("quiz_submissions")
    .update({ contacted_at: undo ? null : new Date().toISOString() })
    .eq("id", id)
    .select("lead_id")
    .single();

  // El lead pasa a "contactado" solo si aún estaba en "nuevo": no pisa agendado ni cerrado.
  if (!undo && sub?.lead_id) {
    await db.from("leads").update({ status: "contactado" }).eq("id", sub.lead_id).eq("status", "nuevo");
  }

  revalidatePath(`/quiz/${id}`);
  revalidatePath("/quiz");
}

export async function saveNotes(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await createServerSupabase();
  await db
    .from("quiz_submissions")
    .update({ notes: String(formData.get("notes") ?? "").slice(0, 5000) || null })
    .eq("id", id);
  revalidatePath(`/quiz/${id}`);
}
