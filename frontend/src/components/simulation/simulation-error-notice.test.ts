import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import type { NormalizedApiError } from '@/lib/api/api-error'

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
  onReselect?: (step: 'franchise' | 'district' | 'service' | 'store') => void
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

  it('사라진 브랜드(404)는 업종 단계로 돌려보낸다', () => {
    const markup = render({
      error: error({
        kind: 'not-found',
        status: 404,
        code: 'SIMULATION_003',
        message: '존재하지 않는 프랜차이즈입니다.',
      }),
      onReselect: () => {},
    })

    expect(markup).toContain('업종 다시 선택')
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
