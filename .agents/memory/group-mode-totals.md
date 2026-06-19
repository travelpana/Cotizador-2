---
name: Group mode (Modo Grupo) accommodation totals
description: How group-mode totals must be computed and why result.totalesPorAcomodacion must NOT be reused for group math.
---

# Group mode totals — single source of truth

`calcGrupoTotalFromResult(result, habitacionesPorAcomodacion, ninos)` in `lib/calc.ts` is the ONE canonical group total. It computes from BASE rates (`preciosPorAcomodacion`) × rooms × pax-per-acom (SGL×1, DBL×2, TPL×3, QDL×4) × noches for hotels, and unit × adult-room-pax for non-hotels. Every group surface (live card, PDF, email, preview, totalizado) must derive from it.

**Rule:** never reuse `result.totalesPorAcomodacion[a]` for group math. In group mode that value is `tarifa × noches × cliente.pasajeros`, where `cliente.pasajeros` = the TOTAL group headcount. Multiplying it again by rooms×pax double-counts.

**Why:** there used to be a second, divergent implementation (`calcGrupoTotal` in `GrupoResumenCard`) that multiplied the already-inflated `totalesPorAcomodacion` by rooms×pax, so the live "Total del Grupo" card showed ~N× the correct value (e.g. 573 instead of 191 for 1 SGL@95 + 1 DBL@48, 3 pax). The export/PDF were already correct because they used the canonical function. The fix deleted the duplicate and pointed the card at `calcGrupoTotalFromResult`.

**How to apply:**
- `result.totalesPorAcomodacion[a]` (= tarifa × noches × pasajeros) is correct ONLY for individual/"tarifas" mode (parallel SGL/DBL/TPL comparison). Do not change that.
- Switching to group mode seeds 1 room per active accommodation, so room distribution is normally populated; the propuesta fallback (no rooms) shows a per-person estimate (`totalesPorAcomodacion[a] / pasajeros`).
- Keep SGL/DBL/TPL/**QDL** in sync everywhere — QDL was historically dropped from a couple of ROOM_PAX maps.
- Do NOT alter traslados/tours/vuelos/catamarán cost logic when touching group accommodation math.
