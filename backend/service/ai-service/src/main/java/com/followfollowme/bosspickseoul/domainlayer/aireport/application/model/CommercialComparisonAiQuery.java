package com.followfollowme.bosspickseoul.domainlayer.aireport.application.model;

/**
 * 상권 비교 AI 리포트 생성 조건.
 *
 * <p>web 애노테이션({@code @Schema}/{@code @NotBlank})을 달지 않는다. 요청 바인딩과 검증은
 * {@code adapter/in/web/dto/request/CommercialComparisonAiRequest} 가 맡고, 이 타입은 그 결과로 만들어진
 * 확정 조건만 표현한다(architecture-guide §2).
 *
 * <p>기본값 보정도 하지 않는다. 값을 채우는 지점이 web 한 곳이어야 잡 파라미터로 저장된 조건과
 * 워커가 재구성한 조건이 항상 같다.
 */
public record CommercialComparisonAiQuery(
    String leftCommercialCode,
    String rightCommercialCode,
    String serviceCode,
    String periodCode
) {

}
