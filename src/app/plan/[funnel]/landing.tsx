"use client";

import { useState } from "react";
import type { PublicFunnel } from "./quiz";

const display = { fontFamily: "var(--font-display)" } as const;
const muted = { color: "var(--foreground-muted)" } as const;

/** "Texto *resaltado* texto" → el tramo entre asteriscos en color de acento. */
function Emphasis({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <span key={i} style={{ color: "var(--brand-600)" }}>{part.slice(1, -1)}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function Logo({ brand }: { brand: string }) {
  // "scaled.es" → "scaled." con el punto en color de acento, como en la web.
  const name = brand.replace(/\.[a-z]{2,}$/i, "");
  return (
    <span className="text-xl font-extrabold tracking-tight" style={display}>
      {name}<span style={{ color: "var(--brand-600)" }}>.</span>
    </span>
  );
}

export function CtaButton({ children, onClick, size = "lg" }: {
  children: React.ReactNode; onClick: () => void; size?: "sm" | "lg";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center justify-center gap-2 rounded-full font-semibold text-white transition hover:brightness-125 ${
        size === "lg" ? "min-h-14 px-8 text-base" : "min-h-10 px-4 text-sm"
      }`}
      style={{
        background: "var(--brand-500)",
        boxShadow: size === "lg"
          ? "0 0 0 1px color-mix(in srgb, var(--brand-600) 50%, transparent), 0 10px 50px -6px color-mix(in srgb, var(--brand-600) 65%, transparent)"
          : "0 0 24px -6px color-mix(in srgb, var(--brand-600) 70%, transparent)",
      }}
    >
      {children}
      <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-center text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl" style={display}>
      {children}
    </h2>
  );
}

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${className}`}
      style={{ background: "color-mix(in srgb, var(--surface) 80%, transparent)", backdropFilter: "blur(6px)", ...style }}
    >
      {children}
    </div>
  );
}

/** Líneas grises que imitan texto: el plan "difuminado". */
function FakeLines({ rows, seed = 0 }: { rows: number; seed?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => {
        const w = 55 + ((i * 37 + seed * 13) % 45);
        return <div key={i} className="h-2 rounded-full" style={{ width: `${w}%`, background: "color-mix(in srgb, var(--foreground) 18%, transparent)" }} />;
      })}
    </div>
  );
}

function PlanMockup({ labels, videoUrl }: { labels: [string, string]; videoUrl: string | null }) {
  const paper = (label: string, rotate: string, side: string) => (
    <div
      aria-hidden
      className={`absolute top-10 hidden w-64 rounded-lg p-5 shadow-2xl lg:block ${side}`}
      style={{ background: "#d9d4cb", color: "#1b1b1b", transform: `rotate(${rotate})` }}
    >
      <p className="mb-4 text-base font-bold" style={display}>{label}</p>
      <div className="space-y-2 blur-[1.2px]">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="h-1.5 rounded-full bg-neutral-800/70" style={{ width: `${50 + ((i * 29) % 50)}%` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative mx-auto mt-12 max-w-4xl">
      {paper(labels[0], "-7deg", "-left-4")}
      {paper(labels[1], "7deg", "-right-4")}
      <div
        className="relative z-10 mx-auto aspect-video w-full max-w-2xl overflow-hidden rounded-2xl border"
        style={{
          background: "var(--surface)",
          boxShadow: "0 30px 90px -20px color-mix(in srgb, var(--brand-600) 45%, transparent)",
        }}
      >
        {videoUrl ? (
          <iframe src={videoUrl} title="Vídeo" className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        ) : (
          <div className="flex h-full flex-col gap-4 p-5 text-left sm:p-7">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand-600)" }}>
                Tu plan de escalado
              </p>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--brand-50)", color: "var(--brand-600)" }}>
                Personalizado
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[["25", "ventas/mes"], ["90", "agendas/mes"], ["600", "leads/mes"]].map(([v, l]) => (
                <div key={l} className="rounded-xl p-2 text-center sm:p-3" style={{ background: "var(--surface-sunken)" }}>
                  <p className="text-lg font-extrabold blur-[3px] sm:text-2xl" style={display}>{v}</p>
                  <p className="text-[10px] sm:text-xs" style={muted}>{l}</p>
                </div>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 overflow-hidden">
              <div className="rounded-xl p-3" style={{ background: "var(--surface-sunken)" }}>
                <p className="mb-2 text-[11px] font-semibold sm:text-xs">Cuello de botella</p>
                <div className="blur-[2px]"><FakeLines rows={5} seed={1} /></div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "var(--surface-sunken)" }}>
                <p className="mb-2 text-[11px] font-semibold sm:text-xs">Palancas en orden</p>
                <div className="blur-[2px]"><FakeLines rows={5} seed={2} /></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto mt-10 max-w-3xl space-y-3">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="rounded-2xl border" style={{ background: "var(--surface)" }}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold"
            >
              {f.q}
              <span aria-hidden className="text-xl transition" style={{ transform: isOpen ? "rotate(45deg)" : "none", color: "var(--brand-600)" }}>+</span>
            </button>
            {isOpen && <p className="px-5 pb-5 leading-relaxed" style={muted}>{f.a}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function Landing({ funnel, onStart }: { funnel: PublicFunnel; onStart: () => void }) {
  const l = funnel.landing;

  return (
    <div className="relative overflow-x-clip">
      {/* Fondo: rejilla sutil y halo del color de acento arriba. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--foreground) 4%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--foreground) 4%, transparent) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "linear-gradient(to bottom, black, transparent 1400px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] max-w-[160vw] -translate-x-1/2"
        style={{ background: "radial-gradient(ellipse at top, color-mix(in srgb, var(--brand-600) 28%, transparent), transparent 65%)" }}
      />

      <header className="relative z-10 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo brand={funnel.brand} />
          <CtaButton size="sm" onClick={onStart}>{l.cta}</CtaButton>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-12 text-center sm:pt-16">
        <p
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs sm:text-sm"
          style={{ background: "color-mix(in srgb, var(--surface) 70%, transparent)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--brand-600)", boxShadow: "0 0 8px var(--brand-600)" }} />
          {l.eyebrow}
        </p>
        <h1
          className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl"
          style={display}
        >
          <Emphasis text={l.headline} />
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty" style={muted}>{l.subheadline}</p>

        <PlanMockup labels={l.mockupLabels} videoUrl={l.videoUrl} />

        <div className="mt-12 flex flex-col items-center gap-4">
          <CtaButton onClick={onStart}>{l.cta}</CtaButton>
          <p className="text-sm" style={muted}>{l.footnote}</p>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="relative z-10 mx-auto max-w-3xl px-4 py-20">
        <SectionTitle>{l.how.title}</SectionTitle>
        <p className="mt-5 text-center text-lg font-semibold">{l.how.lead}</p>
        <div className="mt-8 space-y-4 text-lg leading-relaxed" style={muted}>
          {l.how.paragraphs.map((p) => <p key={p}>{p}</p>)}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Card style={{ borderColor: "color-mix(in srgb, var(--negative) 35%, transparent)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--negative)" }}>✕ Así no</p>
            <p className="mt-3 text-base italic">“{l.how.bad}”</p>
          </Card>
          <Card style={{ borderColor: "color-mix(in srgb, var(--positive) 40%, transparent)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--positive)" }}>✓ Así sí</p>
            <p className="mt-3 text-base italic">“{l.how.good}”</p>
          </Card>
        </div>
        <p className="mt-8 text-center text-xl font-bold" style={display}>{l.how.closing}</p>
      </section>

      {/* Qué incluye */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-20">
        <SectionTitle>{l.included.title}</SectionTitle>
        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
            <div className="rounded-2xl border p-6" style={{ background: "var(--surface)" }}>
              <div className="space-y-5 blur-[3px]" aria-hidden>
                {[7, 5, 8, 6, 7].map((n, i) => (
                  <div key={i}>
                    <div className="mb-2 h-3 w-1/3 rounded-full" style={{ background: "color-mix(in srgb, var(--brand-600) 60%, transparent)" }} />
                    <FakeLines rows={n} seed={i} />
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-sm" style={muted}>{l.included.caption}</p>
          </div>
          <div className="space-y-3">
            {l.included.items.map((it) => (
              <Card key={it.title}>
                <h3 className="flex items-center gap-2.5 text-xl font-bold" style={display}>
                  <span style={{ color: "var(--brand-600)" }}>✓</span>{it.title}
                </h3>
                <p className="mt-2 leading-relaxed" style={muted}>{it.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Qué te llevas: línea de tiempo numerada */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-20">
        <SectionTitle>{l.benefits.title}</SectionTitle>
        <ol className="relative mt-12 space-y-4">
          <span aria-hidden className="absolute bottom-6 left-[22px] top-6 w-px" style={{ background: "linear-gradient(var(--brand-600), var(--border))" }} />
          {l.benefits.items.map((b, i) => (
            <li key={b.title} className="relative flex gap-4 sm:gap-6">
              <span
                className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular"
                style={{
                  background: "var(--surface)",
                  color: i < 2 ? "var(--brand-600)" : "var(--foreground)",
                  borderColor: i < 2 ? "color-mix(in srgb, var(--brand-600) 60%, transparent)" : "var(--border)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <Card className="flex-1">
                <h3 className="text-xl font-bold" style={display}>{b.title}</h3>
                <p className="mt-2 leading-relaxed" style={muted}>{b.body}</p>
              </Card>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex justify-center"><CtaButton onClick={onStart}>{l.cta}</CtaButton></div>
      </section>

      {/* Para quién */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-20">
        <SectionTitle>{l.audience.title}</SectionTitle>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Card style={{ borderColor: "color-mix(in srgb, var(--positive) 40%, transparent)", boxShadow: "0 20px 60px -30px color-mix(in srgb, var(--positive) 50%, transparent)" }}>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--positive)" }} />{l.audience.forTitle}
            </h3>
            <ul className="mt-4 space-y-3">
              {l.audience.forItems.map((t) => <li key={t} className="flex gap-3"><span style={{ color: "var(--positive)" }}>—</span>{t}</li>)}
            </ul>
          </Card>
          <Card style={{ borderColor: "color-mix(in srgb, var(--negative) 35%, transparent)", boxShadow: "0 20px 60px -30px color-mix(in srgb, var(--negative) 50%, transparent)" }}>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--negative)" }} />{l.audience.notForTitle}
            </h3>
            <ul className="mt-4 space-y-3">
              {l.audience.notForItems.map((t) => <li key={t} className="flex gap-3"><span style={{ color: "var(--negative)" }}>—</span>{t}</li>)}
            </ul>
          </Card>
        </div>
      </section>

      {/* Quién te lo dice */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-20">
        <SectionTitle>{l.about.title}</SectionTitle>
        <div className="mt-12 grid items-center gap-8 md:grid-cols-2">
          {l.about.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={l.about.photo}
              alt={l.about.name}
              className="w-full rounded-2xl border object-cover"
              style={{ boxShadow: "0 30px 80px -30px color-mix(in srgb, var(--brand-600) 45%, transparent)" }}
              loading="lazy"
            />
          )}
          <div>
            <h3 className="text-4xl font-extrabold tracking-tight" style={display}>{l.about.name}<span style={{ color: "var(--brand-600)" }}>.</span></h3>
            <div className="mt-5 space-y-4 text-lg leading-relaxed" style={muted}>
              {l.about.bio.map((p) => <p key={p}>{p}</p>)}
            </div>
          </div>
        </div>
        {l.about.cases.length > 0 && (
          <div className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {l.about.cases.map((c) => (
              <figure key={c.name} className="overflow-hidden rounded-2xl border" style={{ background: "var(--surface)" }}>
                {c.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt={`${c.name}: ${c.result}`} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                )}
                <figcaption className="p-3">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="mt-0.5 text-xs" style={muted}>{c.result}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-20">
        <SectionTitle>{l.faq.title}</SectionTitle>
        <Faq items={l.faq.items} />
      </section>

      {/* Cierre */}
      <section className="relative z-10 px-4 py-24 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-80"
          style={{ background: "radial-gradient(ellipse at bottom, color-mix(in srgb, var(--brand-600) 18%, transparent), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-3xl">
          <SectionTitle>{l.final.title}</SectionTitle>
          <p className="mt-6 text-lg leading-relaxed" style={muted}>{l.final.body}</p>
          <p className="mt-6 text-lg font-semibold">{l.final.kicker}</p>
          <div className="mt-10"><CtaButton onClick={onStart}>{l.cta}</CtaButton></div>
        </div>
      </section>

      <footer className="relative z-10 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 text-xs leading-relaxed" style={muted}>
          <Logo brand={funnel.brand} />
          <p>© {new Date().getFullYear()} {funnel.brand}</p>
          {l.disclaimer.map((d) => <p key={d}>{d}</p>)}
        </div>
      </footer>
    </div>
  );
}
