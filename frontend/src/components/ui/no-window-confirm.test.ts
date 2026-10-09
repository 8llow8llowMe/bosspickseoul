import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/*
  window.confirm 금지 가드(#581). 확인은 `components/ui/confirm-sheet` 로 한다 — 인앱 브라우저가 confirm 에
  도메인을 붙이고, 위험 동작의 색 구분이 없고, 문구가 결과를 말하지 못한다.

  소스(테스트 제외)를 주석을 지운 뒤 훑는다. 주석에 「window.confirm 대신」이라고 적는 것은 괜찮다.
  스캐너는 global-styles.test.ts 와 같은 방식이다 — readdirSync 에 withFileTypes 를 줘 목록과 종류를
  한 번에 받는다(그 사이 파일이 사라져도 ENOENT 로 넘어지지 않는다, #349).
*/

const SRC_ROOT = path.resolve(__dirname, '../..')

const collectSourceFiles = (dir: string): string[] => {
  const out: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue

    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full))
    } else if (
      entry.isFile() &&
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      out.push(full)
    }
  }

  return out
}

/** 줄 수를 지키며 주석을 공백으로 바꾼다(`https://` 의 `//` 는 주석이 아니다). */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\/|(?<!:)\/\/[^\n]*/g, match =>
    match.replace(/[^\n]/g, ' '),
  )

/** `window.confirm(` · `globalThis.confirm(` · `self.confirm(` · 맨 `confirm(` 호출. */
const CONFIRM_CALL =
  /(?:\b(?:window|globalThis|self)\s*\.\s*confirm|(?<![\w$.])confirm)\s*\(/

const findConfirmCalls = (source: string) =>
  stripComments(source)
    .split('\n')
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter(({ text }) => CONFIRM_CALL.test(text))

describe('window.confirm 금지 가드', () => {
  it('스캐너는 호출만 잡고, 주석·onConfirm 같은 이름은 넘긴다', () => {
    expect(
      findConfirmCalls("if (!window.confirm('지울까요?')) return"),
    ).toHaveLength(1)
    expect(findConfirmCalls('globalThis.confirm("x")')).toHaveLength(1)
    expect(findConfirmCalls('const ok = confirm("x")')).toHaveLength(1)
    expect(findConfirmCalls('// window.confirm 대신 시트를 쓴다')).toHaveLength(
      0,
    )
    expect(findConfirmCalls('/* window.confirm(\n) */')).toHaveLength(0)
    expect(findConfirmCalls('onConfirm()')).toHaveLength(0)
    expect(findConfirmCalls('sheet.confirm()')).toHaveLength(0)
  })

  it('src 의 어떤 소스도 window.confirm 을 부르지 않는다 — 확인은 ConfirmSheet 로', () => {
    const offenders = collectSourceFiles(SRC_ROOT).flatMap(file =>
      findConfirmCalls(readFileSync(file, 'utf8')).map(
        ({ line, text }) => `${path.relative(SRC_ROOT, file)}:${line} ${text}`,
      ),
    )

    expect(offenders).toEqual([])
  })
})
