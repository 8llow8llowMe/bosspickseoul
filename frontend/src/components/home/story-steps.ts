import {
  Calculator,
  LineChart,
  Map,
  Target,
  type LucideIcon,
} from 'lucide-react'

export type StoryDemo = 'metrics' | 'mini-demo' | 'recommend' | 'simulation'

export type StoryStep = {
  step: string
  title: string
  body: string
  demo: StoryDemo
  /**
   * 탭 아이콘. 네 탭이 글자만 다르면 한 덩어리로 읽힌다 — 아이콘이 각 탭에 눈이 멈출
   * 자리를 만든다(예전 네 도구 보드의 STEP_ICONS 를 옮겼다). 장식이라 스크린리더에서는
   * 숨긴다.
   */
  icon: LucideIcon
  /**
   * 패널에 덧붙이는 한 줄. 04 만 쓴다 — 앞 세 단계는 고른 조건을 따라 움직이는데
   * 04 만 고정 예시라는 사실을 감추지 않는다(POST 가 필요해 랜딩에서 선택을 이어받지 않는다).
   */
  note?: string
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
   * 이 단계를 마치면 **손에 남는 것.** 판단 흐름 패널이 이 한 줄을 싣는다.
   *
   * `body` 와 나누는 이유: `body` 는 「무엇을 하는가」(동작)이고 이쪽은 「무엇을
   * 얻는가」(결과물)다. 카드가 동작만 말하면 네 장이 다 비슷하게 읽혀 **텍스트
   * 네 덩어리**가 된다(예전 네 도구 보드가 빈약해 보이던 원인).
   *
   * ⚠️ **지어낸 수치를 넣지 않는다.** 실데이터에서 나오는 값(추천 몇 곳 등)은 스토리
   * 데모가 화면에서 유도해 보여 준다. 여기 고정 문자열로 박으면 화면과 어긋난다
   * (D5-6 에서 시안의 `25→8→3→1` 중 8·3 을 폐기한 것과 같은 이유).
   */
  outcome: string
}

export const STORY_STEPS: readonly StoryStep[] = [
  {
    step: '01',
    title: '현황 확인',
    body: '서울 25개 자치구를 유동인구·매출·개업 수로 줄 세워 어디부터 볼지 정해요.',
    demo: 'metrics',
    icon: Map,
    outcome: '자치구 25곳을 지표로 줄 세운 순위표',
    cta: { href: '/status', label: '구별 현황 보기' },
  },
  {
    step: '02',
    title: '상권 분석 · AI 리포트',
    body: '지역과 업종을 고르면 매출 추이·경쟁 강도를 읽고, AI 가 판단 근거를 문장으로 정리해 줘요.',
    demo: 'mini-demo',
    icon: LineChart,
    outcome: '업종별 매출 추이와 AI 가 정리한 판단 근거',
    cta: null,
  },
  {
    step: '03',
    title: '후보 추천',
    body: '조건에 맞는 상권을 점수순으로 추천받아 후보를 좁혀요.',
    demo: 'recommend',
    icon: Target,
    outcome: '조건에 맞는 상권만 남긴 후보 목록',
    cta: { href: '/recommend', label: '상권 추천받기' },
  },
  {
    step: '04',
    title: '창업 시뮬레이션',
    body: '예상 비용과 매출로 손익분기에 닿는 시점을 따져 봐요.',
    demo: 'simulation',
    icon: Calculator,
    note: '이 단계는 고른 조건과 상관없는 예시예요.',
    outcome: '예상 비용과 손익분기에 닿는 시점',
    cta: { href: '/simulation', label: '창업 시뮬레이션 해보기' },
  },
] as const
