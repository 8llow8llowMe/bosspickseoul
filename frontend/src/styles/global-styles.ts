import { createGlobalStyle } from 'styled-components'

const GlobalStyles = createGlobalStyle`
  :root {
    --font-pretendard-fallback: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif;
    --color-primary-700: #1549b5;
    --color-primary-600: #336dd3;
    --color-primary-100: #f0f5ff;
    --color-text-900: #191f28;
    --color-text-700: #333333;
    --color-text-500: #606d85;
    --color-border-300: #c4c4c4;
    --color-border-200: #dde3ea;
    --color-surface: #ffffff;
    --color-surface-muted: #f8fafc;
    --color-success: #1f9d55;
    --color-warning: #d9822b;
    --color-danger: #d14343;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-family: var(--font-pretendard), var(--font-pretendard-fallback);
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background: var(--color-surface);
    color: var(--color-text-900);
    font-family: var(--font-pretendard), var(--font-pretendard-fallback);
    line-height: 1.5;
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
`

export default GlobalStyles
