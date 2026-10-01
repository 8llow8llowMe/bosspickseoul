import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

const FRONTEND = fileURLToPath(new URL('../../../', import.meta.url))

/** 시뮬레이션 화면을 이루는 소스 디렉터리 — 컴포넌트와 두 라우트 묶음. */
const ROOTS = [
  'src/components/simulation',
  'app/(shell)/simulation',
  'app/(shell)/analysis/simulation',
].map(dir => join(FRONTEND, dir))

/** 테스트와 이 상수 파일은 뺀다(상수 파일 주석이 리터럴을 예로 든다). */
const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    if (!/\.tsx?$/.test(entry.name)) return []
    if (/\.test\.tsx?$/.test(entry.name)) return []
    if (entry.name === 'simulation-media.ts') return []
    return [path]
  })

/*
  `@media` 뒤에 `${` 가 아닌 것이 오면 리터럴이다 — `(max-width…)` 뿐 아니라
  `screen and (…)` · `only screen` 형태도 잡는다. matchMedia 는 문자열을 직접 넘기면 리터럴이다.
  컨테이너 쿼리(`@container`)는 화면 폭 단계가 아니라 요소 폭에 반응하는 것이라 대상이 아니다.
*/
const LITERAL_MEDIA = /@media(?!\s*\$\{)|matchMedia\(\s*['"`]/

describe('SIMULATION_MEDIA', () => {
  it('세 단계가 767 / 1023 / 1024 경계로 겹치지도 비지도 않는다', () => {
    // 상한을 .98 로 끝내야 1023 과 1024 사이 소수 폭(확대 배율)이 어느 단계에도 안 드는 틈이 없다.
    expect(SIMULATION_MEDIA).toEqual({
      mobile: '(max-width: 767.98px)',
      belowDesktop: '(max-width: 1023.98px)',
      desktop: '(min-width: 1024px)',
      desktopTall: '(min-width: 1024px) and (min-height: 680px)',
    })
  })

  /*
    전에는 400·520·640·767·1023·1279 여섯 값이 파일마다 따로 쓰였다(2026-10-01 실측).
    리터럴이 하나라도 다시 생기면 그 화면만 다른 폭에서 접혀 단계가 흩어진다.
  */
  it('시뮬레이션 소스는 미디어쿼리 리터럴 대신 SIMULATION_MEDIA 를 쓴다', () => {
    const files = ROOTS.filter(
      root => existsSync(root) && statSync(root).isDirectory(),
    ).flatMap(sources)

    // 경로가 바뀌어 아무 파일도 못 읽으면 검사 없이 초록이 된다(거짓 가드).
    expect(files.length).toBeGreaterThan(20)

    const offenders = files.flatMap(path =>
      readFileSync(path, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => LITERAL_MEDIA.test(line))
        .map(({ index }) => `${relative(FRONTEND, path)}:${index + 1}`),
    )

    expect(offenders).toEqual([])
  })

  it('리터럴 판정은 상수 보간·컨테이너 쿼리를 통과시키고 나머지는 잡는다', () => {
    expect(LITERAL_MEDIA.test('  @media ${SIMULATION_MEDIA.mobile} {')).toBe(
      false,
    )
    expect(LITERAL_MEDIA.test('  @container (max-width: 300px) {')).toBe(false)
    expect(LITERAL_MEDIA.test('  @media (max-width: 640px) {')).toBe(true)
    expect(LITERAL_MEDIA.test('  @media screen and (min-width: 1px) {')).toBe(
      true,
    )
    expect(LITERAL_MEDIA.test("window.matchMedia('(max-width: 1px)')")).toBe(
      true,
    )
  })
})
