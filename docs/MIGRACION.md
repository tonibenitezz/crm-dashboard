# Migración desde Airtable

## Qué se importa

| Tabla de Airtable | Destino | Filas |
|---|---|---|
| Booking Calls | `bookings` (+ `leads`) | 209 |
| Cierres | `deals` + `payments` | 66 |
| KPI Setter | `eod_reports` | 44 |
| Programas | `programs` | 4 |
| KPI Closer | — se calcula solo | 0 (estaba vacía) |

```bash
export NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
npx tsx scripts/import-airtable.ts ./data/airtable --dry-run   # prueba
npx tsx scripts/import-airtable.ts ./data/airtable             # de verdad
```
Es idempotente: se apoya en `airtable_record_id` y en las claves únicas, así que
se puede relanzar sin duplicar.

## Verificación

Los parsers reproducen los cálculos que Airtable ya hacía, sobre los datos reales:

- 209/209 fechas de agenda, 66/66 de cierre y 45/45 de EOD legibles.
- `Convs Totales`: 44/44 coinciden.
- `% de Agenda`: 43/43 coinciden.
- Tasas de respuesta inbound, outbound y de seguimiento: 118/118 coinciden.
- Ticket total del histórico: **215.820** en 66 cierres (medio 3.270).

## Trampas del export que hubo que resolver

1. **Dos formatos de fecha distintos en el mismo export.** Booking Calls y KPI
   Setter usan D/M/A; Cierres usa M/D/A. `10/8/2025` es el 8 de octubre en
   Cierres y sería el 10 de agosto leído al revés. Por eso `parseDate` recibe el
   orden explícito en vez de adivinarlo.

2. **Separadores decimales mezclados en la misma columna.** El export trae
   `$350.00` y `$500,00`. Y KPI Setter escribe los enteros como `4,0`, que leído
   como millares da 40: habría multiplicado por diez todas las métricas de los
   setters. La regla es: tres dígitos tras el separador son millares, uno o dos
   son decimales.

3. **Un registro con la fecha rota en el propio Airtable.** El cierre de David
   Gomez tiene `Mes del calendario` = "Número de mes no válido". La fecha
   (6/1/2026) es correcta, lo que falla es la fórmula de Airtable; los
   vencimientos a 30 y 60 días lo confirman. En la importación entra bien.

4. **El mismo closer con tres nombres.** "Toni Benítez" en Booking Calls, "Toni"
   en Cierres; "SOY ALBERTO DE MARIO" y "Alberto". Eran campos de texto libre,
   no vinculados. `team_members.aliases` los unifica en la importación y a
   partir de ahí son una clave foránea: el problema no puede repetirse.

## Lo que hay que decidir

- **Divisa.** El export escribe los tickets con `$` pero el negocio es España,
  con transferencia y SeQura, y un pago aparece como `€1000,00`. Se importa todo
  como **EUR**. Si alguna venta fue de verdad en dólares, hay que marcarla: con
  el símbolo mal, el ROAS sale falseado. Se cambia en la constante `CURRENCY` de
  `scripts/import-airtable.ts`.

- **Qué cuotas están cobradas.** Los campos `Pago completo?`, `Pago 2ª?` y
  `Estado del Pago` están **vacíos en las 66 filas**. Como señal se usa el
  adjunto `Comprobante`: hay en 59 de 66. Esos 59 entran como cobrados y los 7
  restantes como pendientes, para revisarlos a mano.

## Agujeros del Airtable actual que el CRM cierra

Esto no es crítica al sistema, es lo que se pierde hoy y se recupera solo:

- **`Closing Status` no se actualiza.** 202 de 209 agendas siguen en "Para
  Cerrar", pero hay 66 cierres. Los estados se quedaron sin tocar, así que el
  embudo real no se puede leer del Airtable. En el CRM, cargar un cierre marca
  su agenda automáticamente.

- **El setter no llega al cierre.** `Setter` está vacío en las **66** filas de
  Cierres y falta en 60 de 209 agendas. Sin eso no hay comisión de setter
  calculable ni ROAS por persona. Se arregla con enlaces de Calendly por setter
  (`?utm_source=daniela`), que ya lee el webhook.

- **Los UTM están vacíos al 100%** en las dos tablas. Sin ellos no se puede
  atribuir ninguna venta a ningún anuncio, y por tanto no hay ROAS por campaña.
  Mismo arreglo: enlaces con UTM.

- **KPI Closer estaba vacía entera.** Las 18 columnas (no-shows, % de cierre,
  cierres por seguimiento…) había que teclearlas a mano y no se hizo. Ahora son
  la vista `v_closer_daily`, calculada de las agendas y los cierres.

- **Cierres sin programa:** 13 de 66 no tienen `Programa`, así que la
  facturación por producto sale incompleta.
