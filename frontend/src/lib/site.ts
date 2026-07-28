import { env } from '@/lib/env'

export const siteConfig = {
  name: 'BossPickSeoul',
  description:
    '서울 상권 현황 확인부터 상권분석, 추천, 창업 시뮬레이션까지 이어지는 BossPickSeoul 서비스입니다.',
  url: env.siteUrl,
  locale: 'ko_KR',
} as const
