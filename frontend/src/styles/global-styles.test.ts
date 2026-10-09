import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import GlobalStyles from './global-styles'

/**
 * 소스 트리를 훑어 `keep` 이 통과시킨 파일을 모은다.
 *
 * `readdirSync` 에 `withFileTypes` 를 줘서 **종류를 목록과 함께 받는다.** 예전에는
 * 이름만 받고 항목마다 `statSync` 를 따로 불렀는데, 그 사이에 파일이 사라지면
 * ENOENT 로 테스트가 터졌다. 확장자 필터보다 `statSync` 가 먼저라 **스캔 대상이
 * 아닌 파일까지** 그 창에 걸렸다 — 임시 파일 하나만 지나가도 무관한 테스트가
 * 빨개진다(#349). 목록과 종류를 한 번에 받으면 그 창 자체가 없다.
 */
const collectFiles = (
  dir: string,
  keep: (name: string) => boolean,
): string[] => {
  const out: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue

    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      out.push(...collectFiles(full, keep))
      continue
    }

    if (keep(entry.name)) out.push(full)
  }

  return out
}

/** 목록을 얻은 뒤 읽기 전에 파일이 사라져도 스캔을 이어 간다. 같은 이유다. */
const readIfPresent = (file: string): string | null => {
  try {
    return readFileSync(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

/** 구현 소스만 본다 — 테스트 파일의 예시 코드는 규약 대상이 아니다. */
const isSourceFile = (name: string): boolean =>
  /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)

/**
 * 이 파일의 규약 테스트는 전부 소스 트리를 직접 훑는다. 그래서 **스캐너가 깨지면
 * 무관한 규약이 한꺼번에 빨개진다** — 실제로 전체 스위트에서 간헐 실패로 나타났다(#349).
 *
 * 예전 스캐너는 `readdirSync` 로 이름만 받고 항목마다 `statSync` 를 따로 불렀다.
 * 목록을 얻은 시점과 stat 하는 시점 사이에 파일이 사라지면 ENOENT 로 터진다.
 * 끊어진 심볼릭 링크가 그 상황을 결정적으로 만든다 — `statSync` 는 링크를 따라가
 * 던지고, `Dirent` 는 목록을 읽을 때 이미 종류를 알고 있어 던지지 않는다.
 */
describe('소스 스캐너는 사라진 파일에 걸려 넘어지지 않는다', () => {
  const makeFixture = (): string => {
    const dir = mkdtempSync(path.join(tmpdir(), 'scan-toctou-'))

    writeFileSync(path.join(dir, 'real.ts'), 'export const a = 1\n')
    // 대상을 만들지 않는다 — 가리키는 곳이 없는 링크다
    symlinkSync(path.join(dir, 'gone.ts'), path.join(dir, 'dangling.ts'))

    return dir
  }

  it('끊어진 링크가 섞여 있어도 목록을 만든다', () => {
    const dir = makeFixture()

    try {
      // 예전 방식이 왜 터졌는지 먼저 못박는다
      expect(() => statSync(path.join(dir, 'dangling.ts'))).toThrow()

      expect(() => collectFiles(dir, isSourceFile)).not.toThrow()
      expect(
        collectFiles(dir, isSourceFile)
          .map(file => path.basename(file))
          .sort(),
      ).toEqual(['dangling.ts', 'real.ts'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('읽을 수 없는 파일은 건너뛴다 — 던지지 않고 null 이다', () => {
    const dir = makeFixture()

    try {
      expect(readIfPresent(path.join(dir, 'dangling.ts'))).toBeNull()
      expect(readIfPresent(path.join(dir, 'real.ts'))).toBe(
        'export const a = 1\n',
      )
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

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

  // DESIGN.md Neutral Scale · contrast-tokens.md D3. grey600 은 흰 바탕에서만 통과하므로
  // grey50·grey100·blue50 밴드 위 캡션은 grey700 을 가리키는 이 토큰을 쓴다. 토큰이 사라지면
  // 쓰는 곳 글자가 빌드 오류 없이 조용히 투명해진다(styling-rules.md).
  it('밴드 위 캡션 토큰은 grey700 이다', () => {
    expect(squeeze(renderGlobalCss())).toContain(
      '--color-text-caption-on-band:var(--color-grey-700);',
    )
  })

  // contrast-tokens.md TC-CT-001 · D3-3 의 증감 글자 부분. 면적 토큰(positive/negative)은
  // 3:1 기준이라 그대로 두고, 글자는 -text 토큰(green700·red700, 흰 바탕 5.36 / 5.27:1)이다.
  it('증감 글자 토큰은 green700·red700 을 가리키고 면적 토큰은 그대로다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('--color-green-700:#0b7a52;')
    expect(css).toContain('--color-red-700:#c8323f;')
    expect(css).toContain('--color-positive-text:var(--color-green-700);')
    expect(css).toContain('--color-negative-text:var(--color-red-700);')
    expect(css).toContain('--color-positive:var(--color-green-500);')
    expect(css).toContain('--color-negative:var(--color-red-500);')
  })

  it('grey500 자체는 팔레트에 남아 있다 — 비활성·장식용이다', () => {
    const css = renderGlobalCss()

    expect(squeeze(css)).toContain('--color-grey-500:#8b95a1;')
  })

  // contrast-tokens.md TC-CT-001~003 · D3-3 의 파란 채움 부분. hover 는 blue800 이다 —
  // blue600 을 hover 로 쓰면 blue700 보다 밝아져 hover 에서 흰 글자가 4.49 로 다시 떨어진다(D4-4).
  // primary-700/600 별칭은 포커스 링·테두리·지도가 쓰므로 값이 그대로여야 한다.
  it('글자를 얹는 파란 채움 토큰은 blue700·blue800 이고 primary 별칭은 그대로다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('--color-blue-700:#1a5fcc;')
    expect(css).toContain('--color-blue-800:#1757bf;')
    expect(css).toContain('--color-fill-primary-text:var(--color-blue-700);')
    expect(css).toContain(
      '--color-fill-primary-text-hover:var(--color-blue-800);',
    )
    expect(css).toContain('--color-primary-700:var(--color-blue-500);')
    expect(css).toContain('--color-primary-600:var(--color-blue-600);')
  })
})

/*
 * contrast-tokens.md TC-CT-005 · DESIGN.md §7 「Don't put white text on blue500 / blue600」.
 * 파란 채움 위 흰 글자는 blue500 2.77 · blue600 4.49 로 AA(4.5) 미달이다. 글자를 얹는
 * 채움은 `--color-fill-primary-text` 하나뿐이다. 글자 없는 면(막대·점·폴리곤)은
 * primary-700/600 을 그대로 쓰므로, **같은 styled 템플릿 안에 흰 글자가 있을 때만** 막는다.
 */
describe('흰 글자를 얹는 파란 채움은 fill-primary-text 다', () => {
  const projectRoot = path.resolve(
    fileURLToPath(new URL('.', import.meta.url)),
    '..',
  )

  /** 템플릿 안 `url(https://…)` 의 `//` 는 주석이 아니다 — 지우면 닫는 백틱까지 사라진다. */
  const blankComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\/|(?<!:)\/\/[^\n]*/g, match =>
      match.replace(/[^\n]/g, ' '),
    )

  /**
   * 최상위 템플릿 리터럴을 **중첩까지 포함해** 통째로 꺼낸다. 백틱을 순서대로 짝지으면
   * `${p => p.$on && css`…`}` 조각의 본문이 두 템플릿 사이 틈으로 떨어져 스캔에서 빠진다.
   * `${` 를 만나면 중괄호 깊이를 세고, 그 안의 백틱은 안쪽 템플릿으로 본다.
   */
  const extractTemplates = (source: string) => {
    const found: { index: number; body: string }[] = []
    const stack: (
      { kind: 'template'; start: number } | { kind: 'expr'; depth: number }
    )[] = []

    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i]
      const top = stack.at(-1)

      if (top?.kind === 'template') {
        if (ch === '\\') i += 1
        else if (ch === '$' && source[i + 1] === '{') {
          stack.push({ kind: 'expr', depth: 0 })
          i += 1
        } else if (ch === '`') {
          stack.pop()
          if (stack.length === 0) {
            found.push({
              index: top.start,
              body: source.slice(top.start + 1, i),
            })
          }
        }
        continue
      }

      if (ch === '`') stack.push({ kind: 'template', start: i })
      else if (top?.kind === 'expr' && ch === '{') top.depth += 1
      else if (top?.kind === 'expr' && ch === '}') {
        if (top.depth === 0) stack.pop()
        else top.depth -= 1
      }
    }

    return found
  }

  /** color-mix 틴트는 채움이 아니다 — 괄호 짝을 맞춰 호출째 지운다. */
  const stripColorMix = (body: string): string => {
    let out = body
    let start = out.indexOf('color-mix(')

    while (start !== -1) {
      let depth = 0
      let end = start + 'color-mix'.length

      for (; end < out.length; end += 1) {
        if (out[end] === '(') depth += 1
        else if (out[end] === ')' && --depth === 0) break
      }

      out = out.slice(0, start) + out.slice(end + 1)
      start = out.indexOf('color-mix(')
    }

    return out
  }

  /** 삼항으로 고른 값도 잡는다 — 선언 끝(`;`)까지 본다. 대체값(`var(--x, #2272eb)`)·hex 도 같다. */
  const blueFill =
    /background(?:-color)?\s*:[^;]*(?:var\(--color-(?:primary-700|primary-600|blue-500|blue-600)(?:\s*,[^)]*)?\)|#(?:0ea5e9|2272eb)\b)/i

  /** 글자색과 아이콘 채움(`fill`)의 흰색. 반투명 흰색도 흰 글자다. */
  const whiteText =
    /(?<![-\w])(?:color|fill)\s*:[^;]*(?:#fff(?:fff)?\b|\bwhite\b|var\(--color-surface\)|rgba?\(\s*255\s*,\s*255\s*,\s*255\b)/i

  const findOffenders = (files: { name: string; source: string }[]) =>
    files.flatMap(({ name, source }) =>
      extractTemplates(blankComments(source))
        .filter(({ body }) => {
          const css = stripColorMix(body)
          return blueFill.test(css) && whiteText.test(css)
        })
        .map(
          ({ index }) => `${name}:${source.slice(0, index).split('\n').length}`,
        ),
    )

  it('판정 — 흰 글자와 함께인 채움만 걸고, 글자 없는 막대·틴트는 건너뛴다', () => {
    const offenders = findOffenders([
      {
        name: 'cta.tsx',
        source:
          'const A = styled.a`\n  background: var(--color-primary-700);\n  color: #ffffff;\n`',
      },
      {
        name: 'badge.tsx',
        source:
          "const B = styled.span`\n  background: ${p =>\n    p.$top ? 'var(--color-primary-600)' : 'var(--color-grey-100)'};\n  color: ${p => (p.$top ? 'white' : 'var(--color-text-600)')};\n`",
      },
      {
        name: 'bar.tsx',
        source:
          'const C = styled.span`\n  background: var(--color-primary-600);\n`',
      },
      {
        name: 'tint.tsx',
        source:
          'const D = styled.div`\n  background: color-mix(in srgb, var(--color-primary-700) 7%, white);\n  color: var(--color-surface-muted);\n`',
      },
      {
        name: 'fill.tsx',
        source:
          'const E = styled.a`\n  background: var(--color-fill-primary-text);\n  color: #ffffff;\n`',
      },
      {
        name: 'nested.tsx',
        source:
          'const F = styled.a`\n  color: white;\n  ${p => p.$on && css`\n    background: var(--color-primary-600);\n  `}\n`',
      },
      {
        name: 'fallback.tsx',
        source:
          'const G = styled.span`\n  background: var(--color-primary-600, #2272eb);\n  color: rgba(255, 255, 255, 0.84);\n`',
      },
      {
        name: 'url.tsx',
        source:
          'const H = styled.div`\n  background: url(https://x.test/a.png);\n`\nconst I = styled.a`\n  background: #0ea5e9;\n  color: #fff;\n`',
      },
      {
        name: 'mixed.tsx',
        source:
          "const J = styled.div`\n  background: ${p =>\n    p.$a ? 'color-mix(in srgb, var(--color-primary-700) 7%, white)' : 'var(--color-primary-600)'};\n  color: #fff;\n`",
      },
    ])

    expect(offenders).toEqual([
      'cta.tsx:1',
      'badge.tsx:1',
      'nested.tsx:1',
      'fallback.tsx:1',
      'url.tsx:4',
      'mixed.tsx:1',
    ])
  })

  it('소스 어디에도 흰 글자 + primary-700/600 채움 조합이 없다', () => {
    const files = collectFiles(projectRoot, isSourceFile).flatMap(file => {
      const source = readIfPresent(file)

      return source === null
        ? []
        : [{ name: path.relative(projectRoot, file), source }]
    })

    expect(findOffenders(files)).toEqual([])
  })

  it('공용 Button 의 primary 는 채움 토큰을 쓰고 hover 는 -hover 다', () => {
    const source = readIfPresent(
      path.join(projectRoot, 'components/ui/button.tsx'),
    )
    const primary = squeeze(source ?? '').match(/primary:css`([^`]*)`/)?.[1]

    expect(primary).toBeDefined()
    expect(primary).toContain(
      'border-color:var(--color-fill-primary-text);background:var(--color-fill-primary-text);color:#ffffff;',
    )
    expect(primary).toContain(
      '&:hover:not(:disabled){border-color:var(--color-fill-primary-text-hover);background:var(--color-fill-primary-text-hover);}',
    )
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

/*
 * 스크롤바는 6px 이고 평소 투명하다. ScrollbarReveal 이 스크롤 중인 요소에
 * `data-scrolling` 을 붙이는 동안만 막대가 색을 갖는다.
 */
describe('얇고 스크롤 중에만 보이는 스크롤바', () => {
  const supportsGuard = '@supportsnotselector(::-webkit-scrollbar){'

  /** `@supports not selector(::-webkit-scrollbar) { … }` 블록 하나를 중괄호 짝으로 잘라 낸다. */
  const splitSupportsBlock = (
    css: string,
  ): { inside: string; outside: string } => {
    const start = css.indexOf(supportsGuard)

    if (start === -1) return { inside: '', outside: css }

    let depth = 0
    let end = start + supportsGuard.length - 1

    for (; end < css.length; end += 1) {
      if (css[end] === '{') depth += 1
      if (css[end] === '}') depth -= 1
      if (depth === 0) break
    }

    return {
      inside: css.slice(start, end + 1),
      outside: css.slice(0, start) + css.slice(end + 1),
    }
  }

  it('의사요소로 두께를 6px 로 줄이고 막대는 평소 투명하다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('::-webkit-scrollbar{width:6px;height:6px;}')
    expect(css).toMatch(
      /::-webkit-scrollbar-thumb\{background-color:transparent;/,
    )
  })

  it('스크롤 중과 hover 에만 기존 grey 토큰으로 색을 준다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain(
      '[data-scrolling]::-webkit-scrollbar-thumb{background-color:var(--color-grey-400);}',
    )
    expect(css).toContain(
      '::-webkit-scrollbar-thumb:hover{background-color:var(--color-grey-500);}',
    )
  })

  /*
   * Chromium 은 scrollbar-width/scrollbar-color 가 걸린 요소에서 ::-webkit-scrollbar 를
   * 통째로 무시해 6px 대신 thin 기본값(약 11px)을 그린다. 표준 속성은 의사요소를
   * 모르는 엔진(Firefox)에만 가야 한다.
   */
  it('scrollbar-width: thin 은 @supports not selector(::-webkit-scrollbar) 안에만 있다', () => {
    const { inside, outside } = splitSupportsBlock(squeeze(renderGlobalCss()))

    expect(inside).toContain('scrollbar-width:thin;')
    expect(inside).toContain(
      '[data-scrolling]{scrollbar-color:var(--color-grey-400)transparent;}',
    )
    expect(outside).not.toContain('scrollbar-width')
    expect(outside).not.toContain('scrollbar-color')
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

  const collect = (dir: string): string[] =>
    collectFiles(dir, name => extensions.some(ext => name.endsWith(ext)))

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
      .filter(file => bannedPattern.test(readIfPresent(file) ?? ''))
      .map(file => path.relative(projectRoot, file))

    expect(offenders).toEqual([])
  })
})

/**
 * **글자**에 `--color-primary-700`(= blue500)을 쓰지 않는다. 흰 바탕 2.77:1 · blue50 위 2.47:1 이라
 * AA(4.5)에 못 미친다. 파란 글자는 `--color-text-primary-on-light`(blue700)다(DESIGN.md §2 Blue
 * Text, contrast-tokens.md D3-3). 테두리·포커스 링·배경·`fill`/`stroke`·`accent-color` 는 primary-700
 * 그대로라 걸지 않는다 — `color` 속성 앞에 `-`/영숫자가 붙은 것(`border-color` 등)은 건너뛴다.
 *
 * 아직 못 옮긴 파일은 `KNOWN_DEBT` 에 남아 있다(#556 후속). **새 파일이 걸리면 실패**하고, 목록에 있는
 * 파일별 위반 수가 늘면 실패하고, 줄면 「숫자를 낮춰라」(0 이면 「목록에서 빼라」)로 실패한다 —
 * 부채가 줄기만 하도록 상한을 잠근다.
 *
 * 한계: 색을 상수 맵·변수에 담았다가 `color: ${map[x]}` 로 꺼내는 **간접 참조는 못 잡는다**. 선언 안에
 * `--color-primary-700` 이 직접 적힌 것만 본다.
 */
describe('글자색에 primary-700 을 쓰지 않는다', () => {
  const projectRoot = path.resolve(
    fileURLToPath(new URL('.', import.meta.url)),
    '..',
  )

  /** 파일 → 글자색 primary-700 선언 수(상한). */
  const KNOWN_DEBT = new Map<string, number>([
    ['src/components/analysis/analysis-policy-list.tsx', 2],
    ['src/components/analysis/analysis-result-nav.tsx', 2],
    ['src/components/analysis/analysis-result-section.tsx', 1],
    ['src/components/analysis/analysis-selection-panel.tsx', 1],
    ['src/components/analysis/analysis-summary-insights.tsx', 1],
    ['src/components/analysis/popular-commercials-shortcut.tsx', 2],
    ['src/components/auth/password-reset-form.tsx', 1],
    ['src/components/chatting/chat-room-search.tsx', 1],
    ['src/components/chatting/chatting-detail-page.tsx', 3],
    ['src/components/chatting/chatting-list-page.tsx', 3],
    ['src/components/chatting/chatting-unavailable-page.tsx', 1],
    ['src/components/community/community-choice-chips.tsx', 1],
    ['src/components/community/community-list-filter.tsx', 1],
    ['src/components/home/analysis-mini-demo.tsx', 3],
    ['src/components/home/metric-toggle-group.tsx', 2],
    ['src/components/home/product-story.tsx', 1],
    ['src/components/profile/profile-shell.tsx', 2],
    ['src/components/profile/profile-tabs.tsx', 1],
    ['src/components/profile/profile-ui.tsx', 2],
    ['src/components/recommend/recommend-result-list.tsx', 1],
    ['src/components/simulation/report/simulation-save-button.tsx', 1],
    ['src/components/simulation/simulation-analysis-context-card.tsx', 2],
    ['src/components/simulation/simulation-brand-search.tsx', 1],
    ['src/components/simulation/simulation-choice-grid.tsx', 2],
    ['src/components/simulation/simulation-condition-section.tsx', 1],
    ['src/components/simulation/simulation-result-panel.tsx', 1],
    ['src/components/ui/badge.tsx', 1],
    ['src/components/ui/button.tsx', 1],
    ['src/components/ui/option-picker.tsx', 6],
    ['src/components/ui/tabs.tsx', 2],
    ['src/components/ui/toast.tsx', 2],
  ])

  const blankComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\/|(?<!:)\/\/[^\n]*/g, match =>
      match.replace(/[^\n]/g, ' '),
    )

  /**
   * 선언 끝(`;`·`}`)까지 본다 — `color: ${p => p.$on ? 'var(--color-primary-700)' : …}` 삼항도 잡는다.
   * JS 객체(`{ color: 'x', borderColor: 'var(--color-primary-700)' }`)의 다음 키로 넘어가지 않도록
   * `, 키:` 에서도 끊는다.
   */
  const blueText =
    /(?<![-\w])color\s*:(?:(?!,\s*['"]?[\w$-]+['"]?\s*:)[^;}])*--color-primary-700/g

  const countBlueText = (source: string): number =>
    blankComments(source).match(blueText)?.length ?? 0

  const hasBlueText = (source: string): boolean => countBlueText(source) > 0

  it('판정 — 글자색만 걸고 테두리·배경·fill·accent-color 는 건너뛴다', () => {
    expect(hasBlueText('a{ color: var(--color-primary-700); }')).toBe(true)
    expect(
      hasBlueText(
        "a{ color: ${p => p.$on ? 'var(--color-primary-700)' : 'var(--color-text-700)'}; }",
      ),
    ).toBe(true)
    expect(hasBlueText('a{ border-color: var(--color-primary-700); }')).toBe(
      false,
    )
    expect(hasBlueText('a{ background: var(--color-primary-700); }')).toBe(
      false,
    )
    expect(hasBlueText('a{ fill: var(--color-primary-700); }')).toBe(false)
    expect(hasBlueText('a{ accent-color: var(--color-primary-700); }')).toBe(
      false,
    )
    expect(
      hasBlueText('a{ outline: 2px solid var(--color-primary-700); }'),
    ).toBe(false)
    expect(hasBlueText('a{ color: var(--color-text-primary-on-light); }')).toBe(
      false,
    )
    expect(hasBlueText('// color: var(--color-primary-700)')).toBe(false)
    expect(
      hasBlueText(
        "const s = { color: 'var(--color-text-700)', borderColor: 'var(--color-primary-700)' }",
      ),
    ).toBe(false)
    expect(hasBlueText("const s = { color: 'var(--color-primary-700)' }")).toBe(
      true,
    )
  })

  it('파일별 위반 수가 상한(KNOWN_DEBT)을 넘지 않고, 줄면 상한을 낮춘다', () => {
    const found = new Map<string, number>()

    for (const file of collectFiles(projectRoot, isSourceFile)) {
      const source = readIfPresent(file)
      const count = source === null ? 0 : countBlueText(source)

      if (count > 0) {
        const rel = path
          .relative(path.dirname(projectRoot), file)
          .replaceAll('\\', '/')
        found.set(rel.replace(/^.*?(?=src\/)/, ''), count)
      }
    }

    const grew = [...found]
      .filter(([name, count]) => count > (KNOWN_DEBT.get(name) ?? 0))
      .map(
        ([name, count]) => `${name}: ${KNOWN_DEBT.get(name) ?? 0} -> ${count}`,
      )
    const shrank = [...KNOWN_DEBT]
      .filter(([name, limit]) => (found.get(name) ?? 0) < limit)
      .map(
        ([name, limit]) =>
          `${name}: 상한 ${limit} -> ${found.get(name) ?? 0} 로 낮추거나(0 이면 목록에서 뺀다)`,
      )

    expect(grew).toEqual([])
    expect(shrank).toEqual([])
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

  const collectSources = (dir: string): string[] =>
    collectFiles(dir, isSourceFile)

  /** `outline: 2px solid var(--color-primary-600)` 꼴. 굵기·표기 흔들림을 흡수한다. */
  const bannedRing = /outline:[^;{}]*var\(--color-primary-600\)/

  it('아웃라인에 primary-600 을 쓰는 곳이 없다', () => {
    const offenders = collectSources(projectRoot)
      .filter(file => bannedRing.test(readIfPresent(file) ?? ''))
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
      .filter(file => bannedFocusBorder.test(readIfPresent(file) ?? ''))
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

  const collectSources = (dir: string): string[] =>
    collectFiles(dir, isSourceFile)

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
   * 선택자에 hover 와 focus-visible 이 함께 있고 본문에 중첩 블록이 없는 `{…}` 를 찾는다.
   * 선택자는 직전 `{` `}` `;` 바로 뒤부터 `{` 까지다 — 선택자에는 `;` 가 없으므로 그것을
   * 경계로 써서 앞 선언까지 삼키지 않게 한다. `index` 는 선택자 첫 글자의 위치다.
   *
   * **정규식으로 쓰지 않는다.** 예전에는
   * `/([^{};]*hover[^{};]*focus-visible[^{};]*|…)\{([^{}]*)\}/g` 였는데, `[^{};]*` 가
   * 시작 위치마다 같은 구간을 끝까지 다시 훑어 **경계 없는 구간 길이의 제곱**으로 느려졌다.
   * `src/` 334개 파일에 약 0.9초가 들었고(`seoul-status-map.ts` 의 4,261자 구간 하나가
   * 185ms), 병렬 워커와 외부 부하가 겹치면 기본 5초 제한을 넘겨 시간 초과로 빨개졌다(#349).
   * 경계 문자를 한 번씩만 지나가면 파일 길이에 비례한다.
   */
  const findBundledFocusBlocks = (
    source: string,
  ): Array<{ index: number; body: string }> => {
    const boundaries = [...source.matchAll(/[{};]/g)].map(match => ({
      char: match[0],
      at: match.index,
    }))
    const blocks: Array<{ index: number; body: string }> = []

    for (let k = 0; k < boundaries.length; k += 1) {
      if (boundaries[k].char !== '{') continue

      const open = boundaries[k].at
      const selectorStart = k === 0 ? 0 : boundaries[k - 1].at + 1
      const selector = source.slice(selectorStart, open)

      if (!selector.includes('hover') || !selector.includes('focus-visible')) {
        continue
      }

      // 본문의 `;` 는 건너뛰고 다음 중괄호를 본다. 닫는 괄호가 아니면 중첩 블록이다.
      let next = k + 1
      while (next < boundaries.length && boundaries[next].char === ';') {
        next += 1
      }
      if (next === boundaries.length || boundaries[next].char !== '}') continue

      blocks.push({
        // 앞 줄의 경계 바로 뒤가 아니라 선택자 첫 글자를 가리켜야 보고 줄 번호가 맞는다
        index: selectorStart + selector.length - selector.trimStart().length,
        body: source.slice(open + 1, boundaries[next].at),
      })
    }

    return blocks
  }

  it('묶인 블록을 선택자 순서와 상관없이 찾고, 중첩·분리된 블록은 건너뛴다', () => {
    const source = [
      'a { color: red; }',
      '&:hover, &:focus-visible { outline: none; color: red; }',
      '&:focus-visible:not(:disabled), &:hover { outline: 0 }',
      '&:hover { outline: none } &:focus-visible { outline: none }',
      '&:hover, &:focus-visible { & span { outline: none } }',
    ].join('\n')

    expect(
      findBundledFocusBlocks(source).map(({ index, body }) => ({
        line: source.slice(0, index).split('\n').length,
        body: body.trim(),
      })),
    ).toEqual([
      { line: 2, body: 'outline: none; color: red;' },
      { line: 3, body: 'outline: 0' },
    ])
  })

  it('hover 와 묶인 포커스 블록이 outline 을 지우지 않는다', () => {
    const offenders: string[] = []

    for (const file of collectSources(projectRoot)) {
      const raw = readIfPresent(file)

      if (raw === null) continue

      const source = blankComments(raw)

      for (const { index, body } of findBundledFocusBlocks(source)) {
        if (!/outline: *(none|0)/.test(body)) continue

        const line = source.slice(0, index).split('\n').length
        offenders.push(`${path.relative(projectRoot, file)}:${line}`)
      }
    }

    expect(offenders).toEqual([])
  })
})

/**
 * DESIGN.md 「`scrollbar-width`·`scrollbar-color` 와 `::-webkit-scrollbar` 를 같은 요소에
 * 섞지 않는다」. Chromium 은 표준 속성이 걸린 요소에서 전역 `::-webkit-scrollbar` 규칙을
 * 통째로 무시한다. 컴포넌트가 `scrollbar-width: thin` 을 직접 걸면 그 요소만 6px 대신
 * 약 11px 기본색 막대가 **항상** 보인다 — 커뮤니티 목록 탭이 그랬다(#423).
 *
 * 컴포넌트에 허용되는 것은 스크롤바를 아예 숨기는 `scrollbar-width: none` 뿐이다.
 * 표준 속성의 다른 값은 전역 스타일의 `@supports` 블록만 쓴다.
 */
describe('컴포넌트는 스크롤바 표준 속성으로 두께·색을 정하지 않는다', () => {
  const projectRoot = path.resolve(
    fileURLToPath(new URL('.', import.meta.url)),
    '..',
  )

  const globalStyles = path.join(projectRoot, 'styles', 'global-styles.ts')

  /** 주석 속 설명문이 선언으로 읽히지 않게 지운다. */
  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

  const declaration = /scrollbar-(width|color)\s*:\s*([^;}]+)/g

  it('scrollbar-width 는 none 만, scrollbar-color 는 쓰지 않는다', () => {
    const offenders: string[] = []

    for (const file of collectFiles(projectRoot, isSourceFile)) {
      if (file === globalStyles) continue

      const raw = readIfPresent(file)

      if (raw === null) continue

      for (const [text, property, value] of stripComments(raw).matchAll(
        declaration,
      )) {
        if (property === 'width' && value.trim() === 'none') continue

        offenders.push(`${path.relative(projectRoot, file)}: ${text.trim()}`)
      }
    }

    expect(offenders).toEqual([])
  })
})

/**
 * DESIGN.md §Inputs & Forms 「Focus is one line」.
 *
 * 입력칸이 포커스를 **테두리로** 말하면(테두리 → primary-700 + 후광) 전역 `:focus-visible`
 * 링(2px, offset 2px)을 포커스 선택자 안에서 꺼야 한다. 그러지 않으면 테두리 바깥에 흰 틈을
 * 두고 파란 선이 한 줄 더 생긴다 — 로그인 이메일 칸·커뮤니티 폼 등 6곳이 그랬다.
 *
 * 클래스 기본값의 `outline: none` 으로는 안 된다. 전역 `:focus-visible` 과 특이도가 같아
 * 소스 순서에 밀린다(실제로 커뮤니티 폼은 기본값에 `outline: none` 을 두고도 링이 떴다).
 * 그래서 **포커스 선택자가 붙은 블록**에서 끄는지를 본다.
 */
describe('테두리로 포커스를 말하는 입력칸은 전역 링을 끈다', () => {
  const projectRoot = path.resolve(
    fileURLToPath(new URL('.', import.meta.url)),
    '..',
  )

  const blankComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, match =>
      match.replace(/[^\n]/g, ' '),
    )

  /** `styled.input` · `styled.textarea` · `styled.select` 템플릿 본문. */
  const fieldTemplate =
    /styled\.(?:input|textarea|select)(?:<[^>`]*>)?(?:\.attrs\([^)`]*\))?`([^`]*)`/g

  /** 포커스 선택자가 붙은 중첩 없는 블록. */
  const focusBlock = /([^{};]*&:focus(?:-visible)?[^{};]*)\{([^{}]*)\}/g

  it('포커스에 테두리를 바꾸면 포커스 선택자 안에서 outline 을 끈다', () => {
    const offenders: string[] = []

    for (const file of collectFiles(projectRoot, isSourceFile)) {
      const raw = readIfPresent(file)

      if (raw === null) continue

      const source = blankComments(raw)

      for (const template of source.matchAll(fieldTemplate)) {
        const blocks = [...template[1].matchAll(focusBlock)]
        const changesBorder = blocks.some(block =>
          /border(?:-color)?\s*:/.test(block[2]),
        )
        const turnsRingOff = blocks.some(block =>
          /outline\s*:\s*(?:none|0)\b/.test(block[2]),
        )

        if (!changesBorder || turnsRingOff) continue

        const line = source.slice(0, template.index).split('\n').length
        offenders.push(`${path.relative(projectRoot, file)}:${line}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
