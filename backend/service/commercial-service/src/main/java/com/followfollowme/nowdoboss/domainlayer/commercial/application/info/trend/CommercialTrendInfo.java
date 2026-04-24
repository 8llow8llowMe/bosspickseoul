package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.trend;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialTrendMetricType;
import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.PeriodTrendType;
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
