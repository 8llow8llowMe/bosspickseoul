import { env } from '@/lib/env'

export const siteConfig = {
  name: 'NowDoBoss',
  description:
    '상권 데이터 분석, 추천, 시뮬레이션을 연결하는 NowDoBoss 프론트엔드입니다.',
  url: env.siteUrl,
  locale: 'ko_KR',
} as const
