export type StoryDemo = 'map' | 'mini-demo' | 'recommend' | 'simulation'

export type StoryStep = {
  step: string
  title: string
  body: string
  demo: StoryDemo
}

export const STORY_STEPS: readonly StoryStep[] = [
  {
    step: '01',
    title: '현황 확인',
    body: '서울 자치구별 매출·유동인구·업종 분포를 지도에서 비교합니다.',
    demo: 'map',
  },
  {
    step: '02',
    title: '상권 분석',
    body: '지역과 업종을 골라 매출 추이와 경쟁 강도를 리포트로 확인합니다.',
    demo: 'mini-demo',
  },
  {
    step: '03',
    title: '후보 추천',
    body: '조건에 맞는 상권을 점수순으로 추천받아 후보를 좁힙니다.',
    demo: 'recommend',
  },
  {
    step: '04',
    title: '창업 시뮬레이션',
    body: '예상 비용과 매출을 시뮬레이션해 실행 가능성을 점검합니다.',
    demo: 'simulation',
  },
] as const
