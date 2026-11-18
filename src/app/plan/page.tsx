import { redirect } from "next/navigation";

/** /plan es el enlace corto del quiz de scaled.es (conserva los UTM). */
export default async function PlanIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === "string") qs.set(k, v);
  }
  redirect(`/plan/scaled${qs.size ? `?${qs}` : ""}`);
}
