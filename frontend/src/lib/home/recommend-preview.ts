import type { CandidateCommercials } from '@/types/recommend'

export type RecommendPreviewRow = {
  key: string
  rank: number
  name: string
  score: number
  scoreLabel: string
}

export type RecommendPreviewView = {
  rows: RecommendPreviewRow[]
  /** 1위의 추천 이유. 없으면 null — 문장을 지어내지 않는다. */
  reason: string | null
  isSample: boolean
}

const formatScore = (score: number): string =>
  `${(Math.round(score * 10) / 10).toFixed(1)}점`

/** 추천이 죽거나 비었을 때 03단계가 쓰는 예시. 실 데이터와 모양이 같다. */
export const RECOMMEND_PREVIEW_FALLBACK: RecommendPreviewView = {
  rows: [
    { key: 's1', rank: 1, name: '역삼역', score: 92, scoreLabel: '92.0점' },
    {
      key: 's2',
      rank: 2,
      name: '선정릉역 4번',
      score: 88,
      scoreLabel: '88.0점',
    },
    { key: 's3', rank: 3, name: '국기원', score: 85, scoreLabel: '85.0점' },
    { key: 's4', rank: 4, name: '언주역 8번', score: 83, scoreLabel: '83.0점' },
    { key: 's5', rank: 5, name: '역삼역 8번', score: 79, scoreLabel: '79.0점' },
  ],
  reason: null,
  isSample: true,
}

export const toRecommendPreview = (
  body: CandidateCommercials,
): RecommendPreviewView => {
  /*
    `compositeScore` 는 `number | null` 이다. 점수 없는 행은 막대 길이를 정할 수
    없어 목록 안에서 혼자 죽은 행이 되므로 **버린다**. 전부 버려지면 예시로 간다
    — 「추천 0건」을 그리느니 예시가 낫다(스토리 단계가 비면 번호에 구멍이 난다).
  */
  const scored = (body.items ?? []).filter(
    (item): item is typeof item & { compositeScore: number } =>
      typeof item.compositeScore === 'number' &&
      Number.isFinite(item.compositeScore),
  )

  if (scored.length === 0) return RECOMMEND_PREVIEW_FALLBACK

  return {
    rows: scored.map(item => ({
      key: item.commercialCode,
      rank: item.rank,
      name: item.commercialName,
      score: item.compositeScore,
      scoreLabel: formatScore(item.compositeScore),
    })),
    reason: scored[0].selectionReason?.trim() || null,
    isSample: false,
  }
}
