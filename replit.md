# Workspace

## Overview

Cotizador de viajes profesional para RGE Style Travel. Lee el tarifario desde
un archivo Excel (`TARIFARIO.xlsx`) y permite armar cotizaciones con
**multi-acomodación** (SGL/DBL/TPL en paralelo), itinerario automático, y
exportación por WhatsApp, Email y PDF (impresión).

## Artifacts

- `artifacts/cotizador` — Frontend React + Vite + Tailwind. UI tipo dashboard
  con sidebar oscuro, layout 70/30 (servicios izquierda · totales/acciones
  derecha sticky). Cada servicio se agrega/edita en `ServicioFormModal`
  (buscador del catálogo con código + nombre, código editable, notas, toggle
  "Usar fecha", pax Auto/Manual, tarifa aplicada con override de rango,
  campo "Tipo Habitación" para hoteles). El botón "Vista previa" abre
  `VistaPreviaModal` que renderiza un iframe con el HTML compartido
  generado por `src/lib/propuesta.ts` (`buildPropuestaHtml`). Layout
  "PROPUESTA DE SERVICIOS": header con logo Style Travel + pill azul,
  dos columnas info, divisor naranja, pills azules
  (ALOJAMIENTO/TRASLADOS/TOUR Y EXPERIENCIAS), pill naranja
  (ITINERARIO SUGERIDO), notas verdes para "Entrada adicional".
  Exportación a WhatsApp (copiar al portapapeles), Email
  (mailto, mismo HTML) y PDF (impresión, mismo HTML). Sirve en `/`.
  En `ConfiguracionPanel` hay 3 toggles: "Incluir itinerario",
  "Incluir detalles" (texto corto bajo cada actividad del itinerario,
  campo `incluirDescriptivos`) e "Incluir descriptivo" (sección
  completa "DESCRIPTIVOS" después del itinerario con título, info,
  párrafos, Incluye, Observaciones, Recomendaciones y Nota importante;
  campo `incluirDescriptivoCompleto`). Los descriptivos se cargan
  automáticamente al seleccionar tours por código RGE; el código
  nunca se muestra en exportes.
- `artifacts/api-server` — API Express. Lee `TARIFARIO.xlsx` y expone:
  - `GET /api/hoteles` · `GET /api/tours` · `GET /api/traslados` · `GET /api/catalog`
  - `GET /api/descriptivos` · `GET /api/descriptivos/:codigo` — descriptivos
    detallados por tour (servidos desde `src/lib/descriptivos.ts`,
    auto-generado de `attached_assets/DESCRIPTIVOS_*.docx`).
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
