package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record SalesCountByGenderInfo(
    long maleSalesCount,
    long femaleSalesCount
) {

    public static SalesCountByGenderInfo from(SalesCommercial salesCommercial) {
        return SalesCountByGenderInfo.builder()
            .maleSalesCount(salesCommercial.maleSalesCount())
            .femaleSalesCount(salesCommercial.femaleSalesCount())
            .build();
    }
}
