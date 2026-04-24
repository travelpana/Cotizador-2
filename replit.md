# Workspace

## Overview

Cotizador de viajes profesional para RGE Style Travel. Lee el tarifario desde
un archivo Excel (`TARIFARIO.xlsx`) y permite armar cotizaciones con
**multi-acomodación** (SGL/DBL/TPL en paralelo), itinerario automático, y
exportación por WhatsApp, Email y PDF (impresión).

## Artifacts

- `artifacts/cotizador` — Frontend React + Vite + Tailwind. Sirve la UI tipo
  dashboard con sidebar oscuro, panel principal con cards blancas, selector
  multi-acomodación, listado de servicios desde Excel, totales por acomodación,
  itinerario automático y panel de exportación. Sirve en `/`.
- `artifacts/api-server` — API Express. Lee `TARIFARIO.xlsx` y expone:
  - `GET /api/hoteles` · `GET /api/tours` · `GET /api/traslados` · `GET /api/catalog`
  - `POST /api/reload` — recargar Excel
  - `POST /api/cotizacion/calcular` — calcula totales por acomodación
- `artifacts/mockup-sandbox` — Sandbox de mockups (no usado en este proyecto).

## Excel data model

El archivo `artifacts/api-server/TARIFARIO.xlsx` tiene 5 hojas:
- **Hotelería**: código, nombre, estrellas, tipo habitación, SGL, DBL, TPL,
  CHD, desayuno, vigencia. Incluye encabezados de sección por ubicación.
- **Tours**: código, descripción, horario/días, 1 Pax, 2-5 Pax, 6-10 Pax,
  niños 4-10, categoría.
- **Traslados Regulares** y **Traslados Privados**: código, descripción, 1 Pax,
  2-5 Pax, 6-10 Pax, niños.

Para tours/traslados el precio aplicado depende del número de pasajeros (1, 2-5,
o 6-10). Para hoteles el precio es por persona por noche según acomodación.

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.9
- **Backend**: Express 5, xlsx, pino
- **Frontend**: React + Vite, TailwindCSS, wouter, lucide-react
- **Diseño**: fondo `#0f172a`, primario `#38bdf8`, cards blancas con sombra

## Comandos clave

- `pnpm --filter @workspace/api-server run dev` — backend dev
- `pnpm --filter @workspace/cotizador run dev` — frontend dev
- `pnpm run typecheck` — typecheck completo
- Reemplazar el tarifario: copiar nuevo archivo a
  `artifacts/api-server/TARIFARIO.xlsx` y hacer POST a `/api/reload`.
