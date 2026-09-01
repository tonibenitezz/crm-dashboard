"use client";

import { useMemo, useState } from "react";
import { fmtDayMonth } from "@/lib/format";

export type Series = { key: string; label: string; color: string };
export type Point = { date: string; [series: string]: number | string | null };

const PAD = { top: 12, right: 12, bottom: 24, left: 48 };

/**
 * Serie temporal multilínea con crosshair y tooltip.
 * Un solo eje Y a propósito: dos escalas distintas en el mismo gráfico
 * hacen que dos series se crucen donde no se cruzan.
 */
export function TimeSeries({
  data, series, height = 220, formatValue,
}: {
  data: Point[];
  series: Series[];
  height?: number;
  formatValue: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;

  const { max, path, xAt, yAt } = useMemo(() => {
    const values = data.flatMap((d) =>
      series.map((s) => (typeof d[s.key] === "number" ? (d[s.key] as number) : 0)),
    );
    const max = Math.max(1, ...values);
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;

    const xAt = (i: number) =>
      PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const yAt = (v: number) => PAD.top + innerH - (v / max) * innerH;

    const path = (key: string) =>
      data
        .map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(Number(d[key] ?? 0)).toFixed(1)}`)
        .join(" ");

    return { max, path, xAt, yAt };
  }, [data, series, height]);

  if (!data.length) {
    return (
      <p className="py-10 text-center text-sm" style={{ color: "var(--foreground-muted)" }}>
        Sin datos en este periodo.
      </p>
    );
  }

  const ticks = [0, 0.5, 1].map((t) => max * t);
  const active = hover != null ? data[hover] : null;

  return (
    <div>
      {/* Leyenda: la identidad nunca depende solo del color */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs">
            <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
            <span style={{ color: "var(--foreground-muted)" }}>{s.label}</span>
          </span>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={`Evolución de ${series.map((s) => s.label).join(" y ")}`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - box.left) / box.width) * width;
            const innerW = width - PAD.left - PAD.right;
            const ratio = (x - PAD.left) / innerW;
            const i = Math.round(ratio * (data.length - 1));
            setHover(Math.min(data.length - 1, Math.max(0, i)));
          }}
        >
          {/* Rejilla recesiva */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left} x2={width - PAD.right} y1={yAt(t)} y2={yAt(t)}
                stroke="var(--grid)" strokeWidth={1}
              />
              <text
                x={PAD.left - 8} y={yAt(t) + 3} textAnchor="end"
                fontSize={10} fill="var(--foreground-muted)" className="tabular"
              >
                {formatValue(t)}
              </text>
            </g>
          ))}

          {active && (
            <line
              x1={xAt(hover!)} x2={xAt(hover!)} y1={PAD.top} y2={height - PAD.bottom}
              stroke="var(--foreground-muted)" strokeWidth={1} strokeDasharray="3 3"
            />
          )}

          {series.map((s) => (
            <path
              key={s.key} d={path(s.key)} fill="none" stroke={s.color}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            />
          ))}

          {/* El punto activo lleva un anillo del color del fondo para separarlo de la línea */}
          {active &&
            series.map((s) => (
              <circle
                key={s.key} cx={xAt(hover!)} cy={yAt(Number(active[s.key] ?? 0))} r={4}
                fill={s.color} stroke="var(--surface)" strokeWidth={2}
              />
            ))}

          {data.map((d, i) =>
            i % Math.ceil(data.length / 7) === 0 ? (
              <text
                key={d.date} x={xAt(i)} y={height - 6} textAnchor="middle"
                fontSize={10} fill="var(--foreground-muted)"
              >
                {fmtDayMonth(d.date)}
              </text>
            ) : null,
          )}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute top-0 rounded-md border px-2.5 py-1.5 text-xs shadow-sm"
            style={{
              background: "var(--surface)",
              left: `${(xAt(hover!) / width) * 100}%`,
              transform: hover! > data.length / 2 ? "translateX(-110%)" : "translateX(10%)",
            }}
          >
            <p className="font-medium">{fmtDayMonth(active.date)}</p>
            {series.map((s) => (
              <p key={s.key} className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span style={{ color: "var(--foreground-muted)" }}>{s.label}</span>
                <span className="tabular font-medium">{formatValue(Number(active[s.key] ?? 0))}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Ranking horizontal. Etiqueta directa en cada barra: no hace falta
 * volver a la leyenda ni al eje para leer el valor.
 */
export function BarList({
  items, formatValue, color = "var(--series-1)",
}: {
  items: { label: string; value: number; hint?: string }[];
  formatValue: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  if (!items.length) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: "var(--foreground-muted)" }}>
        Sin datos todavía.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="font-medium">{item.label}</span>
            <span className="tabular" style={{ color: "var(--foreground-muted)" }}>
              {item.hint ? `${item.hint} · ` : ""}
              <span style={{ color: "var(--foreground)" }}>{formatValue(item.value)}</span>
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "var(--surface-sunken)" }}>
            <div
              className="h-2 rounded-full"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
