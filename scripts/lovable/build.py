#!/usr/bin/env python3
"""
Genera el paquete de Lovable de un funnel: python3 scripts/lovable/build.py ruben [carpeta_salida]

Convierte el quiz del CRM (Next.js) en un proyecto de Lovable (React + Vite + Supabase):
- src/quiz/            la portada, el quiz y la configuración del funnel
- supabase/functions/  la función que guarda el lead y genera el plan con Claude
- public/quiz/<slug>/  las imágenes del funnel
- sql/ y README.md

El funnel sale de src/lib/quiz/clients/<slug>.ts. Lo que se lea de process.env se
sustituye por su valor por defecto.
"""
import re, shutil, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SDK = "1.9.0"   # fijada: versión publicada hace más de un día
ZOD = "4.5.4"

TOKENS = ["surface-muted", "surface-sunken", "surface", "border", "foreground-muted", "foreground",
          "brand-500", "brand-600", "brand-50", "positive", "negative", "warning"]
TOK_RE = re.compile(r"var\(--(" + "|".join(TOKENS) + r")(?![\w-])")


def must_replace(s, old, new):
    if old not in s:
        raise SystemExit(f"build.py: no encuentro en el código: {old[:70]!r}. ¿Ha cambiado el quiz?")
    return s.replace(old, new)


def prefix_tokens(s):
    # La plantilla de Lovable (shadcn) usa --border, --foreground… con otro formato.
    s = TOK_RE.sub(r"var(--q-\1", s)
    for k in TOKENS:
        s = s.replace(f'"--{k}":', f'"--q-{k}":')
    return s


def strip_env(s):
    # process.env.X ?? valor  →  valor ;  process.env.X  →  null
    s = re.sub(r"process\.env\.[A-Z0-9_]+ \?\? ", "", s)
    return re.sub(r"process\.env\.[A-Z0-9_]+", "null", s)


def main():
    slug = sys.argv[1] if len(sys.argv) > 1 else "scaled"
    out_parent = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "dist"
    client = ROOT / f"src/lib/quiz/clients/{slug}.ts"
    if not client.exists():
        raise SystemExit(f"No existe {client.relative_to(ROOT)}")
    out = out_parent / f"lovable-{slug}"
    shutil.rmtree(out, ignore_errors=True)
    lib = ROOT / "src/lib/quiz"
    app = ROOT / "src/app/plan/[funnel]"

    # --- configuración del funnel (una copia para el front y otra para la función)
    funnel_src = strip_env(client.read_text()).replace('from "../types"', 'from "./types"')
    var = re.search(r"export const (\w+): FunnelConfig", funnel_src).group(1)
    registry = (
        f'import type {{ FunnelConfig }} from "./types";\nimport {{ {var} }} from "./funnel";\n\n'
        f"export const FUNNELS: Record<string, FunnelConfig> = {{ [{var}.slug]: {var} }};\n\n"
        "export function getFunnel(slug: string): FunnelConfig | null {\n  return FUNNELS[slug] ?? null;\n}\n"
        f"\n/** El funnel de este proyecto. */\nexport const FUNNEL = {var};\n"
    )
    types = (lib / "types.ts").read_text()
    for d, ext in [(out / "src/quiz", ""), (out / "supabase/functions/_shared", ".ts")]:
        d.mkdir(parents=True, exist_ok=True)
        (d / "types.ts").write_text(types)
        (d / "funnel.ts").write_text(funnel_src.replace('from "./types"', f'from "./types{ext}"'))
        (d / "funnels.ts").write_text(registry.replace('"./types"', f'"./types{ext}"').replace('"./funnel"', f'"./funnel{ext}"'))

    # --- servidor (Deno, con especificadores npm:)
    plan = (lib / "plan.ts").read_text()
    plan = must_replace(plan, 'from "@anthropic-ai/sdk";', f'from "npm:@anthropic-ai/sdk@{SDK}";')
    plan = must_replace(plan, 'from "@anthropic-ai/sdk/helpers/beta/zod";', f'from "npm:@anthropic-ai/sdk@{SDK}/helpers/beta/zod";')
    plan = must_replace(plan, 'from "zod/v4";', f'from "npm:zod@{ZOD}/v4";')
    plan = must_replace(plan, 'from "./types";', 'from "./types.ts";')
    shared = out / "supabase/functions/_shared"
    (shared / "plan.ts").write_text(plan)
    val = (lib / "validate.ts").read_text()
    val = must_replace(val, 'from "zod";', f'from "npm:zod@{ZOD}";')
    val = must_replace(val, 'from "./plan";', 'from "./plan.ts";')
    val = must_replace(val, 'from "./types";', 'from "./types.ts";')
    (shared / "validate.ts").write_text(val)
    fn = out / "supabase/functions/quiz-plan"
    fn.mkdir(parents=True)
    shutil.copy(HERE / "template/quiz-plan.ts", fn / "index.ts")

    # --- tipo del adelanto para el front, sin el SDK
    teaser = re.search(r"export type PlanTeaser = \{.*?\n\};", plan, re.S).group(0)
    teaser = teaser.replace('Plan["cuello_de_botella"]', "{ titulo: string; explicacion: string; metrica_clave: string }")
    teaser = teaser.replace('Plan["numeros"]', "{ actual: string; objetivo: string; metricas: { etiqueta: string; valor: string }[]; explicacion: string }")
    teaser = teaser.replace('Plan["palancas"][number] | null', "{ titulo: string; por_que: string; accion: string; kpi: string } | null")
    with open(out / "src/quiz/types.ts", "a") as f:
        f.write("\n/** Lo que devuelve la función quiz-plan para la pantalla de resultado. */\n" + teaser + "\n")

    # --- front
    q = (app / "quiz.tsx").read_text().replace('"use client";\n\n', "")
    q = must_replace(q, 'import type { FunnelConfig, Question } from "@/lib/quiz/types";\nimport type { PlanTeaser } from "@/lib/quiz/plan";',
                     'import { supabase } from "@/integrations/supabase/client";\nimport type { FunnelConfig, PlanTeaser, Question } from "./types";')
    q = must_replace(q, 'import { Landing, Logo } from "./landing";', 'import { Landing, Logo } from "./Landing";')
    a, b = q.index("    try {\n      const res = await fetch("), q.index("  const t = funnel.theme;")
    q = q[:a] + (HERE / "template/submit.tsx.part").read_text() + q[b:]
    q = must_replace(q, "    background: t.background,\n    color: t.text,", '    background: t.background,\n    color: t.text,\n    textAlign: "left",')
    q = must_replace(q, '<div className="min-h-dvh" style={themeVars}>', '<div className="quiz-root min-h-dvh" style={themeVars}>')
    q = must_replace(q, '<div className="flex min-h-dvh flex-col" style={themeVars}>', '<div className="quiz-root flex min-h-dvh flex-col" style={themeVars}>')
    (out / "src/quiz/Quiz.tsx").write_text(prefix_tokens(q))

    l = (app / "landing.tsx").read_text().replace('"use client";\n\n', "")
    l = must_replace(l, 'import type { PublicFunnel } from "./quiz";', 'import type { PublicFunnel } from "./Quiz";')
    l = re.sub(r"\n\s*// eslint-disable-next-line @next/next/no-img-element", "", l)
    (out / "src/quiz/Landing.tsx").write_text(prefix_tokens(l))

    shutil.copy(HERE / "template/quiz.css", out / "src/quiz/quiz.css")
    (out / "src/pages").mkdir()
    shutil.copy(HERE / "template/Plan.tsx", out / "src/pages/Plan.tsx")

    # --- imágenes, SQL y README
    imgs = ROOT / f"public/quiz/{slug}"
    if imgs.exists():
        shutil.copytree(imgs, out / f"public/quiz/{slug}")
    (out / "sql").mkdir()
    shutil.copy(ROOT / "supabase/migrations/0004_quiz.sql", out / "sql/1_si_usas_el_supabase_del_crm.sql")
    shutil.copy(HERE / "template/standalone.sql", out / "sql/2_si_es_un_supabase_nuevo.sql")
    readme = (HERE / "template/README.md").read_text()
    readme = readme.replace("{{BRAND}}", re.search(r'brand: "([^"]+)"', funnel_src).group(1))
    (out / "README.md").write_text(readme)

    todos = [ln.strip() for ln in funnel_src.splitlines() if "TODO" in ln]
    zpath = out_parent / f"lovable-{slug}.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(out.rglob("*")):
            z.write(p, p.relative_to(out_parent))
    print(f"OK  {zpath.relative_to(ROOT) if zpath.is_relative_to(ROOT) else zpath}")
    if todos:
        print(f"\nQuedan {len(todos)} TODO en la configuración de {slug}:")
        for t in todos:
            print("  -", t[:110])


if __name__ == "__main__":
    main()
