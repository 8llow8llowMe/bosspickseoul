export type StoryDemo = 'map' | 'mini-demo' | 'recommend' | 'simulation'

export type StoryStep = {
  step: string
  title: string
  body: string
  demo: StoryDemo
  /**
   * 이 단계의 도구로 가는 CTA. **없으면 그 단계는 막다른 길이다.**
   *
   * 과업 흐름 감사(이슈 #176)에서 4단계 중 3단계에 CTA 가 하나도 없다는 것이 확인됐다.
   * 특히 `/recommend` 와 `/simulation` 은 홈 본문 전체에서 링크가 **0개**였다 —
   * 「어디가 좋을지 모르는」 사람이 그것을 위해 만든 도구에 닿지 못했다.
   *
   * `mini-demo` 만 `null` 이다. 그 단계는 데모 자체가 CTA 를 들고 있어(`analysis-mini-demo`
   * 의 「이 조건으로 실제 분석하기」) 여기서 또 그리면 버튼이 둘이 된다.
   */
  cta: { href: string; label: string } | null
}

export const STORY_STEPS: readonly StoryStep[] = [
  {
    step: '01',
    title: '현황 확인',
    body: '서울 자치구별 매출·유동인구·업종 분포를 지도에서 비교합니다.',
    demo: 'map',
    cta: { href: '/status', label: '구별 현황 보기' },
  },
  {
    step: '02',
    title: '상권 분석',
    body: '지역과 업종을 골라 매출 추이와 경쟁 강도를 리포트로 확인합니다.',
    demo: 'mini-demo',
    cta: null,
  },
  {
    step: '03',
    title: '후보 추천',
    body: '조건에 맞는 상권을 점수순으로 추천받아 후보를 좁힙니다.',
    demo: 'recommend',
    cta: { href: '/recommend', label: '상권 추천받기' },
  },
  {
    step: '04',
    title: '창업 시뮬레이션',
    body: '예상 비용과 매출을 시뮬레이션해 실행 가능성을 점검합니다.',
    demo: 'simulation',
    cta: { href: '/simulation', label: '창업 시뮬레이션 해보기' },
  },
] as const
