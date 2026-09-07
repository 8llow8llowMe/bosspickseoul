package com.followfollowme.bosspickseoul.domainlayer.map.application.info;

import java.time.LocalDate;
import lombok.Builder;

/** 상권 프로필에 동봉되는 지원 정책 항목. */
@Builder
public record PolicyInfo(
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
