package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import java.util.List;

/**
 * commercial-service {@code GET /api/v1/commercials/periods} 응답({@code AnalysisPeriodsResponse})의 wire DTO(이슈 #464).
 *
 * <p>ai-service 가 쓰는 필드만 받는다. 나머지({@code datasets} 등)는 역직렬화에서 무시된다. 이 타입은 adapter 밖으로 나가지 않는다 —
 * 어댑터가 기본 분기 문자열만 꺼내 포트로 돌려준다. 계약은 {@code AnalysisPeriodsWireGoldenJsonTest} 가 고정한다.
 */
public record AnalysisPeriodsClientResponse(
    String defaultPeriodCode,
    List<String> availablePeriodCodes,
    String spatialVersion,
    String resolvedAt
) {

}
