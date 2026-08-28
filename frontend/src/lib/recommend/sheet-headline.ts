import type {
  RecommendationCriteria,
  RecommendationView,
} from './recommend-state'

/**
 * 모바일 바텀시트가 **접힌 상태에서 보여줄 첫 줄**을 정한다.
 *
 * 접힘 높이를 72px 로 맞춘 이유가 이 줄이다 — 손잡이만 보이면 시트가 「닫힌 것」처럼
 * 읽힌다(ux-followups C-1). 분석 시트의 `stepLabel`/`summary` 와 같은 규격이고,
 * 무엇을 쓸지는 화면이 아니라 여기서 정해 시트를 단순하게 둔다.
 */
export type RecommendSheetHeadline = {
  title: string
  summary: string
}

export type RecommendSheetHeadlineInput = {
  view: RecommendationView
  /** `view === 'picker'` 일 때 고르는 중인 조건의 이름(예: 「업종」). */
  pickerLabel: string | null
  draft: RecommendationCriteria
  resultCount: number
  /** 목록·지도에서 고른 결과. 없으면 개수만 말한다. */
  selectedResult: { rank: number; commercialName: string } | null
  isResultLoading: boolean
}

/** 채워진 조건만 이어 붙인다. 하나도 없으면 빈 문자열. */
export const summarizeRecommendDraft = (
  draft: RecommendationCriteria,
): string =>
  [draft.district?.name, draft.administration?.name, draft.service?.name]
    .filter((name): name is string => Boolean(name))
    .join(' · ')

export const resolveRecommendSheetHeadline = ({
  view,
  pickerLabel,
  draft,
  resultCount,
  selectedResult,
  isResultLoading,
}: RecommendSheetHeadlineInput): RecommendSheetHeadline => {
  const draftSummary = summarizeRecommendDraft(draft)

  if (view === 'picker' && pickerLabel) {
    return {
      title: `${pickerLabel} 선택`,
      summary: draftSummary || '목록에서 하나를 고르세요',
    }
  }

  if (view === 'results') {
    if (selectedResult) {
      return {
        title: '추천 결과',
        summary: `${selectedResult.rank}위 ${selectedResult.commercialName}`,
      }
    }

    return {
      title: '추천 결과',
      summary: isResultLoading
        ? '추천 상권을 찾고 있어요'
        : resultCount > 0
          ? `추천 상권 ${resultCount}곳`
          : '조건에 맞는 상권이 없어요',
    }
  }

  return {
    title: '상권 추천 조건',
    summary: draftSummary || '자치구부터 선택해 주세요',
  }
}
