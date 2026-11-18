import { useEffect } from "react";
import { Quiz } from "@/quiz/Quiz";
import { FUNNEL } from "@/quiz/funnels";

export default function Plan() {
  useEffect(() => {
    document.title = `${FUNNEL.landing.eyebrow} · ${FUNNEL.brand}`;
  }, []);
  return <Quiz funnel={FUNNEL} />;
}
