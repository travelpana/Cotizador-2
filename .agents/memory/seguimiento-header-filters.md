---
name: Seguimiento header filters
description: Placement and ownership rule for the Seguimiento tab controls and latest-action badge.
---

The Seguimiento tabs and export action are owned by the page-level header so they remain visible as part of the module navigation; the list component only consumes the selected tab and renders its corresponding view. The notification bell is intentionally omitted on this screen.

**Why:** Moving the existing controls reduced duplicated vertical space while preserving their counts, styling, and behavior; replacing the bell creates one balanced action row.

**How to apply:** Keep tab counts derived from the same opportunity status rules, keep export as an icon-only action using the existing export handler, and derive the card badge from the newest `accion_realizada` history entry rather than the opportunity status label.