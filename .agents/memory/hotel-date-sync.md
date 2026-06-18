---
name: Hotel date sync vs manual override
description: How per-hotel dates stay in sync with the global stay, and when they must be locked as manual.
---

# Hotel date sync (cotizador)

Each hotel `ServicioSeleccionado` stores its own `fechaInicio/fechaFin` (copied from the global `cliente` stay at add-time). A `useEffect` in `pages/Cotizador.tsx` re-syncs hotel dates to the global stay whenever `cliente.fechaInicio/fechaFin` change.

**Rule:** the re-sync only touches hotels WITHOUT `fechasManual: true`. Any hotel whose dates intentionally differ from the global stay (multi-tramo / multi-leg stays) MUST carry `fechasManual: true`, or the effect will overwrite them.

**Why:** the original bug was hotels keeping stale per-row nights (e.g. 1 noche) when the global stay grew (2+ noches). Auto-sync fixes that, but multi-leg quotes legitimately need different dates per hotel, so they need an opt-out flag.

**How to apply — every code path that produces hotel dates must set the flag correctly:**
- `DatesEditor.handleApply` (ServiciosSeleccionados.tsx): set `fechasManual: true` ONLY when the range actually changed vs the original; applying with no change must NOT lock it.
- `DatesEditor.handleReset`: sets `fechasManual: false` (re-enables auto-sync).
- `ServicioFormModal.handleSave` (hotel branch): mark `fechasManual: true` when `initial.fechasManual` was already true OR the edited dates differ from `globalFechaInicio/globalFechaFin`.
- Loading saved/legacy quotes (`seguimientoEdit`): run `migrarFechasManual(servicios, cliente)` to mark legacy hotels whose dates differ from the saved global stay (legacy quotes predate the flag).
- Loading plantillas (`handleUsarPlantilla`): intentionally NOT migrated — templates should adapt to the current global stay.

**Loop safety:** the re-sync effect uses a functional update and returns `prev` unchanged when nothing differs, so it never causes a render loop.
