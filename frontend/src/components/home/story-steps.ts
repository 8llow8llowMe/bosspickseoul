export type StoryDemo = 'metrics' | 'mini-demo' | 'recommend' | 'simulation'

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
  /**
   * 이 단계를 마치면 **손에 남는 것.** 보드 카드가 이 한 줄을 싣는다.
   *
   * `body` 와 나누는 이유: `body` 는 「무엇을 하는가」(동작)이고 이쪽은 「무엇을
   * 얻는가」(결과물)다. 카드가 동작만 말하면 네 장이 다 비슷하게 읽혀 **텍스트
   * 네 덩어리**가 된다 — 보드가 빈약해 보이던 원인이다.
   *
   * ⚠️ **지어낸 수치를 넣지 않는다.** 실데이터에서 나오는 값(추천 몇 곳 등)은 스토리
   * 데모가 화면에서 유도해 보여 준다. 여기 고정 문자열로 박으면 화면과 어긋난다
   * (D5-6 에서 시안의 `25→8→3→1` 중 8·3 을 폐기한 것과 같은 이유).
   */
  outcome: string
  /**
   * 이 단계를 담당하는 도구. **네 단계 모두 값이 있다.**
   *
   * `cta` 와 나누는 이유: `cta` 는 스토리 전용이라 02 가 `null` 이다(미니데모가 이미
   * 버튼을 든다). 반면 네 도구 보드(`tool-flow-board.tsx`)는 「무엇을·어디로」를 말하는
   * 자리라 **네 개가 모두 눌려야** 한다. 같은 필드를 재활용하면 02 에 CTA 가 생겨
   * 스토리에서 버튼이 둘이 된다 — PR #206 이 피한 상태로 되돌아간다.
   */
  tool: { href: string; label: string }
}

export const STORY_STEPS: readonly StoryStep[] = [
  {
    step: '01',
    title: '현황 확인',
    body: '서울 25개 자치구를 유동인구·매출·개업 수로 줄 세워 어디부터 볼지 정합니다.',
    demo: 'metrics',
    outcome: '자치구 25곳을 지표로 줄 세운 순위표',
    cta: { href: '/status', label: '구별 현황 보기' },
    tool: { href: '/status', label: '구별현황' },
  },
  {
    step: '02',
    title: '상권 분석 · AI 리포트',
    body: '지역과 업종을 고르면 매출 추이·경쟁 강도를 읽고, AI 가 판단 근거를 문장으로 정리합니다.',
    demo: 'mini-demo',
    outcome: '업종별 매출 추이와 AI 가 정리한 판단 근거',
    cta: null,
    tool: { href: '/analysis', label: '상권분석' },
  },
  {
    step: '03',
    title: '후보 추천',
    body: '조건에 맞는 상권을 점수순으로 추천받아 후보를 좁힙니다.',
    demo: 'recommend',
    outcome: '조건에 맞는 상권만 남긴 후보 목록',
    cta: { href: '/recommend', label: '상권 추천받기' },
    tool: { href: '/recommend', label: '상권추천' },
  },
  {
    step: '04',
    title: '창업 시뮬레이션',
    body: '예상 비용과 매출을 시뮬레이션해 실행 가능성을 점검합니다.',
    demo: 'simulation',
    outcome: '예상 비용과 손익분기에 닿는 시점',
    cta: { href: '/simulation', label: '창업 시뮬레이션 해보기' },
    tool: { href: '/simulation', label: '시뮬레이션' },
  },
] as const
