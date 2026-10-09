/**
 * 구별현황 쿼리 키. 분기를 키에 넣어 분기별 캐시가 섞이지 않게 하고, 분기를 앞에 두어
 * 「그 분기의 status 캐시」를 접두사로 묶는다(status.md 1.6 「쿼리 키」).
 *
 * 홈 Top10(`HOME_TOP_TEN_QUERY_KEY`)은 `top-ten` 을, 이 화면은 `rankings` 를 부른다(#542). 두 화면이 같은
 * API 를 쓰던 때에도 키를 나눴다 — retry·staleTime 이 달라 한 캐시를 나누면 한쪽 옵션이 다른 쪽에 끼어든다.
 */
export const statusQueryKeys = {
  // 목록·지도·상세 머리가 모두 25개 구 전체 순위 한 응답을 쓴다(#542). Top10 은 그 앞 10개다.
  rankings: (periodCode: string) => ['status', 'rankings', periodCode] as const,
  detail: (periodCode: string, districtCode: string | null) =>
    ['status', 'detail', periodCode, districtCode] as const,
}
