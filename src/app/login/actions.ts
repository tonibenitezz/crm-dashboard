"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function signIn(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) return { error: "Escribe tu email y tu contraseña." };

  const db = await createServerSupabase();
  const { error } = await db.auth.signInWithPassword({ email, password });

  // No distinguimos "no existe" de "contraseña incorrecta": revelarlo
  // permitiría averiguar quién tiene cuenta.
  if (error) return { error: "Email o contraseña incorrectos." };

  redirect(next.startsWith("/") ? next : "/");
}

export async function signOut() {
  const db = await createServerSupabase();
  await db.auth.signOut();
  redirect("/login");
}
