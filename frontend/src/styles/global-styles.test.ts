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
  const extensions = ['.ts', '.tsx', '.css', '.svg', '.md', '.js']

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

  /**
   * hex 리터럴뿐 아니라 `--color-brand-accent`/`--color-brand-ghost`
   * CSS 변수 참조도 우회로다 — `:root` 에 선언돼 있어 어떤 styled-component
   * 에서도 `var(--color-brand-accent)` 로 끌어다 쓸 수 있다.
   * `--color-brand-ink` 는 `grey900` 과 같은 값이라 시맨틱 혼동 위험이 없으므로
   * 금지 대상에서 뺀다.
   */
  const bannedPattern =
    /#00795c|#12a47c|var\(--color-brand-accent\)|var\(--color-brand-ghost\)/i

  it('#00795c/#12a47c 와 그 CSS 변수 참조가 브랜드 파일 밖에서는 쓰이지 않는다', () => {
    const offenders = scanned
      .flatMap(entry => collect(path.join(projectRoot, entry)))
      .filter(
        file =>
          !allowed.some(
            prefix => file === prefix || file.startsWith(prefix + path.sep),
          ),
      )
      .filter(file => bannedPattern.test(readFileSync(file, 'utf8')))
      .map(file => path.relative(projectRoot, file))

    expect(offenders).toEqual([])
  })
})

/**
 * 포커스 **링**(outline)은 `--color-primary-700`(= blue500)이다. `--color-primary-600`
 * (= blue600)은 hover/pressed 전용이다(DESIGN.md §Primary).
 *
 * 이 규약이 조용히 깨지는 이유는 **별칭 이름이 명암을 거꾸로 말하기 때문**이다 —
 * 600 이 700 보다 진하다. 그래서 「포커스는 좀 더 진하게」라고 생각하며 600 을 집으면
 * 규약을 어기게 되고, 화면에서는 요소마다 링 색이 달라지는 것으로만 드러난다.
 * 실제로 세 곳이 그렇게 어긋나 있었다(#265).
 *
 * 링 대신 **컨트롤 테두리를 바꾸는** 포커스 표현도 같은 규약이다. 처음에는 커뮤니티 폼
 * 6곳이 600 을 쓰고 있어 링만 막았는데, 그 6곳을 700 으로 맞춘 뒤(#308) 테두리형도 함께
 * 막는다 — `TextField` 가 포커스 테두리에 쓰는 색(`#0ea5e9` = primary-700)과 같아야
 * 한 화면에서 칸마다 포커스 색이 달라지지 않는다.
 */
describe('포커스 링은 primary-700 이다', () => {
  const projectRoot = path.resolve(
    fileURLToPath(new URL('.', import.meta.url)),
    '..',
  )

  const collectSources = (dir: string): string[] => {
    const out: string[] = []

    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue

      const full = path.join(dir, name)

      if (statSync(full).isDirectory()) {
        out.push(...collectSources(full))
        continue
      }

      if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full)
    }

    return out
  }

  /** `outline: 2px solid var(--color-primary-600)` 꼴. 굵기·표기 흔들림을 흡수한다. */
  const bannedRing = /outline:[^;{}]*var\(--color-primary-600\)/

  it('아웃라인에 primary-600 을 쓰는 곳이 없다', () => {
    const offenders = collectSources(projectRoot)
      .filter(file => bannedRing.test(readFileSync(file, 'utf8')))
      .map(file => path.relative(projectRoot, file))

    expect(offenders).toEqual([])
  })

  /**
   * `&:focus-visible { … border-color: var(--color-primary-600) }` 꼴. `:focus` ·
   * `:focus-within` 도 같은 규약이다. hover 블록의 600 은 맞는 사용이므로 포커스 선택자로
   * 시작하는 블록 안만 본다.
   */
  const bannedFocusBorder =
    /&:focus(?:-visible|-within)?\s*\{[^}]*border(?:-color)?:[^;]*var\(--color-primary-600\)/

  it('포커스 테두리에 primary-600 을 쓰는 곳이 없다', () => {
    const offenders = collectSources(projectRoot)
      .filter(file => bannedFocusBorder.test(readFileSync(file, 'utf8')))
      .map(file => path.relative(projectRoot, file))

    expect(offenders).toEqual([])
  })
})

/**
 * **hover 와 포커스를 한 선택자에 묶고 링까지 지우면 포커스가 화면에서 사라진다.**
 *
 * `&:hover, &:focus-visible { ... outline: none }` 는 두 가지를 동시에 한다 — 포커스를
 * hover 와 똑같이 보이게 만들고, 전역 `:focus-visible` 링을 지운다. 그러면 키보드
 * 사용자는 자기가 어디 있는지 알 수 없다. 마우스로 지나간 것과 구별이 안 된다.
 *
 * 눈으로는 「아무 일도 안 일어남」이라 리뷰에서 놓친다 — 실제로 11곳이 그랬다(#265).
 *
 * 통과하는 형태는 둘이다.
 * - 묶되 `outline: none` 을 두지 않는다 → 전역 링이 그대로 뜬다
 * - 포커스를 따로 떼어 자기 신호(`--shadow-focus-primary`·링·테두리 굵기)를 준다
 *
 * hover 를 섞지 않은 포커스 전용 블록은 대상이 아니다 — `outline: none` 을 쓰더라도
 * 대체 신호를 함께 두는 관용구가 있다(`option-picker` 검색칸의 테두리 굵기,
 * `seoul-districts-map` 의 fill 강조, recharts 의 의도적 제거).
 */
describe('포커스가 hover 에 묻히지 않는다', () => {
  const projectRoot = path.resolve(
    fileURLToPath(new URL('.', import.meta.url)),
    '..',
  )

  const collectSources = (dir: string): string[] => {
    const out: string[] = []

    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue

      const full = path.join(dir, name)

      if (statSync(full).isDirectory()) {
        out.push(...collectSources(full))
        continue
      }

      if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full)
    }

    return out
  }

  /**
   * 주석을 **지운 뒤** 스캔한다. 오프셋을 유지하려고 내용만 공백으로 바꾼다 —
   * 그러지 않으면 「포커스는 hover 와 달라야 한다」처럼 hover 를 언급하는 주석이
   * 선택자로 읽혀 방금 고친 블록이 위반으로 잡힌다(실제로 그렇게 잡혔다).
   */
  const blankComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, match =>
      match.replace(/[^\n]/g, ' '),
    )

  /**
   * 선택자에 hover 와 focus-visible 이 함께 있는 블록. 선택자에는 `;` 가 없으므로
   * 그것을 경계로 써서 앞 선언까지 삼키지 않게 한다.
   */
  const bundled =
    /([^{};]*hover[^{};]*focus-visible[^{};]*|[^{};]*focus-visible[^{};]*hover[^{};]*)\{([^{}]*)\}/g

  it('hover 와 묶인 포커스 블록이 outline 을 지우지 않는다', () => {
    const offenders: string[] = []

    for (const file of collectSources(projectRoot)) {
      const source = blankComments(readFileSync(file, 'utf8'))

      for (const match of source.matchAll(bundled)) {
        if (!/outline: *(none|0)/.test(match[2])) continue

        const line = source.slice(0, match.index).split('\n').length
        offenders.push(`${path.relative(projectRoot, file)}:${line}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
