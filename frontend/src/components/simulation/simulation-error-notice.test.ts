import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import type { NormalizedApiError } from '@/lib/api/api-error'
import type { SimulationConditionSection } from '@/lib/simulation/conditions'

const error = (
  overrides: Partial<NormalizedApiError> = {},
): NormalizedApiError => ({
  kind: 'server',
  status: 500,
  code: null,
  message: '일시적인 문제가 발생했어요.',
  fieldErrors: [],
  ...overrides,
})

const render = (props: {
  error: NormalizedApiError
  onRetry?: () => void
  onReselect?: (step: SimulationConditionSection) => void
}) => renderToStaticMarkup(createElement(SimulationErrorNotice, props))

describe('SimulationErrorNotice', () => {
  it('5xx·무응답에는 재시도 버튼을 붙인다', () => {
    const markup = render({
      error: error({ kind: 'server' }),
      onRetry: () => {},
    })

    expect(markup).toContain('다시 시도')
    expect(markup).toContain('일시적인 문제가 발생했어요.')

    const network = render({
      error: error({ kind: 'network', status: null }),
      onRetry: () => {},
    })
    expect(network).toContain('다시 시도')
  })

  it('404에는 재시도 버튼이 없고 서버 메시지를 그대로 보여준다', () => {
    const markup = render({
      error: error({
        kind: 'not-found',
        status: 404,
        code: 'SIMULATION_002',
        message: '해당 자치구의 임대료 데이터가 없습니다.',
      }),
      onRetry: () => {},
      onReselect: () => {},
    })

    expect(markup).not.toContain('다시 시도')
    expect(markup).toContain('해당 자치구의 임대료 데이터가 없습니다.')
    expect(markup).toContain('자치구 다시 선택')
  })

  it('사라진 브랜드(404)는 브랜드 단계로 돌려보낸다', () => {
    const markup = render({
      error: error({
        kind: 'not-found',
        status: 404,
        code: 'SIMULATION_003',
        message: '존재하지 않는 프랜차이즈입니다.',
      }),
      onReselect: () => {},
    })

    expect(markup).toContain('브랜드 다시 선택')
    expect(markup).not.toContain('업종 다시 선택')
    expect(markup).not.toContain('다시 시도')
  })

  it('요청 검증 실패는 필드별 메시지를 나열하고 재시도하지 않는다', () => {
    const markup = render({
      error: error({
        kind: 'client',
        status: 400,
        code: 'SIMULATION_109',
        message: '요청 값을 확인해 주세요.',
        fieldErrors: [
          {
            code: 'SIMULATION_109',
            field: 'storeSize',
            message: 'storeSize는 1 이상이어야 합니다.',
          },
        ],
      }),
      onRetry: () => {},
      onReselect: () => {},
    })

    expect(markup).not.toContain('다시 시도')
    expect(markup).toContain('storeSize는 1 이상이어야 합니다.')
    expect(markup).toContain('매장 조건 다시 선택')
  })

  it('모르는 404는 단계 이동 버튼 없이 메시지만 보여준다', () => {
    const markup = render({
      error: error({
        kind: 'not-found',
        status: 404,
        code: null,
        message: '요청한 데이터가 없습니다.',
      }),
      onReselect: () => {},
    })

    expect(markup).toContain('요청한 데이터가 없습니다.')
    expect(markup).not.toContain('다시 선택')
    expect(markup).not.toContain('다시 시도')
  })
})

/*
 * C5 — 비교 화면은 조건이 둘이다. 어느 쪽이 문제인지 밝히고, 되돌릴 섹션을 모르는 비재시도 오류에도
 * 그 쪽 편집기로 가는 버튼을 둔다 — 404 에 버튼이 하나도 없으면 사용자가 막힌다.
 */
describe('SimulationErrorNotice — 비교 쪽 표시 (C5)', () => {
  const scope = { label: '조건 B', onEdit: () => {} }

  it('어느 쪽을 확인할지 밝히고 섹션 버튼 이름에 쪽을 붙인다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationErrorNotice, {
        error: error({
          kind: 'not-found',
          status: 404,
          code: 'SIMULATION_003',
          message: '존재하지 않는 프랜차이즈입니다.',
        }),
        onReselect: () => {},
        scope,
      }),
    )

    expect(markup).toContain('조건 B를 확인해 주세요.')
    expect(markup).toMatch(
      /조건 B <!-- -->브랜드 다시 선택|조건 B 브랜드 다시 선택/,
    )
  })

  it('되돌릴 섹션을 모르는 404 에도 그 쪽을 고치러 가는 버튼이 있다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationErrorNotice, {
        error: error({ kind: 'not-found', status: 404, code: null }),
        scope,
      }),
    )

    expect(markup).toContain('조건 B 고치기')
    expect(markup).not.toContain('다시 시도')
  })

  it('쪽을 모르면(단일 화면) 그대로다', () => {
    const markup = render({
      error: error({ kind: 'not-found', status: 404, code: null }),
    })

    expect(markup).not.toContain('고치기')
    expect(markup).not.toContain('확인해 주세요')
  })
})

describe('SimulationErrorNotice — 필드 이름·제목 수준 (X1·X4)', () => {
  const validation = (field: string) =>
    error({
      kind: 'client',
      status: 400,
      code: 'SIMULATION_104',
      message: '요청 값을 확인해 주세요.',
      fieldErrors: [
        {
          code: 'SIMULATION_104',
          field,
          // BE SimulationValidationMessage 의 실제 문구다(한국어).
          message: '매장 면적(㎡)은 1 이상이어야 합니다.',
        },
      ],
    })

  it('필드 머리에 API 필드명 대신 한국어 이름을 쓴다', () => {
    const markup = render({ error: validation('storeSize') })

    expect(markup).toContain('<strong>매장 면적</strong>')
    expect(markup).not.toContain('<strong>storeSize</strong>')
  })

  it('모르는 필드는 머리를 빼고 메시지만 둔다 — 영문 키를 노출하지 않는다', () => {
    const markup = render({ error: validation('somethingNew') })

    expect(markup).not.toContain('somethingNew')
    expect(markup).toContain('매장 면적(㎡)은 1 이상이어야 합니다.')
  })

  it('제목은 기본 h3, 페이지 h1 바로 아래면 h2 로 둘 수 있다', () => {
    const base = render({ error: error() })
    const top = renderToStaticMarkup(
      createElement(SimulationErrorNotice, {
        error: error(),
        headingLevel: 2,
      }),
    )

    expect(base).toMatch(/<h3[^>]*>잠시 문제가 생겼어요<\/h3>/)
    expect(top).toMatch(/<h2[^>]*>잠시 문제가 생겼어요<\/h2>/)
  })
})
