---
name: CHD (child) rate storage convention
description: Where the child/CHD rate lives on a ServicioSeleccionado and which casing each service type reads.
---

# CHD rate: two casings, by service type

A `ServicioSeleccionado.precios` object can hold the child rate under TWO keys and they are NOT interchangeable in `calcularLocal` (`lib/calc.ts`):

- **Hotel** reads `precios.CHD` (uppercase). Computed always, regardless of whether `CHD` is in `acomodaciones` (needed for group mode + PDF).
- **Non-hotel** (tour / traslado / catamaran / vuelo / custom) reads `precios.chd` (lowercase).

**Why:** the hotel accommodation editor iterates the `Acomodacion` union (`SGL|DBL|TPL|QDL|CHD`, all uppercase), while non-hotel services store a single per-person child price as `chd`. The two paths were built separately and never unified.

**How to apply:**
- When making CHD editable anywhere, write BOTH `CHD` and `chd` for hotels (the hotel editor's `buildPrecios` already does), but for non-hotel services write `precios.chd`.
- The quick-tariff popups live in `ServiciosSeleccionados.tsx`: `PricesEditor` (hotel) and `UnitPriceEditor` (non-hotel). `UnitPriceEditor` only edits the adult unit via `unitOverride`; the CHD value is stored directly on `precios.chd` (no separate override), so a "reset to automatic unit" must preserve the edited CHD.
- Show CHD as editable when `ninos > 0`. Don't gate the popup input on the current rate being > 0 (that gate is only for the row preview).
