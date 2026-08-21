package com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic;

import lombok.Builder;

@Builder
public record DistrictMetricValueInfo(
    Enum<?> metricType,
    long value
) {

    public static DistrictMetricValueInfo of(Enum<?> metricType, long value) {
        return DistrictMetricValueInfo.builder()
            .metricType(metricType)
            .value(value)
            .build();
    }
}

