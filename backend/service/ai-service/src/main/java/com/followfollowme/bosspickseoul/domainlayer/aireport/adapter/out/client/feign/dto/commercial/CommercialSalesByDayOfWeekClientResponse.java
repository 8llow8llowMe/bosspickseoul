package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialSalesByDayOfWeekClientResponse(
    long mondaySalesAmount,
    long tuesdaySalesAmount,
    long wednesdaySalesAmount,
    long thursdaySalesAmount,
    long fridaySalesAmount,
    long saturdaySalesAmount,
    long sundaySalesAmount
) {

}
