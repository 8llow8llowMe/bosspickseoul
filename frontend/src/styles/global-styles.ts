import { createGlobalStyle } from 'styled-components'

const GlobalStyles = createGlobalStyle`
  :root {
    --font-ui-fallback: 'Toss Product Sans', 'Tossface', 'Pretendard', 'SF Pro KR', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Basier Square', 'Apple SD Gothic Neo', Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif;
    --font-mono: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;

    --color-blue-50: #e8f3ff;
    --color-blue-500: #0ea5e9;
    --color-blue-600: #2272eb;
    --color-grey-50: #f9fafb;
    --color-grey-100: #f2f4f6;
    --color-grey-200: #e5e8eb;
    --color-grey-300: #d1d6db;
    --color-grey-400: #b0b8c1;
    --color-grey-500: #8b95a1;
    --color-grey-600: #6b7684;
    --color-grey-700: #4e5968;
    --color-grey-800: #333d4b;
    --color-grey-900: #191f28;
    --color-red-500: #f04452;
    --color-green-500: #03b26c;
    --color-orange-500: #fe9800;
    --color-yellow-500: #ffc342;
    --color-teal-500: #18a5a5;
    --color-purple-500: #a234c7;

    --color-primary-700: var(--color-blue-500);
    --color-primary-600: var(--color-blue-600);
    --color-primary-100: var(--color-blue-50);
    --color-text-900: #191f28;
    --color-text-800: var(--color-grey-800);
    --color-text-700: var(--color-grey-700);
    --color-text-600: var(--color-grey-600);
    --color-text-500: var(--color-grey-600);
    --color-text-caption: var(--color-grey-500);
    --color-placeholder: var(--color-grey-400);
    --color-border-300: var(--color-grey-300);
    --color-border-200: var(--color-grey-200);
    --color-surface: #ffffff;
    --color-surface-muted: var(--color-grey-100);
    --color-background: #ffffff;
    --color-background-muted: var(--color-grey-50);
    --color-float-background: #ffffff;
    --color-overlay: rgba(2, 9, 19, 0.5);
    --color-success: var(--color-green-500);
    --color-warning: var(--color-orange-500);
    --color-danger: var(--color-red-500);
    --color-info: var(--color-teal-500);
    --color-premium: var(--color-purple-500);

    --radius-compact: 4px;
    --radius-control: 8px;
    --radius-card: 12px;
    --radius-sheet: 16px;
    --radius-pill: 9999px;

    --shadow-level-1: 0 1px 3px rgba(0, 0, 0, 0.06);
    --shadow-level-2: 0 2px 8px rgba(0, 0, 0, 0.08);
    --shadow-level-3: 0 4px 12px rgba(0, 0, 0, 0.12);
    --shadow-level-4: 0 8px 24px rgba(0, 0, 0, 0.16);
    --shadow-focus-primary: 0 0 0 2px rgba(14, 165, 233, 0.16);
    --shadow-focus-primary-strong: 0 0 0 4px rgba(14, 165, 233, 0.16);
    --shadow-focus-danger: 0 0 0 2px rgba(240, 68, 82, 0.14);

    --motion-instant: 0ms;
    --motion-fast: 150ms;
    --motion-standard: 250ms;
    --motion-slow: 400ms;
    --motion-page: 350ms;
    --ease-enter: cubic-bezier(0, 0, 0.2, 1);
    --ease-exit: cubic-bezier(0.4, 0, 1, 1);
    --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --button-disabled-opacity-color: 0.45;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-family: var(--font-pretendard), var(--font-ui-fallback);
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background: var(--color-background);
    color: var(--color-text-900);
    font-family: var(--font-pretendard), var(--font-ui-fallback);
    line-height: 1.5;
  }

  ::selection {
    background: var(--color-blue-50);
    color: var(--color-grey-900);
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  input,
  textarea {
    color: var(--color-text-900);
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--color-placeholder);
  }

  button {
    color: inherit;
  }

  button:disabled,
  input:disabled,
  textarea:disabled,
  select:disabled {
    cursor: not-allowed;
  }

  :focus-visible {
    outline: 2px solid var(--color-blue-500);
    outline-offset: 2px;
  }

  img,
  picture,
  video,
  canvas,
  svg {
    display: block;
    max-width: 100%;
  }

  ul,
  ol {
    list-style: none;
  }

  code,
  kbd,
  samp,
  pre {
    font-family: var(--font-mono);
  }

  .numeric,
  .tabular-nums,
  [data-numeric='true'],
  [data-tabular-nums='true'] {
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: var(--motion-instant) !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: var(--motion-instant) !important;
    }
  }
`

export default GlobalStyles
