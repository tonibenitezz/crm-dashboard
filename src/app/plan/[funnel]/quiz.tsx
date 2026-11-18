"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FunnelConfig, Question } from "@/lib/quiz/types";
import type { PlanTeaser } from "@/lib/quiz/plan";
import { Landing, Logo } from "./landing";

export type PublicFunnel = Omit<FunnelConfig, "aiContext" | "slackChannel" | "ai">;

type AnswerValue = string | string[] | Record<string, string>;
type Answers = Record<string, AnswerValue>;
type Contact = { name: string; email: string; phone: string; instagram: string };
type Tracking = Record<string, string>;

type Step =
  | { kind: "intro" }
  | { kind: "question"; index: number }
  | { kind: "contact" }
  | { kind: "loading" }
  | { kind: "result"; teaser: PlanTeaser | null };

const STORAGE_PREFIX = "quiz:";

// localStorage puede no existir o lanzar (modo privado, previews): siempre con try.
function load<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {}
}

function isAnswered(q: Question, a: AnswerValue | undefined): boolean {
  if (q.type === "single") return typeof a === "string" && a !== "";
  if (q.type === "multi") return Array.isArray(a) && a.length > 0;
  if (q.type === "text") return typeof a === "string" && a.trim() !== "";
  if (q.type === "numbers") return !!a && typeof a === "object" && Object.values(a).some((v) => String(v).trim());
  return false;
}

export function Quiz({ funnel }: { funnel: PublicFunnel }) {
  const total = funnel.questions.length;
  const [step, setStep] = useState<Step>({ kind: "intro" });
  const [answers, setAnswers] = useState<Answers>({});
  const [contact, setContact] = useState<Contact>({ name: "", email: "", phone: "", instagram: "" });
  const [tracking, setTracking] = useState<Tracking>({});
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState(""); // trampa para bots

  // El progreso se guarda en sessionStorage desde los handlers (no en efectos)
  // para que un render inicial vacío no pise lo guardado.
  function setAnswer(id: string, v: AnswerValue) {
    setAnswers((prev) => {
      const nextAnswers = { ...prev, [id]: v };
      save(`${funnel.slug}:answers`, nextAnswers);
      return nextAnswers;
    });
  }
  function updateContact(c: Contact) {
    setContact(c);
    save(`${funnel.slug}:contact`, c);
  }

  function readTracking(): Tracking {
    const params = new URLSearchParams(window.location.search);
    const t: Tracking = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = params.get(k);
      if (v) t[k] = v.slice(0, 200);
    }
    if (document.referrer) t.referrer = document.referrer.slice(0, 500);
    return t;
  }

  // Al cambiar de paso, arriba del todo (en móvil importa).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const progress =
    step.kind === "intro" ? 0
    : step.kind === "question" ? ((step.index + 1) / (total + 1)) * 100
    : step.kind === "contact" ? (total / (total + 1)) * 100
    : 100;

  function next() {
    setError(null);
    if (step.kind === "intro") {
      // Si recargó a mitad, recupera lo que ya había contestado.
      const savedAnswers = load<Answers>(`${funnel.slug}:answers`);
      const savedContact = load<Contact>(`${funnel.slug}:contact`);
      if (savedAnswers) setAnswers(savedAnswers);
      if (savedContact) setContact(savedContact);
      setStep({ kind: "question", index: 0 });
    }
    else if (step.kind === "question") {
      setStep(step.index + 1 < total ? { kind: "question", index: step.index + 1 } : { kind: "contact" });
    }
  }

  function back() {
    setError(null);
    if (step.kind === "question") {
      setStep(step.index === 0 ? { kind: "intro" } : { kind: "question", index: step.index - 1 });
    } else if (step.kind === "contact") {
      setStep({ kind: "question", index: total - 1 });
    }
  }

  async function submit() {
    setError(null);
    setStep({ kind: "loading" });
    const t = readTracking();
    setTracking(t);
    try {
      const res = await fetch(`/api/quiz/${funnel.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, contact, tracking: t, website }),
      });
      const body = (await res.json().catch(() => ({}))) as { teaser?: PlanTeaser | null; error?: string };
      if (!res.ok) {
        setError(body.error ?? "No hemos podido enviar tus respuestas. Inténtalo de nuevo.");
        setStep({ kind: "contact" });
        return;
      }
      setStep({ kind: "result", teaser: body.teaser ?? null });
    } catch {
      setError("Parece que se ha cortado la conexión. Inténtalo de nuevo.");
      setStep({ kind: "contact" });
    }
  }

  const t = funnel.theme;
  // El tema del funnel pisa los tokens globales: todo lo que usa var(--brand-500),
  // var(--surface)… sale con los colores de la marca.
  const themeVars = {
    "--surface-muted": t.background,
    "--surface": t.surface,
    "--surface-sunken": t.surfaceRaised,
    "--border": t.border,
    "--foreground": t.text,
    "--foreground-muted": t.muted,
    "--brand-500": t.accent,
    "--brand-600": t.accentBright,
    "--brand-50": t.accentSoft,
    "--positive": "#34c37f",
    "--negative": "#f0544d",
    "--warning": "#e3a72f",
    background: t.background,
    color: t.text,
    colorScheme: "dark",
    fontFamily: "var(--font-body), system-ui, sans-serif",
  } as React.CSSProperties;

  if (step.kind === "intro") {
    return (
      <div className="min-h-dvh" style={themeVars}>
        <Landing funnel={funnel} onStart={next} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col" style={themeVars}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-80"
        style={{ background: "radial-gradient(ellipse at top, color-mix(in srgb, var(--brand-600) 16%, transparent), transparent 70%)" }}
      />
      <header className="relative mx-auto flex w-full max-w-2xl items-center justify-between px-4 pt-5">
        <Logo brand={funnel.brand} />
        {(step.kind === "question" || step.kind === "contact") && (
          <span className="text-xs tabular" style={{ color: "var(--foreground-muted)" }}>
            {step.kind === "question" ? `${step.index + 1} de ${total}` : "Último paso"}
          </span>
        )}
      </header>

      {step.kind !== "result" && (
        <div className="relative mx-auto mt-4 w-full max-w-2xl px-4">
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-sunken)" }}>
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: "var(--brand-600)",
                boxShadow: "0 0 12px var(--brand-600)",
              }}
            />
          </div>
        </div>
      )}

      <main className="relative mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:pt-14">
        {step.kind === "question" && (
          <QuestionStep
            key={funnel.questions[step.index].id}
            question={funnel.questions[step.index]}
            value={answers[funnel.questions[step.index].id]}
            onChange={(v) => setAnswer(funnel.questions[step.index].id, v)}
            onNext={next}
            onBack={back}
          />
        )}

        {step.kind === "contact" && (
          <ContactStep
            funnel={funnel}
            contact={contact}
            onChange={updateContact}
            website={website}
            onWebsite={setWebsite}
            error={error}
            onBack={back}
            onSubmit={submit}
          />
        )}

        {step.kind === "loading" && <Loading messages={funnel.plan.loading} />}

        {step.kind === "result" && (
          <Result funnel={funnel} teaser={step.teaser} contact={contact} tracking={tracking} />
        )}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function PrimaryButton({
  children, onClick, disabled, type = "button",
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-12 items-center justify-center rounded-full px-7 text-base font-semibold text-white transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background: "var(--brand-500)", boxShadow: disabled ? "none" : "0 8px 32px -8px color-mix(in srgb, var(--brand-600) 70%, transparent)" }}
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-12 rounded-xl px-4 text-sm font-medium hover:bg-[var(--surface-sunken)]"
      style={{ color: "var(--foreground-muted)" }}
    >
      ← Atrás
    </button>
  );
}

function QuestionHeader({ q }: { q: Question }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold leading-snug tracking-tight text-balance sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>{q.title}</h2>
      {q.subtitle && (
        <p className="mt-2 text-base" style={{ color: "var(--foreground-muted)" }}>{q.subtitle}</p>
      )}
    </div>
  );
}

function OptionButton({
  label, selected, onClick, multi,
}: { label: string; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-medium transition hover:border-[var(--brand-500)]"
      style={{
        background: selected ? "var(--brand-50)" : "var(--surface)",
        borderColor: selected ? "var(--brand-500)" : "var(--border)",
      }}
    >
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 text-[11px] font-bold text-white ${multi ? "rounded-md" : "rounded-full"}`}
        style={{
          borderColor: selected ? "var(--brand-500)" : "var(--border)",
          background: selected ? "var(--brand-500)" : "transparent",
        }}
      >
        {selected ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

function QuestionStep({
  question: q, value, onChange, onNext, onBack,
}: {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const required = q.required !== false;
  const answered = isAnswered(q, value);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const footer = (showNext: boolean) => (
    <div className="mt-8 flex items-center justify-between gap-3">
      <BackButton onClick={onBack} />
      {showNext && (
        <PrimaryButton onClick={onNext} disabled={required && !answered}>
          {!required && !answered ? "Saltar →" : "Continuar →"}
        </PrimaryButton>
      )}
    </div>
  );

  if (q.type === "single") {
    return (
      <section className="animate-[fadein_.3s_ease-out]">
        <QuestionHeader q={q} />
        <div role="radiogroup" className="mt-7 space-y-3">
          {q.options.map((o) => (
            <OptionButton
              key={o.value}
              label={o.label}
              selected={value === o.value}
              onClick={() => {
                onChange(o.value);
                // Avanza solo, con una pausa breve para que se vea la selección.
                if (advanceTimer.current) clearTimeout(advanceTimer.current);
                advanceTimer.current = setTimeout(onNext, 220);
              }}
            />
          ))}
        </div>
        {footer(answered)}
      </section>
    );
  }

  if (q.type === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <section className="animate-[fadein_.3s_ease-out]">
        <QuestionHeader q={q} />
        <div className="mt-7 space-y-3">
          {q.options.map((o) => (
            <OptionButton
              key={o.value}
              multi
              label={o.label}
              selected={selected.includes(o.value)}
              onClick={() =>
                onChange(selected.includes(o.value) ? selected.filter((v) => v !== o.value) : [...selected, o.value])
              }
            />
          ))}
        </div>
        {footer(true)}
      </section>
    );
  }

  if (q.type === "text") {
    const text = typeof value === "string" ? value : "";
    const common = {
      value: text,
      placeholder: q.placeholder,
      autoFocus: true,
      maxLength: 1500,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
      className:
        "mt-7 w-full rounded-xl border-2 px-4 py-3 text-base outline-none transition focus:border-[var(--brand-500)]",
      style: { background: "var(--surface)" },
    };
    return (
      <section className="animate-[fadein_.3s_ease-out]">
        <QuestionHeader q={q} />
        {q.multiline ? (
          <textarea
            {...common}
            rows={4}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && (answered || !required)) onNext();
            }}
          />
        ) : (
          <input
            {...common}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (answered || !required)) onNext();
            }}
          />
        )}
        {footer(true)}
      </section>
    );
  }

  // numbers
  const nums = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return (
    <section className="animate-[fadein_.3s_ease-out]">
      <QuestionHeader q={q} />
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {q.fields.map((f) => (
          <label key={f.id} className="block">
            <span className="text-sm font-medium">{f.label}</span>
            <div className="relative mt-1.5">
              <input
                inputMode="decimal"
                value={nums[f.id] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) =>
                  onChange({ ...nums, [f.id]: e.target.value.replace(/[^\d.,]/g, "").slice(0, 9) })
                }
                className="w-full rounded-xl border-2 px-4 py-3 text-base tabular outline-none transition focus:border-[var(--brand-500)]"
                style={{ background: "var(--surface)", paddingRight: f.suffix ? "2.5rem" : undefined }}
              />
              {f.suffix && (
                <span
                  className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  {f.suffix}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
      {footer(true)}
    </section>
  );
}

function ContactStep({
  funnel, contact, onChange, website, onWebsite, error, onBack, onSubmit,
}: {
  funnel: PublicFunnel;
  contact: Contact;
  onChange: (c: Contact) => void;
  website: string;
  onWebsite: (v: string) => void;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const valid =
    contact.name.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(contact.email.trim()) &&
    contact.phone.replace(/\D/g, "").length >= 8;

  const field = (key: keyof Contact, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...props}
        value={contact[key]}
        onChange={(e) => onChange({ ...contact, [key]: e.target.value })}
        className="mt-1.5 w-full rounded-xl border-2 px-4 py-3 text-base outline-none transition focus:border-[var(--brand-500)]"
        style={{ background: "var(--surface)" }}
      />
    </label>
  );

  return (
    <section className="animate-[fadein_.3s_ease-out]">
      <h2 className="text-2xl font-extrabold leading-snug tracking-tight text-balance sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
        {funnel.contact.title}
      </h2>
      <p className="mt-2 text-base" style={{ color: "var(--foreground-muted)" }}>{funnel.contact.subtitle}</p>

      <form
        className="mt-7 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit();
        }}
      >
        {field("name", "Nombre", { autoComplete: "name", required: true, placeholder: "Tu nombre" })}
        {field("email", "Email", { type: "email", autoComplete: "email", required: true, placeholder: "tu@email.com" })}
        {field("phone", "WhatsApp (con prefijo)", {
          type: "tel", autoComplete: "tel", inputMode: "tel", required: true, placeholder: "+34 600 000 000",
        })}
        {funnel.contact.askInstagram &&
          field("instagram", "Instagram (opcional)", { autoComplete: "off", placeholder: "@tuusuario" })}

        {/* Trampa para bots: fuera de pantalla y sin foco para personas. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Web
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => onWebsite(e.target.value)} />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "color-mix(in srgb, var(--negative) 12%, transparent)", color: "var(--negative)" }}
          >
            {error}
          </p>
        )}

        <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>{funnel.contact.consent}</p>

        <div className="flex items-center justify-between gap-3 pt-2">
          <BackButton onClick={onBack} />
          <PrimaryButton type="submit" disabled={!valid}>Ver mi plan →</PrimaryButton>
        </div>
      </form>
    </section>
  );
}

function Loading({ messages }: { messages: string[] }) {
  const [i, setI] = useState(0);
  const [pct, setPct] = useState(4);
  useEffect(() => {
    const msg = setInterval(() => setI((n) => Math.min(n + 1, messages.length - 1)), 9000);
    // Se acerca al 95 % sin llegar: la barra no miente sobre cuándo acaba.
    const bar = setInterval(() => setPct((p) => p + (95 - p) * 0.04), 600);
    return () => {
      clearInterval(msg);
      clearInterval(bar);
    };
  }, [messages.length]);

  return (
    <section className="flex flex-col items-center py-16 text-center" aria-live="polite">
      <div
        className="h-14 w-14 animate-spin rounded-full border-4"
        style={{ borderColor: "var(--surface-sunken)", borderTopColor: "var(--brand-500)" }}
        aria-hidden
      />
      <h2 className="mt-8 text-2xl font-bold tracking-tight">Preparando tu plan</h2>
      <p className="mt-3 min-h-6 text-base" style={{ color: "var(--foreground-muted)" }}>{messages[i]}</p>
      <div className="mt-8 h-1.5 w-full max-w-sm overflow-hidden rounded-full" style={{ background: "var(--surface-sunken)" }}>
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: "var(--brand-500)" }} />
      </div>
      <p className="mt-4 text-sm" style={{ color: "var(--foreground-muted)" }}>
        Suele tardar un minuto. No cierres esta pestaña.
      </p>
    </section>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-5 sm:p-6" style={{ background: "var(--surface)" }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand-600)" }}>{label}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Result({
  funnel, teaser, contact, tracking,
}: { funnel: PublicFunnel; teaser: PlanTeaser | null; contact: Contact; tracking: Tracking }) {
  const r = funnel.result;
  const firstName = contact.name.trim().split(/\s+/)[0] ?? "";

  const calendlyHref = useMemo(() => {
    if (!r.calendlyUrl) return null;
    try {
      const u = new URL(r.calendlyUrl);
      // Calendly rellena nombre y email con estos parámetros; los UTM viajan a la agenda.
      u.searchParams.set("name", contact.name.trim());
      u.searchParams.set("email", contact.email.trim());
      const pre = r.calendlyPrefill;
      if (pre?.instagram && contact.instagram.trim()) u.searchParams.set(pre.instagram, contact.instagram.trim());
      if (pre?.phone && contact.phone.trim()) u.searchParams.set(pre.phone, contact.phone.trim());
      for (const [k, v] of Object.entries(tracking)) if (k.startsWith("utm_")) u.searchParams.set(k, v);
      return u.toString();
    } catch {
      return r.calendlyUrl;
    }
  }, [r.calendlyUrl, r.calendlyPrefill, contact, tracking]);

  const whatsappHref = r.whatsappNumber
    ? `https://wa.me/${r.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`${r.whatsappMessage} Soy ${contact.name.trim()}.`)}`
    : null;

  const cta = (
    <section
      className="rounded-2xl border p-6 text-center sm:p-8"
      style={{
        background: "linear-gradient(160deg, var(--brand-500), color-mix(in srgb, var(--brand-500) 55%, var(--surface)))",
        borderColor: "color-mix(in srgb, var(--brand-600) 50%, transparent)",
        boxShadow: "0 30px 80px -30px color-mix(in srgb, var(--brand-600) 70%, transparent)",
        color: "white",
      }}
    >
      <h2 className="text-2xl font-bold tracking-tight">
        {teaser ? "Recibe tu plan completo" : r.headline}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-base opacity-90">{r.body}</p>
      <div className="mt-6 flex flex-col items-center gap-3">
        {calendlyHref && (
          <a
            href={calendlyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-white px-6 text-base font-semibold"
            style={{ color: "var(--brand-500)" }}
          >
            {r.calendlyCta} →
          </a>
        )}
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full border-2 border-white/60 px-6 text-sm font-semibold"
          >
            {r.whatsappCta}
          </a>
        )}
        {!calendlyHref && !whatsappHref && (
          <p className="text-sm opacity-90">Te escribimos por WhatsApp en las próximas horas.</p>
        )}
      </div>
    </section>
  );

  if (!teaser) {
    return (
      <div className="space-y-6 animate-[fadein_.4s_ease-out]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Gracias{firstName ? `, ${firstName}` : ""}</h1>
          <p className="mt-3 text-lg" style={{ color: "var(--foreground-muted)" }}>
            Tenemos tus respuestas. Estamos terminando tu plan a mano y te lo explicamos personalmente.
          </p>
        </div>
        {cta}
      </div>
    );
  }

  const m = teaser.numeros;
  const p = funnel.plan;
  return (
    <div className="space-y-5 animate-[fadein_.4s_ease-out]">
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--positive)" }}>✓ {r.headline}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          {firstName ? `${firstName}, esto` : "Esto"} es lo que te separa de {m.objetivo}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-pretty">{teaser.resumen}</p>
      </div>

      <Block label={p.labels.obstacle}>
        <h2 className="text-xl font-bold">{teaser.cuello_de_botella.titulo}</h2>
        <p className="mt-2 leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
          {teaser.cuello_de_botella.explicacion}
        </p>
        <p
          className="mt-4 rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: "color-mix(in srgb, var(--warning) 14%, transparent)" }}
        >
          📍 {teaser.cuello_de_botella.metrica_clave}
        </p>
      </Block>

      <Block label={`${p.labels.numbers}: de ${m.actual} a ${m.objetivo}`}>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {m.metricas.slice(0, 3).map((x) => ({ label: x.etiqueta, value: x.valor })).map((t) => (
            <div key={t.label} className="rounded-xl p-3 text-center" style={{ background: "var(--surface-sunken)" }}>
              <p className="text-xl font-bold tracking-tight sm:text-2xl">{t.value}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--foreground-muted)" }}>{t.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--foreground-muted)" }}>{m.explicacion}</p>
      </Block>

      {teaser.primera_palanca && (
        <Block label="Palanca #1">
          <h2 className="text-xl font-bold">{teaser.primera_palanca.titulo}</h2>
          <p className="mt-2 leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
            {teaser.primera_palanca.por_que}
          </p>
          <p className="mt-3 leading-relaxed"><strong>Qué hacer:</strong> {teaser.primera_palanca.accion}</p>
        </Block>
      )}

      <section className="rounded-2xl border p-5 sm:p-6" style={{ background: "var(--surface)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--foreground-muted)" }}>
          🔒 En tu plan completo
        </p>
        <ul className="mt-3 space-y-2.5">
          {teaser.palancas_restantes.map((t, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="text-sm font-semibold tabular" style={{ color: "var(--foreground-muted)" }}>#{i + 2}</span>
              <span className="select-none blur-[5px]" aria-hidden>{t}</span>
              <span className="sr-only">Palanca bloqueada</span>
            </li>
          ))}
          <li className="flex items-center gap-3">
            <span aria-hidden>🗓️</span>
            <span>Tu {p.name} de {p.duration}, en {teaser.bloques} bloques con checkpoints</span>
          </li>
          <li className="flex items-center gap-3">
            <span aria-hidden>⚠️</span>
            <span>El error que más caro te puede salir</span>
          </li>
          <li className="flex items-center gap-3">
            <span aria-hidden>🚀</span>
            <span>Fase 2: qué hacer cuando llegues al objetivo</span>
          </li>
        </ul>
      </section>

      {cta}
    </div>
  );
}
