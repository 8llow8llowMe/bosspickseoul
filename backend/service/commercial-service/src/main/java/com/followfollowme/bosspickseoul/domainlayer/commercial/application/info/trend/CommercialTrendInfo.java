package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.trend;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialTrendMetricType;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.enums.PeriodTrendType;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialTrendInfo(
    String commercialCode,
    String serviceCode,
    CommercialTrendMetricType metricType,
    PeriodTrendType trendDirection,
    List<CommercialTrendItem> periods
) {

}
