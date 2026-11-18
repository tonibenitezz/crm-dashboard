import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFunnel } from "@/lib/quiz/funnels";
import { Quiz, type PublicFunnel } from "./quiz";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ funnel: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const funnel = getFunnel((await params).funnel);
  if (!funnel) return {};
  return {
    title: `${funnel.landing.eyebrow} · ${funnel.brand}`,
    description: funnel.landing.subheadline,
    robots: { index: false },
  };
}

export default async function QuizPage({ params }: Props) {
  const funnel = getFunnel((await params).funnel);
  if (!funnel) notFound();

  // Al navegador solo le llega lo público: ni el contexto de la IA ni el canal de Slack.
  const publicFunnel: PublicFunnel = {
    slug: funnel.slug,
    brand: funnel.brand,
    owner: funnel.owner,
    landing: funnel.landing,
    questions: funnel.questions,
    contact: funnel.contact,
    result: funnel.result,
  };
  return <Quiz funnel={publicFunnel} />;
}
