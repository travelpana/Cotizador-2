---
name: Seguimiento header filters
description: Placement and ownership rule for the Seguimiento tab controls and latest-action badge.
---

The Seguimiento tabs are owned by the page-level header so they remain visible as part of the module navigation; the list component only consumes the selected tab and renders its corresponding view.

**Why:** Moving the existing controls reduced duplicated vertical space while preserving their counts, styling, and behavior.

**How to apply:** Keep tab counts derived from the same opportunity status rules, keep export as an icon-only action, and derive the card badge from the newest `accion_realizada` history entry rather than the opportunity status label.