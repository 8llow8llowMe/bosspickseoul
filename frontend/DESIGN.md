---
omd: 0.1
brand: Toss
---

# Custom Design System (based on Toss)

> **문서 정본 안내 (2026-07-15)**: 이 문서(`frontend/DESIGN.md`)는 BossPickSeoul(NowDoBoss) 프론트엔드 디자인 시스템의 **단일 정본(single source of truth)**이다. 기존에 `frontend/docs/`에 흩어져 있던 3개 문서 — `design-guide.md`(레거시 V1 토큰 가이드), `design-prompt.md`(NowDoBoss V2 화면 사양/디자이너 AI 프롬프트), `design-redesign-tasks.md`(개편 작업 큐) — 를 아래 부록 섹션([토큰](#토큰-legacy-v1-스냅샷--design-guidemd-흡수), [컴포넌트 규칙](#컴포넌트-규칙-design-guidemd-흡수--확장-컴포넌트), [디자인 생성 프롬프트/레퍼런스](#디자인-생성-프롬프트레퍼런스), [후속 디자인 과제](#후속-디자인-과제))로 통합했다. 원본 3개 파일은 삭제되지 않고 `frontend/docs/_archive/`로 이동되어 보관되며, 더 이상 갱신 대상이 아니다. 새 작업과 상충 판단은 항상 이 문서(`DESIGN.md`)를 기준으로 한다.

## 1. Visual Theme & Atmosphere

Toss is Korea's fintech super-app that redefined what a financial interface could feel like -- calm, confident, and deceptively simple. The page opens on a clean white canvas (`#ffffff`) with deep charcoal headings (`#191f28`) and a signature blue (`#0ea5e9`) that functions as the universal interactive accent. This isn't the cold, institutional blue of legacy banking; it's a bright, optimistic cerulean that says "your money is in good hands, and we'll make it easy."

The custom **Toss Product Sans** typeface is the quiet hero. Developed with Korean type foundries Sandoll and Leedotype, it was purpose-built for financial contexts: numerals and Latin characters are optically weighted to match Korean hangul proportions, and financial symbols (%, commas, ±) are given enhanced legibility. The font ships in 8 weights (300-950) but the UI exercises restraint, primarily using 400, 600, and 700. The system supports both variable-width numerals for display and fixed-width (tabular) numerals for data tables -- context determines mode.

What defines Toss visually is its OKLCH-based color system, rebuilt from scratch for perceptual uniformity. Colors at the same scale level appear equally bright regardless of hue, enabling consistent semantic coloring where blue-500, red-500, and green-500 carry identical visual weight without manual tuning.

**Key Characteristics:**

- Toss Blue (`#0ea5e9`) as the primary interactive color -- bright, optimistic, trustworthy
- Toss Product Sans with Korean-Latin optical balancing and tabular numeral support
- OKLCH color space for perceptual uniformity across all hue scales
- 10-step grey scale (grey50-grey900) with warm undertones
- Three-tier token architecture: primitive → semantic → component
- Minimal shadow system -- trust comes from clarity, not depth
- Mobile-first at 375px design baseline with accessibility scaling up to 310%

## 2. Color Palette & Roles

### Primary

- **Toss Blue** (`#0ea5e9`): `blue500`. Primary interactive color -- CTAs, links, active states, selection highlights. The workhorse of every tappable element.
- **Blue Hover** (`#2272eb`): `blue600`. Hover/pressed state for blue500 elements.
- **Blue Light** (`#e8f3ff`): `blue50`. Informational backgrounds, subtle blue-tinted surfaces.
- **Pure White** (`#ffffff`): `background`, `layeredBackground`. Page background, card surfaces.
- **Dark Charcoal** (`#191f28`): `grey900`. Primary heading color, strongest text. Warm near-black with subtle blue undertone.

### Brand (Logo/Marketing Only)

- **Brand Blue** (`#0064FF`): Official Toss brand color (Pantone 2175 C). Logo and marketing materials only -- distinct from UI blue500.
- **Brand Gray** (`#202632`): Official secondary brand color (Pantone 433 C). Corporate contexts.

### Semantic

- **Error Red** (`#f04452`): `red500`. Error states, destructive actions, negative financial indicators.
- **Success Green** (`#03b26c`): `green500`. Positive financial indicators, confirmations.
- **Warning Orange** (`#fe9800`): `orange500`. Pending states, attention-needed indicators.
- **Caution Yellow** (`#ffc342`): `yellow500`. Soft warnings, highlight moments.
- **Info Teal** (`#18a5a5`): `teal500`. Informational accent, alternative categorization.
- **Premium Purple** (`#a234c7`): `purple500`. Premium features, special offers.

### Neutral Scale

- **Grey 50** (`#f9fafb`): Lightest gray, `greyBackground` surface.
- **Grey 100** (`#f2f4f6`): Secondary background, card fills, disabled surfaces.
- **Grey 200** (`#e5e8eb`): Default border color, dividers, input backgrounds.
- **Grey 400** (`#b0b8c1`): Placeholder text, disabled icon fills.
- **Grey 500** (`#8b95a1`): Caption text, secondary labels.
- **Grey 600** (`#6b7684`): Body text, descriptions, metadata.
- **Grey 700** (`#4e5968`): Emphasized body text, sub-headings.
- **Grey 800** (`#333d4b`): Strong labels, navigation text.

### Surface & Borders

- **Border Default**: `#e5e8eb` (grey200). Standard card borders, input borders, dividers.
- **Border Strong**: `#d1d6db` (grey300). Emphasized borders, active input outlines.
- **Background Float**: `#ffffff`. `floatBackground`. Floating elements -- tooltips, dropdowns.
- **Overlay Scrim**: `rgba(2,9,19,0.5)` to `rgba(2,9,19,0.91)`. `greyOpacity` scale. Blue-tinted dark overlays.

## 3. Typography Rules

### Font Family

- **Primary**: `"Toss Product Sans", "Tossface", "SF Pro KR", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Basier Square", "Apple SD Gothic Neo", Roboto, "Noto Sans KR", sans-serif`
- **Monospace**: `"SF Mono", SFMono-Regular, Menlo, Consolas, monospace`
- **Emoji**: `Tossface` -- Toss's custom emoji font (3500+ emojis, open-source on GitHub)

### Hierarchy

| Role           | Font              | Size  | Weight | Line Height | Letter Spacing | Notes                             |
| -------------- | ----------------- | ----- | ------ | ----------- | -------------- | --------------------------------- |
| Display Hero   | Toss Product Sans | 30px  | 700    | 40px (1.33) | normal         | Splash screens, hero moments      |
| Display Large  | Toss Product Sans | 26px  | 700    | 36px (1.38) | normal         | Section headers, key metrics      |
| Heading Large  | Toss Product Sans | 22px  | 700    | 30px (1.36) | normal         | Feature titles, modal headers     |
| Heading        | Toss Product Sans | 20px  | 600    | 28px (1.40) | normal         | Card headings, sub-sections       |
| Subtitle       | Toss Product Sans | 16px  | 600    | 24px (1.50) | normal         | Navigation titles, list headers   |
| Body Large     | Toss Product Sans | 16px  | 400    | 24px (1.50) | normal         | Descriptions, explanations        |
| Body           | Toss Product Sans | 14px  | 400    | 22px (1.57) | normal         | Standard reading text             |
| Body Small     | Toss Product Sans | 13px  | 400    | 20px (1.54) | normal         | Secondary information             |
| Caption        | Toss Product Sans | 12px  | 400    | 18px (1.50) | normal         | Timestamps, fine print            |
| Number Display | Toss Product Sans | 30px+ | 700    | tight       | normal         | Financial amounts -- tabular nums |

### Principles

- **Eight weights, three used**: Ships 300-950, but UI uses 400 (body), 600 (emphasis), 700 (headings). Restraint over variety.
- **Dual numeral modes**: Variable-width for display, fixed-width (tabular) for financial tables and stock tickers. Context determines mode.
- **Korean-Latin optical balance**: Korean characters and Latin/numerals are independently weighted so mixed text looks harmonious without manual kerning.
- **Financial symbol optimization**: %, comma separators, ±, currency symbols, and directional arrows given enhanced legibility at small sizes.

## 4. Component Stylings

### Buttons

**Primary (Fill)**

- Background: `#0ea5e9` (blue500)
- Text: `#ffffff`
- Radius: `var(--button-border-radius)` (typically 8px-12px)
- Font: 16px weight 600
- Pressed: dimmed overlay (opacity reduction)
- Loading: 3-dot animation replacing text
- Disabled: reduced opacity via `--button-disabled-opacity-color`
- Display modes: `inline` (auto-width), `block` (full-width with line break), `full` (fills parent)
- Sizes: `tiny`, `medium`, `large`, `big` (default)
- Colors: `primary`, `dark`, `danger`, `light`
- Use: Primary CTAs ("송금하기", "확인")

**Secondary (Weak)**

- Background: `#e8f3ff` (blue50) or `#f2f4f6` (grey100)
- Text: `#0ea5e9` (blue500) or `#191f28` (grey900)
- Use: Less prominent CTAs, secondary actions

**Dark**

- Background: `#191f28` (grey900)
- Text: `#ffffff`
- Use: Actions on light backgrounds where blue would be too playful

**Danger**

- Background: `#f04452` (red500)
- Text: `#ffffff`
- Use: Destructive actions, alert confirmations

### Cards & Containers

- Background: `#ffffff` (layeredBackground)
- Border: 1px solid `#e5e8eb` (grey200) or no border
- Radius: 12px (standard), 16px (featured), 8px (compact)
- Shadow: `0px 2px 8px rgba(0,0,0,0.08)` -- single-layer, minimal
- Financial cards: prominent number display with amount in 700 weight, currency label in 400

### Inputs & Forms

- Background: `#f2f4f6` (grey100) for contained variant
- Border: 1px solid `#e5e8eb`, focus: 2px solid `#0ea5e9`
- Radius: 8px
- Text: `#191f28`, Placeholder: `#b0b8c1` (grey400)
- Error border: `#f04452` (red500)
- Special: SplitTextField for OTP, SecureKeypad for financial input

### Navigation

- Bottom tab bar: white background, top border `#e5e8eb`
- Active: `#0ea5e9` icon + `#191f28` text, Inactive: `#b0b8c1` icon + `#8b95a1` text
- Top app bar: white, sticky, optional backdrop blur
- Segmented control for section switching

### Overlays

- Bottom Sheet: `#ffffff`, 16px top radius, managed via `overlay-kit`
- Dialog: centered modal, AlertDialog and ConfirmDialog variants
- Toast: floating notification, subtle shadow, auto-dismiss
- Tooltip: `#191f28` background, white text, arrow pointer

## 5. Layout Principles

### Spacing System

- Base unit: 8px
- Common values: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px
- Horizontal padding: 20px (slightly wider than typical 16px)
- Financial data grids: tighter 4px internal spacing

### Grid & Container

- Design baseline: 375px mobile width
- Content: full-width with 20px horizontal padding
- No explicit multi-column grid -- single-column, mobile-first
- Transaction lists: full-width rows with consistent left-align for amounts

### Whitespace Philosophy

- **Breathing room for money**: Financial numbers get extra surrounding space. A balance at 30px with 32px margins communicates security through spaciousness.
- **Progressive density**: Summary screens are spacious; detail/transaction screens are denser. The deeper you go, the more information-dense.
- **Grouped by function**: Send/receive/invest actions separated by 24px+ gaps; related data within a group uses 8-12px gaps.

### Border Radius Scale

- Compact (4px): Small badges, inline elements
- Standard (8px): Inputs, small buttons, compact cards
- Comfortable (12px): Standard cards, dialog corners
- Large (16px): Featured cards, bottom sheet top corners
- Pill (9999px): Toggle switches, floating chips

## 6. Depth & Elevation

| Level              | Treatment                       | Use                                   |
| ------------------ | ------------------------------- | ------------------------------------- |
| Flat (Level 0)     | No shadow                       | Page background, inline elements      |
| Subtle (Level 1)   | `0px 1px 3px rgba(0,0,0,0.06)`  | Slight lift, list item separation     |
| Standard (Level 2) | `0px 2px 8px rgba(0,0,0,0.08)`  | Cards, content panels                 |
| Elevated (Level 3) | `0px 4px 12px rgba(0,0,0,0.12)` | Dropdowns, popovers, floating buttons |
| Modal (Level 4)    | `0px 8px 24px rgba(0,0,0,0.16)` | Bottom sheets, dialogs, modals        |

**Shadow Philosophy**: Toss keeps shadows minimal and neutral. In a financial app, visual noise undermines trust -- elevation is communicated through subtle opacity differences rather than dramatic depth. Pure black with low opacity creates clinical precision matching the fintech context. Where Stripe uses brand-colored shadows, Toss uses restraint as its brand statement.

### Blur Effects

- Menu components use backdrop blur for lightweight floating panels
- Navigation bar applies subtle blur on scroll for the sticky header

## 7. Do's and Don'ts

### Do

- Use Toss Blue (`#0ea5e9`) for all interactive elements -- links, buttons, toggles, selections
- Apply the full font stack with Korean fallbacks including Tossface emoji
- Use tabular (fixed-width) numerals for financial data and transaction amounts
- Use 700 weight for financial amounts and headings, 400 for body, 600 for emphasis
- Keep border-radius between 8px-16px for most elements
- Show positive changes in green (`#03b26c`), negative in red (`#f04452`)
- Use blue50 (`#e8f3ff`) for subtle informational backgrounds

### Don't

- Don't confuse Brand Blue (`#0064FF`) with UI Blue (`#0ea5e9`) -- brand is for marketing/logo only
- Don't use heavy shadows -- rely on background color layering, not depth
- Don't use bold (700) for body text -- reserved for headings and financial amounts
- Don't mix variable-width and tabular numerals in the same data context
- Don't use warm accent colors (orange, pink) for primary actions -- blue is the sole interactive hue
- Don't use border-radius > 16px except for pills/toggles
- Don't add decorative elements to financial data displays -- clarity is the aesthetic

## 8. Responsive Behavior

### Breakpoints

| Name             | Width     | Key Changes                                             |
| ---------------- | --------- | ------------------------------------------------------- |
| Mobile (Primary) | <480px    | Full design fidelity, 375px baseline                    |
| Tablet           | 480-768px | Expanded cards, optional side margins                   |
| Desktop (Web)    | >768px    | Centered column, max-width ~480px for mobile-web parity |

### Touch Targets

- Buttons: xlarge (~56px), large (~48px), medium (~40px), small (~36px)
- List items: minimum 52px row height for financial actions
- Keypad buttons: large targets (56-64px) for secure input

### Collapsing Strategy

- Desktop web mirrors mobile layout in a centered column
- Bottom sheet → modal dialog on larger screens
- Sticky bottom CTA bar with safe area insets on all devices
- Horizontal scrolling card carousels for product discovery

### Image Behavior

- Bank/service logos: 24-40px with consistent sizing within context
- Tossface emojis: inline at text size, display size for decorative use
- Charts/graphs: full-width, responsive, maintain aspect ratio

## 9. Agent Prompt Guide

### Quick Color Reference

- Primary CTA: Toss Blue (`#0ea5e9`)
- CTA Hover: Blue 600 (`#2272eb`)
- Background: Pure White (`#ffffff`)
- Background Surface: Light Gray (`#f2f4f6`)
- Heading text: Dark Charcoal (`#191f28`)
- Body text: Medium Gray (`#6b7684`)
- Caption text: Gray (`#8b95a1`)
- Placeholder: Soft Gray (`#b0b8c1`)
- Border: Gray 200 (`#e5e8eb`)
- Success/Positive: Green (`#03b26c`)
- Error/Negative: Red (`#f04452`)
- Warning: Orange (`#fe9800`)

### Example Component Prompts

- "Create a balance card: white bg, 12px radius, 20px padding. Balance label 14px weight 400, #8b95a1. Amount 30px weight 700, #191f28, tabular numerals. Currency '원' 20px weight 400. Shadow 0px 2px 8px rgba(0,0,0,0.08)."
- "Build a send-money button: #0ea5e9 bg, white text, 16px weight 600, min-height 56px, 12px radius, full-width. Pressed: overlay dim. Loading: 3-dot white animation."
- "Design a transaction row: full-width, 16px h-padding, 52px min-height. Left: 32px circle icon + name (14px weight 600, #191f28) + category (13px weight 400, #8b95a1). Right: amount (14px weight 600, #f04452 expense / #03b26c income)."
- "Create an OTP input: 6 boxes, each 48px wide, 56px tall, 8px radius, 1px border #e5e8eb. Active: 2px border #0ea5e9. Digit: 24px weight 700, centered, #191f28."
- "Design a bottom tab bar: white bg, top border 1px #e5e8eb. 4 tabs evenly spaced. Active: #0ea5e9 icon + #191f28 label 11px weight 500. Inactive: #b0b8c1 icon + #8b95a1 label. Tab height 56px with safe area."

### Iteration Guide

1. Always use the full Toss Product Sans font stack with Korean fallbacks
2. Primary interactive color is `#0ea5e9` (blue500) -- never `#0064FF` (brand blue)
3. Financial numbers: 700 weight, tabular numerals, right-aligned in lists
4. Grey scale has warm undertones: grey900 `#191f28`, grey50 `#f9fafb`
5. Border-radius: 8px inputs, 12px cards, 16px sheets, pill for toggles
6. Shadows are single-layer, pure black opacity, no colored tints
7. Mobile-first: design at 375px, 20px horizontal padding

---

## 10. Voice & Tone

Toss speaks like a friend who happens to be a fiduciary: calm, unhurried, zero jargon, positive statements without hedging. Balance is stated, not "approximately" anything. Korean is the primary voice — English UI strings are secondary translations, not parity. Sentences end in periods; buttons do not. No emoji in financial contexts. Tossface exists as brand decoration but is disallowed on money-handling screens.

| Context            | Tone                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| CTAs               | Imperative, short Korean verb form (`송금하기`, `확인`, `가입하기`)                               |
| Success toasts     | Past-tense single sentence (`송금이 완료되었어요`). No emoji.                                     |
| Error messages     | Specific + blameless + actionable. Never `문제가 발생했습니다`.                                   |
| Onboarding screens | Second-person, one idea per screen, no bullet lists.                                              |
| Financial amounts  | Bare numerals with comma separators, then currency unit. `1,240,000원`, never `₩1.24M`.           |
| Empty states       | Explain the _why_ in one line, offer one action. Never `데이터가 없습니다`.                       |
| Legal / disclosure | Korean financial-regulation tone — formal `합니다` endings. Single exception to the casual voice. |

**Forbidden phrases.** `불편을 드려 죄송합니다`, `Oops`, `죄송하지만`, `약 ~원` (approximation on money), any sentence starting with `I'm sorry` in English strings. Rounded currency amounts (`약 120만원`) are forbidden on primary surfaces; exact numerals only.

## 11. Brand Narrative

Toss launched in 2015 as a single-feature money-transfer app in a Korean banking market dominated by legacy institutions — KB, Shinhan, Woori, Hana — each with institutional-indigo websites, 12-digit account numbers, Active-X plug-ins, and the presumption that handling money had to feel like filing taxes. The founding rejection was of that entire aesthetic vocabulary. The specific cerulean `#0ea5e9` was chosen because it was **not** the indigo of any incumbent bank. The optimism of the color was the whole thesis: money could feel light.

Toss is not a neo-bank. It's a super-app: one interface holds transfers, investments, credit scoring, insurance, brokerage, and lending. The design's job is to flatten that complexity into **one gesture per screen**. That requires extreme restraint — shadows are single-layer black, palette is blue-and-neutral, type is one family in three weights. Every ornamental move costs clarity, and clarity is the entire brand promise.

What Toss refuses: the institutional seriousness of legacy finance, the playfulness of consumer apps (no bright pink, no illustrations of cartoon piggy banks), the data-viz density of Bloomberg-style terminals. Toss occupies a narrow middle — calm but optimistic, dense with functionality but spacious in presentation.

## 12. Principles

1. **Breathing room for money.** Financial amounts get ≥1.5× the surrounding spacing of normal text. A balance at 30px with 32px margins is correct; the same balance at 16px margins looks cheap and therefore untrustworthy.
2. **Progressive density.** Summary screens are spacious; detail and transaction screens are dense. The deeper the user navigates, the more information per pixel — they've committed to the context and want facts.
3. **One action per screen.** If a screen has two primary buttons, it is two screens. Secondary actions are acceptable; two primaries are never acceptable.
4. **Blue is interaction, not decoration.** `#0ea5e9` appears only where the user can tap. It never decorates. Illustrations, ornaments, borders, and headers never use blue500 unless they are interactive surfaces.
5. **Restraint communicates trust.** Shadows are single-layer, pure black, low opacity. No colored shadows, no multi-layer elevation stacks. In finance, visual noise is credibility tax.
6. **Korean and Latin are co-equal.** Never assume one is primary. Typography stacks, optical weights, and tabular numerals all assume both scripts render simultaneously in the same line.
7. **Numbers are typography.** Financial amounts use 700 weight and tabular numerals with the same care as display headings. Amounts never inherit body-text weight.
8. **Negative space is a brand asset.** If reducing padding would fit more on screen, the answer is another screen, not tighter packing.

## 13. Personas

_Personas below are fictional archetypes informed by publicly described Korean fintech user segments, not individual people._

**정민 (Jeongmin), 28, Seoul.** Software engineer at a mid-size startup. Opens Toss 2–3 times a day — morning subway, post-lunch balance check, evening transfer to a flatmate. Expects the app to open directly to the account screen and paint in under 1s. If she has to tap twice to see her money, she's already irritated. Uses both Korean and English on-device; reads financial English natively but prefers Korean UI for speed.

**이선생님 (Mr. Lee), 54, Busan.** Runs a three-person machining shop. His daughter set up Toss for him two years ago. Primary use: transferring to suppliers and receiving invoice payments. Needs one-tap repeat transfer — he has about 12 regular counterparties. Distrusts anything that looks like an advertisement. Would uninstall the app before tapping a promoted banner. Reads Korean only; English strings on product surfaces are invisible to him. Values receipts and transaction history — never deletes them.

**예은 (Yeeun), 21, Daegu.** University student, third year, Economics. Toss is her primary banking app — she opened her first account through it, and has never touched a legacy bank's web interface except under duress. Expects Toss Blue to be "banking blue." If another financial app uses cerulean, she assumes it's imitating Toss. Sends ₩5,000–₩30,000 amounts constantly (splitting bills, paying back friends). Treats the app like a messaging app with money attached.

## 14. States

| State                             | Treatment                                                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Empty (first use)**             | Single paragraph of `grey700` body text explaining _why_ the screen is empty (`아직 거래내역이 없어요`), plus one suggested action as a secondary button (blue50 bg, blue500 text). Never an illustration. Never `데이터가 없습니다`.       |
| **Empty (filter cleared)**        | Single line of `grey500` caption (`조건에 맞는 결과가 없어요`). No button — user resets the filter themselves.                                                                                                                              |
| **Loading (first paint)**         | Skeleton blocks matching the final layout's structure at `#f2f4f6` (grey100). Financial amounts render as `--` until resolved; they never appear as skeleton blocks (would look like they have a placeholder value).                        |
| **Loading (refresh)**             | Top bar pull-down spinner in blue500. No overlay, no blocking. Content stays visible with its previous values.                                                                                                                              |
| **Error (inline field)**          | `#f04452` (red500) 2px border on the input, error text below in red500 13px. One actionable sentence (`계좌번호를 다시 확인해주세요`).                                                                                                      |
| **Error (toast)**                 | `#191f28` background, white 14px 400 text, 3s auto-dismiss. One sentence. No icons. Bottom of screen with 20px inset.                                                                                                                       |
| **Error (screen-blocking)**       | Reserved for server outage. White screen, centered single-line message in `grey900` 16px weight 600, retry button in blue500 below. No illustration.                                                                                        |
| **Success (inline flash)**        | Brief flash of `#e8f3ff` (blue50) background behind the updated element, 300ms fade to default. For routine actions like toggling a setting.                                                                                                |
| **Success (money moved)**         | Dedicated confirmation screen — not a toast. `#03b26c` (green500) checkmark top-center, exact amount in 30px weight 700 below, recipient name, timestamp. Single button: `확인`. This weight is intentional; money moving is never a toast. |
| **Skeleton**                      | `#f2f4f6` blocks at exact final dimensions. 1.2s shimmer as `linear-gradient` with 8% white highlight. Rounded at component radius (8px/12px/16px per component). Never used on financial amounts — those show `--`.                        |
| **Disabled**                      | Button opacity drops per `--button-disabled-opacity-color`. No grey-out of input borders — disabled inputs keep `grey200` border, so the geometry is stable if re-enabled.                                                                  |
| **Loading inside pressed button** | Text is replaced by the 3-dot white animation. Width of the button does not change. Press is visually committed; user cannot double-submit.                                                                                                 |

## 15. Motion & Easing

**Durations** (named, not raw milliseconds):

| Token             | Value | Use                                                                   |
| ----------------- | ----- | --------------------------------------------------------------------- |
| `motion-instant`  | 0ms   | Toggle flips, checkbox state changes                                  |
| `motion-fast`     | 150ms | Hover, focus, small reveals, button press overlay                     |
| `motion-standard` | 250ms | The default — sheet opens, card expands, tab switches                 |
| `motion-slow`     | 400ms | Emphasized transitions — success checkmarks, onboarding step advances |
| `motion-page`     | 350ms | Full-screen transitions between top-level routes                      |

**Easings:**

| Token           | Curve                               | Use                                                                                                            |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ease-enter`    | `cubic-bezier(0.0, 0.0, 0.2, 1)`    | Things appearing — sheets, toasts, screen pushes                                                               |
| `ease-exit`     | `cubic-bezier(0.4, 0.0, 1, 1)`      | Things leaving — dismissals, pops                                                                              |
| `ease-standard` | `cubic-bezier(0.4, 0.0, 0.2, 1)`    | Two-way transitions — collapsible cards, tab content                                                           |
| `ease-spring`   | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Reserved. Only for money-moved success checkmark. Nowhere else — overshoot on routine UI would feel unserious. |

**Signature motions.**

1. **Money-moves.** When a balance updates, the old number slides up 20px and fades out (`motion-fast / ease-exit`), the new number slides in from below 20px (`motion-standard / ease-enter`). Never cross-fade money — a financial amount flickering between values looks like a bug.
2. **Bottom-sheet presentation.** Sheets rise from `y+40px` with `motion-standard / ease-enter` and a synchronized backdrop fade from `rgba(2,9,19,0)` to `rgba(2,9,19,0.5)`. Dismissal uses `motion-fast / ease-exit` — leaving feels lighter than entering.
3. **Success checkmark.** On money-moved confirmation, the checkmark draws over `motion-slow` with `ease-spring`. This is the one place spring easing is licensed. Everywhere else, standard easing.
4. **Reduce motion.** If `prefers-reduced-motion: reduce`, all `motion-*` tokens collapse to `motion-instant`. No exceptions. Crossfades replace slides. The app stays usable; just less kinetic.

<!--
OmD v0.1 Sources — Philosophy Layer (sections 10–15)

Direct verification via WebFetch (2026-04-19):
- https://toss.im/ — confirms Viva Republica (비바리퍼블리카) as operating company,
  unified-finance super-app positioning ("내 모든 금융 내역을 한눈에 조회하고 한 곳에서 관리하세요"),
  and mission framing "모두의 금융에 자유를" (financial freedom for everyone).
- https://slash.page/ — confirms Toss maintains a public open-source engineering
  presence ("Copyright © 2024 Viva Republica - Toss Frontend Chapter"), with
  packages including overlay-kit, suspensive, use-funnel — demonstrating the
  design/engineering self-documentation culture referenced in §12 Principles.

Base DESIGN.md (sections 1–9) is the source for token-level claims including
Toss Blue #0ea5e9, Toss Product Sans, the OKLCH-based palette, and shadow tokens.

Not independently verified via WebFetch — widely documented public facts used:
- Toss (Viva Republica) was founded in 2013; the money-transfer app launched in 2015.
- Korean legacy-bank institutional palette context (KB, Shinhan, Woori, Hana) is
  general industry knowledge, not a sourced Toss statement.

Personas (§13) are fictional archetypes informed by publicly described Korean
fintech user segments. Any resemblance to specific individuals is unintended.

Interpretive claims (e.g., "the specific cerulean was chosen because it was
not the indigo of any incumbent bank") are editorial readings of the design,
not documented Toss statements.
-->

---

## Included Components

The following components are part of this design system:

- Button
- Input
- Table
- Card
- Badge
- Tabs
- Dialog

---

## Iconography & SVG Guidelines

### Icon Library

Use a single, consistent icon library throughout the project. Recommended options:

- **Lucide React** (`lucide-react`): Default for shadcn/ui projects. 1,400+ icons, tree-shakeable, consistent 24x24 grid.
- **Radix Icons** (`@radix-ui/react-icons`): 300+ icons, 15x15 grid, minimal and geometric.
- **Heroicons** (`@heroicons/react`): 300+ icons by Tailwind team, outline and solid variants.

Pick ONE library and use it everywhere. Do not mix icon libraries within the same project.

### SVG Usage Rules

- All icons must be inline SVG components (not `<img>` tags) for color and size control.
- Icon size follows the type scale: 16px (inline), 20px (buttons), 24px (standalone).
- Icon color inherits from `currentColor` -- never hard-code fill/stroke colors.
- For custom/brand icons, export as SVG components with `currentColor` fills.
- Stroke width: 1.5px-2px for outline icons. Keep consistent across the project.

### Icon Sizing Scale

| Context     | Size            | Usage                       |
| ----------- | --------------- | --------------------------- |
| Inline text | 16px (1rem)     | Badges, labels, breadcrumbs |
| Button icon | 18px (1.125rem) | Icon buttons, CTA icons     |
| Standalone  | 24px (1.5rem)   | Navigation, card icons      |
| Feature     | 32-48px         | Hero sections, empty states |

### SVG Optimization

- Run all custom SVGs through SVGO before committing.
- Remove unnecessary attributes: `xmlns`, `xml:space`, editor metadata.
- Use `viewBox` instead of fixed `width`/`height` for scalability.

---

## Document Policies

### No Emojis

This design system must not use emojis in any UI element, component, label, status indicator, or documentation.
Use SVG icons from the chosen icon library instead. Emojis render inconsistently across platforms and break visual coherence.

- Status indicators: use colored dots or icon components, not emoji.
- Section markers: use text prefixes ("DO:" / "DON'T:") or icons, not checkmark/cross emojis.
- Navigation: use icon components, not emoji.

### Format Compliance

This document follows the Google Stitch DESIGN.md 9-section format:

1. Visual Theme & Atmosphere
2. Color Palette & Roles
3. Typography Rules
4. Component Stylings
5. Layout Principles
6. Depth & Elevation
7. Do's and Don'ts
8. Responsive Behavior
9. Agent Prompt Guide

Extended with:

- Iconography & SVG Guidelines
- Document Policies

Total target length: 250-400 lines. Keep sections concise and actionable.

---

## 토큰 (Legacy V1 스냅샷 · design-guide.md 흡수)

> 출처: 구 `frontend/docs/design-guide.md`(현재 `frontend/docs/_archive/design-guide.md`로 보관). 색상·타이포·레이아웃·컴포넌트 규칙의 대부분은 위 §1~§9(Toss 기반 시스템)로 이미 대체되어 있으므로, 여기서는 **레거시 스냅샷(마이그레이션 이력 참고용)** 과 **§1~§9에 아직 없던 규칙**만 남기고 나머지 중복은 생략한다.

### 레거시 V1 토큰 스냅샷 (대체 완료, 참고용)

```css
:root {
  --color-primary-700: #1549b5; /* → blue500 #0ea5e9 로 대체 */
  --color-primary-600: #336dd3; /* → blue600 #2272eb 로 대체 */
  --color-primary-100: #f0f5ff; /* → blue50 #e8f3ff 로 대체 */
  --color-text-900: #191f28; /* → grey900, 값 동일 유지 */
  --color-text-700: #333333; /* → grey800 #333d4b 계열로 흡수 */
  --color-text-500: #606d85; /* → grey600 #6b7684 계열로 흡수 */
  --color-border-300: #c4c4c4; /* → grey300 #d1d6db 계열로 흡수 */
  --color-border-200: #dde3ea; /* → grey200 #e5e8eb 계열로 흡수 */
  --color-surface: #ffffff;
  --color-surface-muted: #f8fafc; /* → grey50 #f9fafb 계열로 흡수 */
  --color-success: #1f9d55; /* → green500 #03b26c 로 대체 */
  --color-warning: #d9822b; /* → orange500 #fe9800 로 대체 */
  --color-danger: #d14343; /* → red500 #f04452 로 대체 */
}
```

레거시 V1 대표 색상 `#1549B5`, `#336DD3`, `#191F28`, `#606D85`, `#F0F5FF`, `#C4C4C4`는 모두 위 Toss 팔레트(§2)로 대체됐다. 2026-07-15 기준 `rg "#1549b5|#336dd3|rgba\(21, 73, 181"` 검증 결과 `frontend/src`, `frontend/app`에 잔존 없음.

레거시 V1 breakpoint(`640/768/1024/1280px`, 데스크톱 콘텐츠 폭 `1200~1280px`, 좌우 여백 `24px+`)는 Toss 기준 breakpoint(§8 Responsive Behavior: `<480px / 480-768px / >768px`, 375px 베이스라인)로 대체됐다. 레거시 폭 기준이 남아있는 화면이 있다면 [후속 디자인 과제 · Task 09](#후속-디자인-과제) Visual QA에서 정리한다.

레거시 V1 버튼 radius(`12~14px`)·카드 radius(`16~20px`)·카드 shadow(`0 10px 30px rgba(21,73,181,.08)`)는 §5 Border Radius Scale(4/8/12/16/9999px)과 §6 Depth & Elevation(단일 레이어 블랙 opacity)으로 대체됐다.

레거시 V1 입력 높이(`44px`/`48px`)는 §4 Inputs & Forms와 동일 값을 유지하므로 변경 없음.

---

## 컴포넌트 규칙 (design-guide.md 흡수 + 확장 컴포넌트)

> §4 Component Stylings(Buttons/Cards/Inputs/Navigation/Overlays)에 없던 규칙만 아래에 편입한다.

### 차트와 데이터 표현

- 차트는 장식보다 해석 가능성을 우선한다.
- 한 차트 안에서 강조 색은 1개, 보조 색은 2개 이내로 제한한다.
- grid, axis, legend는 과도하게 진하지 않게 유지한다.
- 요약 숫자 카드는 차트보다 먼저 읽히도록 배치한다.
- Chart 래퍼: Bar(수직/수평) / Line / Stacked Bar / Donut. (출처: design-prompt.md — [디자인 생성 프롬프트/레퍼런스](#디자인-생성-프롬프트레퍼런스) §2 참고)

### Score Scale (NowDoBoss 고유 시맨틱 컬러)

- `--score-high`: 등급 HIGH — 종합 점수 70점 이상 (예: `green500`)
- `--score-mid`: 등급 MEDIUM — 40~70점
- `--score-low`: 등급 LOW — 40점 미만
- 색상만 의존하지 말고 명도 차 + 숫자 라벨도 함께 표시한다(컬러 블라인드 대응).

### 지도와 공간 정보 화면

- 지도는 화면의 주인공이지만, 컨트롤 패널이 기능을 방해하면 안 된다.
- 필터 박스, 요약 카드, floating action은 동일한 radius와 shadow 체계를 공유한다.
- 지도 위 오버레이는 텍스트 대비를 충분히 확보한다.
- V2 1차 범위 제외: 풀스크린 지도 + Kakao Map 폴리곤 히트맵(`/map` 류) — Kakao Map SDK 미이식. 자치구 grid + bar metric으로 1차 대체한다. (자세한 Out of Scope 목록은 [디자인 생성 프롬프트/레퍼런스](#디자인-생성-프롬프트레퍼런스) §8 참고)

### 접근성

- 텍스트 대비는 WCAG AA 이상을 목표로 한다.
- hover만으로 정보가 드러나는 인터랙션은 피한다.
- 버튼, 링크, 입력은 키보드 포커스 스타일을 가진다.
- 아이콘 버튼에는 `aria-label`을 명시한다.

### 구현 규칙

- 새 화면은 반드시 공통 토큰 파일에서 색상, spacing, radius를 가져다 쓴다.
- 디자인 예외가 필요하면 해당 화면 안에서 임시 상수를 만들지 말고 토큰에 추가할지 먼저 검토한다.
- 공통 컴포넌트 후보는 화면 파일에 중복 정의하지 않고 `src/components`로 올린다.

### 피해야 할 것 (V1 회귀 방지)

§7 Do's and Don'ts와 중복되지 않는 NowDoBoss 고유 항목만 남긴다.

- 화면마다 다른 블루 색상 / 다른 border-radius / 다른 그림자 스타일을 쓰지 않는다.
- 레거시 톤과 무관한 새 브랜드 재해석을 하지 않는다 — Toss 기반 톤을 유지한다.
- 모바일에서 지나치게 작은 탭/버튼 터치 영역을 두지 않는다(§8 Touch Targets 기준 준수).

### 확장 컴포넌트 (design-prompt.md 흡수 — NowDoBoss 고유 프리미티브)

`## Included Components`(Button/Input/Table/Card/Badge/Tabs/Dialog)에 아래 8종 Primitive + 보조 컴포넌트를 추가한다.

**8종 Primitive**

1. **Button** — variant: `primary` / `secondary` / `dark` / `danger` / `ghost`. size: `tiny` / `medium` / `large` / `big`. display: `inline` / `block` / `full`.
2. **TextField** — bg `grey100`, border `grey200`, focus `blue500` 2px, error `red500` 2px. height 44 또는 48.
3. **Card** — white, 12px radius, optional `1px grey200` 또는 무테, Level 2 shadow.
4. **Badge** — pill, score 등급 표시(HIGH/MEDIUM/LOW), 트렌드(↑↓→), 프리셋명.
5. **Tabs** — active: blue text 또는 blue underline. inactive: grey text. 가로 스크롤 모바일.
6. **Dialog** — centered modal + bottom-sheet 양쪽 base. 16px top radius(sheet).
7. **EmptyState** — 라인 일러스트 + 한 줄 + CTA 1개.
8. **Skeleton** — `grey100` block, 1.2s shimmer(8% white). 금액·지표는 `--` fallback(skeleton 금지 — 가짜 값처럼 보임).

**보조 컴포넌트**

- Toast(`grey900` bg, white 14/400 텍스트, 3s auto-dismiss, 하단 20px 인셋)
- Tooltip(`grey900` bg, white 텍스트, arrow)
- Bottom Sheet(16px top radius, scrim `rgba(2,9,19,0.5)`)
- Toggle / Checkbox / Radio(active blue500)
- Combobox(검색 자동완성 — 글로벌 검색용)
- SegmentedControl(프리셋 6종, 정렬 토글)
- Chip(필터, 카테고리, reasonTags)
- DataTable(자치구 TOP10, 신고 대시보드)
- Avatar(32~48px, fallback: 단일 grey)
- BreadCrumb / Pagination(커서 기반 "더 보기")

---

## 디자인 생성 프롬프트/레퍼런스

> 이 섹션은 구 `frontend/docs/design-prompt.md`(현재 `frontend/docs/_archive/design-prompt.md`로 보관)를 참고 자료로 부록화한 것이다. 위 §1~§9(Toss 기반 공통 토큰) 및 [컴포넌트 규칙](#컴포넌트-규칙-design-guidemd-흡수--확장-컴포넌트)과 중복되는 "2. 디자인 시스템" 항목(컬러/타이포/스페이싱/라디우스/그림자/모션/아이콘/Do·Don't)은 생략했다. NowDoBoss V2 제품 고유의 화면 사양·정보구조·카피·유저저니는 아래에 그대로 남긴다. 필요 시 이 섹션 전체를 발췌해 디자이너 AI(Claude Design / Figma AI 등)에 입력해 화면 시안을 생성할 수 있다.
>
> 통합 출처: 이 문서(`DESIGN.md`) §1~§9(Toss 기반 디자인 시스템) · [후속 디자인 과제](#후속-디자인-과제)(구 `design-redesign-tasks.md`, 재작업 큐) · `frontend/docs/features/_index.md`(라우트 매핑) · `backend/docs/api-screens.md` · `backend/docs/feature-status.md`

### 0. 빠른 안내 (디자이너 AI에게)

- **너의 역할**: NowDoBoss V2 웹앱의 디자인 시스템 페이지 1개 + 핵심 화면 시안 약 25개 + 인터랙션 프로토타입 6개를 만든다.
- **톤**: Toss(toss.im) 기준 — 차분하고 자신감 있는 핀테크 톤. 단, NowDoBoss는 핀테크가 아니라 **소상공인 예비 창업자용 상권 분석 + AI 컨설팅** 서비스다. Toss의 "정돈됨"은 가져오되 "금융" 어휘는 빼라.
- **언어**: 한국어 단일. UI 카피는 모두 한국어. 폰트 fallback chain은 위 §3 Typography Rules 참조.
- **모바일 우선**: 375px 베이스라인. 데스크탑(>768px)은 가운데 정렬 컬럼으로 모바일과 패리티.
- **금지**: 이모지, 컬러 그림자, 글래스모피즘, 그라디언트 장식, 핑크/오렌지를 primary로 사용, viewport 기반 폰트 스케일링, 네거티브 letter-spacing.

### 1. 제품 컨텍스트

#### 1.1 한 줄 정의

서울시 상권·유동인구·매출·인구 데이터를 기반으로 **소상공인 예비 창업자**가 "어디서, 어떤 업종으로 시작할지"를 결정하도록 돕는 **데이터 + AI 컨설팅 웹 서비스**.

#### 1.2 사용자

- **20~30대 청년 창업 예비자** — 트렌디한 상권 + 빠른 의사결정.
- **40~50대 재취업 창업 예비자** — 안정적 거주 상권 + 위험 회피.
- **자영업 운영자** — 내 상권 모니터링 + 비교.

#### 1.3 차별점

1. 상권 6종 프리셋 추천: `BALANCED / AGGRESSIVE_OPPORTUNITY / STABLE_LOW_RISK / LOW_BUDGET_RESIDENT / YOUTH_STARTUP / RE_EMPLOYMENT_STARTUP`
2. 상권 vs 행정동 vs 자치구 **3계층 비교** + 상권 A/B 비교
3. **AI 리포트(LLM)** — 비동기 잡 모델(POST → jobId 폴링)로 자연어 인사이트 제공
4. 북마크·커뮤니티로 의사결정 기록·공유

#### 1.4 무드

- 데이터를 다루지만 **처음 창업하는 사람이 압도되지 않도록** 친근하고 정돈됨.
- 참고 톤: Toss의 정돈된 정보 밀도 + 당근마켓의 친근함.
- **금지**: 과한 그라디언트, 게임 같은 색감, 화려한 일러스트.

### 2. 디자인 시스템 — NowDoBoss 고유 확장분만

> 컬러/타이포/스페이싱/라디우스/그림자/모션/아이콘/보이스 토큰은 위 §1~§9(Toss 기반)와 동일하다. Score Scale과 컴포넌트 목록은 [컴포넌트 규칙 > 확장 컴포넌트](#컴포넌트-규칙-design-guidemd-흡수--확장-컴포넌트) 절로 옮겼으므로 중복 생략.

### 3. 정보구조 (IA)

#### 3.1 사이트맵 — V2 실제 30개 라우트

라우트 그룹 2개:

- **`(auth)`** — 헤더/푸터 없음. 비로그인 진입.
- **`(shell)`** — GNB 적용. 메인 셸.

```
(auth)
  /login
  /register
  /register/general
  /account-deleted

(shell)
  /                          홈 (자치구 grid + 추천 진입)
  /status                    시스템/배치 상태
  /recommend                 업종/프리셋 기반 추천
  /analysis                  분석 진입(자치구·업종 선택)
  /analysis/result           분석 결과 (탭 6종 + AI)
  /analysis/simulation       분석 컨텍스트 시뮬 진입
  /analysis/simulation/report
  /analysis/simulation/compare
  /simulation                창업 비용 시뮬 폼
  /simulation/report
  /simulation/compare
  /community/list            커뮤니티 피드 + 검색
  /community/[communityId]   게시글 상세 + 댓글
  /community/register        글쓰기/수정 (?id= / ?from=compare)
  /chatting/list             채팅방 리스트
  /chatting/[roomId]         채팅방 상세
  /share/[token]             공유 토큰 리포트 (비로그인 가능)
  /member/loading/[provider] 소셜 OAuth 콜백
  /profile/settings          마이페이지
  /profile/settings/edit
  /profile/settings/change-password
  /profile/settings/withdraw
  /profile/bookmarks         북마크 진입
  /profile/bookmarks/analysis
  /profile/bookmarks/recommend
  /profile/bookmarks/simulation
```

#### 3.2 글로벌 네비게이션

**데스크탑 (>768px)**

- 좌: 로고
- 중: `홈` `추천` `분석` `커뮤니티` `채팅`
- 우: 검색(자동완성 combobox) → 프로필 메뉴(아바타+이름) / 비로그인 시 `로그인` 버튼

**모바일 (<480px)**

- 상단 헤더: 로고 + 검색 아이콘 + 햄버거(슬라이드 메뉴)
- **BottomNav 미도입** (V2 1차 결정). 향후 검토.
- Sticky bottom CTA bar는 화면별로 사용 가능.

**Footer (모든 화면 동일)**

- 서비스 설명 + 약관/개인정보처리방침 + 깃허브 링크 (white surface, 가벼움)

#### 3.3 인증 가드 매트릭스

| 분류                       | 라우트                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **public**                 | `/`, `/status`, `/recommend`, `/analysis`, `/analysis/result`, `/community/list`, `/community/[id]`(읽기), `/share/[token]`, `/(auth)/*` |
| **auth-required**          | `/community/register`, `/profile/**`, `/simulation/**`, `/analysis/simulation/**`, `/chatting/**`, AI 분석 탭 진입                       |
| **role-required(MANAGER)** | (V2 1차 미포함)                                                                                                                          |

**401/만료 동작**

- 만료 access token: 인터셉터가 `POST /auth/token/reissue` 자동 호출 → 원 요청 재시도. **사용자 화면 변화 없음**.
- refresh 만료: 토큰 정리 → `/login?redirect={현재 경로}` + 토스트 "다시 로그인이 필요해요".
- public 화면에서 auth 액션(좋아요/북마크/글쓰기) 클릭: **페이지 이동 없이 인라인 모달** ("로그인이 필요해요" + `로그인` `회원가입`).

#### 3.4 반응형 브레이크포인트

| Name    | 폭        | 변화                                                    |
| ------- | --------- | ------------------------------------------------------- |
| Mobile  | <480px    | 풀 디자인 충실도, 375 베이스라인, 좌우 20px 패딩        |
| Tablet  | 480~768px | 카드 확장, 옵션 사이드 마진                             |
| Desktop | >768px    | 가운데 정렬 컬럼, max-width 약 480~1280px (화면별 결정) |

**Touch target**

- 버튼 사이즈: xlarge(56) / large(48) / medium(40) / small(36)
- 리스트 row: 최소 52px
- 모바일 헤더 액션: 최소 40px, 주요 액션 48px+

### 4. 공통 패턴

#### 4.1 상태 표현 (모든 화면 공통)

| 상태                        | 처리                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Empty (첫 사용)**         | grey700 본문 한 단락(왜 비었는지) + `secondary` 버튼 1개 (blue50 bg, blue500 text). **일러스트 없음**.    |
| **Empty (필터 결과 없음)**  | grey500 캡션 한 줄. 버튼 없음 — 사용자가 필터 직접 리셋.                                                  |
| **Loading (첫 페인트)**     | Skeleton block (`grey100`, 컴포넌트 라디우스에 맞춤, 1.2s shimmer). **금액·지표는 `--`** (skeleton 금지). |
| **Loading (refresh)**       | 상단 풀다운 spinner blue500. **블로킹 오버레이 금지**. 이전 값 유지.                                      |
| **Error (인라인 필드)**     | 인풋 2px red500 border + 그 아래 red500 13px 한 문장 (행동 가능한 카피).                                  |
| **Error (toast)**           | grey900 bg, white 14/400, 3s 자동 dismiss, 하단 20px 인셋. 한 문장. **아이콘 없음**.                      |
| **Error (스크린 블로킹)**   | 서버 outage 전용. white 화면, grey900 16/600 한 줄, blue500 retry 버튼. **일러스트 없음**.                |
| **Success (인라인 플래시)** | 업데이트된 요소 뒤로 blue50 배경 깜빡(300ms fade). 토글 등 routine 액션.                                  |
| **Disabled**                | 버튼 opacity 다운. 인풋 border는 `grey200` 유지(geometry stable).                                         |
| **Loading inside button**   | 텍스트 → 3-dot white 애니메이션 교체. **버튼 폭 변경 없음**. 더블 submit 방지.                            |

#### 4.2 토스트 / 다이얼로그

**Toast 위치**
화면 하단 중앙, 20px 인셋, `motion-fast / ease-enter`로 등장, 3s 후 `motion-fast / ease-exit`.

**Confirm Dialog**

- 헤더 (Heading Large, grey900)
- 본문 (Body, grey600)
- CTA: secondary("취소") + primary 또는 danger ("삭제" 등) — **항상 2개**

#### 4.3 AI 비동기 폴링 — 7 UI 상태 (가장 중요)

> 백엔드: `POST /api/v1/ai-reports/commercials/{code}` → 200(CACHED) 즉시 / 202(ACCEPTED) jobId → `GET /api/v1/ai-reports/jobs/{jobId}` 폴링.
> **디자이너는 아래 7상태를 각각 별도 시안으로** 그릴 것.

```
idle → submitting → ┬── cached (200)        → completed
                    └── accepted (202)      → queued → running → ┬── completed
                                                                  └── failed
                                                                  └── timeout
```

| 상태           | 트리거                        | 화면 표현                                                      | 카피                                                          |
| -------------- | ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| **idle**       | AI 탭 첫 진입 전              | 비활성 카드 + primary 버튼                                     | `AI에게 이 상권을 분석시켜 보세요` / 버튼: `AI 분석 시작하기` |
| **submitting** | POST 요청 중 (~500ms)         | 버튼 spinner                                                   | `분석 요청 중…`                                               |
| **cached**     | 응답 200                      | 결과 카드 220ms fade-in + 캡션 배지                            | `5분 전 생성된 분석` (상대 시간)                              |
| **queued**     | 202 → status `PENDING`        | step-bar 4단(`수집 → 분석 → 작성 → 완료`) 1단 활성 + dot pulse | `분석 준비 중이에요`                                          |
| **running**    | status `RUNNING`              | step-bar 2~3단 활성 + 타이핑 dot                               | `AI가 분석 중이에요. 보통 10~30초 걸려요.`                    |
| **completed**  | status `COMPLETED`            | 결과 카드 5블록 fade-in + "방금 생성됨" 캡션                   | (결과 본문)                                                   |
| **failed**     | status `FAILED` 또는 4xx      | red 알림 카드 + retry 버튼                                     | (ErrorCode 매핑 표 참조)                                      |
| **timeout**    | 60초 폴링해도 PENDING/RUNNING | grey 알림 카드 + retry 버튼                                    | `분석에 시간이 오래 걸려요. 잠시 후 다시 시도해주세요.`       |

**결과 카드 5블록 구조**

1. **한 줄 요약** (`summary`) — Heading Large 22px, 강조
2. **강점** — green 액센트 + 체크 아이콘
3. **약점·위험** — orange 액센트 + 경고 아이콘
4. **추천 업종 / 시간대** — chip 리스트
5. **다음 행동 제안** — bullet 리스트 + `북마크` `비교에 추가` CTA

**ErrorCode 카피 매핑**

| 코드                | 사용자 카피                                                 |
| ------------------- | ----------------------------------------------------------- |
| `AI_001`            | 분석 데이터를 불러오지 못했어요.                            |
| `AI_002` / `AI_003` | AI 분석이 일시적으로 중단됐어요. 잠시 후 다시 시도해주세요. |
| `AI_005`            | (사용자 노출 X — 자동 재제출)                               |
| `AI_009`            | 분석에 시간이 오래 걸려 중단됐어요. 다시 시도해주세요.      |

**비교/자치구/행정동 AI 리포트**
비동기 미적용(레거시 동기 GET). **submitting → completed** 2단만 사용. 응답 3~30초 → skeleton + `AI가 분석 중이에요` 카피 필수.

#### 4.4 인증 모달 (auth-required 액션 트리거 시)

- 헤더: `로그인이 필요해요` (Heading Large)
- 본문: `이 기능을 사용하려면 로그인해주세요.` (Body, grey600)
- CTA: `로그인` (primary) / `회원가입` (secondary) / X 닫기

### 5. 화면별 사양

> 각 화면 = 목적 / 레이아웃 / 핵심 컴포넌트·데이터 / 상태(empty·loading·error·success) / 마이크로 카피

#### 5.1 (auth) 그룹

**S-AUTH-1. `/login`**

- **목적**: 이메일/비번 + 소셜 로그인
- **레이아웃**: 중앙 정렬 카드(420px). 로고 → 폼 → 소셜 버튼 → 푸터 링크.
- **컴포넌트**: TextField(email), TextField(password, show toggle), Checkbox(자동 로그인), Button(`로그인`, primary, full), Divider("또는"), SocialButton × 2(Kakao 노란색 가이드 / Google).
- **상태**: 인라인 검증, 401 → 인풋 하단 `이메일 또는 비밀번호가 올바르지 않아요`.
- **호출**: `POST /api/v1/auth/login`.

**S-AUTH-2. `/register`**

- **목적**: 회원가입 1단계 (이메일 + 인증코드 + 비밀번호)
- **레이아웃**: 단계 표시(1/2) + 폼.
- **컴포넌트**: TextField(email), Button(`인증코드 받기`, secondary), TextField(인증코드), TextField(password + 강도 미터), TextField(password 확인).
- **인라인 에러**: `이메일 형식이 맞는지 확인해주세요`, `이미 가입된 이메일이에요`, `8자 이상, 영문·숫자를 섞어주세요`, `비밀번호가 같지 않아요`.

**S-AUTH-3. `/register/general`**

- **목적**: 회원가입 2단계 (닉네임 + 약관 동의)
- **컴포넌트**: TextField(닉네임 + 중복 체크), Checkbox 4개(필수 2 + 선택 2), Button(`가입 완료`, primary, disabled until 필수 동의).

**S-AUTH-4. `/account-deleted`**

- **목적**: 탈퇴 완료 안내(정적)
- **레이아웃**: 중앙 텍스트 + `홈으로` 버튼.
- **카피**: `탈퇴가 완료됐어요`, `이용해주셔서 감사했어요`.

**S-AUTH-5. `/member/loading/[provider]`**

- **목적**: OAuth 콜백 처리 + 신규 가입자 닉네임 단계
- **레이아웃**: 중앙 spinner + `잠시만 기다려주세요`. 신규면 닉네임 입력 시트.

#### 5.2 (shell) Home & Discovery

**S-HOME. `/` (홈)**

- **목적**: 자치구 grid + 추천 진입 + 빠른 액션
- **레이아웃**:
  - Hero: H1 (Display Large 26px) `오늘은 어디서 시작해볼까요?` + 한 줄 설명 + primary CTA `추천 받기` (1개만).
  - 섹션 1: **자치구 TOP10** (가로 스크롤 카드). 각 카드: 자치구명, 종합 점수(700/tabular-nums), 상승/하락 배지(↑↓→), `자세히 보기` 보조 액션.
  - 섹션 2: 빠른 분석 진입 (3~4개 row): `업종으로 추천 받기` `상권 분석` `시뮬레이션` `커뮤니티`.
  - 섹션 3: 최근 본 상권 (로그인 사용자만, 없으면 숨김).
- **호출**: `GET /api/v1/districts/top-ten`, `GET /api/v1/map/districts` (lite).
- **상태**: loading → 자치구 카드 6칸 skeleton. error → 토스트.
- **금지**: 마케팅 hero 그라디언트, decorative glow, glass panel.
- **예외(승인 2026-08-10)**: 랜딩 히어로(`/`)의 "떠 있는 분석 창" 카드(`src/components/home/hero-window.tsx`의 `WindowCard`, `hero-glass.ts`의 `glassSurface`, `hero-section.tsx`의 `DockButton`)에 한해 `backdrop-filter` 글래스를 허용한다. 창(window) 은유를 위한 기능적 표현이며, 다른 화면·마케팅 배너로 확산 금지.

**S-DISC-1. `/recommend`**

- **목적**: 업종/프리셋 기반 추천 결과
- **레이아웃**:
  - 상단 폼 카드: 자치구 Combobox + 업종 Combobox + 프리셋 SegmentedControl(6종) + Button `추천 받기`.
  - 결과: rank 카드 그리드(데스크탑) 또는 리스트(모바일). 각 카드: rank 배지, 상권명, compositeScore + grade 배지, reasonTags chip 3개, 미니 KPI 4(매출·유동·점포·거주), `상세 보기` CTA, ★북마크.
- **호출**: 1) `GET /api/v1/map/candidate-presets` 2) `GET /api/v1/commercials/candidates` 또는 `/recommendations/by-service`.
- **상태**: loading → 카드 6칸 skeleton. empty → `조건에 맞는 상권이 없어요. 프리셋을 바꿔보세요.` + 프리셋 chip.

**S-DISC-2. `/analysis`**

- **목적**: 분석 진입 — 자치구·행정동·업종·분기 선택
- **레이아웃**: 단계별 폼 카드. 각 단계 완료 시 다음 단계 펼침. 마지막에 `분석 시작` primary CTA.
- **컴포넌트**: 자치구 Combobox → 행정동 Combobox → 업종 Combobox → 분기 Select(기본 `2023년 3분기`).
- **호출**: `GET /districts`, `GET /map/administrations`, `GET /regions/code-lookup`(자동완성).

**S-DISC-3. `/analysis/result`**

- **목적**: 분석 결과 — 한 상권의 모든 데이터
- **레이아웃**:
  - 헤더: 상권명 + 위치 + ★북마크 + `비교에 추가` + `공유`.
  - 메타 배지 row: `2023년 3분기 기준`, `활성화 상권`, `30대 주요 상권`, `저녁 장사가 강한`(있을 때).
  - **Tabs (sticky)**: `요약 / 유동인구 / 매출 / 점포 / 시설 / 거주 / 소득 / 트렌드 / 벤치마크 / AI 분석`.
  - 본문: 탭별 차트 + 인사이트 카드.
  - 우측 사이드(데스크탑) 또는 하단(모바일): **3계층 비교** — "우리 상권 vs 행정동 vs 자치구" 미러 막대.
- **탭별 데이터**:
  - 요약: KPI 그리드 6칸 (매출·유동·점포·유사업종·거주·소득) + 미니 도넛(개·폐업률).
  - 유동인구: 시간대 6단 막대 + 요일 막대 + 연령 막대 + 성별 도넛.
  - 매출: 같은 구조 + 매출 vs 유사업종.
  - 점포: 개·폐업률, 평균 운영기간, 신생률.
  - 시설: 학교/관공서/지하철/버스 카운트(아이콘 + 숫자).
  - 거주: 인구 피라미드.
  - 소득: 평균 소득·지출 + 분포.
  - 트렌드: 분기별 라인 + `trendDirection` 배지(↑↓→) + changeRate 라벨.
  - 벤치마크: 동일 자치구 평균과 z-score 막대.
  - **AI**: §4.3 7상태 폴링.
- **호출**: 탭은 lazy load. AI 탭은 auth 필수 — 비로그인 시 잠금 카드 + `로그인하고 분석 보기` CTA.

#### 5.3 (shell) Simulation & Share

> 시뮬레이션 BE는 V2 계약(`/api/v1/simulations/**`)으로 확정됐다. 계약 정본은
> `backend/docs/simulation-frontend-guide.md`와 세부 명세 `docs/features/simulation/simulation-report.md`다.
>
> ⚠️ **이 절은 2026-08-26에 V2 계약에 맞춰 정정됐다.** 이전 판이 요구했던 인건비·재료비·예상 매출 **입력**,
> 예상 **월 순익**, **손익분기점**, **회수 기간**, 월별 **누적 손익 라인**, **민감도 분석(±10%)** 은
> 모두 삭제했다. V2에 그 원천 데이터가 없고, FE가 없는 지표를 계산해 만들어내지 않는다.
> V2가 실제로 주는 것은 **총 창업 비용 / 비용 구성 / 권리금(총비용 미포함) / 유사 프랜차이즈 Top 5 /
> 성별·연령 매출 / 성수기** 뿐이다.

**S-SIM-1. `/simulation` 및 `/analysis/simulation`** — 입력 마법사

- **목적**: 창업 조건 4가지를 모아 예상 **총 창업 비용**을 계산한다. 손익이 아니라 **초기 비용** 화면이다.
- **레이아웃**: 단계별 폼 4단계 + 상단 진행 indicator(4칸 고정, `완료`/`현재`/`잠금` 3상태. 앞 단계가 비면 잠금).
- **단계**: ① 창업 형태(프랜차이즈 / 개인) → ② 자치구(25) → ③ 업종(지원 30종) → ④ 매장 조건(크기·층).
  ③이 브랜드 검색보다 **앞서는 것은 계약상 강제**다 — 브랜드 검색이 `serviceCode`를 필수로 받는다.
- **컴포넌트**:
  - 선택지는 전부 **칩 격자**(최소 44px, 선택 시 primary 테두리·`primary100` 배경·우상단 체크). 상권분석 선택 패널과 같은 관용구.
  - 브랜드 검색: TextField(돋보기 leftSlot) + 결과 행 리스트 + `더 보기` secondary 버튼. 커서 페이징 10건씩 누적, 마지막 페이지면 버튼 숨김.
  - 매장 크기: 프리셋 3칩(`소형`/`중형`/`대형`, **㎡·평 병기**) + `직접 입력 (㎡)` TextField(tabular-nums, 임의 양수 허용) + 평 환산 caption.
  - 층 구분: `1층` / `1층 외` 2칩. **자유 입력을 두지 않는다** — 정의되지 않은 enum이 본문에 들어가면 백엔드가 `dataHeader` 봉투 없는 400을 내려 화면이 원인을 안내할 수 없다.
  - 하단 Button row: `이전`(secondary) / `다음`(primary) — 마지막 단계에서만 `계산하기`(primary, 계산기 아이콘).
- **비노출**: 기간(분기) 선택지를 얹지 않는다. 서버 기본값(2023년 3분기)을 쓰고 기준 분기는 리포트에만 표기한다.
- **상태**: 계산은 **동기 1회**다 — 폴링·SSE가 없으므로 §4.3의 7상태 폴링 UI를 쓰지 않는다. 로딩은 `계산하기` 버튼 인라인 스피너 **한 번**.
- **오류**: 404 계열은 **재시도 버튼 없이** 서버 문구 + 해당 단계로 되돌리는 CTA(`자치구 다시 선택` 등). 5xx·무응답은 `다시 시도` 버튼. 요청 검증 실패는 필드별 문구를 폼에 붙인다.
- **결과 무효화**: 조건을 고치면 앞 계산 결과·오류 배너를 **내린다.** 바뀐 조건 아래 남은 숫자는 오독을 부른다.
- **인증**: 계산은 공개다. 로그인은 **저장 시점에만** 유도한다.
- **분석 컨텍스트** (`/analysis/simulation`): 상단에 **sticky 카드** — 분석에서 가져온 자치구·업종 badge + `분석으로` 링크. 컨텍스트가 없으면 카드 없이 `/simulation`과 동일하게 동작한다.

**S-SIM-2. `/simulation/report` 및 `/analysis/simulation/report`** — 결과 리포트

- **목적**: 예상 **총 창업 비용**과 그 구성, 그리고 판단에 쓸 상권 참고 지표.
- **금액 단위는 전부 만원**이다. 표기는 `N억 M만원`(`formatLargeWon`). 원 단위 포매터를 쓰면 1만 배 틀린다.
- **레이아웃**:
  - 헤드라인: 예상 총 창업 비용(Display Large 30, tabular-nums) + 조건 요약(자치구·업종·브랜드·면적·층).
  - 기준 안내문 **필수**: `{연도}년 기준 데이터로 계산된 결과입니다.` 밝히지 않으면 최신 시세로 오인된다.
  - 비용 구성: 월 임대료 / 보증금(월 임대료 10개월분) / 인테리어 / 가맹 부담금 → 도넛 또는 표.
    가맹 부담금은 **프랜차이즈만**. 값이 없으면(`null`) 항목을 숨기고, **`0`은 "0원"으로 표기**한다.
  - 권리금 카드: 유 비율(%) / 평균(만원) / ㎡당(만원). **총비용에 포함되지 않는다 — `참고` 배지 필수.**
  - 유사 예산 프랜차이즈 Top 5: 브랜드별 총비용·가입비·교육비·가맹보증금·기타·인테리어. 모바일은 가로 스크롤 컨테이너.
  - 고객 참고(성별·연령): 성별 매출 비중 도넛 + 연령 Top 3 막대. **집계 범위가 사용자 점포가 아니라 `{자치구} {업종} 전체`**이므로 범위 라벨을 제목·축에 반드시 붙이고 수치는 **억 단위로 축약**한다.
  - 성수기: 성수기·비성수기 월 배지.
  - 고객 참고·성수기 섹션에 **기준 분기**를 표기한다(예: `2023년 3분기 기준`).
- **결측**: 성별·연령·성수기는 데이터가 없으면 `null`로 온다. **성공 응답 안의 결측이므로 해당 섹션만 숨기고 오류 UI·재시도 버튼을 띄우지 않는다.**
- **없는 항목**: V1의 `월 최소 목표 매출`은 보증금을 잘못 표기한 것이었다. 되살리지 않는다.
- **CTA**: `저장`(비로그인은 이 시점에만 로그인 유도) + `비교에 추가`. **공유 CTA는 없다** — S-SIM-4 참조.

**S-SIM-3. `/simulation/compare` 및 `/analysis/simulation/compare`** — A/B 비교

- **목적**: 두 창업 조건의 초기 비용을 같은 기준으로 나란히 본다.
- **호출**: 서버 비교 API가 **없다.** 같은 계산 엔드포인트를 두 조건으로 **2회 병렬 호출**한다.
- **부분 성공 금지**: 한쪽이 실패하면 한쪽만 보이는 "비교"가 사용자를 오도하므로 전체 실패로 처리하고 오류 UI를 **하나만** 띄운다.
- **레이아웃**: 좌우 카드(미러) + 총비용·비용 항목 미러 막대. 모바일은 세로 스택.
- **강조 규칙**: 비교 가능한 지표는 총 창업 비용과 그 구성뿐이다. "승자" 강조는 **총 창업 비용이 낮은 쪽**에만 쓰고, 비용이 낮은 것이 곧 더 나은 선택이라는 오해를 부르지 않게 중립 문구를 함께 둔다(수익 지표가 없다).

**S-SIM-4. `/share/[token]`** — 공유 리포트

- **시뮬레이션 공유는 미지원이다.** 백엔드 `ShareTargetType`에 시뮬레이션 상수가 없으므로 시뮬 리포트에 공유 CTA를 그리지 않는다.
- 이 화면은 공유를 지원하는 대상(상권분석 등)만 다룬다.
- **레이아웃**: 대상 리포트 본문 + 상단 작은 알림(`이 리포트는 공유 링크로 열어본 거예요`) + 하단 `나도 시작하기` CTA(가입 유도, secondary).
- **상태**: loading skeleton, 만료 → `이 링크는 만료됐거나 잘못됐어요` + `홈으로` 버튼.

#### 5.4 (shell) Community

**S-COM-1. `/community/list`**

- **목적**: 피드(전체/카테고리/상권별) + 검색
- **레이아웃**:
  - 상단 sticky 헤더: 검색 인풋(돋보기 아이콘) + 필터 chip row(`전체` `자치구별` `행정동별` `상권별`) + 정렬 토글(`최신` `인기`).
  - 본문: 카드 리스트(카드: 작성자 아바타 + 닉네임 + 시간, 제목 16/600, 본문 2줄 14/400 grey600, 좋아요·댓글·조회수 카운트 13/400 grey500, 대상 chip).
  - FAB(우하단): `글쓰기` (auth-required → 미로그인 시 인증 모달).
- **무한 스크롤**: `lastPostId` 커서.
- **호출**: `GET /api/v1/community/posts`, 검색 시 `GET /community/posts/search`.
- **상태**: loading → 카드 5칸 skeleton. empty(검색결과없음) → `조건에 맞는 글이 없어요`. empty(첫방문) → `아직 글이 없어요. 첫 글을 남겨보세요.` + 글쓰기 CTA.

**S-COM-2. `/community/[communityId]`**

- **목적**: 게시글 상세 + 댓글 + 좋아요 + 신고
- **레이아웃**:
  - 본문: 작성자 정보 + 제목(Heading Large 22) + 본문 + 첨부 chip(상권/자치구).
  - 액션 바: 좋아요(♥ + 카운트) / 공유 / 더보기(메뉴: 신고 / 작성자만 수정·삭제).
  - 댓글 섹션: depth 1 트리. 부모 댓글 클릭 → 대댓글 입력 inline 펼침. 댓글: 닉네임, 시간, 본문, 좋아요(❤ + 카운트), 더보기.
- **호출**: `GET /community/posts/{id}` (조회수+1), `GET /community/posts/{id}/comments`, `POST .../likes`, `POST .../comments`, `POST /community/reports`.
- **신고 모달**: Confirm + 사유 TextField + 제출.

**S-COM-3. `/community/register` (작성·수정 겸용)**

- **목적**: 글쓰기 또는 수정 (`?id=` 시 수정, `?from=compare&left=&right=` 시 비교 초안 자동 채움)
- **레이아웃**: 대상 선택 dropdown(전체/자치구/행정동/상권) + 제목 TextField + 본문 textarea(plain + 줄바꿈) + Button(`저장`, primary).
- **비교 초안**: 진입 시 `POST /community/posts/drafts/commercial-comparisons` 호출 → 제목·본문 자동 입력 → 사용자 수정 → `POST /community/posts`.

#### 5.5 (shell) Chatting

> ⚠️ 채팅도 V2 BE 미정. STOMP WebSocket + Firebase FCM 의존.

**S-CHT-1. `/chatting/list`**

- **레이아웃**:
  - 좌측(데스크탑) 또는 단일(모바일): 채팅방 리스트 + 검색 + `+` 만들기 FAB.
  - 룸 카드: 아바타, 룸 이름, 최근 메시지 1줄, 미읽음 배지, 시간.
- **상태**: empty → `참여 중인 채팅방이 없어요` + `채팅방 만들기` CTA.

**S-CHT-2. `/chatting/[roomId]`**

- **레이아웃**:
  - 헤더: 룸 이름 + 인원 + `←` 뒤로.
  - 메시지 영역: 시간순. **내 메시지만 blue interactive surface(`blue50` 또는 `blue500` 본문은 white) 허용**, 상대 메시지는 white 또는 grey100 surface.
  - 입력바: 48px height, 좌측 `+`(첨부), 중앙 TextField, 우측 send 아이콘 버튼(blue500).
- **연결 상태 표시**: 상단 sticky 알림 — `연결 중…` (yellow) / `연결이 끊겼어요. 다시 시도 중…` (red).

#### 5.6 (shell) Profile

**S-PRO-1. `/profile/settings`**

- **목적**: 마이페이지 진입점
- **레이아웃**: 프로필 카드(아바타, 닉네임, 이메일, 가입일) + 빠른 통계(북마크 N개, 좋아요 N개, 작성 글 N개) + 메뉴 리스트(편집·비밀번호·탈퇴).
- **호출**: `GET /api/v1/members/me`.

**S-PRO-2~4. `/profile/settings/{edit, change-password, withdraw}`**

- 공통: 폼 카드 + Button(`저장`, primary) + Button(`취소`, ghost).
- **edit**: 닉네임, 아바타 업로드(파일 picker), 자기소개 textarea.
- **change-password**: 현재 → 새 → 확인 + 강도 미터.
- **withdraw**: 안내 문단 + 동의 Checkbox + 사유 Select(선택) + Button(`탈퇴`, danger). 클릭 시 confirm 다이얼로그.

**S-PRO-5. `/profile/bookmarks` (탭 진입점)**

- 상단 Tabs: `분석 / 추천 / 시뮬레이션`. 각 탭은 `/profile/bookmarks/{analysis,recommend,simulation}`.

**S-PRO-6~8. `/profile/bookmarks/{analysis, recommend, simulation}`**

- **레이아웃**: 필터 chip(전체/상권/행정동/자치구) + 카드 그리드(또는 리스트). 카드: 대상 정보 + 저장 시간 + ✕ 삭제 + 클릭 시 해당 상세로 이동.
- **호출**: `GET /api/v1/members/me/bookmarks` (커서 페이지네이션).
- **empty**: `★를 눌러 관심 항목을 저장해 보세요` + `지금 추천 받기` CTA.

#### 5.7 (shell) System

**S-SYS-1. `/status`**

- **목적**: 시스템/배치 상태 페이지(공개)
- **레이아웃**: 서비스별 상태 row (서비스명 + 상태 dot + 최근 업데이트 시간). 상태: `정상`(green dot) / `점검 중`(yellow) / `장애`(red).

**S-SYS-2. 에러 화면 (404 / 403 / 5xx)**

- 중앙: H1 (Heading Large), 한 줄 설명, primary 버튼(`홈으로`).
- 5xx: + `잠시 후 다시 시도해주세요. 문제가 계속되면 문의` + 메일 링크.
- **일러스트 없음**.

### 6. UX 카피 사전

#### 6.1 토스트

| 이벤트             | 카피                                         | 톤      |
| ------------------ | -------------------------------------------- | ------- |
| 북마크 저장        | `관심 항목에 저장했어요`                     | success |
| 북마크 중복(409)   | `이미 저장된 항목이에요`                     | info    |
| 북마크 삭제        | `삭제했어요`                                 | success |
| 게시글 작성        | `글이 등록됐어요`                            | success |
| 게시글 수정        | `수정했어요`                                 | success |
| 게시글 삭제        | `글을 삭제했어요`                            | success |
| 신고 접수          | `신고가 접수됐어요. 운영자가 확인할게요.`    | info    |
| 로그아웃           | `로그아웃했어요`                             | info    |
| 토큰 만료          | `다시 로그인이 필요해요`                     | warning |
| 비번 변경          | `비밀번호를 변경했어요`                      | success |
| 네트워크 오류 일반 | `잠시 연결이 불안정해요. 다시 시도해주세요.` | error   |

좋아요·댓글·검색은 토스트 없음 (UI에 즉시 반영).

#### 6.2 폼 인라인 에러

| 케이스      | 카피                                     |
| ----------- | ---------------------------------------- |
| 이메일 형식 | `이메일 형식이 맞는지 확인해주세요`      |
| 이메일 중복 | `이미 가입된 이메일이에요`               |
| 비번 미일치 | `비밀번호가 같지 않아요`                 |
| 비번 강도   | `8자 이상, 영문·숫자를 섞어주세요`       |
| 닉네임 중복 | `이미 사용 중인 닉네임이에요`            |
| 필수 미입력 | `필수 항목이에요`                        |
| 로그인 실패 | `이메일 또는 비밀번호가 올바르지 않아요` |

#### 6.3 Confirm 다이얼로그

| 액션        | 헤더                  | 본문                                      | CTA                          |
| ----------- | --------------------- | ----------------------------------------- | ---------------------------- |
| 게시글 삭제 | `글을 삭제할까요?`    | `삭제하면 되돌릴 수 없어요`               | `삭제`(danger) / `취소`      |
| 댓글 삭제   | `댓글을 삭제할까요?`  | `삭제하면 되돌릴 수 없어요`               | `삭제`(danger) / `취소`      |
| 신고        | `이 글을 신고할까요?` | `운영자가 검토 후 처리할게요`             | `신고하기`(primary) / `취소` |
| 로그아웃    | `로그아웃할까요?`     | (없음)                                    | `로그아웃` / `취소`          |
| 회원 탈퇴   | `정말 탈퇴할까요?`    | `데이터는 즉시 삭제되며 복구할 수 없어요` | `탈퇴`(danger) / `취소`      |

#### 6.4 데이터 표기 컨벤션 (필수)

| 종류                | 표기                                                             |
| ------------------- | ---------------------------------------------------------------- |
| 매출/금액           | `1,240,000원` (정확) — 요약 컨텍스트만 `124만원` 허용            |
| 인원                | 상세: `1,240,000명` / 요약: `124만명`                            |
| 분기 (`periodCode`) | `20233` → `2023년 3분기`                                         |
| 등급                | `HIGH/MEDIUM/LOW` → `높음/보통/낮음`                             |
| 트렌드              | `INCREASE/DECREASE/STAGNANT` → `↑ 상승` / `↓ 하락` / `→ 정체`    |
| 시간대              | `peakSalesTimeSlot` `17시~21시` → `저녁 장사가 강한 상권` (배지) |
| 연령대              | `dominantSalesAgeGroup` `30대` → `30대 주요 상권` (배지)         |
| 활성/위축           | `openingRate > closureRate` → `활성화 상권` / 반대 → `축소 상권` |
| 상대 시간           | `5분 전`, `방금 전`, `어제`, `2일 전`, `2026.04.20` (1주 초과)   |

**숫자는 모두 tabular-nums + 700 weight (지표·금액·점수)**. 통화 단위(`원`)는 400 weight로 작게.

### 7. 사용자 여정 (5개 critical paths)

**J1. 처음 방문자 → 추천 → 북마크**

1. `/` → 자치구 grid 또는 `추천 받기` CTA → `/recommend`
2. 프리셋(`청년창업형`) 선택 → 결과 카드 리스트
3. 1순위 카드 클릭 → `/analysis/result?code=...`
4. ★북마크 → 인증 모달 → `/login?redirect=...` → 로그인 → 자동 저장 → 토스트
5. AI 탭 → §4.3 폴링 → completed → 결과 5블록

**J2. 분석 → 시뮬레이션 → 저장**

1. `/analysis` 자치구·업종 선택 → `/analysis/result`
2. `시뮬레이션` 탭/CTA → `/analysis/simulation` (분석 컨텍스트 보존 — 자치구·업종 프리필)
3. 4단계 입력 → `계산하기`(동기 1회) → `/analysis/simulation/report`
4. `저장` → 비로그인이면 로그인 유도 → 저장 후 `/profile/bookmarks/simulation`에서 다시 본다

> 이전 판의 4단계는 `카카오톡 공유 → /share/[token]`이었다. 시뮬레이션 공유는 백엔드
> `ShareTargetType`에 상수가 없어 **미지원**이므로 저장 흐름으로 정정했다(S-SIM-4).

**J3. 비교 분석 → 커뮤니티 글쓰기**

1. `/analysis/result` AI 결과 → `커뮤니티에 공유` 버튼
2. `/community/register?from=compare&left=...&right=...` 진입
3. 백엔드 초안 자동 채움 → 사용자 수정 → `POST /community/posts` → `/community/[id]`

**J4. 신고**

1. `/community/[id]` 더보기 → 신고 모달 → 사유 → 제출 → 토스트
2. (운영자 처리 화면은 V2 1차 미포함)

**J5. 채팅 (BE 미정 — UI만)**

1. `/chatting/list` → 검색 또는 `+` 생성 → `/chatting/[roomId]`
2. STOMP 연결 → 메시지 송수신 (slide-in 애니메이션)
3. FCM 푸시: 백그라운드 알림(브라우저 native).

### 8. Out of Scope (V2 1차 제외 — 그리지 말 것)

- **풀스크린 지도 + Kakao Map 폴리곤 히트맵** (`/map` 류) — Kakao Map SDK 미이식. 자치구 grid + bar metric으로 1차 대체.
- **상권/자치구/행정동 단독 상세 라우트** (`/commercials/:code`, `/districts/:code`, `/administrations/:code`) — `/analysis/result` 안에서 통합 처리.
- **두 상권 비교 단독 화면** (`/compare?left=&right=`).
- **운영자 신고 대시보드** (`/admin/reports`).
- **다크 모드** (토큰 구조만 분리).
- **다국어** (한국어 단일).
- **알림 센터**.
- **모바일 BottomNav** (1차는 상단 헤더 only).
- **Toss Product Sans** 자산 (Pretendard로 대체).

### 9. 디자이너 산출물 체크리스트

#### 9.1 디자인 시스템 페이지 (1순위)

- [ ] 컬러 팔레트 페이지 (Primary / Semantic / Neutral / Score / Overlay)
- [ ] 타이포 스케일 페이지 (10단)
- [ ] 스페이싱·라디우스·그림자 페이지
- [ ] 모션 토큰 페이지 (5 duration × 4 easing)
- [ ] 8종 Primitive 컴포넌트 변형 모음 (Button 5×4 size, TextField, Card, Badge, Tabs, Dialog, EmptyState, Skeleton)
- [ ] 보조 컴포넌트 (Toast, Tooltip, Bottom Sheet, Toggle, Combobox, SegmentedControl, Chip, DataTable, Chart wrapper, Avatar)
- [ ] 아이콘 가이드 (lucide-react 예시 24x24)

#### 9.2 화면 시안 (Hi-Fi) — 약 25개

**(auth)**

- [ ] `/login`, `/register`, `/register/general`, `/account-deleted`, `/member/loading/[provider]`

**(shell) Home & Discovery**

- [ ] `/` (홈) — 데스크탑 + 모바일
- [ ] `/recommend` — 입력 + 결과
- [ ] `/analysis` — 단계별 폼
- [ ] `/analysis/result` — 요약 탭 + 트렌드 탭 + AI 탭(§4.3 7상태 모두)

**(shell) Simulation**

- [ ] `/simulation`, `/simulation/report`, `/simulation/compare`
- [ ] `/share/[token]` — 비로그인 전용 뷰

**(shell) Community**

- [ ] `/community/list` — loading/empty/success
- [ ] `/community/[id]` — 본문 + 댓글 트리 + 신고 모달
- [ ] `/community/register` — 일반 + 비교 초안 임포트 케이스

**(shell) Chatting**

- [ ] `/chatting/list`, `/chatting/[roomId]` — 연결 상태 표시 포함

**(shell) Profile**

- [ ] `/profile/settings` + 4개 하위(edit/password/withdraw/bookmarks)
- [ ] `/profile/bookmarks` 탭 3종

**System**

- [ ] `/status`, 404/403/5xx, 인증 모달, confirm 모달, 토스트 모음

#### 9.3 인터랙션 프로토타입 (모션)

- [ ] AI 탭: idle → submitting → queued → running → completed
- [ ] 비교 초안 임포트: `/analysis/result` 공유 → `/community/register` 자동 채움
- [ ] 좋아요 토글 (애니메이션 + 카운트)
- [ ] 무한 스크롤 (커뮤니티 피드 / 북마크)
- [ ] 채팅 메시지 도착 (slide-in)
- [ ] 토스트 등장/소멸 (220ms ease-enter / ease-exit)

### 10. AI 디자이너에게 주는 마지막 노트

1. **단일 컬러 톤**: Toss Blue(`#0ea5e9`) 외 다른 액센트 색은 semantic 용도(green/red/orange)로만. 장식용 블루 사용 금지.
2. **숨 쉴 공간**: 핵심 지표 카드는 항상 주변보다 1.5배 여백. 압축은 cheap해 보임.
3. **One action per screen**: 화면당 primary CTA 1개만. 두 개면 두 화면으로 분리.
4. **이모지·일러스트·그라디언트 금지**. 빈 상태도 일러스트 없이 텍스트 + 1개 행동.
5. **숫자는 타이포그래피**: 700 weight, tabular-nums, 우측 정렬(리스트).
6. **모바일 우선**: 375px 베이스라인. 데스크탑은 가운데 정렬 컬럼 패리티.
7. **`prefers-reduced-motion`**: 모든 motion 토큰 `motion-instant`로 collapse. 슬라이드 → 크로스페이드.
8. **Korean only**. 영문 UI 카피 만들지 말 것.
9. **불확실하면 절제**. NowDoBoss는 의사결정 신뢰가 핵심 가치.

---

## 후속 디자인 과제

> 출처: 구 `frontend/docs/design-redesign-tasks.md`(현재 `frontend/docs/_archive/design-redesign-tasks.md`로 보관). 원문은 `frontend/DESIGN.md`를 정본으로 삼고 (구)`docs/design-guide.md`를 "충돌 시 하위" 레거시 기준으로 다뤘는데, `design-guide.md`가 이번 통합으로 archive되었으므로 그 충돌 규칙은 더 이상 유효하지 않다 — 정본은 이 문서(`DESIGN.md`) 하나뿐이다. 원문 Task 09의 "docs/design-guide.md를 새 기준에 맞춰 갱신하거나 deprecated 문서로 표시한다" 항목은 이번 문서 통합 작업으로 완료된 것으로 간주한다. 원문이 참조하던 `docs/done-checklist.md`는 현재 `frontend/docs/_archive/done-checklist.md`에 있다.
>
> 아래 체크 상태는 2026-07-15 기준 `frontend/src`, `frontend/package.json`에 대한 간이 grep 검증 결과이며, 화면 단위 실사는 Task 09(Visual QA)에서 이어간다. 각 Task의 상세 Target Scope/Required Work/Verification 원문 전체는 archive된 파일에 그대로 남아 있다.

### Non-Goals (유지)

- 백엔드 API 계약을 바꾸지 않는다.
- Next.js route path를 바꾸지 않는다.
- 서버 응답 type, request payload, auth/session 흐름을 바꾸지 않는다.
- 디자인 개편과 기능 리팩터링을 같은 task에서 섞지 않는다.
- 실제 Toss Product Sans 또는 Tossface 폰트 자산을 새로 확보하지 않는다. 현재 repo의 Pretendard를 구현 폰트로 유지한다.

### Global Design Rules — 검증 상태

- [x] Primary `#0ea5e9`, hover `#2272eb`, weak bg `#e8f3ff` 적용 (레거시 `#1549b5`/`#336dd3`/`rgba(21, 73, 181,` 코드 잔존 없음, 2026-07-15 `rg` 검증)
- [x] Radius 스케일을 `4px`/`8px`/`12px`/`16px`/`9999px`로 제한 (`border-radius: (1[7-9]|[2-9][0-9])px` grep 무결과)
- [ ] Shadow가 전 화면에서 단일 black opacity 계열만 사용하는지 — 화면별 실사 필요
- [x] 장식용 gradient/glass 코드 없음 — 2026-07-15 `rg` 검증 기준(전면 재검증은 Task 09에서). 단, 2026-08-10 승인 예외로 `src/components/home/hero-window.tsx`, `hero-section.tsx`에는 히어로 글래스 `backdrop-filter`가 존재한다(같은 디렉터리의 `hero-glass.ts`는 이 두 파일이 공유하는 글래스 표면 스타일인 shadow/border만 정의하며 `backdrop-filter`는 없음) — S-HOME `금지`/`예외` 항목 참고
- [ ] 숫자·금액·지표·count에 `font-variant-numeric: tabular-nums` 전면 적용 — 화면별 실사 필요
- [x] `prefers-reduced-motion: reduce` 대응 — `motion-instant/fast/standard/slow/page`, `ease-enter/exit/standard` 토큰이 `global-styles.ts` 및 `components/ui/*`에서 다수 사용 확인

### Task 01. Foundation — 완료로 보임

- `src/styles/global-styles.ts`, `src/lib/fonts.ts`에 색상/라디우스/모션 토큰 적용 확인.
- 레거시 hex(`#1549b5`, `#336dd3`, `rgba(21,73,181,...)`) 코드 잔존 없음(2026-07-15 `rg` 검증).
- [ ] 잔여: legacy token alias가 남아있다면 제거 여부는 Visual QA(Task 09)에서 재확인.

### Task 02. Common UI Primitives — 완료로 보임

- `frontend/package.json`에 `lucide-react` 의존성 확인.
- `src/components/ui/`에 `button.tsx`, `text-field.tsx`, `card.tsx`, `badge.tsx`, `tabs.tsx`, `dialog.tsx`, `empty-state.tsx`, `skeleton.tsx` 8종 모두 존재.
- [ ] 잔여: 각 화면이 로컬 중복 정의 없이 실제로 이 primitive를 사용하는지는 Task 06/07 대상 화면에서 재확인 필요.

### Task 03. Shell & Navigation — 부분 확인, Manual QA 필요

- `src/components/layout/site-header.tsx`, `site-footer.tsx` 존재 확인.
- [x] Mobile bottom-nav 도입 여부 — [Out of Scope](#8-out-of-scope-v2-1차-제외--그리지-말-것)에서 "1차는 상단 헤더 only"로 이미 확정됨.
- [ ] Header touch target ≥40px(모바일)/48px(주요 액션) 실사
- [ ] Nav active/inactive 상태가 모든 route에서 일관되는지 실사

### Task 04. Auth & Profile — Manual QA 필요

- [ ] `/login`, `/register`, `/register/general`, `/account-deleted` 카드 radius `<20px`, decorative gradient 제거 여부 실사
- [ ] Profile tabs가 공통 Tabs primitive를 사용하는지 확인
- [ ] Empty bookmark state가 "왜 비어 있는지" 한 줄 + 액션 1개 기준을 지키는지 확인

### Task 05. Home — 완료로 보임

- `src/components/home/home-page.tsx`에서 `linear-gradient|radial-gradient|backdrop-filter|glassmorphism` grep 무결과.
- [x] (2026-08-10 갱신) 같은 디렉터리의 `hero-window.tsx`, `hero-section.tsx`는 예외적으로 `backdrop-filter` 글래스를 사용한다 — S-HOME `예외(승인 2026-08-10)` 항목에 정본화됨. `home-page.tsx` 자체는 여전히 grep 무결과.
- [ ] 잔여: 375px 뷰포트에서 첫 화면 overflow 여부는 Task 09 manual QA 대상.

### Task 06. Data Workflows — Manual QA 필요

- [ ] `/status`, `/recommend`, `/analysis`, `/analysis/result`, `/simulation*`, `/share/[token]` — metric typography(700/tabular-nums), skeleton `--` fallback, empty state 카피 실사
- [ ] 필터·탭·셀렉트·칩이 공통 primitive 기준으로 정리됐는지 확인

### Task 07. Community & Chatting — Manual QA 필요

- [ ] Community 카드에 decorative gradient가 남아있지 않은지 확인
- [ ] 채팅 메시지 버블 색상 규칙(내 메시지만 blue, 상대는 white/grey) 실사
- [ ] Chat input height 48px, focus blue, send 아이콘 버튼 실사

### Task 08. Copy, States, Motion — 미완 (금지 문구 잔존)

- 2026-07-16 기준 금지 문구 `문제가 발생했습니다`가 `src/lib/api/response.ts`와 `src/lib/realtime/chat-stomp.ts`에 fallback 문자열로 여전히 남아 있어 이 항목은 완료된 것이 아니다. 해당 fallback 문자열을 수정해야 한다.
- [ ] 잔여: 화면별 empty/loading/error 카피가 [UX 카피 사전](#6-ux-카피-사전)과 완전히 일치하는지는 화면 단위 실사 필요.

### Task 09. Visual QA — 다음 액션 (미완료)

- [ ] 375 / 768 / 1280px 3개 뷰포트에서 아래 Route Checklist 전수 시각 확인:
      `/`, `/login`, `/register`, `/status`, `/recommend`, `/analysis`, `/analysis/result`, `/simulation`, `/simulation/report`, `/simulation/compare`, `/community/list`, `/community/register`, `/chatting/list`, `/profile/settings`, `/profile/bookmarks`
- [ ] Static Search Checklist 재실행 및 결과 기록:

  ```sh
  rg -n "#1549b5|#336dd3|rgba\(21, 73, 181" src app
  rg -n "linear-gradient|radial-gradient|backdrop-filter|filter: blur|box-shadow" src/components app
  rg -n "border-radius: (1[7-9]|[2-9][0-9])px" src/components app
  rg -n "letter-spacing: -" src/components app
  rg -n "font-size: clamp|vw" src/components app
  ```

  - 위 두 번째 명령(`backdrop-filter` 포함)의 `src/components/home` 매치는 승인된 히어로 글래스 예외인 `hero-window.tsx`/`hero-section.tsx`만 예상된다(S-HOME `예외(승인 2026-08-10)` 참고). 그 외 경로에서 새 매치가 나오면 회귀로 간주하고 확인한다.

- [x] `docs/design-guide.md` 갱신/deprecated 표시 — 이번 문서 통합(Task 4)으로 archive 이동 + 이 문서로 흡수 완료.
- [ ] QA 결과를 `frontend/docs/runbook/qa.md` 또는 신규 QA 노트에 기록

### Implementation Notes (유지)

- 작업은 PR 단위로 작게 나눈다. 한 커밋에서 전체 라우트를 리디자인하지 않는다.
- 로컬 스타일 중복을 primitive로 교체하는 작업을 시각적 튜닝보다 먼저 한다.
- 화면이 아직 로컬 스타일을 쓰면, 일회성 색상을 추가하는 대신 전역 토큰을 사용한다.
- 디자인 작업 중 동작 버그를 발견하면, 시각적 완료를 막지 않는 한 별도로 기록한다.
- 디자인 시스템은 시간이 지날수록 더 엄격해져야 한다: Foundation은 임시 alias를 유지할 수 있으나, Visual QA에서는 제거하거나 문서화해야 한다.
