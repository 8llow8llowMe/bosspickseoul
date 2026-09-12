package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialSalesByDayOfWeekQueryResult(
    long mondaySalesAmount,
    long tuesdaySalesAmount,
    long wednesdaySalesAmount,
    long thursdaySalesAmount,
    long fridaySalesAmount,
    long saturdaySalesAmount,
    long sundaySalesAmount
) {

}

