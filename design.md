# Design System — The Daily Web

The UI/UX language for **"The Daily Web"** news portal. Direction: a **modern, vibrant‑red, BBC‑style** news site — energetic breaking‑news feel on top of a professional, trustworthy reading environment.

> Stack reminder: **vanilla HTML/CSS + EJS**, no Tailwind, no CSS framework. Every token below is a plain CSS custom property on `:root`. Layout uses **Flexbox** (taught in the course); CSS Grid is avoided so nothing depends on an untaught technique.

---

## 1. Core aesthetic
- **Style:** clean, modern, high‑contrast, structural (flat — hierarchy comes from type, rule‑lines and the red accent, not shadows).
- **Keywords:** legible, geometric, functional, confident, fast.
- **Vibe:** *breaking news energy* meets *long‑form trust*. Bold red signals urgency and navigation; the serif body invites long reading.

## 2. Signature element (the one memorable thing)
Everything else stays quiet so this reads clearly:

1. **The red section flag** — a solid `--red` uppercase **Libre Franklin** tab used consistently in three places: as the thick rule under the masthead, as the label above every content section, and as the category tag on each card. It is the through‑line that ties masthead → feed → article together and makes the site instantly "ours."
2. **The BREAKING eyebrow** — for breaking stories only, a small red uppercase label with a **soft pulsing dot** (the single lively motion moment). Respects `prefers-reduced-motion` (dot goes static).

Spend boldness here. Do **not** add gradients, glows, or decorative shadows elsewhere.

## 3. Layout & structure
Container: centered, `--container: 1200px` max width, `--gutter: 24px` side padding.

**Home (mixed layout, BBC‑style):**
```
┌───────────────────────────────────────────────┐
│  THE DAILY WEB          [date] [weather] [login]│  masthead
├━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┤  ← thick red rule (signature)
│  Home  World  Tech  Business  Sport  Culture …  │  category nav
├───────────────────────────────────────────────┤
│  ┌───────────────────────┐  ┌──────────────┐   │
│  │  LEAD STORY           │  │ ▸ secondary  │   │  hero: 1 lead + 2 stacked
│  │  big 16:9 image       │  │ ▸ secondary  │   │
│  │  ▮ FLAG  Big headline │  └──────────────┘   │
│  └───────────────────────┘                      │
│  ▮ LATEST ─────────────────────────  [sidebar]  │  section flag + hairline
│  ┌───────┐ ┌───────┐ ┌───────┐        ┌───────┐ │
│  │ card  │ │ card  │ │ card  │        │Weather│ │  feed: flex-wrap cards
│  └───────┘ └───────┘ └───────┘        ├───────┤ │  (3 → 2 → 1 cols)
│  ┌───────┐ ┌───────┐ ┌───────┐        │Most   │ │
│  │ card  │ │ card  │ │ card  │        │read   │ │  sidebar: weather + popularity
│  └───────┘ └───────┘ └───────┘        └───────┘ │
│                 ↓ infinite scroll loads 20 more  │
└───────────────────────────────────────────────┘
```
**Article page:** full‑width headline + byline + hero image, then a serif body column capped at **~68ch** measure for readability, with the sidebar (weather + related) beside it on desktop. The full article text is **server‑rendered in the initial HTML** (SEO requirement); only comments and the sidebar hydrate via Ajax.

**Reporter / Editor areas:** the same masthead, a workspace toolbar, and a table/list of articles with status chips (see §6).

## 4. Typography
Sans for everything structural, serif for the read.

- **Display / headlines / nav / labels — `Libre Franklin`** (weights 600/700/800/900). Editorial grotesque with newspaper heritage; carries the "vibrant news" personality. *(To revert to Inter, change one variable — see §8.)*
- **Body / article text — `Merriweather`** (400, 400 italic, 700). Classic, highly readable for long paragraphs.
- **Utility (bylines, timestamps, flags, data):** `Libre Franklin`, uppercase, `letter-spacing: .06em`, small size — no third family needed.

```css
@import url('https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600;700;800;900&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');
```

**Type scale** (mobile → desktop, use `clamp()`):
| Role | Size | Weight | Family |
|------|------|--------|--------|
| Lead headline | `clamp(2rem, 5vw, 3.25rem)` | 900 | Libre Franklin |
| Card / section headline | `1.25–1.5rem` | 700 | Libre Franklin |
| Body | `1.0625rem` / `line-height:1.7` | 400 | Merriweather |
| Meta / flag | `0.75rem` uppercase | 700 | Libre Franklin |

## 5. Color palette
| Role | Name | Hex | Usage |
|------|------|-----|-------|
| **Primary** | Vibrant Red | `#DC2626` | Section flags, masthead rule, active nav, buttons, links, breaking tags. |
| **Primary‑deep** | Deep Red | `#B91C1C` | Hover / pressed states of red elements. |
| **Red wash** | `#FEF2F2` | Subtle background behind breaking eyebrows / red callouts. |
| **Ink** | Dark Slate | `#0F172A` | Headlines and primary text. |
| **Background** | Off‑White | `#F8FAFC` | Page background (contrasts white cards). |
| **Surface** | Pure White | `#FFFFFF` | Cards, inputs, forms, sidebar panels. |
| **Muted** | Slate Gray | `#64748B` | Dates, author names, secondary info. |
| **Line** | Light Gray | `#E2E8F0` | Card borders, hairline dividers. |

Contrast: ink `#0F172A` and red `#DC2626` on white both clear 4.5:1. Never put muted gray on the off‑white background for essential text.

## 6. Components & interactions
- **Cards:** white surface, `1px solid var(--line)`, radius **2px** (crisp/editorial), image top at **16:9**. Structure: red section flag → headline (Libre Franklin 700) → 2‑line serif summary → meta row (`reporter · date`). **Hover:** border → `--red`, lift `translateY(-2px)` + a *single* soft shadow, `transition: 150ms ease`.
- **Section flag:** `display:inline-block; background:var(--red); color:#fff; font:700 .72rem/1 'Libre Franklin'; text-transform:uppercase; letter-spacing:.06em; padding:.25em .5em;`
- **Buttons:** solid `--red` bg, white text, radius 2px, `cursor:pointer`, `transition: background-color .2s ease` → `--red-deep` on hover. Secondary button: white bg, `1px` red border, red text.
- **Status chips** (reporter/editor workflow): pill labels, color‑coded — In preparation = slate, Awaiting approval = amber `#D97706`, Published = green `#16A34A`, Returned for corrections = red `--red`. Text stays readable (dark text on light chip bg).
- **Links:** `--red`, underline on hover.
- **Forms/inputs:** white, `1px var(--line)` border, focus ring `2px` `--red` (visible keyboard focus is required).
- **Images:** 2px radius, 16:9 thumbnails, always with `alt`.
- **Effects:** flat and structural. One hover shadow on cards is the only shadow. No gradients.

## 7. Motion
Restrained and purposeful:
- **Page load:** feed cards do a subtle staggered fade + 8px rise (~250ms, ~40ms stagger).
- **Hover:** card lift + button color, 150–200ms.
- **Breaking dot:** 1.5s ease‑in‑out opacity pulse.
- **All of the above** wrapped in `@media (prefers-reduced-motion: reduce)` → no transforms, static dot.

## 8. Implementation notes
- **CSS architecture:** all colors, fonts and spacing as custom properties on `:root`; components reference the variables so re‑theming is one place.
  ```css
  :root {
    --red:#DC2626; --red-deep:#B91C1C; --red-wash:#FEF2F2;
    --ink:#0F172A; --bg:#F8FAFC; --surface:#FFFFFF;
    --muted:#64748B; --line:#E2E8F0;
    --font-display:'Libre Franklin', system-ui, sans-serif; /* swap to 'Inter' here to revert */
    --font-body:'Merriweather', Georgia, serif;
    --container:1200px; --gutter:24px;
  }
  ```
- **Layout:** Flexbox only (`display:flex; flex-wrap:wrap`) for the card grid; the container is a centered `max-width` block. No CSS Grid, no framework.
- **Responsive (mobile‑first):** single column by default → 2 cards per row at `≥600px` → 3 per row + sidebar at `≥1000px`. Test at 375 / 768 / 1280.

## 9. Pre‑delivery checklist
- [ ] Icons are inline **SVG** (Heroicons/Simple Icons), never emoji.
- [ ] `cursor:pointer` on every clickable element.
- [ ] Hover transitions 150–300ms.
- [ ] Visible keyboard focus on links, buttons, inputs.
- [ ] `prefers-reduced-motion` respected.
- [ ] Text contrast ≥ 4.5:1.
- [ ] Responsive verified at mobile / tablet / desktop.
- [ ] Every image has `alt`.
