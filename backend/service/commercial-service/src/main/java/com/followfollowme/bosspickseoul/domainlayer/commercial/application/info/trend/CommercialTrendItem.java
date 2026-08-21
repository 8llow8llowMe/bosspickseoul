package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.trend;

import lombok.Builder;

@Builder
public record CommercialTrendItem(
    String periodCode,
    Double value,
    Double changeRate    // 직전 분기 대비 증감률 (null: 첫 분기)
) {

}
