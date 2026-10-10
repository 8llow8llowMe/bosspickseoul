// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SimulationBuilderPage from '@/components/simulation/simulation-builder-page'
import { SIMULATION_AUTO_CALCULATE_DELAY_MS } from '@/lib/simulation/auto-calculate'
import type { SimulationConditionSection } from '@/lib/simulation/conditions'
import * as api from '@/lib/api/simulation'

/*
 * 이 파일이 잡는 회귀는 **배선**이다. PR #249 에서 사람이 잡아낸 Important 결함 3건 중
 * 2건이 정확히 이 파일의 배선 결함이었고(첫 마운트 포커스 강탈 · 앞 단계의 「변경」이
 * 죽은 컨트롤), 둘 다 브라우저 실측과 jsdom 재현으로만 드러났다(#250).
 *
 * 포커스는 `renderToStaticMarkup` 문자열 단언으로는 원리적으로 볼 수 없다 — 마운트
 * 이펙트도 `document.activeElement` 도 없다. 그래서 이 파일만 jsdom + 실제 DOM 마운트로
 * 돈다(`analysis-result-modal.portal.test.ts` 와 같은 관용구).
 *
 * 레이아웃(펼친 설명이 잘리는지 등)은 여기서도 잡히지 않는다. jsdom 은 CSS 를 계산하지
 * 않으므로 그건 여전히 브라우저 실측의 몫이다 — 잘못된 안심을 만들지 않기 위해 적어 둔다.
 */

/* 진입 쿼리. 복원(#568)·진입 시 자동 계산(#604)을 보는 테스트만 바꾼다. */
const navigation = vi.hoisted(() => ({ search: '' }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

vi.mock('@/lib/api/simulation', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api/simulation')>()),
  fetchSimulationStoreSizes: vi.fn(),
  fetchSimulationFranchisees: vi.fn(),
  createSimulationReport: vi.fn(),
}))

const ok = <T>(dataBody: T) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody,
})

const failure = (resultCode: string, message: string) => ({
  dataHeader: { success: false, resultCode, resultMessage: message },
  dataBody: null,
})

const storeSizes = ok({
  serviceCode: 'CS100001',
  serviceName: '한식음식점',
  dataBaseYear: '2024',
  small: { sizeSquareMeter: 33, storeCount: 1 },
  medium: { sizeSquareMeter: 66, storeCount: 2 },
  large: { sizeSquareMeter: 99, storeCount: 3 },
})

const franchisees = ok({
  franchisees: [
    {
      franchiseeId: 7,
      brandName: '테스트브랜드',
      serviceCode: 'CS100001',
      serviceName: '한식음식점',
    },
  ],
  lastId: null,
})

/* ---------------------------------------------------------------- *
 * DOM 조회 — 섹션 루트 id 로 좁힌다. 요약 바·결과 패널에도 같은 문구의
 * 컨트롤이 있어서 이름만으로 고르면 엉뚱한 것을 집는다.
 * ---------------------------------------------------------------- */

const header = (section: SimulationConditionSection) => {
  const node = document.querySelector<HTMLButtonElement>(
    `#simulation-section-${section} button[aria-expanded]`,
  )
  if (!node)
    throw new Error(`${section} 헤더 버튼이 없다(잠긴 단계는 button 이 아니다)`)
  return node
}

const isExpanded = (section: SimulationConditionSection) =>
  header(section).getAttribute('aria-expanded') === 'true'

/** 칩은 `title={choice.name}` 을 달고 있어 이름이 정확히 일치한다(힌트 문구가 섞이지 않는다). */
const chip = (name: string) => {
  const nodes = [
    ...document.querySelectorAll<HTMLButtonElement>('button[title]'),
  ].filter(node => node.title === name)
  if (nodes.length !== 1) {
    throw new Error(`칩 「${name}」이 ${nodes.length}개다`)
  }
  return nodes[0]
}

const renderPage = (variant: 'standalone' | 'analysis' = 'standalone') =>
  render(
    createElement(
      QueryClientProvider,
      {
        client: new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        }),
      },
      createElement(SimulationBuilderPage, { variant }),
    ),
  )

/** 개인 창업 → 자치구 → 업종. 브랜드가 필요 없는 최단 경로다. */
const fillThroughService = () => {
  fireEvent.click(chip('개인 창업'))
  fireEvent.click(chip('강남구'))
  fireEvent.click(chip('한식음식점'))
}

beforeEach(() => {
  vi.mocked(api.fetchSimulationStoreSizes).mockResolvedValue(
    storeSizes as never,
  )
  vi.mocked(api.fetchSimulationFranchisees).mockResolvedValue(
    franchisees as never,
  )
  vi.mocked(api.createSimulationReport).mockResolvedValue(
    failure('SIMULATION_002', '해당 자치구의 임대료 기준이 없습니다.') as never,
  )

  // jsdom 에 없는 브라우저 API. 없으면 계산·재선택 경로가 TypeError 로 죽는다.
  Element.prototype.scrollIntoView = vi.fn()
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as never
  window.location.hash = ''
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  navigation.search = ''
  // 거울(#568)이 주소창을 바꾼다. 다음 테스트가 앞 테스트의 주소에서 시작하지 않게 되돌린다.
  window.history.replaceState(null, '', '/')
})

describe('SimulationBuilderPage — 포커스 배선', () => {
  /*
    `lastFocused` 의 초기값이 null 이면 마운트 직후 effect 가 「자동 진행」으로 착각해
    페이지를 연 사람의 포커스를 1단계 버튼으로 끌어간다(PR #249 Important).
  */
  it('첫 마운트에는 포커스를 훔치지 않는다', () => {
    renderPage()

    expect(isExpanded('franchise')).toBe(true)
    expect(document.activeElement).toBe(document.body)
  })

  it('자동 진행하면 새로 열린 단계의 헤더로 포커스를 옮긴다', () => {
    renderPage()

    fireEvent.click(chip('개인 창업'))

    expect(isExpanded('district')).toBe(true)
    expect(document.activeElement).toBe(header('district'))
  })

  /*
    마지막 조건을 고르면 열려 있던 패널이 통째로 사라진다. 예전 early return 은 이
    전이를 그냥 넘겨 포커스가 복구 없이 <body> 로 떨어졌다.
  */
  it('전부 접히면 직전에 열려 있던 헤더로 포커스를 돌려준다', async () => {
    renderPage()
    fillThroughService()

    expect(isExpanded('store')).toBe(true)

    fireEvent.change(screen.getByLabelText('면적 직접 입력 (제곱미터)'), {
      target: { value: '66' },
    })

    /*
      마지막 칩을 **포커스한 뒤** 누른다. 실제 클릭은 포커스를 옮기지만 fireEvent 는
      옮기지 않아서, 이 줄이 없으면 앞선 자동 진행이 남겨 둔 포커스를 그대로 보고
      복구 로직이 죽어 있어도 초록이 된다(거짓 가드).
    */
    chip('1층').focus()
    expect(document.activeElement).toBe(chip('1층'))

    fireEvent.click(chip('1층'))

    // 네 조건이 다 찼으므로 열 단계가 없다. 방금 누른 칩은 패널과 함께 사라졌다.
    expect(header('store').getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(header('store'))
    await waitFor(() =>
      expect(api.fetchSimulationStoreSizes).toHaveBeenCalled(),
    )
  })
})

describe('SimulationBuilderPage — 열림 단계 배선', () => {
  /*
    gap 을 사용자 의사보다 앞세우면 완료된 앞 단계의 「변경」이 눌러도 아무 일이
    없는 죽은 컨트롤이 된다(PR #249 Important).
  */
  it('완료된 앞 단계의 「변경」이 그 단계를 펼친다', () => {
    renderPage()
    fireEvent.click(chip('개인 창업'))

    expect(isExpanded('district')).toBe(true)

    fireEvent.click(header('franchise'))

    expect(isExpanded('franchise')).toBe(true)
    expect(isExpanded('district')).toBe(false)
  })

  it('펼친 단계를 다시 누르면 접고 자동 진행으로 돌아간다', () => {
    renderPage()
    fireEvent.click(chip('개인 창업'))
    fireEvent.click(header('franchise'))

    fireEvent.click(header('franchise'))

    expect(isExpanded('district')).toBe(true)
  })

  /*
    선택 핸들러는 매번 openedByUser 를 비운다. 비우지 않으면 앞 단계를 고친 뒤에도
    그 단계가 계속 열려 있어 자동 진행이 멈춘다.
  */
  it('앞 단계를 고쳐도 선택 즉시 자동 진행이 되살아난다', () => {
    renderPage()
    fillThroughService()

    // 자치구를 다시 펼쳐 고른다 — openedByUser = 'district'.
    fireEvent.click(header('district'))
    expect(isExpanded('district')).toBe(true)

    fireEvent.click(chip('서초구'))

    // 비어 있는 첫 단계(매장 조건)로 넘어간다. 자치구가 열린 채로 남지 않는다.
    expect(isExpanded('district')).toBe(false)
    expect(isExpanded('store')).toBe(true)
  })

  /*
    매장 조건의 두 컨트롤(면적·층)이 비우는지는 **사용자가 직접 매장 조건을 펼친
    상태**에서만 드러난다. openedByUser 가 남아 있으면 resolveOpenSection 이 그것을
    이겨서, 네 조건이 다 찼는데도 패널이 펼친 채로 남는다.
  */
  it('직접 펼친 매장 조건도 선택하면 비워져 전부 접힌다', () => {
    renderPage()
    fillThroughService()

    // 자치구를 펼쳤다가 매장 조건을 다시 펼친다 — openedByUser = 'store'.
    fireEvent.click(header('district'))
    fireEvent.click(header('store'))
    expect(isExpanded('store')).toBe(true)

    fireEvent.change(screen.getByLabelText('면적 직접 입력 (제곱미터)'), {
      target: { value: '66' },
    })
    // 크기만으로는 미완료라 매장 조건이 계속 열려 있다.
    expect(isExpanded('store')).toBe(true)

    fireEvent.click(chip('1층'))

    expect(header('store').getAttribute('aria-expanded')).toBe('false')
  })

  /*
    브랜드는 프랜차이즈일 때만 있는 독립 섹션이다(Q4). 업종을 고르면 업종 단계가 끝나고
    브랜드 단계가 열리며, 브랜드를 고르면 매장 조건으로 넘어간다.
  */
  /*
    브랜드 기본 목록은 인기순이 아니라 찾는 브랜드가 안 보일 수 있다. 그때 이 화면에서
    막히지 않게 「개인 창업 기준으로 계산하기」가 창업 형태를 바꾸고 다음 단계로 넘긴다.
  */
  it('찾는 브랜드가 없으면 개인 창업 기준으로 바꿔 다음 단계로 넘어간다', async () => {
    renderPage()
    fireEvent.click(chip('프랜차이즈'))
    fireEvent.click(chip('강남구'))
    fireEvent.click(chip('한식음식점'))

    fireEvent.click(
      await screen.findByRole('button', {
        name: '개인 창업 기준으로 계산하기',
      }),
    )

    expect(document.querySelector('#simulation-section-brand')).toBeNull()
    expect(header('franchise').textContent).toContain('개인 창업')
    expect(isExpanded('store')).toBe(true)
  })

  it('브랜드 조회가 실패해도 개인 창업 기준으로 빠져나갈 수 있다', async () => {
    vi.mocked(api.fetchSimulationFranchisees).mockResolvedValue(
      failure('COMMERCIAL_100', '요청 값을 확인해 주세요.') as never,
    )
    renderPage()
    fireEvent.click(chip('프랜차이즈'))
    fireEvent.click(chip('강남구'))
    fireEvent.click(chip('한식음식점'))

    await screen.findByText('요청 값을 확인해 주세요.')
    fireEvent.click(
      screen.getByRole('button', { name: '개인 창업 기준으로 계산하기' }),
    )

    expect(document.querySelector('#simulation-section-brand')).toBeNull()
    expect(isExpanded('store')).toBe(true)
  })

  it('프랜차이즈는 업종 → 브랜드 → 매장 조건 순서로 넘어간다', async () => {
    renderPage()
    fireEvent.click(chip('프랜차이즈'))
    fireEvent.click(chip('강남구'))
    fireEvent.click(chip('한식음식점'))

    expect(isExpanded('service')).toBe(false)
    expect(isExpanded('brand')).toBe(true)
    expect(document.activeElement).toBe(header('brand'))
    // 첫 조회가 몇 초 걸릴 수 있어(dev 실측 5.8초) 스켈레톤만이 아니라 문구를 보인다.
    expect(
      screen.getByText('브랜드를 불러오는 중이에요').closest('[role="status"]'),
    ).not.toBeNull()

    const brand = await screen.findByRole('button', { name: /테스트브랜드/ })
    fireEvent.click(brand)

    expect(isExpanded('brand')).toBe(false)
    expect(header('brand').textContent).toContain('테스트브랜드')
    expect(isExpanded('store')).toBe(true)
  })

  it('번호는 실제로 놓인 섹션 순서다 — 프랜차이즈면 매장 조건이 5번이다', () => {
    renderPage()

    // 창업 형태 전에는 브랜드 섹션이 없다.
    expect(document.querySelector('#simulation-section-brand')).toBeNull()

    fireEvent.click(chip('프랜차이즈'))

    expect(document.querySelector('#simulation-section-brand')).not.toBeNull()
    expect(
      document.querySelector('#simulation-section-store h2')?.textContent,
    ).toMatch(/^5매장 조건/)
  })

  /*
    `franchisees` 는 serviceCode 없이 부르면 400 이다. 업종 전 브랜드 섹션은 펼칠 수 없는
    잠긴 줄이어야 하고(버튼이 아니다), 그 자리에서 순서를 알려 준다.
  */
  it('업종을 고르기 전 브랜드 섹션은 잠겨 있다', () => {
    renderPage()
    fireEvent.click(chip('프랜차이즈'))

    const brandSection = document.querySelector('#simulation-section-brand')
    expect(brandSection?.querySelector('button[aria-expanded]')).toBeNull()
    expect(brandSection?.textContent).toContain('업종을 고르면 열려요')
    expect(api.fetchSimulationFranchisees).not.toHaveBeenCalled()
  })

  it('개인 창업으로 바꾸면 브랜드 섹션이 사라지고 고른 브랜드도 버린다', async () => {
    renderPage()
    fireEvent.click(chip('프랜차이즈'))
    fireEvent.click(chip('강남구'))
    fireEvent.click(chip('한식음식점'))
    fireEvent.click(await screen.findByRole('button', { name: /테스트브랜드/ }))

    fireEvent.click(header('franchise'))
    fireEvent.click(chip('개인 창업'))

    expect(document.querySelector('#simulation-section-brand')).toBeNull()
    expect(
      document.querySelector('#simulation-section-store h2')?.textContent,
    ).toMatch(/^4매장 조건/)

    // 다시 프랜차이즈로 돌아오면 비어 있는 브랜드가 곧바로 열리고, 앞에서 고른 브랜드는
    // 되살아나지 않는다(선택 표시가 없다).
    fireEvent.click(header('franchise'))
    fireEvent.click(chip('프랜차이즈'))

    expect(isExpanded('brand')).toBe(true)
    const again = await screen.findByRole('button', { name: /테스트브랜드/ })
    expect(again.getAttribute('aria-pressed')).toBe('false')
  })
})

describe('SimulationBuilderPage — 면적 직접 입력의 진행 시점', () => {
  /*
    직접 입력은 한 글자마다 onChange 를 부른다. 그때마다 진행시키면 층을 먼저 고른
    사람이 `66` 을 치려다 `6` 에서 섹션이 접혀 6㎡ 로 확정됐다(2026-10-01 실측).
    진행은 Enter·blur 에서만 한다(명세 D4-1-1 규칙 3).
  */
  const sizeInput = () => screen.getByLabelText('면적 직접 입력 (제곱미터)')

  const typeSize = (value: string) =>
    fireEvent.change(sizeInput(), { target: { value } })

  it('층을 먼저 고른 뒤 면적을 입력해도 입력하는 동안에는 접히지 않는다', () => {
    renderPage()
    fillThroughService()
    fireEvent.click(chip('1층'))

    typeSize('6')
    expect(isExpanded('store')).toBe(true)

    typeSize('66')
    expect(isExpanded('store')).toBe(true)

    fireEvent.blur(sizeInput())

    expect(isExpanded('store')).toBe(false)
    expect(header('store').textContent).toContain('66㎡')
  })

  it('「변경」으로 다시 연 매장 조건에서 면적을 고쳐도 첫 글자에 접히지 않는다', () => {
    renderPage()
    fillThroughService()
    typeSize('66')
    fireEvent.click(chip('1층'))
    expect(isExpanded('store')).toBe(false)

    fireEvent.click(header('store'))
    typeSize('1')
    typeSize('12')

    expect(isExpanded('store')).toBe(true)
  })

  it('Enter 로 입력을 끝내면 접고 매장 조건 헤더로 포커스를 돌려준다', () => {
    renderPage()
    fillThroughService()
    fireEvent.click(chip('1층'))

    sizeInput().focus()
    typeSize('66')
    /*
      fireEvent 는 preventDefault 가 불렸으면 false 를 돌려준다. 막지 않으면 접힌 뒤 포커스를
      받은 헤더 버튼에 뒤따르는 keypress 가 떨어져 섹션이 다시 열린다(Chrome 실측) — jsdom 은
      keypress 를 합성하지 않으므로 그 재열림 대신 「막았는가」를 단언한다.
    */
    expect(fireEvent.keyDown(sizeInput(), { key: 'Enter' })).toBe(false)

    expect(isExpanded('store')).toBe(false)
    expect(document.activeElement).toBe(header('store'))
  })

  it('층이 비어 있으면 blur 해도 매장 조건이 열린 채로 남는다', () => {
    renderPage()
    fillThroughService()

    typeSize('66')
    fireEvent.blur(sizeInput())

    expect(isExpanded('store')).toBe(true)
  })

  /*
    포커스가 같은 영역의 칩으로 옮겨 가는 blur 에서 접으면, 사용자가 누르려던 칩이
    클릭 전에 사라진다. 칩은 눌리는 순간 스스로 진행하므로 blur 는 넘긴다.
  */
  it('같은 영역의 칩으로 포커스가 옮겨 가는 blur 로는 접히지 않는다', () => {
    renderPage()
    fillThroughService()
    fireEvent.click(chip('1층'))

    typeSize('66')
    fireEvent.blur(sizeInput(), { relatedTarget: chip('1층 외') })
    expect(isExpanded('store')).toBe(true)

    fireEvent.click(chip('1층 외'))

    expect(isExpanded('store')).toBe(false)
    expect(header('store').textContent).toContain('1층 외')
  })

  /*
    Safari 는 버튼을 클릭해도 포커스를 주지 않아 blur 의 relatedTarget 이 null 이다.
    pointerdown 이 blur 보다 먼저 온다는 점으로 「영역 안을 누르는 중」을 가려낸다.
  */
  it('relatedTarget 없이 영역 안을 눌러도(Safari) 클릭 전에 접히지 않는다', () => {
    renderPage()
    fillThroughService()
    fireEvent.click(chip('1층'))

    fireEvent.focus(sizeInput())
    typeSize('66')
    fireEvent.pointerDown(chip('1층 외'))
    fireEvent.blur(sizeInput())
    expect(isExpanded('store')).toBe(true)

    fireEvent.click(chip('1층 외'))

    expect(header('store').textContent).toContain('66㎡ (약 20평) · 1층 외')
  })

  /*
    「누르는 중」 표시가 남으면 다음 blur 를 삼켜 섹션이 붙잡힌 채 열려 있다. 칩이 아닌
    곳(제목 글자)을 눌러 진행이 일어나지 않는 경로로 표시가 지워지는지 본다.
  */
  it.each([
    ['click', (node: Element) => fireEvent.click(node)],
    ['스크롤(pointercancel)', (node: Element) => fireEvent.pointerCancel(node)],
  ])('영역 안 누르기가 %s 로 끝나면 다음 blur 에서 접힌다', (_, release) => {
    renderPage()
    fillThroughService()
    fireEvent.click(chip('1층'))

    const floorHeading = screen.getByRole('heading', { name: '층 구분' })
    fireEvent.focus(sizeInput())
    typeSize('66')
    fireEvent.pointerDown(floorHeading)
    fireEvent.blur(sizeInput())
    expect(isExpanded('store')).toBe(true)

    release(floorHeading)
    fireEvent.blur(sizeInput())

    expect(isExpanded('store')).toBe(false)
  })
})

describe('SimulationBuilderPage — 면적 단위', () => {
  const unitButton = (name: string) => screen.getByRole('button', { name })

  /*
    평으로 넣어도 상태·요청은 ㎡ 정수다. 헤더 요약이 「66㎡ (약 20평)」으로 계산 근거(㎡)를
    밝힌다 — 평만 보여 주면 서버에 무엇이 갔는지 알 수 없다.
  */
  it('평으로 입력하면 ㎡ 로 바꿔 계산 조건에 넣는다', () => {
    renderPage()
    fillThroughService()
    fireEvent.click(chip('1층'))

    fireEvent.click(unitButton('평으로 입력'))
    const input = screen.getByLabelText('면적 직접 입력 (평)')
    fireEvent.change(input, { target: { value: '20' } })

    expect(screen.getByText('66㎡로 계산해요')).toBeTruthy()

    fireEvent.blur(input)

    expect(isExpanded('store')).toBe(false)
    expect(header('store').textContent).toContain('66㎡ (약 20평) · 1층')
  })

  it('고른 단위는 매장 조건을 접었다 다시 열어도 남는다', () => {
    renderPage()
    fillThroughService()
    fireEvent.click(chip('1층'))

    fireEvent.click(unitButton('평으로 입력'))
    fireEvent.keyDown(screen.getByLabelText('면적 직접 입력 (평)'), {
      key: 'Enter',
    })
    fireEvent.change(screen.getByLabelText('면적 직접 입력 (평)'), {
      target: { value: '20' },
    })
    fireEvent.keyDown(screen.getByLabelText('면적 직접 입력 (평)'), {
      key: 'Enter',
    })
    expect(isExpanded('store')).toBe(false)

    fireEvent.click(header('store'))

    expect(unitButton('평으로 입력').getAttribute('aria-pressed')).toBe('true')
    expect(
      (screen.getByLabelText('면적 직접 입력 (평)') as HTMLInputElement).value,
    ).toBe('20')
  })

  /*
    토글은 입력칸과 같은 영역 안에 있다. 입력 중에 토글을 누르면 그 blur 를 진행으로 치지
    않아야 한다(PR 1 의 「영역 안을 누르는 중」 규칙). jsdom 의 click 은 blur 를 일으키지
    않으므로 pointerdown → blur → click 순서를 직접 낸다.
  */
  it('입력하다 단위를 바꿔도 매장 조건이 접히지 않는다', () => {
    renderPage()
    fillThroughService()
    fireEvent.click(chip('1층'))

    const input = screen.getByLabelText('면적 직접 입력 (제곱미터)')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '66' } })
    fireEvent.pointerDown(unitButton('평으로 입력'))
    fireEvent.blur(input)
    fireEvent.click(unitButton('평으로 입력'))

    expect(isExpanded('store')).toBe(true)
    expect(
      (screen.getByLabelText('면적 직접 입력 (평)') as HTMLInputElement).value,
    ).toBe('20')
  })

  it('값이 되기 전의 글자는 단위를 바꿔도 지우지 않는다', () => {
    renderPage()
    fillThroughService()

    fireEvent.click(unitButton('평으로 입력'))
    fireEvent.change(screen.getByLabelText('면적 직접 입력 (평)'), {
      target: { value: '18.' },
    })
    fireEvent.click(unitButton('제곱미터로 입력'))

    expect(
      (screen.getByLabelText('면적 직접 입력 (제곱미터)') as HTMLInputElement)
        .value,
    ).toBe('18.')
  })

  it('단위를 바꾸면 이미 넣은 값을 새 단위로 다시 보여 준다', () => {
    renderPage()
    fillThroughService()

    fireEvent.change(screen.getByLabelText('면적 직접 입력 (제곱미터)'), {
      target: { value: '66' },
    })
    expect(screen.getByText('약 20평')).toBeTruthy()

    fireEvent.click(unitButton('평으로 입력'))

    expect(
      (screen.getByLabelText('면적 직접 입력 (평)') as HTMLInputElement).value,
    ).toBe('20')
    expect(unitButton('평으로 입력').getAttribute('aria-pressed')).toBe('true')
    // 단위만 바꿨으므로 매장 조건은 열린 채다(층이 비어 있기도 하다).
    expect(isExpanded('store')).toBe(true)
  })
})

describe('SimulationBuilderPage — 해시로 들어오는 경로', () => {
  /*
    리포트 화면의 「다시 선택」은 `#simulation-section-<section>` 을 달고 빌더로
    돌아온다. 해시는 서버로 가지 않으므로 마운트 후 effect 에서 한 번 읽는다.
  */
  it('해시가 지목한 단계를 펼친 채로 시작한다', () => {
    window.location.hash = '#simulation-section-service'
    renderPage()

    expect(isExpanded('service')).toBe(true)
    expect(isExpanded('franchise')).toBe(false)
  })

  it('모르는 해시는 무시하고 첫 미완료 단계를 연다', () => {
    window.location.hash = '#simulation-section-period'
    renderPage()

    expect(isExpanded('franchise')).toBe(true)
  })

  it('화면에 없는 단계(창업 형태 전의 브랜드)를 지목한 해시는 무시한다', () => {
    window.location.hash = '#simulation-section-brand'
    renderPage()

    expect(isExpanded('franchise')).toBe(true)
  })
})

describe('SimulationBuilderPage — 오류가 지목한 단계로 되돌리기', () => {
  /*
    계산은 조건 4개가 다 차야 가능하므로 오류 배너가 뜨는 시점엔 항상 전부 접혀 있다.
    펼치지 않고 스크롤만 하면 접힌 한 줄만 보이고 칩은 한 번 더 눌러야 나온다.
  */
  it('「다시 선택」이 그 단계를 펼치고 앵커로 스크롤한다', async () => {
    renderPage()
    fillThroughService()
    fireEvent.change(screen.getByLabelText('면적 직접 입력 (제곱미터)'), {
      target: { value: '66' },
    })
    fireEvent.click(chip('1층'))

    // 「계산하기」는 결과 패널과 하단 요약 바에 하나씩 있다. 둘 다 같은 계산을 부른다.
    fireEvent.click(screen.getAllByRole('button', { name: '계산하기' })[0])

    const reselect = await screen.findByRole('button', {
      name: /자치구 다시 선택/,
    })

    expect(isExpanded('district')).toBe(false)

    fireEvent.click(reselect)

    expect(isExpanded('district')).toBe(true)
  })
})

/* 자동 계산의 디바운스(SIMULATION_AUTO_CALCULATE_DELAY_MS)보다 넉넉히 기다린다. */
const settle = () => new Promise(resolve => setTimeout(resolve, 450))

/** 개인 창업 · 강남구 · 한식음식점 · 66㎡ · 1층 — 마지막 칩(1층)이 전부 접는다. */
const fillAll = () => {
  fillThroughService()
  fireEvent.change(screen.getByLabelText('면적 직접 입력 (제곱미터)'), {
    target: { value: '66' },
  })
  fireEvent.click(chip('1층'))
}

const COMPLETE_QUERY =
  'franchisee=false&districtCode=11680&serviceCode=CS100001&storeSize=66&floorType=FIRST_FLOOR'

describe('SimulationBuilderPage — 자동 계산 (#604)', () => {
  it('마지막 조건을 고르면 버튼 없이 한 번 계산한다', async () => {
    renderPage()
    fillAll()

    await waitFor(() =>
      expect(api.createSimulationReport).toHaveBeenCalledTimes(1),
    )
    expect(api.createSimulationReport).toHaveBeenCalledWith(
      expect.objectContaining({
        franchisee: false,
        districtCode: '11680',
        serviceCode: 'CS100001',
        storeSize: 66,
        floorType: 'FIRST_FLOOR',
      }),
    )

    // 같은 조건으로는 다시 보내지 않는다 — 오류가 나도 되풀이하지 않는다.
    await settle()
    expect(api.createSimulationReport).toHaveBeenCalledTimes(1)
  })

  it('면적을 치는 동안에는 계산하지 않고 Enter 로 끝낼 때 계산한다', async () => {
    renderPage()
    fillThroughService()
    fireEvent.click(chip('1층'))

    const input = screen.getByLabelText('면적 직접 입력 (제곱미터)')
    fireEvent.change(input, { target: { value: '6' } })
    await settle()
    expect(api.createSimulationReport).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: '66' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(api.createSimulationReport).toHaveBeenCalledTimes(1),
    )
    expect(api.createSimulationReport).toHaveBeenCalledWith(
      expect.objectContaining({ storeSize: 66 }),
    )
  })

  it('미루는 사이 「계산하기」를 눌러도 같은 조건으로 두 번 보내지 않는다', async () => {
    renderPage()
    fillAll()

    fireEvent.click(screen.getAllByRole('button', { name: '계산하기' })[0])
    await settle()

    expect(api.createSimulationReport).toHaveBeenCalledTimes(1)
  })

  it('조건을 바꾸면 바뀐 조건으로 다시 계산한다', async () => {
    renderPage()
    fillAll()
    await waitFor(() =>
      expect(api.createSimulationReport).toHaveBeenCalledTimes(1),
    )

    fireEvent.click(header('store'))
    fireEvent.click(chip('1층 외'))

    await waitFor(() =>
      expect(api.createSimulationReport).toHaveBeenCalledTimes(2),
    )
    expect(api.createSimulationReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ floorType: 'OTHER' }),
    )
  })

  it('계산한 조건으로 오류가 나면 버튼은 「다시 계산」이다', async () => {
    renderPage()
    fillAll()

    await screen.findByRole('button', { name: /자치구 다시 선택/ })
    expect(
      screen.getAllByRole('button', { name: '다시 계산' }).length,
    ).toBeGreaterThan(0)
  })

  it('이미 완성된 조건으로 들어오면 진입만으로 계산하지 않는다', async () => {
    navigation.search = COMPLETE_QUERY
    renderPage()

    await settle()

    expect(api.createSimulationReport).not.toHaveBeenCalled()
    expect(
      screen.getAllByRole('button', { name: '계산하기' }).length,
    ).toBeGreaterThan(0)
  })
})

describe('SimulationBuilderPage — 입력 중 조건 보존 (#568)', () => {
  it('고를 때마다 주소창에 조건을 쓰고 히스토리는 쌓지 않는다', () => {
    window.history.replaceState(null, '', '/simulation')
    const before = window.history.length
    renderPage()

    fireEvent.click(chip('개인 창업'))
    fireEvent.click(chip('강남구'))

    const params = new URLSearchParams(window.location.search)
    expect(params.get('franchisee')).toBe('false')
    expect(params.get('districtCode')).toBe('11680')
    expect(window.history.length).toBe(before)
  })

  it('주소창에 남은 조건으로 다시 열면 고른 곳까지 그대로 돌아온다 — 새로고침·링크 공유', () => {
    window.history.replaceState(null, '', '/simulation')
    renderPage()
    fireEvent.click(chip('개인 창업'))
    fireEvent.click(chip('강남구'))
    const written = window.location.search
    cleanup()

    // 새로고침: 주소창의 쿼리가 진입 쿼리가 된다.
    navigation.search = written
    renderPage()

    expect(header('district').textContent).toContain('강남구')
    expect(isExpanded('service')).toBe(true)
  })
})

const liveStatus = () => {
  const node = document.querySelector('[role="status"][aria-live="polite"]')
  if (!node) throw new Error('계산 상태 live 영역이 없다')
  return node
}

const ok23450 = () =>
  ok({
    condition: {
      franchisee: false,
      franchiseeId: null,
      brandName: null,
      districtCode: '11680',
      districtName: '강남구',
      serviceCode: 'CS100001',
      serviceName: '한식음식점',
      storeSize: 66,
      floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
      periodCode: '20261',
    },
    dataBaseYear: '2024',
    totalPrice: 23_450,
    keyMoney: { keyMoneyRatio: 62, keyMoneyAverage: 4_200, keyMoneyLevel: 63 },
    costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: null },
    similarFranchisees: [],
    genderAgeAnalysis: null,
    seasonAnalysis: null,
  })

/** 손으로 끝내는 요청. 요청 중에 조건을 바꾸는 경쟁을 재현한다. */
const deferred = () => {
  let resolve: (value: unknown) => void = () => {}
  const promise = new Promise(next => {
    resolve = next
  })
  return { promise, resolve }
}

describe('SimulationBuilderPage — 계산 상태 낭독 (#604 리뷰)', () => {
  it('자동 계산의 시작과 완료를 live 영역이 알린다', async () => {
    const pending = deferred()
    vi.mocked(api.createSimulationReport).mockReturnValue(
      pending.promise as never,
    )
    renderPage()
    expect(liveStatus().textContent).toBe('')

    fillAll()
    await waitFor(() =>
      expect(liveStatus().textContent).toBe(
        '고른 조건으로 예상 창업 비용을 계산하고 있어요',
      ),
    )

    pending.resolve(ok23450())
    await waitFor(() =>
      expect(liveStatus().textContent).toBe('예상 총 창업 비용 2억 3,450만원'),
    )
  })

  it('실패는 오류 안내(alert)가 읽고 live 영역은 비운다 — 같은 오류를 두 번 읽지 않는다', async () => {
    renderPage()
    fillAll()

    await screen.findByRole('alert')
    expect(liveStatus().textContent).toBe('')
  })
})

/*
  #635 — 분석 경유 화면도 바꾼 자치구·업종을 주소에 남긴다. 컨텍스트는 `ctx` 키에 따로 있어, 새로고침 뒤에도
  카드는 분석 조건을 말하고 입력 화면은 바꾼 조건으로 열린다.
*/
describe('SimulationBuilderPage — 분석 경유 화면의 URL 거울 (#635)', () => {
  const ENTRY =
    '?ctxDistrictCode=11440&ctxAdministrationCode=11440660&ctxCommercialCode=3110567&ctxServiceCode=CS100001'
  const LEGACY_ENTRY =
    '?districtCode=11440&administrationCode=11440660&commercialCode=3110567&serviceCode=CS100001'

  const enter = (search: string) => {
    navigation.search = search.replace(/^\?/, '')
    window.history.replaceState(null, '', `/analysis/simulation${search}`)
    renderPage('analysis')
  }

  const contextCard = () => screen.getByLabelText('분석에서 가져온 조건')

  const changeDistrictToGangnam = () => {
    fireEvent.click(chip('개인 창업'))
    fireEvent.click(header('district'))
    fireEvent.click(chip('강남구'))
  }

  it('분석 조건으로 채운 채 열고, 그 조건을 주소의 조건 키에도 적는다', () => {
    enter(ENTRY)

    expect(header('district').textContent).toContain('마포구')
    expect(contextCard().textContent).toContain(
      '분석 조건을 그대로 채워 뒀어요',
    )
    const params = new URLSearchParams(window.location.search)
    expect(params.get('districtCode')).toBe('11440')
    expect(params.get('serviceCode')).toBe('CS100001')
    expect(params.get('ctxDistrictCode')).toBe('11440')
  })

  it('자치구를 바꾸면 조건 키는 바꾼 값, ctx 키는 진입 값이다', () => {
    enter(ENTRY)
    changeDistrictToGangnam()

    const params = new URLSearchParams(window.location.search)
    expect(params.get('districtCode')).toBe('11680')
    expect(params.get('franchisee')).toBe('false')
    expect(params.get('ctxDistrictCode')).toBe('11440')
    expect(params.get('ctxServiceCode')).toBe('CS100001')
    expect(params.get('ctxAdministrationCode')).toBe('11440660')
    expect(params.get('ctxCommercialCode')).toBe('3110567')
    expect(contextCard().textContent).toContain('조건을 직접 바꿨어요')
  })

  it('바꾼 뒤 새로고침해도 바꾼 자치구가 남고 카드는 분석 조건으로 되돌리기를 제안한다', () => {
    enter(ENTRY)
    changeDistrictToGangnam()
    const written = window.location.search
    cleanup()

    // 새로고침: 주소창의 쿼리가 진입 쿼리가 된다.
    enter(written)

    expect(header('district').textContent).toContain('강남구')
    expect(contextCard().textContent).toContain('조건을 직접 바꿨어요')
    expect(contextCard().textContent).toContain('분석 조건 · 마포구')

    fireEvent.click(
      screen.getByRole('button', { name: '분석 조건으로 되돌리기' }),
    )

    expect(header('district').textContent).toContain('마포구')
    expect(contextCard().textContent).toContain(
      '분석 조건을 그대로 채워 뒀어요',
    )
    expect(
      new URLSearchParams(window.location.search).get('districtCode'),
    ).toBe('11440')
  })

  it('옛 형식 링크도 카드와 함께 열리고, 컨텍스트를 ctx 키로 옮겨 적는다', () => {
    enter(LEGACY_ENTRY)

    expect(header('district').textContent).toContain('마포구')
    expect(contextCard().textContent).toContain(
      '분석 조건을 그대로 채워 뒀어요',
    )
    const params = new URLSearchParams(window.location.search)
    expect(params.get('ctxDistrictCode')).toBe('11440')
    expect(params.get('ctxCommercialCode')).toBe('3110567')
    expect(params.has('commercialCode')).toBe(false)
    expect(params.has('administrationCode')).toBe(false)
  })

  it('옛 형식 링크에서 바꾼 자치구도 새로고침 뒤 남고 카드는 분석 조건을 말한다', () => {
    enter(LEGACY_ENTRY)
    changeDistrictToGangnam()
    const written = window.location.search
    cleanup()

    enter(written)

    expect(header('district').textContent).toContain('강남구')
    expect(contextCard().textContent).toContain('분석 조건 · 마포구')
  })

  it('컨텍스트 없이 연 화면은 조건을 여러 번 바꾸고 새로고침해도 카드가 없다 (#635 리뷰)', () => {
    enter('')
    expect(screen.queryByLabelText('분석에서 가져온 조건')).toBeNull()

    fireEvent.click(chip('개인 창업'))
    fireEvent.click(chip('강남구'))
    fireEvent.click(chip('한식음식점'))
    const written = window.location.search
    const params = new URLSearchParams(written)
    expect(params.get('ctx')).toBe('1')
    expect(params.has('ctxDistrictCode')).toBe(false)
    cleanup()

    enter(written)

    expect(header('district').textContent).toContain('강남구')
    expect(screen.queryByLabelText('분석에서 가져온 조건')).toBeNull()
  })

  it('계산 결과의 리포트·비교 링크에 분석 컨텍스트를 덧붙인다 (#635 리뷰)', async () => {
    vi.mocked(api.createSimulationReport).mockResolvedValue(ok23450() as never)
    enter(ENTRY)
    changeDistrictToGangnam()
    fireEvent.change(screen.getByLabelText('면적 직접 입력 (제곱미터)'), {
      target: { value: '66' },
    })
    fireEvent.click(chip('1층'))

    const reportLink = await waitFor(() => {
      const node = document.querySelector<HTMLAnchorElement>(
        'a[href^="/analysis/simulation/report?"]',
      )
      if (!node) throw new Error('리포트 링크가 아직 없다')
      return node
    })
    const reportParams = new URL(reportLink.href).searchParams
    expect(reportParams.get('districtCode')).toBe('11680')
    expect(reportParams.get('ctx')).toBe('1')
    expect(reportParams.get('ctxDistrictCode')).toBe('11440')

    const compareLink = document.querySelector<HTMLAnchorElement>(
      'a[href^="/analysis/simulation/compare?"]',
    )
    expect(
      compareLink &&
        new URL(compareLink.href).searchParams.get('ctxDistrictCode'),
    ).toBe('11440')
  })
})

/*
  경쟁(리뷰 3). 실제 타이머로 기다리면 「한 번만」을 우연히 통과할 수 있어 디바운스를 가짜 타이머로 정확히 넘긴다.
  setTimeout 만 가짜로 둔다 — React Query 의 알림 스케줄도 setTimeout 이라 advanceTimersByTimeAsync 로 함께 민다.
*/
describe('SimulationBuilderPage — 자동 계산 경쟁 (#604 리뷰)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const advance = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  it('요청 중에 조건을 바꾸면 끝난 뒤 바뀐 조건으로 한 번만 더 보낸다', async () => {
    const first = deferred()
    vi.mocked(api.createSimulationReport)
      .mockReturnValueOnce(first.promise as never)
      .mockResolvedValue(ok23450() as never)
    renderPage()
    fillAll()

    await advance(SIMULATION_AUTO_CALCULATE_DELAY_MS)
    expect(api.createSimulationReport).toHaveBeenCalledTimes(1)

    fireEvent.click(header('store'))
    fireEvent.click(chip('1층 외'))
    await advance(SIMULATION_AUTO_CALCULATE_DELAY_MS * 3)
    // 앞 요청이 끝나기 전에는 보내지 않는다.
    expect(api.createSimulationReport).toHaveBeenCalledTimes(1)

    await act(async () => {
      first.resolve(ok23450())
    })
    await advance(SIMULATION_AUTO_CALCULATE_DELAY_MS * 3)

    expect(api.createSimulationReport).toHaveBeenCalledTimes(2)
    expect(api.createSimulationReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ floorType: 'OTHER' }),
    )
  })

  it('디바운스 중에 화면을 떠나면 보내지 않는다', async () => {
    const { unmount } = renderPage()
    fillAll()

    await advance(SIMULATION_AUTO_CALCULATE_DELAY_MS - 50)
    unmount()
    await advance(SIMULATION_AUTO_CALCULATE_DELAY_MS * 3)

    expect(api.createSimulationReport).not.toHaveBeenCalled()
  })

  it('오류 뒤 「다시 계산」은 한 번만 더 보내고 자동 계산은 되풀이하지 않는다', async () => {
    renderPage()
    fillAll()

    await advance(SIMULATION_AUTO_CALCULATE_DELAY_MS)
    await advance(50)
    expect(api.createSimulationReport).toHaveBeenCalledTimes(1)

    const retry = screen.getAllByRole('button', { name: '다시 계산' })[0]
    fireEvent.click(retry)
    await advance(SIMULATION_AUTO_CALCULATE_DELAY_MS * 3)

    expect(api.createSimulationReport).toHaveBeenCalledTimes(2)
  })
})
