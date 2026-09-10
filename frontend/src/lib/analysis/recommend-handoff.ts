/**
 * 분석 보고서 하단 「다른 상권도 추천받기」 링크의 문구.
 *
 * 이름을 넣어 구체적으로 말하는 것이 기본이다 — 「다른 상권 추천」만 적으면 무엇을
 * 기준으로 한 다른 상권인지 알 수 없다.
 *
 * **업종 코드 폴백을 걸러내는 이유.** 보고서의 `serviceName` 은 업종 목록 조회가
 * 아직 끝나지 않았거나 실패하면 `serviceCode` 그 자체(`CS100001`)로 떨어진다. 그
 * 값을 그대로 문장에 끼우면 「CS100001 창업하기 좋은」이 되어 사용자가 읽을 수 없는
 * 문구가 화면에 남는다. 이름과 코드는 같은 변수에 실려 오므로 여기서 `serviceCode`
 * 와 대조해 갈라낸다.
 */
export type RecommendHandoffLabelInput = {
  /** 행정동 이름. 매출 요약이 도착하기 전에는 없다. */
  administrationName?: string | null
  /** 업종 이름. 목록이 없으면 `serviceCode` 로 폴백된 값이 온다. */
  serviceName?: string | null
  /** 폴백 여부를 가리는 기준값. */
  serviceCode?: string | null
}

/** 이름을 하나라도 말할 수 없을 때 쓰는 문구. 조건은 URL 이 이미 나르고 있다. */
const FALLBACK_LABEL = '같은 조건으로 다른 상권도 추천받기'

export const createRecommendHandoffLabel = ({
  administrationName,
  serviceName,
  serviceCode,
}: RecommendHandoffLabelInput): string => {
  const resolvedServiceName =
    serviceName && serviceName !== serviceCode ? serviceName : null

  if (!administrationName || !resolvedServiceName) return FALLBACK_LABEL

  return `${administrationName}에서 ${resolvedServiceName} 창업하기 좋은 다른 상권도 추천받기`
}
