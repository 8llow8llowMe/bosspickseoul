// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SimulationBuilderPage from '@/components/simulation/simulation-builder-page'
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

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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

const renderPage = () =>
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
      createElement(SimulationBuilderPage),
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
  it('프랜차이즈는 업종 → 브랜드 → 매장 조건 순서로 넘어간다', async () => {
    renderPage()
    fireEvent.click(chip('프랜차이즈'))
    fireEvent.click(chip('강남구'))
    fireEvent.click(chip('한식음식점'))

    expect(isExpanded('service')).toBe(false)
    expect(isExpanded('brand')).toBe(true)
    expect(document.activeElement).toBe(header('brand'))

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

    expect(header('store').textContent).toContain('66㎡ · 1층 외')
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
