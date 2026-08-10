import type {
  CommercialReportView,
  RegionReportView,
} from '@/lib/analysis/ai-report-presentation'

export const sampleCommercialView: CommercialReportView = {
  headline: {
    summary:
      '유동인구가 꾸준한 성장 상권으로, 저녁 시간대 매출 비중이 높습니다.',
    insight: '20~30대 직장인 수요가 탄탄해 객단가 중심 업종에 유리합니다.',
  },
  strengths: ['배후 직장인 밀집', '저녁 피크 매출', '대중교통 접근성'],
  risks: ['임대료 상승세', '주말 유동인구 감소'],
  actions: [
    { title: '추천 업종군', items: ['카페', '베이커리', '주점'] },
    { title: '추천 운영 시간', items: ['11:00~14:00', '18:00~22:00'] },
  ],
  generatedAt: '',
}

export const sampleRegionView: RegionReportView = {
  headline: {
    summary: '자치구 전반의 소비가 안정적으로 유지되는 성숙 상권입니다.',
    marketStatus: '안정',
  },
  recommended: ['생활서비스', '외식', '소매'],
  caution: ['유흥', '대형 판매'],
  insight: '동별 편차가 크므로 세부 행정동 단위 확인을 권장합니다.',
  generatedAt: '',
}
