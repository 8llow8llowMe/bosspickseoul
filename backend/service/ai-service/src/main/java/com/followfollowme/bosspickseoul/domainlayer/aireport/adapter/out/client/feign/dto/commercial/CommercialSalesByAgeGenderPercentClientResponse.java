package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialSalesByAgeGenderPercentClientResponse(
    double maleAge10Percent,
    double femaleAge10Percent,
    double maleAge20Percent,
    double femaleAge20Percent,
    double maleAge30Percent,
    double femaleAge30Percent,
    double maleAge40Percent,
    double femaleAge40Percent,
    double maleAge50Percent,
    double femaleAge50Percent,
    double maleAge60PlusPercent,
    double femaleAge60PlusPercent
) {

}
