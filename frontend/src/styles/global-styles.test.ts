import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import GlobalStyles from './global-styles'

/** styled-components 는 선언을 압축해 내보낸다 — 공백 차이로 깨지지 않게 지운다. */
const squeeze = (css: string): string => css.replace(/\s+/g, '')

const renderGlobalCss = (): string => {
  const styleSheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(styleSheet.collectStyles(createElement(GlobalStyles)))
    return styleSheet.getStyleTags()
  } finally {
    styleSheet.seal()
  }
}

/**
 * DESIGN.md 「텍스트 대비는 WCAG AA 이상을 목표로 한다」.
 * grey500(#8b95a1)은 흰 배경에서 3.04:1 이라 12px 캡션으로 쓰면 AA 를 넘지 못한다.
 * grey600(#6b7684)은 4.62:1 로 통과한다. 캡션 토큰이 grey500 으로 되돌아가면
 * 80여 곳이 한꺼번에 AA 아래로 떨어지므로 여기서 못박는다.
 */
describe('디자인 토큰 대비 (DESIGN.md §Accessibility)', () => {
  it('캡션 토큰은 grey600 이다 — grey500 은 AA 미달이다', () => {
    const css = renderGlobalCss()

    expect(squeeze(css)).toContain(
      '--color-text-caption:var(--color-grey-600);',
    )
    expect(squeeze(css)).not.toContain(
      '--color-text-caption:var(--color-grey-500);',
    )
  })

  it('grey500 자체는 팔레트에 남아 있다 — 비활성·장식용이다', () => {
    const css = renderGlobalCss()

    expect(squeeze(css)).toContain('--color-grey-500:#8b95a1;')
  })
})

/*
 * 세로 스크롤바가 있는 페이지와 없는 페이지 사이를 오갈 때 콘텐츠가 스크롤바 폭
 * (실측 15px)만큼 좌우로 밀렸다. 헤더 폭을 전 화면 통일한 뒤에도 우측 끝이 홈
 * 1405 / status 1420 으로 어긋난 원인이 이것이다 — 헤더 규칙이 아니라 스크롤바다.
 * `scrollbar-gutter: stable` 은 스크롤바 자리를 항상 예약해 그 이동을 없앤다.
 */
describe('스크롤바 자리 예약 (페이지 간 가로 밀림 방지)', () => {
  it('html 이 스크롤바 자리를 항상 예약한다', () => {
    expect(squeeze(renderGlobalCss())).toContain('scrollbar-gutter:stable')
  })
})

/**
 * DESIGN.md 「셸은 전 라우트 공통, 상한은 요소가 진다」.
 * 폭이 파일마다 박힌 리터럴 9종이던 것을 토큰으로 접었다. 리터럴로 되돌아가면
 * 헤더와 본문 정렬이 다시 어긋나므로 여기서 못박는다.
 */
describe('폭 토큰 (설계 2026-09-04-app-width-system)', () => {
  it('셸 거터와 셸 폭이 정의돼 있다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('--shell-gutter:20px;')
    expect(css).toContain('--w-shell:calc(100%-var(--shell-gutter)*2);')
  })

  it('컬럼 토큰은 셋뿐이다 — 미사용 토큰을 미리 만들지 않는다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('--w-read:720px;')
    expect(css).toContain('--w-form:880px;')
    expect(css).toContain('--w-wide:1400px;')
    expect(css).not.toContain('--w-standard')
  })

  it('좁은 화면에서 거터가 16px 로 줄어든다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('--shell-gutter:16px;')
  })
})

/**
 * 로고 강조색은 `green500`(#03b26c)과 계열이 같다. UI 에 풀리면 성공·상승
 * 시맨틱과 혼동되므로 브랜드 파일 밖에서는 등장하지 않아야 한다.
 * 이 분리는 규약으로만 유지되니 여기서 못박는다.
 */
describe('브랜드 컬러 토큰 (로고 전용)', () => {
  it('브랜드 토큰 셋을 :root 에 선언한다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('--color-brand-ink:#191f28;')
    expect(css).toContain('--color-brand-accent:#00795c;')
    expect(css).toContain('--color-brand-ghost:#edf0f3;')
  })

  it('로고 파랑 금지 — 브랜드 토큰이 blue500 을 참조하지 않는다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).not.toContain('--color-brand-accent:var(--color-blue-500)')
    expect(css).not.toContain('--color-brand-accent:#0ea5e9')
    expect(css).not.toContain('--color-brand-accent:#0064ff')
  })
})

describe('브랜드 강조색은 로고 전용이다', () => {
  const projectRoot = path.resolve(
    fileURLToPath(new URL('.', import.meta.url)),
    '../..',
  )

  /** 강조색이 허용되는 곳. 브랜드 자산과 그 문서뿐이다. */
  const allowed = [
    'src/lib/brand',
    'src/components/brand',
    'src/styles/global-styles.ts',
    'src/styles/global-styles.test.ts',
    'public/brand',
    'app/icon.svg',
    'app/apple-icon.tsx',
    'app/opengraph-image.tsx',
    /* DESIGN.md는 스캔 트리 밖에 있어 도달할 수 없지만 규약 문서로 존재한다 */
    'DESIGN.md',
  ].map(entry => path.join(projectRoot, entry))

  const scanned = ['src', 'app', 'public']
  const extensions = ['.ts', '.tsx', '.css', '.svg', '.md']

  const collect = (dir: string): string[] => {
    const out: string[] = []

    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue

      const full = path.join(dir, name)

      if (statSync(full).isDirectory()) {
        out.push(...collect(full))
        continue
      }

      if (extensions.some(ext => name.endsWith(ext))) out.push(full)
    }

    return out
  }

  it('#00795c 와 #12a47c 가 브랜드 파일 밖에서는 쓰이지 않는다', () => {
    const offenders = scanned
      .flatMap(entry => collect(path.join(projectRoot, entry)))
      .filter(
        file =>
          !allowed.some(
            prefix => file === prefix || file.startsWith(prefix + path.sep),
          ),
      )
      .filter(file => /#00795c|#12a47c/i.test(readFileSync(file, 'utf8')))
      .map(file => path.relative(projectRoot, file))

    expect(offenders).toEqual([])
  })
})
