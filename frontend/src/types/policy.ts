/**
 * 소상공인 지원 정책 (`GET /api/v1/policies`, 그리고 상권 프로필 응답의
 * `policyRecommendations`).
 *
 * ⚠️ **이 타입은 응답 실측으로 적었다.** 프로필 엔드포인트
 * (`GET /commercials/{code}/profile`)는 백엔드에서 `@Hidden` 이라 api-docs 에도,
 * 우리 OpenAPI 스냅샷에도 나오지 않는다 — 계약 대조(`docs/api/openapi/*.json`)에
 * 걸리지 않으므로 **백엔드가 필드를 바꾸면 조용히 어긋난다.**
 * 널 가능성은 BE `PolicyEntity` 의 `@Column(nullable = ...)` 로 확인했다.
 *
 * ⚠️ 현재 데이터는 `policy-seed.sql` 의 **2026-09-09 공고 스냅샷 14건**이다.
 * 실시간 수집은 아직 없다(BE `docs/feature-status.md`: 정책 추천 실 데이터 연동 = 보류).
 * 화면은 받은 `detailUrl` 을 그대로 연다.
 */

/** BE `PolicySupportType` 5종. 표시명은 `supportTypeName` 으로 함께 내려온다. */
export type PolicySupportType =
  | 'FUNDING'
  | 'SUBSIDY'
  | 'FACILITY'
  | 'MARKETING'
  | 'EDUCATION'

export type PolicyItem = {
  /** Snowflake 라 **문자열이다.** `Number(...)` 로 바꾸면 뒷자리가 날아간다. */
  policyId: string
  title: string
  organization: string
  supportType: PolicySupportType
  /**
   * 지원 유형 표시명. **화면은 이 값을 쓴다** — FE 가 `supportType` 으로 라벨을
   * 다시 만들면 백엔드가 유형을 추가할 때 조용히 빈칸이 된다.
   */
  supportTypeName: string
  targetSummary: string
  supportContent: string
  /** null 이면 지역 제한 없음(서울 전역·전국). */
  districtCode: string | null
  /** 업종 대분류(`CS1` 등). null 이면 전업종. **이름은 내려오지 않는다.** */
  serviceCategoryCode: string | null
  /** `YYYY-MM-DD`. null 이면 시작 제한 없음. */
  applyStartAt: string | null
  /** `YYYY-MM-DD`. **null 이면 상시 모집이다.** */
  applyEndAt: string | null
  detailUrl: string
}
