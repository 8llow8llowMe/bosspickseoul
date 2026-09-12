package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialSalesCountByDayOfWeekQueryResult(
    long mondaySalesCount,
    long tuesdaySalesCount,
    long wednesdaySalesCount,
    long thursdaySalesCount,
    long fridaySalesCount,
    long saturdaySalesCount,
    long sundaySalesCount
) {

}

