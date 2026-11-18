import type { FunnelConfig } from "./types";
import { scaled } from "./clients/scaled";
import { ruben } from "./clients/ruben";

/**
 * Un archivo por funnel en ./clients. Para dar de alta uno nuevo: copia el más
 * parecido, adáptalo y añádelo aquí. Ver docs/QUIZ_FUNNEL.md.
 */
export const FUNNELS: Record<string, FunnelConfig> = {
  [scaled.slug]: scaled,
  [ruben.slug]: ruben,
};

export function getFunnel(slug: string): FunnelConfig | null {
  return FUNNELS[slug] ?? null;
}
