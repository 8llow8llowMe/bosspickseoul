/**
 * 구별현황 쿼리 키. 분기를 키에 넣어 분기별 캐시가 섞이지 않게 하고, 분기를 앞에 두어
 * 「그 분기의 status 캐시」를 접두사로 묶는다(status.md 1.6 「쿼리 키」).
 *
 * 홈 Top10(`HOME_TOP_TEN_QUERY_KEY`)과는 같은 분기여도 키를 나눈다 — 두 화면의
 * retry·staleTime 이 달라 한 캐시를 나누면 한쪽 옵션이 다른 쪽에 끼어든다.
 */
export const statusQueryKeys = {
  topTen: (periodCode: string) => ['status', 'topTen', periodCode] as const,
  detail: (periodCode: string, districtCode: string | null) =>
    ['status', 'detail', periodCode, districtCode] as const,
}
