package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query;

import java.time.LocalDate;

/**
 * commercial-service 상권 프로필이 함께 내려주는 지원 정책 항목.
 *
 * <p>필드 이름은 commercial-service 의 응답 JSON 과 1:1 로 맞춘다 — Feign 역직렬화가 이름으로 붙기 때문이다.
 */
public record PolicyQueryResult(
    String policyId,
    String title,
    String organization,
    String supportType,
    String supportTypeName,
    String targetSummary,
    String supportContent,
    String districtCode,
    String serviceCategoryCode,
    LocalDate applyStartAt,
    LocalDate applyEndAt,
    String detailUrl
) {

}
