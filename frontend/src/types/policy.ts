/**
 * 소상공인 지원 정책 (`GET /api/v1/policies`, 그리고 상권 프로필 응답의
 * `policyRecommendations`).
 *
 * 이 타입은 처음 응답 실측으로 적었고, 지금은 dev api-docs 의 `PolicyItem` 스키마와
 * 필드가 같다(프로필 엔드포인트 `GET /commercials/{code}/profile` 도 api-docs 에 나온다 —
 * 스냅샷 갱신은 PR #303). 널 가능성은 BE `PolicyEntity` 의 `@Column(nullable = ...)` 로
 * 확인했다.
 *
 * ⚠️ **데이터는 매일 바뀐다.** 백엔드가 기업마당 지원사업을 매일 06:00 수집하고 06:30 에
 * 마감 건을 만료시킨다(BE #292, batch-service Quartz). 처음 시드였던 14건은 수집이
 * 켜지면 제목·기관·마감일·건수가 달라진다. 그래서 **테스트를 시드 제목이나 건수에 묶지
 * 않는다** — 받은 `PolicyItem` 을 그대로 그리는지만 본다. 화면은 받은 `detailUrl` 을
 * 그대로 새 탭으로 연다(공고 상세 URL 인지는 배포 뒤 샘플로만 확인한다, #290).
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
