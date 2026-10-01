---
omd: 0.1
brand: BossPickSeoul
---

# Custom Design System (based on Toss)

> **문서 정본 안내 (2026-07-15)**: 이 문서(`frontend/DESIGN.md`)는 BossPickSeoul(NowDoBoss) 프론트엔드 디자인 시스템의 **단일 정본(single source of truth)**이다. 기존에 `frontend/docs/`에 흩어져 있던 3개 문서 — `design-guide.md`(레거시 V1 토큰 가이드), `design-prompt.md`(NowDoBoss V2 화면 사양/디자이너 AI 프롬프트), `design-redesign-tasks.md`(개편 작업 큐) — 를 아래 부록 섹션([토큰](#토큰-legacy-v1-스냅샷--design-guidemd-흡수), [컴포넌트 규칙](#컴포넌트-규칙-design-guidemd-흡수--확장-컴포넌트), [디자인 생성 프롬프트/레퍼런스](#디자인-생성-프롬프트레퍼런스), [후속 디자인 과제](#후속-디자인-과제))로 통합했다. 원본 3개 파일은 삭제되지 않고 `frontend/docs/_archive/`로 이동되어 보관되며, 더 이상 갱신 대상이 아니다. 새 작업과 상충 판단은 항상 이 문서(`DESIGN.md`)를 기준으로 한다.

> **2026-09-11 갱신**: 텍스트를 싣는 파란 채움·색 글자의 AA 대비 결정을 반영했다(blue700/blue800·red700/green700·`--color-text-caption-on-band`). 근거와 계산표는 [contrast-tokens](./docs/features/layout/contrast-tokens.md) D3~D5.

## 1. Visual Theme & Atmosphere

Toss is Korea's fintech super-app that redefined what a financial interface could feel like -- calm, confident, and deceptively simple. The page opens on a clean white canvas (`#ffffff`) with deep charcoal headings (`#191f28`) and a signature blue (`#0ea5e9`) that functions as the universal interactive accent. This isn't the cold, institutional blue of legacy banking; it's a bright, optimistic cerulean that says "your money is in good hands, and we'll make it easy."

The custom **Toss Product Sans** typeface is the quiet hero. Developed with Korean type foundries Sandoll and Leedotype, it was purpose-built for financial contexts: numerals and Latin characters are optically weighted to match Korean hangul proportions, and financial symbols (%, commas, ±) are given enhanced legibility. The font ships in 8 weights (300-950) but the UI exercises restraint, primarily using 400, 600, and 700. The system supports both variable-width numerals for display and fixed-width (tabular) numerals for data tables -- context determines mode. **단, 이 저장소는 Toss Product Sans 를 싣지 않는다.** `public/fonts/` 에는 Pretendard 만 있고 Toss Product Sans 는 폴백 목록에 이름만 있다. 위 서술은 원본 시스템의 설계 의도를 기록한 것이고, **실제 렌더 서체는 Pretendard** 다.

What defines Toss visually is its OKLCH-based color system, rebuilt from scratch for perceptual uniformity. Colors at the same scale level appear equally bright regardless of hue, enabling consistent semantic coloring where blue-500, red-500, and green-500 carry identical visual weight without manual tuning.

**Key Characteristics:**

- Toss Blue (`#0ea5e9`) as the primary interactive color -- bright, optimistic, trustworthy
- Pretendard (Toss Product Sans 는 싣지 않는다 — 폴백 이름만 남아 있다)
- OKLCH color space for perceptual uniformity across all hue scales
- 10-step grey scale (grey50-grey900) with warm undertones
- Three-tier token architecture: primitive → semantic → component
- Minimal shadow system -- trust comes from clarity, not depth
- Mobile-first at 375px design baseline with accessibility scaling up to 310%

## 1.5. Brand Assets

로고 기하의 정본은 `src/lib/brand/mark-geometry.ts` 다. 좌표를 고칠 일이 있으면 그 파일을 고치고, `src/lib/brand/brand-assets.test.ts` 가 정적 SVG 와의 일치를 지킨다. 설계 근거는 `docs/superpowers/specs/2026-09-08-brand-logo-design.md`.

### 심볼

B 이니셜을 **4열 × 7행 모듈 격자**로 재구성한다. `viewBox="0 0 19 34"`, 모듈 `4`, 갭 `1`, pitch `5`, 모서리는 각짐(`rx` 없음). 아래 카운터 2×2 중 **우하단 한 칸**을 강조색으로 채워 "여러 칸 중 하나를 골랐다"는 Pick 의미를 담는다.

**3열의 노치 3칸 `(15,0) (15,15) (15,30)`은 어떤 변형에서도 채우지 않는다.** 채우면 실루엣이 4×7 사각형이 되어 B 가 죽는다.

### 크기별 변형

| 변형    | 크기      | 구성                           |
| ------- | --------- | ------------------------------ |
| Primary | 48px+     | 격자 + 고스트 7칸              |
| Grid    | 34~47px   | 격자, 고스트 없음              |
| Solid   | 33px 이하 | 갭 없음, `viewBox="0 0 16 28"` |

34px 에서 갭이 1px 로 렌더된다. 27px 는 0.79px, 20px 는 0.59px 로 무너진다 — 브라우저 1배율 실측. `resolveMarkVariant(height)` 가 이 규칙을 코드로 들고 있다.

### 컨테이너

정사각, `border-radius = 변 길이 × 0.25`, 심볼 높이 `= 변 길이 × 0.625`. 잉크 바탕 + 흰 심볼이 기본이고 어두운 배경에서는 흰 바탕 + 잉크 심볼로 반전한다.

심볼을 컨테이너 없이 워드마크 옆에 두면 안 된다 — 비례가 0.559 라 텍스트 높이에 맞추면 폭 15px 의 조각이 되어 장식 불릿처럼 보인다. 심볼 단독 사용은 34px 이상에서만 허용한다.

### 워드마크와 락업

`BossPick` **700** + `Seoul` **400**, `letter-spacing: -0.01em`. 13자를 전부 700 으로 두면 덩어리로 뭉친다.

가로형 기본값은 컨테이너 32px + 간격 8px + 워드마크 19px 다. 간격은 컨테이너 변의 25% 이고 최소 여백도 같다. `BrandLockup` 컴포넌트를 쓰고 조판을 호출부에서 다시 주지 않는다.

### 자산 파일

| 경로                            | 용도                     |
| ------------------------------- | ------------------------ |
| `public/brand/mark-primary.svg` | 배포용 Primary 심볼      |
| `public/brand/mark-grid.svg`    | 배포용 Grid 심볼         |
| `public/brand/mark-solid.svg`   | 배포용 Solid 심볼        |
| `app/icon.svg`                  | 파비콘(컨테이너 + Solid) |
| `app/apple-icon.tsx`            | 180×180                  |
| `app/opengraph-image.tsx`       | 1200×630                 |

정적 **락업** SVG 는 없다. `<text>` 는 파일을 여는 사람 컴퓨터에 Pretendard 가 있어야 하고, 글자를 아웃라인 패스로 바꿀 도구가 저장소에 없다. `apple-icon` 과 OG 이미지에 워드마크가 없는 것도 같은 계열의 제약이다 — satori 는 WOFF2 를 지원하지 않고 저장소에는 WOFF2 만 있다. Pretendard TTF/OTF 를 싣는 것이 후속 과제다.

## 2. Color Palette & Roles

### Primary

- **Toss Blue** (`#0ea5e9`): `blue500`. Primary interactive color -- CTAs, links, active states, selection highlights. The workhorse of every tappable element.
- **Blue Hover** (`#2272eb`): `blue600`. Hover/pressed state for blue500 elements.
- **Blue Text** (`#1a5fcc`): `blue700`. 텍스트를 싣는 파란 채움(주 버튼·순위 배지)과,
  밝은 배경 위의 파란 글자에 쓴다. blue500·blue600 은 흰 글자와 각각 2.77 / 4.49 로
  AA(4.5:1)를 넘지 못한다. blue700 은 흰 글자와 **5.91:1**, blue50 위 글자로 **5.26:1**.
- **Blue Text Hover** (`#1757bf`): `blue800`. blue700 채움의 hover/pressed 전용.
  흰 글자와 6.66:1. **blue600 을 이 자리에 쓰지 않는다** — blue700 보다 밝아 역전된다.

> #### ⚠️ `--color-primary-*` 별칭은 명암을 거꾸로 말한다
>
> ```css
> --color-primary-700: var(--color-blue-500); /* #0ea5e9 — 더 밝다 */
> --color-primary-600: var(--color-blue-600); /* #2272eb — 더 진하다 */
> ```
>
> V1 에서는 `primary-700`(`#1549b5`)이 `primary-600`(`#336dd3`)보다 진했다. Toss 개편에서
> 700 → blue500, 600 → blue600 으로 갈아끼우며 **관계가 역전됐다**(아래 「레거시 V1 토큰
> 스냅샷」에 그 매핑이 남아 있다). **이름만 보고 고르면 반대가 된다.**
>
> 역할은 위 두 줄이 이미 정한 그대로다. 별칭으로 옮겨 적으면:
>
> | 별칭                  | 값                | 역할                                                          |
> | --------------------- | ----------------- | ------------------------------------------------------------- |
> | `--color-primary-700` | blue500 `#0ea5e9` | 기본 인터랙티브 — 채움·링크·활성·선택 강조, **그리고 포커스** |
> | `--color-primary-600` | blue600 `#2272eb` | **hover/pressed 전용**                                        |
>
> 그래서 `&:hover { border-color: var(--color-primary-600) }` 는 맞고,
> `&:focus-visible { outline: 2px solid var(--color-primary-600) }` 는 틀렸다 — 포커스는
> hover 가 아니다. 포커스 링은 `--color-primary-700`(= 전역 `:focus-visible` 이 쓰는
> `--color-blue-500`)이고, 링 대신 컨트롤 테두리를 바꾸는 방식이면 `--shadow-focus-primary`
> 를 함께 얹는다.
>
> 아웃라인 링과 테두리형 포커스(`&:focus-visible { border-color: … }`) 모두에 `primary-600`
> 을 쓰지 못하게 `global-styles.test.ts` 가 소스를 스캔해 막는다. 테두리형에 남아 있던
> 커뮤니티 폼 6곳은 #308 에서 700 으로 맞췄다.

- **Blue Light** (`#e8f3ff`): `blue50`. Informational backgrounds, subtle blue-tinted surfaces.
- **Pure White** (`#ffffff`): `background`, `layeredBackground`. Page background, card surfaces.
- **Dark Charcoal** (`#191f28`): `grey900`. Primary heading color, strongest text. Warm near-black with subtle blue undertone.

### Brand (Logo/Marketing Only)

- **Brand Ink** (`#191f28`): `--color-brand-ink`. 심볼 본체와 워드마크. `grey900` 과 같은 값이다.
- **Brand Accent** (`#00795c`): `--color-brand-accent`. 강조 칸 전용. **UI 에서 절대 쓰지 않는다** — `green500`(`#03b26c`)과 계열이 같아 성공·상승 시맨틱과 혼동된다.
- **Brand Ghost** (`#edf0f3`): `--color-brand-ghost`. 고스트 칸 전용. 48px 이상에서만 등장한다.
- **반전 팔레트**: 어두운 배경에서 본체 `#ffffff`, 고스트 `#252d3a`, 강조 `#12a47c`. 강조색을 밝히는 이유는 원래 값(`#00795c`)이 반전 고스트 대비 2.04 로 무너지기 때문이다. 고스트가 `grey800`(`#333d4b`)이 아닌 이유는 그 값이 잉크 배경 대비 1.51 로 **너무 잘 보여** 카운터가 채워진 것처럼 읽히고 B 판독성이 무너지기 때문이다 — 라이트 모드 고스트는 배경 대비 1.14 이고 `#252d3a` 는 1.19 로 그 미묘함을 맞춘다.

### Semantic

- **Error Red** (`#f04452`): `red500`. Error states, destructive actions, negative financial indicators.
- **Error Red Text** (`#c8323f`): `red700`. 빨강을 **글자**로 쓸 때(변화율 배지, 오류 문구).
  토큰은 `--color-red-700`, 증감 글자는 시맨틱 `--color-negative-text`.
  red500 은 흰 배경 위 3.71 로 AA 미달이다. red700 은 흰 배경 5.27 / grey50 5.04 / blue50 4.69.
- **Success Green** (`#03b26c`): `green500`. Positive financial indicators, confirmations.
- **Success Green Text** (`#0b7a52`): `green700`. 초록을 **글자**로 쓸 때.
  토큰은 `--color-green-700`, 증감 글자는 시맨틱 `--color-positive-text`.
  green500 은 2.77 로 미달이다. green700 은 흰 배경 5.36 / grey50 5.13 / blue50 4.77.
  면적 채움(차트 막대·스코어)은 3:1 기준이라 green500/red500 을 그대로 쓴다.
- **Warning Orange** (`#fe9800`): `orange500`. Pending states, attention-needed indicators.
- **Caution Yellow** (`#ffc342`): `yellow500`. Soft warnings, highlight moments.
- **Info Teal** (`#18a5a5`): `teal500`. Informational accent, alternative categorization.
- **Premium Purple** (`#a234c7`): `purple500`. Premium features, special offers.

### Neutral Scale

- **Grey 50** (`#f9fafb`): Lightest gray, `greyBackground` surface.
- **Grey 100** (`#f2f4f6`): Secondary background, card fills, disabled surfaces.
- **Grey 200** (`#e5e8eb`): Default border color, dividers, input backgrounds.
- **Grey 400** (`#b0b8c1`): Placeholder text, disabled icon fills.
- **Grey 500** (`#8b95a1`): Disabled text, decorative dividers. **Not for caption text** — 3.04:1 on white fails the AA bar set below.
- **Grey 600** (`#6b7684`): Caption text, secondary labels. **흰 배경 위에서만** 4.62:1 로
  통과한다. grey50(4.42) · grey100(4.19) · blue50(4.11) 밴드 위에서는 미달이므로
  `--color-text-caption-on-band`(= grey700, 6.33~6.81)를 쓴다.
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

- **Primary**: `Pretendard` (`next/font/local`, `src/lib/fonts.ts`). **KS X 1001 기반 서브셋 가변 1파일**(`PretendardVariable.subset.woff2`, 428.6KiB)로 400 / 500 / 600 / 700 네 무게를 모두 덮는다 — 무게마다 파일을 싣던 방식(전체 글리프 4파일 3,048KiB)을 대체했다. 생성 절차는 [pretendard-subset 명세](docs/features/layout/pretendard-subset.md). 폴백은 `'Toss Product Sans', 'Tossface', 'SF Pro KR', 'SF Pro Display', 'Apple SD Gothic Neo', 'Roboto', 'Noto Sans KR', 'Malgun Gothic', 'system-ui', 'sans-serif'`.
- **Monospace**: `"SF Mono", SFMono-Regular, Menlo, Consolas, monospace`
- **Emoji**: `Tossface` -- Toss's custom emoji font (3500+ emojis, open-source on GitHub)

### Hierarchy

| Role           | Font       | Size  | Weight | Line Height | Letter Spacing | Notes                             |
| -------------- | ---------- | ----- | ------ | ----------- | -------------- | --------------------------------- |
| Display Hero   | Pretendard | 30px  | 700    | 40px (1.33) | normal         | Splash screens, hero moments      |
| Display Large  | Pretendard | 26px  | 700    | 36px (1.38) | normal         | Section headers, key metrics      |
| Heading Large  | Pretendard | 22px  | 700    | 30px (1.36) | normal         | Feature titles, modal headers     |
| Heading        | Pretendard | 20px  | 600    | 28px (1.40) | normal         | Card headings, sub-sections       |
| Subtitle       | Pretendard | 16px  | 600    | 24px (1.50) | normal         | Navigation titles, list headers   |
| Body Large     | Pretendard | 16px  | 400    | 24px (1.50) | normal         | Descriptions, explanations        |
| Body           | Pretendard | 14px  | 400    | 22px (1.57) | normal         | Standard reading text             |
| Body Small     | Pretendard | 13px  | 400    | 20px (1.54) | normal         | Secondary information             |
| Caption        | Pretendard | 12px  | 400    | 18px (1.50) | normal         | Timestamps, fine print            |
| Number Display | Pretendard | 30px+ | 700    | tight       | normal         | Financial amounts -- tabular nums |

### Principles

- **Eight weights, three used**: Ships 300-950, but UI uses 400 (body), 600 (emphasis), 700 (headings). Restraint over variety.
- **Dual numeral modes**: Variable-width for display, fixed-width (tabular) for financial tables and stock tickers. Context determines mode.
- **Korean-Latin optical balance**: Korean characters and Latin/numerals are independently weighted so mixed text looks harmonious without manual kerning.
- **Financial symbol optimization**: %, comma separators, ±, currency symbols, and directional arrows given enhanced legibility at small sizes.

## 4. Component Stylings

### Buttons

**Primary (Fill)**

- Background: `#1a5fcc` (blue700) — 흰 글자 5.91:1
- Text: `#ffffff`
- Hover/Pressed: `#1757bf` (blue800) — 6.66:1

> 2026-09-11 결정: 이전 규격은 `#0ea5e9`(blue500) 채움 + 흰 글자 = **2.77:1** 로 AA 미달이었고,
> 그 해결을 「디자인 시스템 차원의 결정」으로 예약해 두고 있었다. 이 슬라이스에서 **fill 색을
> 어둡게 하는 쪽으로 결정했다.** blue500 은 인터랙티브 색(링크·포커스·선택 강조·테두리)으로
> 그대로 남고, **텍스트를 싣는 채움에서만** blue700 으로 간다.
> 개별 화면이 텍스트 색을 바꿔 이탈하지 않는 규칙은 그대로다.

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
- Text: `#1a5fcc` (blue700) or `#191f28` (grey900)
  — blue50 배경 위에서 blue500 은 2.47, blue600 은 4.00 으로 둘 다 미달이다.
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

### Charts

> 폭 일반 규칙(넓어질 때 무엇이 좋아지는가 · 상한은 요소가 진다)은 §5 「폭 체계」에
> 있다. 여기에는 차트 고유의 수치와 근거만 둔다 — 요소별 상한값은 차트 절에 있는 편이
> 찾기 쉽다.

- **가로 막대는 폭에 상한을 둔다 — 기본 560px.** 막대 두께는 26px(`maxBarSize`)에 묶여
  있는데 길이에 상한이 없으면 넓은 칸에서 가로세로비가 무너진다. 실측으로 `/status`
  「업종별 점포수」가 1016px 칸에서 **약 31:1** 이 됐고, 그 폭에서는 왼쪽 라벨과 오른쪽
  값을 눈으로 잇기 어렵다. **막대 길이 : 두께가 대략 15:1 을 넘지 않게 한다.**
- **가로 막대는 카드 하나를 가로지르게(`full`) 두지 않는다.** 세로 막대·꺾은선·도넛은
  가로가 넓을수록 좋아지지만, 가로 막대는 나빠진다. 같은 폭으로 나란히 둔다.
- 값 라벨은 막대 끝에 붙이고 `tabular-nums` 로 자릿수를 맞춘다.
- 데이터가 없으면 빈 차트를 그리지 않고 "데이터 없음" 문구로 대체한다.
- **라벨 · 트랙 · 값 한 줄로 된 「미터 행」에도 같은 규칙이 적용된다.** 리포트
  「지역별 월 매출 비교」가 full 스팬 안에서 폭 상한 없이 10px 트랙을 써서 1300px
  칸에서 약 **108:1** 이 됐다 — 위 31:1 사례보다 나쁘다. 상한 360px + 두께 14px 로
  약 13:1 이 된다. 얇은 pill 이라 규칙에서 벗어난다고 생각하기 쉬운데, 두께가
  가로세로비의 분모라 오히려 더 빨리 무너진다.

### Inputs & Forms

- Background: `#f2f4f6` (grey100) for contained variant
- **Border: none at rest.** The grey fill already reads as an input; adding a border on top
  is a double treatment and the border ends up floating over the fill. Reserve the border
  for state: focus `2px #0ea5e9`, error `2px #f04452`.
  Keep the resting border at `2px solid transparent` so the box does not shift 2px when a
  state arrives. The `emphasized` variant (fields on low-contrast surfaces) draws a
  `1px` inset ring instead of a border, so it does not read twice as heavy as before.
- Outlined fields (white background — search bars, community forms) keep their `1px` border;
  the double-treatment problem does not apply to them.
- **Focus is one line.** A field that signals focus by changing its border (border →
  `--color-primary-700`, plus `--shadow-focus-primary(-strong)` glow) must switch the global
  `:focus-visible` ring off **inside its focus selector** — `&, &:focus, &:focus-visible { outline: none; }`.
  Otherwise the global ring (`2px`, `outline-offset: 2px`) draws a second blue line outside the
  border with a white gap between them. A class-level `outline: none` is not enough: it has the
  same specificity as the global `:focus-visible` rule and loses on source order. This is a
  choice between two signals, not a removal — the border still turns blue. Fields with no focus
  rule of their own must get this border treatment rather than rely on the ring, because a
  grey border plus an offset blue ring reads as two lines too. `global-styles.test.ts` scans
  styled `input`/`textarea`/`select` for the border-without-ring-off pattern.
- **Radius: 12px** (`--radius-field`). 8px reads square on a 48px-tall field. Buttons, chips
  and tabs stay on `--radius-control` (8px) — 126 call sites share that token, so form
  fields got their own.
- Text: `#191f28`, Placeholder: `#b0b8c1` (grey400)
- Error border: `#f04452` (red500)
- Special: SplitTextField for OTP, SecureKeypad for financial input

### Navigation

- Bottom tab bar: white background, top border `#e5e8eb`
- Active: `#0ea5e9` icon + `#191f28` text, Inactive: `#b0b8c1` icon + `#8b95a1` text
- Top app bar: white, sticky, optional backdrop blur
- **헤더 콘텐츠 폭은 라우트마다 다르게 두지 않는다 — 전 화면 셸 토큰 `var(--w-shell)`.**
  예전에는 페이지 본문 폭에 맞춰 셋으로 갈라져 있어 페이지를 옮길 때마다 로고와 메뉴가
  좌우로 튀었다. 헤더는 본문의 일부가 아니라 앱 전체의 고정 틀이다. **이제 본문도 같은
  셸을 쓰므로 헤더가 기준이 된다** — 폭 판정은 §5 「폭 체계」를 따른다.
- **`html` 에 `scrollbar-gutter: stable`.** 스크롤이 생기는 페이지와 안 생기는 페이지를
  오갈 때 콘텐츠 전체가 스크롤바 폭(실측 15px)만큼 밀린다. 헤더 폭을 통일해도 이건
  남으므로 자리를 항상 예약한다.
- **스크롤바는 6px 이고 스크롤하는 동안에만 보인다.** 막대는 평소 투명하고, 전역
  `ScrollbarReveal`(`src/components/layout/scrollbar-reveal.tsx`)이 스크롤 중인 요소
  (페이지 스크롤은 `body`)에 `data-scrolling` 을 붙이는 동안만 grey400 이 된다. 900ms 멈추면
  뗀다. hover 는 JS 없이도 grey500 으로 보인다. 트랙 폭은 그대로라 나타나고 사라져도
  레이아웃이 밀리지 않고, 위 예약 폭도 6px 로 따라 줄 뿐이다.
- **`scrollbar-width`·`scrollbar-color` 와 `::-webkit-scrollbar` 를 같은 요소에 섞지 않는다.**
  Chromium 은 표준 속성이 지정된 요소에서 의사요소를 통째로 무시해 6px 대신 thin
  기본값(약 11px)을 그린다. 표준 속성은 `@supports not selector(::-webkit-scrollbar)`
  안에서 Firefox 에만 건다. 스크롤바를 아예 숨기는 가로 스크롤 영역은 예외로
  `scrollbar-width: none` + `::-webkit-scrollbar { display: none }` 을 함께 쓴다.
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

### 폭 체계 — 셸과 컬럼

**셸 폭과 컬럼 폭은 다른 것이다.** 셸은 헤더·본문이 공유하는 최외곽 테두리로
**정렬을 결정**하고, 컬럼은 셸 안에서 콘텐츠 유형별 상한으로 **가독성을 결정**한다.
둘을 리터럴 하나로 뭉개면 헤더와 본문이 어긋난다(1920 폭 `/status` 에서 좌우 233px).

- 셸은 전 라우트 공통 `var(--w-shell)` = `calc(100% - 40px)`, **상한이 없다**
- 컬럼은 `--w-read`(720) · `--w-form`(880) · `--w-wide`(1400) 셋뿐이다.
  **새 폭이 필요하면 리터럴이 아니라 토큰을 추가한다**
- **셸은 페이지의 최외곽 컨테이너에만 건다.** 컬럼 토큰을 페이지 컨테이너에 걸면
  리터럴이 토큰으로 바뀔 뿐 어긋남은 그대로다. 셸을 중첩해서 걸면 거터가 두 겹이 된다
- 헬퍼는 `src/styles/layout.ts` 의 `shellWidth` · `centeredColumn(token)` 이다

**넓어질 때 무엇이 좋아지는지는 요소마다 다르다.** 반응형은 좁아질 때를 다루지만,
넓어질 때는 요소별로 따로 정해야 한다. 셸에 상한이 없으므로 **상한은 요소가 진다.**
「반응형이니까 괜찮다」는 좁아지는 방향에만 참이다.

| 넓어질수록 좋아짐                | 무관          | 넓어질수록 나빠짐 — 상한 필수      |
| -------------------------------- | ------------- | ---------------------------------- |
| 지도                             | 아이콘 · 배지 | 가로 막대 → 560px                  |
| 세로막대 · 꺾은선 · 도넛         | 버튼          | 미터 행 → 360px                    |
| 비교표 (열 = 비교 항목)          |               | 읽기 텍스트 → `--w-read`           |
| 카드 그리드 (열 증가, 상한 있음) |               | 리스트 행 (제목과 메타가 멀어진다) |
|                                  |               | 폼 필드 → `--w-form`               |

**상한 없는 `repeat(auto-fit, …)` 은 금지한다.** 열 수에 상한이 없고 CSS 에
`max-columns` 가 없으므로 반드시 폭 상한과 짝지운다. `/status` 지표 그리드가
`minmax(140px, 1fr)` 만으로 2560px 칸에서 18열까지 갔다 — 최소 트랙 폭은 폭주를
막지 못한다.

실측 기록은 [width-system-verification](./docs/features/layout/width-system-verification.md).

**홈(랜딩) 본문은 중앙 그룹이다 — `--w-wide`(1400).** 헤더는 셸 그대로 두고,
히어로를 뺀 본문 섹션(네 도구 보드 · 스토리 · 지금 많이 본 지역 · 벤토)이 모두
`HOME_COLUMN`(`src/components/home/layout-constants.ts`)을 쓴다. 홈 섹션은 짧은 카드·목록·
막대로 되어 있어 넓어져도 좋아지는 요소가 없다. 셸로 열어 두었을 때 1920 에서 보드
카드 한 장이 458px(2560 에서 620px)로 늘어 글이 왼쪽에 몰렸고, 인기지역 막대는 850px 가
됐으며, 스토리만 1400 이라 왼쪽 기준선이 20 → 253 → 20 으로 튀었다. 섹션끼리 기준선을
하나로 맞추는 것이 헤더와 맞추는 것보다 중요하다 — 스크롤하는 동안 눈에 들어오는 것은
섹션 사이의 어긋남이다. 헤더(로고 x=20)와의 차이는 남는다. 전폭 배경 밴드가 이 차이를
「넓은 판 위의 컬럼」으로 흡수하는 곳은 스토리뿐이고, 나머지 세 섹션은 흰 페이지 위에
그대로 놓인다(2026-09-29).

### Whitespace Philosophy

- **Breathing room for money**: Financial numbers get extra surrounding space. A balance at 30px with 32px margins communicates security through spaciousness.
- **Progressive density**: Summary screens are spacious; detail/transaction screens are denser. The deeper you go, the more information-dense.
- **Grouped by function**: Send/receive/invest actions separated by 24px+ gaps; related data within a group uses 8-12px gaps.

### Border Radius Scale

- Compact (4px): Small badges, inline elements
- Standard (8px): Small buttons, chips, tabs, compact cards
- Field (12px): Form inputs, textareas, selects (`--radius-field`)
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
- Show positive changes in green, negative in red. 면적·아이콘은 `#03b26c` / `#f04452`,
  **글자는 `#0b7a52` / `#c8323f`** (12~16px 텍스트는 AA 4.5:1 을 넘어야 한다)
- Use blue50 (`#e8f3ff`) for subtle informational backgrounds

### Don't

- Don't confuse Brand Accent (`#00795c`) with UI Blue (`#0ea5e9`) or Success Green (`#03b26c`) -- brand accent is for the logo mark's accent cell only, never a UI color
- Don't use heavy shadows -- rely on background color layering, not depth
- Don't use bold (700) for body text -- reserved for headings and financial amounts
- Don't mix variable-width and tabular numerals in the same data context
- Don't use warm accent colors (orange, pink) for primary actions -- blue is the sole interactive hue
- Don't use border-radius > 16px except for pills/toggles
- Don't add decorative elements to financial data displays -- clarity is the aesthetic
- Don't put white text on blue500 (`#0ea5e9`) or blue600 (`#2272eb`) — 2.77 / 4.49 로 AA 미달이다.
  텍스트를 싣는 파란 채움은 blue700 하나뿐이다

## 8. Responsive Behavior

### Breakpoints

| Name             | Width     | Key Changes                                              |
| ---------------- | --------- | -------------------------------------------------------- |
| Mobile (Primary) | <480px    | Full design fidelity, 375px baseline                     |
| Tablet           | 480-768px | Expanded cards, optional side margins                    |
| Desktop (Web)    | >768px    | Centered column, max-width ~480px for mobile-web parity  |
| Desktop wide     | ≥1080px   | 피드형 화면(커뮤니티)만 — 본문 열 + 레일. 아래 메모 참고 |

> **피드형 화면의 구간 (2026-10-01).** 커뮤니티는 `<480` 모바일 · `480–1079` 태블릿(`--w-read` 1단) ·
> `≥1080` 데스크톱(본문 `--w-read` + 레일 300, 최종 3단 240·720·300 = 1308 은 `--w-wide` 안)으로 나눈다.
> 1080 은 본문 720 + 레일 300 + 간격이 셸 안에 들어가는 첫 폭이다. 레거시 640·760·768 은 쓰지 않는다.
> 목록의 **3단은 `≥1360`** 에서만 편다(1308 + 셸 거터 40 을 올림). `1080–1359` 는 피드 + 우 레일 2단이다(4단계).
> 근거: [커뮤니티 개편 제안서](./docs/superpowers/specs/2026-10-01-community-ux-renewal.md) §3.

> **예외 — 시뮬레이션 화면**: 2단 작업 화면이라 이 표 대신 `≤767 / 768–1023 / ≥1024` 3단계를 쓴다(2026-10-01). 규칙은 [S-SIM-1](#53-shell-simulation--share) 「반응형은 3단계다」.

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
- Caption text: Gray (`#6b7684`, grey600 — grey500 fails AA)
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

1. Always use Pretendard (the font this repo actually loads) with its Korean fallback stack -- not Toss Product Sans
2. Primary interactive color is `#0ea5e9` (blue500) -- never the logo mark's Brand Accent (`#00795c`)
3. Financial numbers: 700 weight, tabular numerals, right-aligned in lists
4. Grey scale has warm undertones: grey900 `#191f28`, grey50 `#f9fafb`
5. Border-radius: 12px inputs, 8px buttons/chips, 12px cards, 16px sheets, pill for toggles
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
| **Empty (filter cleared)**        | Single line of `grey600` caption (`조건에 맞는 결과가 없어요`). No button — user resets the filter themselves.                                                                                                                              |
| **Loading (first paint)**         | Skeleton blocks matching the final layout's structure at `#f2f4f6` (grey100). Financial amounts render as `--` until resolved; they never appear as skeleton blocks (would look like they have a placeholder value).                        |
| **Loading (refresh)**             | Top bar pull-down spinner in blue500. No overlay, no blocking. Content stays visible with its previous values.                                                                                                                              |
| **Error (inline field)**          | `#f04452` (red500) 2px border on the input plus a 6% danger tint on the fill, error text below in red500 13px. One actionable sentence (`계좌번호를 다시 확인해주세요`).                                                                    |
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
- V2 1차 범위 제외: **점수 히트맵**(`/map` 류의 복합 점수 레이어) — 엔드포인트가 `@Hidden` 이라 계약이 없다(BE 이슈 #193). **카카오 지도·영역 폴리곤 자체는 이식돼 세 화면이 쓴다.** (자세한 Out of Scope 목록은 [디자인 생성 프롬프트/레퍼런스](#디자인-생성-프롬프트레퍼런스) §8 참고)

#### 영역 폴리곤 (Area Polygon)

상권분석·상권추천의 지도 폴리곤은 화면이 달라도 같은 규격을 쓴다. 정본은
`src/lib/map/area-polygon-style.ts` 의 `resolveAreaPolygonStyle` 이며, 컴포넌트가
stroke 굵기나 파랑 계열을 직접 정하지 않는다.

- **색은 `--color-primary-600` 하나다.** 외곽선·채움 모두 같은 파랑을 쓰고, 상태는
  굵기와 농도로만 구분한다. 지도 한 화면에 파랑을 둘 이상 두지 않는다.

| 상태     | stroke | fill 농도 |
| -------- | ------ | --------- |
| default  | 1.5px  | 0.08      |
| hovered  | 2px    | 0.18      |
| selected | 2.5px  | 0.28      |

- 자체 농도 체계가 있는 레이어(추천 결과의 점수 기반 농도 등)는
  `resolveAreaPolygonStyle` 의 `baseFillOpacity` 로 base 만 갈아끼우고, 상태 증분
  (+0.10 / +0.20)과 stroke 규격은 위 표를 그대로 따른다. 상한은 0.6 이다.
- **hover 는 폴리곤 본체에서도 열려 있어야 한다.** 마커·리스트 항목에만 호버가
  걸려 있으면 지도를 직접 짚는 사용자가 아무 반응도 받지 못한다.
- hover 로만 드러나는 정보는 두지 않는다(§접근성). 폴리곤 호버는 이미 다른 곳에
  적힌 정보를 강조할 뿐이어야 한다.

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
   `emphasized` 변형은 **테두리만** `grey300`(§Border Strong)으로 올린다 — 흰 카드 위에서 칩 격자와 나란히 놓여
   `grey200` 테두리로는 "입력 가능한 칸"으로 읽히지 않는 자리에만 쓴다. 기본값은 `grey200`이라 기존 화면은 그대로다.
   비활성은 테두리를 유지하고 글자색·커서만 바꾼다(§Disabled).
3. **Card** — white, 12px radius, optional `1px grey200` 또는 무테, Level 2 shadow.
4. **Badge** — pill, score 등급 표시(HIGH/MEDIUM/LOW), 트렌드(↑↓→), 프리셋명.
5. **Tabs** — active: blue text 또는 blue underline. inactive: grey text. 가로 스크롤 모바일.
6. **Dialog** — centered modal + bottom-sheet 양쪽 base. 16px top radius(sheet).
7. **EmptyState** — 한 줄 + CTA 1개. **일러스트 없음**(위 Empty 상태 표·§한국어 요약과 같다).
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
  /community/register        글쓰기/수정 (?postId= / ?draftSource=comparison)
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

**S-SIM-1. `/simulation` 및 `/analysis/simulation`** — 조건 입력

- **목적**: 창업 조건 4가지를 모아 예상 **총 창업 비용**을 계산한다. 손익이 아니라 **초기 비용** 화면이다.
- **레이아웃**: **단일 화면 2단.** 마법사(단계별 폼 + 상단 4칸 진행 indicator)를 쓰지 않는다.
  - **반응형은 3단계다 — S-SIM 전용 예외(2026-10-01).** §8 의 `<480 / 480–768 / >768` 은 모바일 웹 패리티(가운데 한 줄) 기준이라 2단 작업 화면에 맞지 않는다.
    시뮬레이션 화면(입력·리포트·비교·이력)은 **Mobile ≤767 · Tablet 768–1023 · Desktop ≥1024** 만 쓰고, 리터럴 대신 `SIMULATION_MEDIA`(`src/components/simulation/simulation-media.ts`)를 끼운다.
    Mobile 에서는 카드 패딩을 줄이고 격자를 1열로 접는다. Tablet 은 1단 + 하단 고정 바를 유지하고 격자만 넓힌다.
  - 컨테이너는 셸(`shellWidth`)이고 **상한이 없다** — §5 폭 체계대로 상한은 요소가 진다(크기·층 컨트롤 520/220/340 등). 페이지 컨테이너에 상한을 걸면 1920 이상에서 헤더와 본문이 어긋난다.
    좌우 거터도 셸(`--shell-gutter`, 640px 이하 16px)을 그대로 따른다. 페이지가 거터를 따로 덮어쓰지 않는다.
  - ≥1024px: `minmax(0, var(--w-form)) / 360px` 2단(폭에 따라 380↔340 으로 바뀌던 1279px 분기는 없앴다). 왼쪽은 조건 섹션(4·5장) 세로 스택, 오른쪽은 결과 패널 `position: sticky; top: 96px`.
    **조건 열은 `--w-form`(880)에서 멈추고 결과 패널은 그 바로 옆에 붙는다**(2026-10-01). 상한이 없으면 1440 에서 1,020px, 1920 에서 1,500px 까지 늘어 접힌 헤더 줄의 값과 오른쪽 답 사이가 멀어졌다. 남는 폭은 오른쪽 끝에 둔다 — 패널을 셸 오른쪽 끝에 붙이면 조건과 답 사이가 오히려 벌어진다.
    셸 안의 **본문 묶음 전체**(헤더·분석 컨텍스트 카드·2단)가 트랙 합(880 + 20 + 360)에서 멈춘다. 조건 열만 멈추면 헤더와 컨텍스트 카드는 셸 끝까지 늘어 결과 패널과 오른쪽 끝이 어긋난다.
  - ≤1023px: 1단 스택 + **하단 고정 요약 바**(계산 전 = 진행도 `n/N` + 남은 조건 문구 + `계산하기`, 계산 후 = 총비용 + `리포트 보기`). 본문 하단 여백 96px로 바에 가리지 않게 한다.
    **계산 전 본문 결과 패널은 숨긴다** — 바와 패널에 같은 `계산하기`가 둘 보이고 체크리스트가 아코디언 헤더를 그대로 반복했다(2026-10-01 실측). 결과·오류가 생기면 입력 아래에 나온다(오류의 `다시 선택` CTA 는 패널에만 있다).
  - **왜 마법사를 걷어냈는가**: 조건 사이 의존성은 **업종 → 브랜드 하나뿐**이다. 나머지 셋은 순서가 무관해 단계로 쪼갤 값이 없고, 대신 "뒤 단계에서 앞 단계로 되돌아가기" 비용만 남았다. 그 하나뿐인 순서는 **업종을 고르기 전 브랜드 섹션을 잠가서** 지킨다(`franchisees`가 `serviceCode` 필수).
- **헤더**: h1(22/750) + 한 줄 설명을 **같은 줄**에 둔다. eyebrow를 두지 않는다 — 매 방문 같은 3층 문구가 상단을 다 먹을 이유가 없다.
  - 로그인 사용자에게만 오른쪽 끝에 `저장한 결과`(ghost, 프로필 저장 목록)를 둔다. 건수는 붙이지 않는다 — 입력 화면을 열 때마다 이력 목록을 부르게 된다. 세션 복원(hydration) 전에는 그리지 않는다.
- **조건 섹션**(개인 창업 4장 · 프랜차이즈 5장): ① 창업 형태 ② 자치구(25) ③ 업종(지원 30종) ④ 브랜드(**프랜차이즈만**) ⑤ 매장 조건(크기·층).
  - **브랜드는 독립 섹션이다(2026-10-01 결정 Q4).** 업종 섹션 안에 두면 프랜차이즈는 6번을 고르는데 화면은 「조건 4개」라고 말해 끝이 보이지 않았다. 번호와 진행도(`n/N`)는 지금 놓인 섹션 수를 쓴다 — 프랜차이즈를 고르면 매장 조건이 5번이 된다.
  - 헤더 설명은 섹션 수를 적지 않는다: `차례대로 고르면 예상 창업 비용을 바로 계산해 드려요`.
  - 섹션 헤더 왼쪽에 **번호 칩 24px** — 완료되면 번호가 체크로 바뀐다. 진행 상태는 상단 인디케이터가 아니라 값이 있는 자리에 붙인다.
  - 섹션은 **잠기지 않는다.** 어느 섹션이든 언제든 고칠 수 있고, 각 섹션은 `id="simulation-section-{name}"` 앵커를 가져 오류 CTA가 그 자리로 스크롤한다.
- **결과 패널**(오른쪽 sticky / 모바일 하단):
  - **계산 전에도 비워 두지 않는다**(≥1024). 무엇을 계산하는지 한 줄 + 놓인 섹션의 현재 값 체크리스트(비면 `선택 전`) + `계산하기`(full width) + `n/N 완료 · 남은 조건` 안내.
    「무엇을 계산하는지」는 창업 형태를 따른다 — 개인 창업이면 가맹 부담금을 빼고, 고르기 전에는 `(프랜차이즈면 가맹 부담금까지)`로 둘 다 걸친다.
  - 계산 후: 총비용(30/750, tabular-nums) + 프랜차이즈 여부 badge + **비용 구성 행**(색 점 · 라벨 · 금액 · 비중, 3~4줄) + 버림 안내 + **조건 요약 행 흐름**(라벨 왼쪽·값 오른쪽) + 기준 연도 안내 + CTA 2개(`상세 리포트 보기` primary · `다른 조건과 비교` secondary, 둘 다 large·full width).
    구성 행의 라벨·비중·색은 S-SIM-2 비용 구성과 같은 함수에서 온다. 행 설명·도넛·합계 행은 리포트에만 둔다 — 카드의 헤드라인이 곧 합계다.
    조건 요약은 2열 그리드를 쓰지 않는다 — 항목이 5개면 마지막 하나가 홀로 남아 붕 뜬다.
  - 오류는 계산 CTA **자리를 대체**한다(둘을 동시에 보여주지 않는다).
- **컴포넌트**:
  - 선택지는 전부 **칩 격자**(최소 44px, 선택 시 primary 테두리·`primary100` 배경·우상단 체크). 상권분석 선택 패널과 같은 관용구.
    최소 열 폭은 자치구 **96** / 업종 132 / 프리셋·층 120. 자치구 96은 375px에서 3열을 유지하는 상한이다.
    **창업 형태는 열 수를 2로 고정하고 폭을 520px 로 묶는다**(`columns`/`maxWidth`) — 최소 폭 auto-fill 로 두면 넓은 칸에서 빈 트랙이 남아 카드가 왼쪽으로 쏠렸다. 힌트는 무엇이 달라지는지 적는다(`본사 가맹비가 함께 들어가요` / `브랜드 없이 직접 차려요`).
  - 브랜드 검색: TextField(돋보기 leftSlot, `emphasized`) + 결과 격자(`minmax(240px,1fr)` 흐름) + `더 보기` secondary 버튼. 커서 페이징 10건씩 누적, 마지막 페이지면 버튼 숨김.
    브랜드 섹션 안에서는 검색 컴포넌트의 자체 제목을 끈다(`showHeading={false}` — 섹션 카드가 제목을 갖는다). 업종 전에는 섹션 헤더가 잠긴 줄(`업종을 고르면 열려요`)로 순서를 드러내므로 비활성 검색칸을 따로 그리지 않는다.
    자리표시자 `브랜드명 일부만 입력해도 찾아요`, 첫 조회 중 `브랜드를 불러오는 중이에요` 문구 + 스켈레톤. 목록 아래(그리고 검색 결과 없음 상태)에 **출구** `찾는 브랜드가 없나요? 개인 창업 기준으로 계산하기`(ghost / secondary 버튼)를 둔다.
  - 업종: 검색 + **대분류 묶음**(`simulation-catalog` 6분류). ≥1024 는 여섯 묶음을 다 펼치고 소제목(12/700, grey600)을 왼쪽 88px 열에 둔다. ≤1023 은 공용 탭(`ui/tabs`) 필터 줄로 분류 하나만 펼치고 소제목을 숨긴다(탭 = 분류명 + 개수). 검색어가 있으면 분류를 무시하고 전체에서 거른다.
  - 매장 크기: 프리셋 3칩(`소형`/`중형`/`대형`) — **3열 고정**(375 에서 auto-fill 이면 2+1 로 떨어졌다), 힌트는 `36㎡` / `10평` **두 줄**(한 칸 약 98px 에 한 줄로 넣으면 가운뎃점에서 끊긴다).
    `면적 직접 입력`(tabular-nums, `emphasized`, 칸 안 단위 rightSlot) 위 라벨 줄에 **단위 전환 `㎡ | 평`** 세그먼트를 둔다(slot 은 aria-hidden 이라 버튼을 못 두고, TextField 가 통째로 `<label>` 이라 라벨을 바깥에 같은 모양으로 그려 `htmlFor` 로 잇는다).
    상태·요청은 언제나 ㎡ 정수다 — 평 입력(소수 허용)은 반올림해 ㎡ 로 바꾸고, helper 에 환산값(`약 20평` / `66㎡로 계산해요`)을 한 줄로 보인다. 단위를 바꾸면 입력칸이 지금 값을 새 단위로 다시 보여 줄 뿐 값은 그대로다.
    크기·층 컨트롤은 **max-width로 폭을 제한한다**(크기 520 / 입력 덩어리 260 / 층 340, 층은 2열 고정). 세 자리 숫자 받는 칸이 1000px을 가로지르면 무엇을 넣는 칸인지 흐려진다.
  - **면적 표기는 어디서나 `66㎡ (약 20평)`**(`formatStoreSize`) — 입력 화면 헤더 요약·결과 미리보기·리포트·비교·이력. 정본은 ㎡(계산 근거), 평은 「약」.
    **표기용 평은 정수 반올림 하나로 둔다**(`squareMeterToPyeong`, 0.5평 미만만 소수 한 자리). 프리셋 힌트도 서버 `pyeong`(버림) 대신 이 함수를 쓴다 — 칩 `19평`과 헤더 `약 19.7평`이 한 화면에서 갈렸고, 정수 평을 넣어도 ㎡ 정수를 거쳐 `약 29.9평`으로 돌아왔다.
  - 층 구분: `1층` / `1층 외` 2칩. **자유 입력을 두지 않는다** — 정의되지 않은 enum이 본문에 들어가면 백엔드가 `dataHeader` 봉투 없는 400을 내려 화면이 원인을 안내할 수 없다.
  - `이전`/`다음` Button row는 없다(단계가 없다). CTA는 결과 패널과 하단 요약 바의 `계산하기` **한 종류**다.
- **비노출**: 기간(분기) 선택지를 얹지 않는다. 서버 기본값(2023년 3분기)을 쓰고 기준 분기는 리포트에만 표기한다.
- **상태**: 계산은 **동기 1회**다 — 폴링·SSE가 없으므로 §4.3의 7상태 폴링 UI를 쓰지 않는다. 로딩은 `계산하기` 버튼 인라인 스피너 **한 번**.
- **오류**: 404 계열은 **재시도 버튼 없이** 서버 문구 + 해당 조건 섹션으로 데려가는 CTA(`자치구 다시 선택` 등). 5xx·무응답은 `다시 시도` 버튼. 요청 검증 실패는 필드별 문구를 나열한다.
- **결과 무효화**: 조건을 고치면 앞 계산 결과·오류 배너를 **내린다.** 바뀐 조건 아래 남은 숫자는 오독을 부른다.
- **인증**: 계산은 공개다. 로그인은 **저장 시점에만** 유도한다.
- **분석 컨텍스트** (`/analysis/simulation`): 상단 한 줄 카드 — 분석에서 가져온 자치구·업종 badge + `분석으로` 링크.
  **카드가 낡지 않게 한다**: 현재 선택이 가져온 조건과 달라지면 문구를 `조건을 직접 바꿨어요`로 바꾸고, badge에 `분석 조건 ·` 접두사를 붙여 그 값이 *지금 선택*이 아님을 드러낸 뒤 `분석 조건으로 되돌리기` CTA를 준다.
  컨텍스트가 채우지 않은 칸을 사용자가 고르는 것은 어긋남이 아니다. 컨텍스트가 없으면 카드 없이 `/simulation`과 동일하게 동작한다.

**S-SIM-2. `/simulation/report` 및 `/analysis/simulation/report`** — 결과 리포트

- **목적**: 예상 **총 창업 비용**과 그 구성, 그리고 판단에 쓸 상권 참고 지표.
- **금액 단위는 전부 만원**이다. 표기는 `N억 M만원`(`formatLargeWon`). 원 단위 포매터를 쓰면 1만 배 틀린다.
  §6.4 의 `1,240,000원`(정확) 규칙은 이 화면에 적용되지 않는다 — 데이터가 만원 단위라 만원 자리가 이 화면의 최대 정밀도이고,
  `formatLargeWon` 은 축약이 아니라 자릿수 구분이다(`2,733,782` → `273억 3,782만원`). 억 자리가 딱 떨어지면 `1억원`(`1억 0만원`도 단위 없는 `1억`도 아님 — 옆의 `2억 4,002만원`과 나란하면 단위가 빠진 값처럼 보였다), `0` 은 `0원`.
  용어: 사용자 총액은 언제나 **`예상 총 창업 비용`**(비교 화면 포함 — `예상 초기 비용` 금지), 임대 쪽은 **`임대 보증금`**, 브랜드 쪽은 **`가맹 보증금`**이다. 둘 다 `보증금`으로 쓰면 다른 돈이 섞인다.
- **레이아웃**(2026-10-01 PR 8 — 입력 화면과 같은 3단계·같은 문법):
  - 컨테이너는 셸(`shellWidth`)이고, 그 안의 본문 묶음이 2단 트랙 합(340 + 20 + `--w-form` 880)에서 멈춘다. 전에는 읽기 칸(720) 한 줄 가운데 정렬이라 1440 에서 좌우가 비었고 저장·비교가 첫 카드를 지나면 사라졌다.
  - ≥1024: **2단** — 왼쪽 340px 요약 열(`position: sticky; top: 96px`, 세로 680px 이상일 때만 — 짧은 창에서 붙이면 저장·비교가 화면 밖에 고정된다) = 헤드라인 카드 + 저장·비교, 오른쪽 섹션들(비용 구성 → 권리금 → 비슷한 브랜드 → 고객 → 성수기, `--w-form` 상한). 답(총액)이 먼저라 요약을 왼쪽에 둔다(입력 화면은 입력이 먼저라 결과가 오른쪽).
  - ≤1023: 1단 + **하단 고정 바**(입력 화면 요약 바와 같은 틀 `SimulationBottomBarFrame`) = 총액 + `결과 저장`(medium, primary) + 비교 아이콘 버튼(40px 정사각, `aria-label="다른 조건과 비교"`). 요약 카드 안의 저장·비교는 이 구간에서 숨긴다(**보이는** 버튼 두 벌 금지 — 마운트는 두 벌이고 CSS 가 고른다). 본문 하단 여백 120px.
    바 안의 로그인 유도는 아이콘을 뺀다 — 375 에서 아이콘까지 두면 총액 칸이 121px 로 줄어 `12억 3,456만원`(127px)이 말줄임된다.
  - 헤드라인: 예상 총 창업 비용(Display Large 30, tabular-nums) + 조건 요약(자치구·업종·브랜드·면적·층).
  - 기준 안내문 **필수**, **출처별로 한 번에**: `비용·권리금은 {연도}년 자료로 계산했어요. 고객 지표·성수기는 {연도}년 {분기}분기 매출 기준이에요.` 밝히지 않으면 최신 시세로 오인된다.
    BE 는 임대료·인테리어·권리금·가맹 정보를 `dataBaseYear` 연도 자료로, 고객 지표·성수기를 `periodCode` 분기 매출로 낸다. 한 기준만 적으면 아래 섹션의 분기 기준과 설명 없이 어긋난다(`describeReportDataBasis`). 매출 섹션이 다 숨으면 두 번째 문장을 빼고, 보이는 섹션 이름만 넣는다.
    입력 화면 결과 카드처럼 비용만 보이는 곳은 `{연도}년 자료로 계산한 결과예요.`
  - 비용 구성: 첫 달 임대료 / 임대 보증금(월 임대료 10개월분) / 인테리어 / 가맹 부담금 → 도넛(240px 칸) + 항목 행 + **합계 행**.
    가맹 부담금은 **프랜차이즈만**. 값이 없으면(`null`) 항목을 숨기고, **`0`은 "0원"으로 표기**한다.
    - 임대료는 「월 임대료」가 아니라 **「첫 달 임대료」**다. 총액에는 한 달 치만 더해지므로(BE `SimulationReportProcessor`) 「월」이라 적으면 매달 나가는 돈이 일회성 총액에 섞인 것처럼 읽힌다. 매달 나간다는 사실은 행 설명(`이후 매달 같은 금액이 나가요`)으로 둔다.
    - **색은 항목에 묶는다** — 첫 달 임대료 `teal500` · 임대 보증금 `primary600` · 인테리어 `purple500` · 가맹 부담금 `grey700`. 색조가 서로 다르고 흰 바탕 그래픽 대비 3:1 을 넘는다. 공용 도넛의 기본 2색 교대(성별용)를 그대로 쓰면 1·3번째, 2·4번째 조각이 같은 색이 된다. `blue500`(2.77)·`orange500`(2.16)은 3:1 미달이라 쓰지 않는다.
    - 도넛 자체 범례는 끄고 **항목 행이 범례를 맡는다**: 색 점 · 라벨 · 설명 · 금액(tabular-nums) · 비중(%). 비중은 도넛과 같은 함수(`toDonutSlices`)로 낸다.
    - 항목 아래 **`합계 · 예상 총 창업 비용`** 행으로 검산할 수 있게 한다. BE 가 원 단위로 계산한 뒤 항목과 총액을 각각 만원 미만에서 버리므로 만원 값끼리는 산식이 정확히 맞지 않을 수 있다(보증금 ≠ 첫 달 임대료 × 10, 항목 합이 총액보다 최대 (항목 수 − 1)만원 작음). 각주에 `금액은 만원 미만을 버려 표시해요.`를 **항상** 두고, 합계 차이가 나면 몇 만원인지 덧붙인다.
  - 권리금 카드: 유 비율(%) / 평균(만원) / ㎡당(만원). **총비용에 포함되지 않는다 — `참고` 배지 필수.**
  - 유사 예산 프랜차이즈 Top 5: 브랜드별 합계·가입비·교육비·가맹 보증금·인테리어·기타. 합계 열은 **그 브랜드의 비용 합계**라 `총비용`·`예상 총 창업 비용`처럼 사용자 총액의 이름을 쓰지 않고 표 머리 **`합계`**로 둔다(행이 브랜드라 무엇의 합계인지는 행이 말한다). 「금액은 만원 단위예요」 같은 단위 안내는 두지 않는다(값에 이미 단위가 있다).
    - ≥768: 표. 칸을 넘기면 표만 가로로 스크롤하고 **브랜드 열은 sticky** 로 붙인다(스크롤하면 숫자가 어느 브랜드 것인지 사라졌다).
    - ≤767: **카드 목록**(2026-10-01 결정 Q7). 접힌 줄 = 브랜드 + 합계, `<details>` 로 펼치면 세부 5항목. 375 에서 6열 표는 두세 열만 보여 브랜드끼리 견줄 수 없었다. 표와 카드는 같은 항목 배열을 쓰고 CSS 로 고른다.
    - 사용자가 고른 브랜드가 목록에 있으면 **`내 선택`** 배지(blue, 바탕은 흰색으로 덮는다 — 기본 blue 배지 바탕이 `primary100` 이라 선택 바탕 위에서 알약이 사라진다) + `primary100` 바탕(카드는 `primary600` 테두리도). 비교의 기준점이 보여야 위아래를 읽는다. id 는 문자열로 맞춰 비교한다(dev 응답이 문자열로 준다).
  - 고객 참고(성별·연령): 성별 매출 비중 도넛 + 연령 Top 3 막대. **집계 범위가 사용자 점포가 아니라 `{자치구} {업종} 전체`**이므로 범위 라벨을 제목·축에 반드시 붙이고 수치는 **억 단위 소수 한 자리로 축약**한다(`273.4억원`, 딱 떨어지면 `3억원`). 버리면 1억 9,600만원이 `1억원`이 된다.
  - 성수기: 성수기·비성수기 월 배지.
  - 고객 참고·성수기 섹션에 **기준 분기**를 표기한다(예: `2023년 3분기 기준`).
- **결측**: 성별·연령·성수기는 데이터가 없으면 `null`로 온다. **성공 응답 안의 결측이므로 해당 섹션만 숨기고 오류 UI·재시도 버튼을 띄우지 않는다.**
- **없는 항목**: V1의 `월 최소 목표 매출`은 보증금을 잘못 표기한 것이었다. 되살리지 않는다.
- **CTA**: `결과 저장`(비로그인은 이 시점에만 로그인 유도 `저장하려면 로그인`) + `다른 조건과 비교`. **공유 CTA는 없다** — S-SIM-4 참조.
  - 요약 열에서는 **둘 다 large(48px)·full width 로 세로로 쌓는다**(R2). 저장은 primary, 비교는 secondary — 로그인 유도도 primary 다(주 행동이 저장이다). 전에는 저장 40px 내용 폭 · 비교 56px 남은 폭이라 보조 행동이 더 커 보였다. 340px 열에서 가로로 놓으면 `다른 조건과 비교`가 142px 한 칸에 겨우 들어간다.
  - 요약 열과 하단 바의 저장은 **상태가 하나**다(`useSimulationSave`). 보이는 쪽을 CSS 로 고르므로 두 벌이 모두 마운트된다.
  - 저장하면 `role="status"` 로 `저장했어요 · 저장 목록 보기`(프로필 저장 목록 링크)를 알린다. 상태 영역은 비어 있어도 늘 둔다(영역째 새로 붙이면 읽지 않는 낭독기가 있다). 바에서는 이 줄이 바 위쪽 한 줄을 차지한다.
- **로딩**: 스켈레톤은 그려질 리포트와 같은 2단(왼쪽 1장 · 오른쪽 2장, `aria-hidden`). 낭독은 늘 있는 숨긴 `role="status"` 영역의 글자를 `리포트를 계산하고 있어요`로 바꿔 알린다. 스켈레톤만으로는 낭독기가 아무것도 읽지 않는다.
- **조건 없음 · 오류**는 읽기 칸(`--w-read`)에 둔다. 2단 묶음 상한(1,240)을 받으면 오류 문장이 한 줄로 늘어난다.

**S-SIM-3. `/simulation/compare` 및 `/analysis/simulation/compare`** — A/B 비교

- **목적**: 두 창업 조건의 예상 총 창업 비용을 같은 기준으로 나란히 본다.
- **호출**: 서버 비교 API가 **없다.** 같은 계산 엔드포인트를 두 조건으로 **2회 병렬 호출**한다.
- **부분 성공 금지**: 한쪽이 실패하면 한쪽만 보이는 "비교"가 사용자를 오도하므로 전체 실패로 처리하고 오류 UI를 **하나만** 띄운다.
- **레이아웃**: 좌우 카드(미러) + 예상 총 창업 비용·비용 항목 미러 막대. 모바일은 세로 스택.
- **강조 규칙**: 비교 가능한 지표는 총 창업 비용과 그 구성뿐이다. "승자" 강조는 **총 창업 비용이 낮은 쪽**에만 쓰고, 비용이 낮은 것이 곧 더 나은 선택이라는 오해를 부르지 않게 중립 문구를 함께 둔다(수익 지표가 없다).

**S-SIM-4. `/share/[token]`** — 공유 리포트

- **시뮬레이션 공유는 미지원이다.** 백엔드 `ShareTargetType`에 시뮬레이션 상수가 없으므로 시뮬 리포트에 공유 CTA를 그리지 않는다.
- 이 화면은 공유를 지원하는 대상(상권분석 등)만 다룬다.
- **레이아웃**: 대상 리포트 본문 + 상단 작은 알림(`이 리포트는 공유 링크로 열어본 거예요`) + 하단 `나도 시작하기` CTA(가입 유도, secondary).
- **상태**: loading skeleton, 만료 → `이 링크는 만료됐거나 잘못됐어요` + `홈으로` 버튼.

#### 5.4 (shell) Community

**S-COM-1. `/community/list`** (개편 1단계, 2026-10-01 — 동작 정본은 `docs/features/community/community.md` §S4 「화면 구성」)

- **목적**: 지역에 붙은 글 피드 + 검색. 모바일 첫 화면에 글 행 3건 이상
- **레이아웃** (모든 폭 `--w-read` 1단):
  - 제목 한 줄: `사장님 이야기` / 대상 선택 시 `{지역} 이야기`. 소개 카드 없음. `≥480` 우측 `글쓰기`(primary)
  - sticky 툴바: 검색 인풋(돋보기 아이콘, 지우기 버튼) + 지역 칩(→ 지역 선택 시트)
  - 밑줄 탭 `최신` `인기` + 오른쪽 끝 `좋아요한 글` 토글
  - 글 행(카드 아님, 구분선): `지역 · 시간`(13/400) → 제목 16/600 → 본문 2줄 14/400 grey600 → 작성자 · 좋아요 · 댓글(13/400). 썸네일 72(`<480`)/96, radius 8. 인기 상위 3건 순위 숫자
  - FAB(`<480` 우하단): `글쓰기`
- **지역 선택 시트**: 단계 진입 리스트(자치구 → 행정동 → 상권), 각 단계 첫 행 `○○ 전체`, 경로 브레드크럼, 현재 단계 검색. `<480` 바텀시트 / `≥480` 다이얼로그
- **다음 쪽**: `lastPostId` 커서. 목록 끝 감시 요소로 자동 무한 스크롤(2단계), 실패하면 그 자리에 `다시 불러오기`. 끝이면 `여기까지 다 봤어요`
- **모바일 상세 하단 바**(S-COM-2): `<480` 에서 반응 바가 안 보이면 `[♡] [댓글을 남겨 보세요] [↗]`, 56 + safe-area
- **상태**: loading → 행 skeleton. empty 는 이유별 한 줄 + 행동 하나

**S-COM-2. `/community/[communityId]`**

- **목적**: 게시글 상세 + 댓글 + 좋아요 + 신고
- **레이아웃**: `≥1080` 본문(`--w-read`) + 레일 300 을 **가운데 묶음**으로, 그 아래 1단
  - 머리 줄: `← 목록` · 더보기(⋯)
  - 본문(카드 없이 흰 바탕): 지역 칩(링크) + 제목(22 / `≥480` 26, 700) + 작성자 · `상대 시간 · 조회 N(· 수정됨)` + 본문 + 이미지
  - 반응 바: 좋아요(♥ + 카운트) / 댓글 / 공유 — 아이콘 + 라벨, 높이 40
  - 더보기 메뉴: 신고 / 작성자만 수정·삭제. `<480` 바텀시트, `≥480` 팝오버
  - 댓글 섹션: depth 1 트리. 부모 댓글 → 대댓글 입력 inline 펼침. 댓글: 닉네임, 시간, 본문, 좋아요(❤ + 카운트), 더보기
- **호출**: `GET /community/posts/{id}` (조회수+1), `GET /community/posts/{id}/comments`, `POST .../likes`, `POST .../comments`, `POST /community/reports`.
- **신고 모달**: 사유 라디오 5개(스팸·홍보 · 욕설·비방 · 개인정보 노출 · 거짓 정보 · 기타) + 자세한 내용(선택, 기타만 필수) + 제출. 보내는 값은 `[사유] 상세` 문자열 하나(3단계).

**S-COM-3. `/community/register` (작성·수정 겸용)** (개편 3단계, 2026-10-01 — 동작 정본은 community.md §S4 「개편 3단계」)

- **목적**: 쓰고 싶은 말부터 쓰고, 쓴 글을 잃지 않는다. `?postId=` 면 수정, `?draftSource=comparison…` 면 비교 초안, `?targetType=&targetCode=&targetName=` 면 지역 프리필
- **레이아웃**: 지역 칩(→ 지역 선택 시트) → 제목(테두리 없는 20/600, 밑줄 포커스) → 본문(자동 높이, 최소 8줄) → 사진 줄(72, 첫 장 `대표`, `+` 타일). 본문이 비면 작성 도움 칩 3개
  - `<480`: 사이트 헤더 아래 sticky 편집 바 `[✕] 새 글 [등록]`
  - `≥480`: 제목 한 줄 + 하단 sticky 액션 바 `[취소] [등록하기]`(safe-area). `≥1080` 은 오른쪽 작성 팁 카드
  - 폼 열 `--w-form`, 팁까지 `--w-wide` 안
- **검증**: 등록 버튼은 pending 때만 비활성. 누르면 첫 빈 필수값(지역 → 제목 → 본문)으로 포커스 + 그 아래 한 줄 안내
- **임시 저장**: 제목·본문·지역만 `localStorage`(사진 제외). 재진입 시 폼 전에 `이어 쓰기 / 새로 쓰기`. 비교 초안이면 끈다
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

| 종류                | 표기                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- |
| 매출/금액           | `1,240,000원` (정확) — 요약 컨텍스트만 `124만원` 허용. **시뮬레이션은 예외**(S-SIM-2) |
| 인원                | 상세: `1,240,000명` / 요약: `124만명`                                                 |
| 분기 (`periodCode`) | `20233` → `2023년 3분기`                                                              |
| 등급                | `HIGH/MEDIUM/LOW` → `높음/보통/낮음`                                                  |
| 트렌드              | `INCREASE/DECREASE/STAGNANT` → `↑ 상승` / `↓ 하락` / `→ 정체`                         |
| 시간대              | `peakSalesTimeSlot` `17시~21시` → `저녁 장사가 강한 상권` (배지)                      |
| 연령대              | `dominantSalesAgeGroup` `30대` → `30대 주요 상권` (배지)                              |
| 활성/위축           | `openingRate > closureRate` → `활성화 상권` / 반대 → `축소 상권`                      |
| 상대 시간           | `5분 전`, `방금 전`, `어제`, `2일 전`, `2026.04.20` (1주 초과)                        |

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
2. `/community/register?draftSource=comparison&leftCommercialCode=...&rightCommercialCode=...&serviceCode=...&administrationCode=...` 진입
3. 백엔드 초안 자동 채움 → 사용자 수정 → `POST /community/posts` → `/community/[id]`

**J4. 신고**

1. `/community/[id]` 더보기 → 신고 모달 → 사유 → 제출 → 토스트
2. (운영자 처리 화면은 V2 1차 미포함)

**J5. 채팅 (BE 미정 — UI만)**

1. `/chatting/list` → 검색 또는 `+` 생성 → `/chatting/[roomId]`
2. STOMP 연결 → 메시지 송수신 (slide-in 애니메이션)
3. FCM 푸시: 백그라운드 알림(브라우저 native).

### 8. Out of Scope (V2 1차 제외 — 그리지 말 것)

> **2026-09-06 정정.** 아래 목록에 **이미 만든 것 두 개**가 「그리지 말 것」으로 남아 있었다.
> 목록을 믿고 다시 그리지 않도록 실제 상태로 고친다.

- ~~**풀스크린 지도 + Kakao Map 폴리곤 히트맵** (`/map` 류) — Kakao Map SDK 미이식~~
  → **SDK 는 이식됐다.** `/status`·`/analysis`·`/recommend` 가 카카오 지도 + 영역 폴리곤을 쓴다
  (규격 정본 `src/lib/map/area-polygon-style.ts`). **다만 히트맵은 여전히 범위 밖이다** —
  점수 히트맵 엔드포인트가 `@Hidden` 이라 계약이 없고 정본도 미정이다(BE 이슈 #193).
- **상권/자치구/행정동 단독 상세 라우트** (`/commercials/:code`, `/districts/:code`, `/administrations/:code`) — `/analysis/result` 안에서 통합 처리. (유지)
- ~~**두 상권 비교 단독 화면** (`/compare?left=&right=`)~~
  → **만들었다.** 후보 상권 비교 `/recommend/compare`(PR #181)와 시뮬레이션 조건 비교
  `/simulation/compare`. 라우트 이름만 다르고 화면은 존재한다.
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
