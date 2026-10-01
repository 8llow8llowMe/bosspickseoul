package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.trend;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialTrendMetricType;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.enums.PeriodTrendType;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialTrendInfo(
    // 추이의 기준(가장 최근) 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String periodCode,
    String commercialCode,
    String serviceCode,
    CommercialTrendMetricType metricType,
    PeriodTrendType trendDirection,
    List<CommercialTrendItem> periods
) {

}
