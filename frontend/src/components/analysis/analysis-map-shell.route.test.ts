import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 지도 셸의 **소스 계약**(map-shell.md D7 TC-MS-060~063).
 *
 * 라우트 트리와 컴포넌트 배선은 렌더 테스트로 잡히지 않는다 — `(map-shell)` 그룹
 * 경계가 무너지면 `/analysis/simulation` 까지 지도가 깔리고, 에코 가드가 사라지면
 * URL 이 무한 진동한다. 둘 다 조용히 깨지므로 소스로 못 박는다.
 */

const analysisRoot = fileURLToPath(
  new URL('../../../app/(shell)/analysis', import.meta.url),
)
const componentDir = fileURLToPath(new URL('.', import.meta.url))

const read = (path: string) => readFileSync(path, 'utf8')

/**
 * 주석을 지운 소스. "이 코드가 사라졌다"를 문자열로 검증할 때 필요하다 —
 * 사라진 이유를 설명하는 주석 자체가 그 문자열을 담고 있기 때문이다.
 */
const readCode = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

describe('라우트 트리 (TC-MS-060)', () => {
  it('@modal 병렬·인터셉팅 라우트가 존재하지 않는다', () => {
    expect(existsSync(`${analysisRoot}/@modal`)).toBe(false)
    // `{children}{modal}` 레이아웃은 @modal 이 없어지면 존재 이유가 없다.
    expect(existsSync(`${analysisRoot}/layout.tsx`)).toBe(false)
  })

  it('(map-shell) 그룹 안에 두 라우트와 레이아웃만 있다', () => {
    const group = `${analysisRoot}/(map-shell)`

    expect(readdirSync(group).sort()).toEqual([
      'layout.tsx',
      'page.tsx',
      'result',
    ])
    expect(readdirSync(`${group}/result`)).toEqual(['page.tsx'])
  })

  it('결과 표면이 한 벌만 남는다 — 독립 결과 페이지는 폐기됐다', () => {
    expect(existsSync(`${componentDir}/analysis-result-page.tsx`)).toBe(false)
    expect(existsSync(`${componentDir}/analysis-result-layer.tsx`)).toBe(true)
    expect(existsSync(`${analysisRoot}/result`)).toBe(false)
  })
})

describe('그룹 경계 (TC-MS-061)', () => {
  it('report·simulation 은 그룹 밖이라 지도 셸이 걸리지 않는다', () => {
    expect(existsSync(`${analysisRoot}/report/page.tsx`)).toBe(true)
    expect(existsSync(`${analysisRoot}/simulation/page.tsx`)).toBe(true)
    expect(existsSync(`${analysisRoot}/(map-shell)/report`)).toBe(false)
    expect(existsSync(`${analysisRoot}/(map-shell)/simulation`)).toBe(false)
  })

  it('지도 셸은 (map-shell) 레이아웃에서만 렌더된다', () => {
    const layout = read(`${analysisRoot}/(map-shell)/layout.tsx`)
    expect(layout).toContain('AnalysisMapShell')

    // 그룹 밖 라우트들이 셸을 직접 불러 쓰지 않는지 확인한다.
    ;[
      `${analysisRoot}/report/page.tsx`,
      `${analysisRoot}/simulation/page.tsx`,
      `${analysisRoot}/simulation/compare/page.tsx`,
      `${analysisRoot}/simulation/report/page.tsx`,
    ].forEach(path => {
      expect(read(path)).not.toContain('analysis-map-shell')
    })
  })
})

describe('AnalysisResultModalSurface 계약 (TC-MS-062)', () => {
  const src = read(`${componentDir}/analysis-result-modal.tsx`)
  const code = readCode(`${componentDir}/analysis-result-modal.tsx`)

  it('surface export 는 유지된다 — ai-report-panel 이 크게보기로 재사용한다', () => {
    expect(src).toContain('export function AnalysisResultModalSurface')
    expect(read(`${componentDir}/ai-report/ai-report-panel.tsx`)).toContain(
      'AnalysisResultModalSurface',
    )
  })

  it('기본 export(router.back 닫기)는 사라졌다', () => {
    expect(code).not.toContain('export default')
    expect(code).not.toContain('router.back()')
    expect(code).not.toContain('useRouter')
  })
})

describe('지도 셸 배선', () => {
  const src = read(`${componentDir}/analysis-map-shell.tsx`)
  const code = readCode(`${componentDir}/analysis-map-shell.tsx`)

  // TC-MS-063
  it('mapLayer 초기값을 초기 카메라 level 에서 유도한다 (idle 을 기다리지 않는다)', () => {
    expect(src).toContain('resolveMapLayerByZoom(initialCamera.level)')
  })

  it('첫 조회 bounds 를 카메라 근사 창에서 시작한다', () => {
    expect(src).toContain('createCameraBounds(initialCamera)')
    expect(code).not.toContain('SEOUL_MAP_BOUNDS')
  })

  // TC-MS-034 / TC-MS-038 — 카메라 URL 갱신은 항상 replace 다
  it('카메라 갱신에 push 를 쓰지 않는다', () => {
    const settle = src.slice(
      src.indexOf('const handleCameraSettle'),
      src.indexOf('const handleCameraSettle') + 1200,
    )
    expect(settle).toContain('router.replace(')
    expect(settle).not.toContain('router.push(')
  })

  // TC-MS-040~042 — 닫기 폴백
  it('닫기는 push 로 열었을 때만 back() 이고 그 외에는 replace 다', () => {
    expect(src).toContain('openedByPushRef')
    const close = src.slice(
      src.indexOf('const closeResultLayer'),
      src.indexOf('const closeResultLayer') + 500,
    )
    expect(close).toContain('router.back()')
    expect(close).toContain('createAnalysisExplorerHref(selection, camera)')
    expect(code).not.toContain('history.length')
    expect(code).not.toContain('document.referrer')
  })

  // TC-MS-050 / TC-MS-052 — 좁은 뷰포트 + 결과 열림이면 지도 언마운트
  it('좁은 뷰포트에서 결과가 열리면 지도와 지도 쿼리를 끈다', () => {
    expect(src).toContain(
      'const shouldMountMap = !resultOpen || narrow === false',
    )
    expect(src).toContain('enabled: shouldMountMap')
    expect(src).toContain("shouldMountMap && mapLayer === 'commercial'")
    expect(src).toContain('shouldMountMap ? (')
  })

  // D6 — 배경 inert
  it('결과 레이어가 열리면 배경 표면을 inert 로 만든다', () => {
    expect(src).toContain('inert={resultOpen}')
  })
})

describe('결과 레이어 배선 (TC-MS-043)', () => {
  const src = read(`${componentDir}/analysis-result-layer.tsx`)

  it('X·Escape·배경 mousedown 이 모두 같은 closeResultLayer 를 쓴다', () => {
    // surface 는 Escape·배경 mousedown 을, view 는 X 버튼을 각각 같은 콜백으로 받는다.
    expect(src).toContain('onClose={closeResultLayer}')
    expect(src.match(/onClose=\{closeResultLayer\}/g)).toHaveLength(2)
    expect(src).toContain('useAnalysisMapShell')
  })
})

describe('결과 뷰의 URL 계약', () => {
  const src = read(`${componentDir}/analysis-result-view.tsx`)
  const code = readCode(`${componentDir}/analysis-result-view.tsx`)

  it('기간을 로컬 state 가 아니라 URL 에서 읽는다', () => {
    expect(src).toContain('const periodCode = selection.periodCode')
    expect(code).not.toContain('useState<string>(selection.periodCode)')
  })

  it('기간 전환도 탭 전환과 같은 replace 정책이다', () => {
    const handler = src.slice(
      src.indexOf('const handlePeriodChange'),
      src.indexOf('const handlePeriodChange') + 400,
    )
    expect(handler).toContain('router.replace(')
    expect(handler).not.toContain('router.push(')
  })

  // TC-MS-023 — 탭 전환이 c 를 지우지 않는다
  it('탭·기간 전환 href 가 카메라를 보존한다', () => {
    // 포맷터가 인자를 줄바꿈해도 깨지지 않게 공백을 눌러 비교한다.
    const flat = code.replace(/\s+/g, ' ')

    expect(flat).toContain('createResultTabHref(selection, tab, camera)')
    expect(flat).toContain('activeTab, camera')
    // 카메라를 받는 빌더 시그니처 자체도 못 박는다.
    expect(flat).toContain('camera?: MapCamera | null,')
  })

  // D4-5 — 닫기 문구·아이콘 통일
  it('닫기 버튼이 모든 경로에서 X + 상권 분석 결과 닫기 다', () => {
    expect(code).toContain('aria-label="상권 분석 결과 닫기"')
    expect(code).not.toContain("'조건 다시 선택'")
    expect(code).not.toContain('ArrowLeft')
  })
})
