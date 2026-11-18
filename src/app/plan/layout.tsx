import { Bricolage_Grotesque, Manrope } from "next/font/google";

// Tipografías de scaled.es. next/font las descarga al compilar y las sirve
// desde el propio dominio: el navegador no llama a Google.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${body.variable}`}>{children}</div>;
}
