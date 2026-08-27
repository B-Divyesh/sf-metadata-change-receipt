# Metadata Change Receipt — visual thesis

## Direction

**Risograph tactile collage: the audit desk.** This product sits between a contact sheet, a marked-up archive ledger, and the rubber stamp that closes a job. It should feel materially inspectable rather than cloud-magical: misregistered ink, clipped paper edges, halftone photographs, pencil rules, and stamped status marks. Decoration always carries the product idea—source records move through a transformation and leave an evidence trail.

The interface is deliberately single-mode and paper-light. A dark theme would turn the “physical receipt” metaphor into a generic dashboard and reduce the legibility of dense proof tables. The warm paper canvas is painted explicitly.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| Paper | `#F4EAD2` | page background, like an archive folder |
| Sheet | `#FFF9EA` | working surfaces and receipt paper |
| Ink | `#1E2522` | primary copy and rules |
| Muted ink | `#5E5B50` | secondary copy; ≥4.5:1 on paper/sheet |
| Cobalt | `#1646A0` | primary action, links, focus, “after” marks |
| Cobalt dark | `#0D327A` | pressed/hover action |
| Vermillion | `#C53D2D` | exceptions, registration marks, urgent state |
| Vermillion dark | `#8E281E` | accessible danger text |
| Mustard | `#E5B94B` | highlight and pending state, always with labels |
| Forest | `#245C42` | verified/success state |

Ink colors are flat rather than gradient-driven. Overlaps use crosshatch or halftone patterns, never glossy effects. Status never relies on color alone.

## Type

- **Editorial/display:** Georgia, `Times New Roman`, serif. Used for the single h1 and numbered section headings; its print lineage makes “receipt” feel durable.
- **Utility/data:** `Arial Narrow`, `Aptos`, `Segoe UI`, sans-serif, with `ui-monospace` only for hashes and identifiers. Used for controls, explanations, and tables.
- Scale: 16px body; 14px annotations; 20px section title; responsive 42–72px h1. Data uses tabular figures.
- Measure: explanatory copy is capped around 66 characters. Tables remain wide and horizontally scrollable rather than crushing content.

No font downloads are needed, improving privacy and first load.

## Spacing and layout

- Base rhythm: 4px; primary intervals: 8, 12, 16, 24, 32, 48, 72.
- Desktop shell: max 1180px with a two-column hero; workflow becomes a vertical numbered ledger.
- Surfaces are separated first by space, then by 2px ink rules. Shadows are offset hard-print shadows, never diffuse card shadows.
- Controls are at least 44px high. At 390px, the hero stacks, actions become full-width where helpful, tables scroll with a visible cue, and nonessential thumbnail decoration drops away.

## Interaction grammar

- The workflow has three numbered stops: **Load CSV → Plan change → Issue receipt**. The current stop is marked by a filled cobalt registration disc.
- Drop zones resemble clipped envelopes; accepted files visibly become a source sheet with row/field counts.
- Preview changes are overprinted: old values struck in vermillion, new values underlined in cobalt. Exceptions get a stamped `EXCEPTION` label and a plain-language reason.
- Every computation is deterministic and local. Buttons use verbs and report outcomes in a polite live region.
- Receipt identity is a SHA-256 digest over canonical receipt data. The signature is tamper-evident, not an identity or cryptographic authorship claim; the UI states that distinction.

## Motion

- 180–240ms transitions only: paper lifts by 2px, stamps settle with a small transform, and newly computed results fade in from their source region.
- Nothing loops. `prefers-reduced-motion: reduce` removes transforms and transitions while preserving state changes through ink, labels, and borders.

## Asset plan and provenance

### Hero collage

- Use case: `illustration-story`
- Asset: wide landing-page editorial illustration
- Subject/world: top-down archive worktable with anonymous photographic contact sheets, metadata ledger strips, date stamps, keyword tabs, and a receipt ribbon connecting “before” to “after”. No people and no recognizable photographs.
- Style/materials: two-color risograph print, visible paper fibers, coarse halftone dots, torn collage edges, slight cobalt/vermillion misregistration, mustard pencil accents.
- Light/lens: flat overhead editorial composition; no photographic depth-of-field.
- Palette words: warm oat paper, deep cobalt ink, vermillion ink, sparse mustard.
- Composition: 3:2 horizontal; visual weight to the right and generous quiet paper at left/bottom so it can sit beside interface copy.
- Negative list: no text, letters, numbers, logos, watermarks, brands, real people, faces, cameras, laptops, glossy 3D, gradients, neon, stock-photo polish.
- Generation prompt: “A tactile editorial risograph collage seen from directly overhead: an archivist's paper worktable with abstract anonymous photo contact sheets, clipped metadata ledger strips, date-stamp circles, keyword tabs, and one long receipt ribbon visibly connecting a before sheet to an after sheet. Two-color print with deep cobalt and vermillion inks on warm oat paper, sparse mustard pencil marks, coarse halftone dots, torn paper edges, subtle ink misregistration and paper fibers. Wide 3:2 composition, visual density on the right with calm negative paper space on the left and lower edge. Flat graphic printmaking, no photographic depth. No readable text, no letters, no numbers, no logos, no watermark, no brands, no people or faces, no recognizable photos, no camera or laptop, no glossy 3D, no gradient, no neon.”
- Model/tool: Factory image deployment via `/opt/fleet/lib/gen-image.sh`.
- Created: 2026-08-27.
- License/provenance: original AI-generated asset commissioned for this product; generated imagery is disclosed in the footer. Source PNG and prompt sidecar retained in `assets/src/`; optimized WebP ships from `public/assets/`.

All small icons and registration marks are original CSS/SVG geometry authored in-repository. No third-party imagery or icon set is used.
