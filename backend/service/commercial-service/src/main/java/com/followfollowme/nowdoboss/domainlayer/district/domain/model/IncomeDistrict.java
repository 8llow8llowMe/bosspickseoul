package com.followfollowme.nowdoboss.domainlayer.district.domain.model;

import lombok.Builder;

@Builder
public record IncomeDistrict(
    long id,
    String periodCode,
    String districtCode,
    String districtName,
    long totalExpenseAmount
) {

}
