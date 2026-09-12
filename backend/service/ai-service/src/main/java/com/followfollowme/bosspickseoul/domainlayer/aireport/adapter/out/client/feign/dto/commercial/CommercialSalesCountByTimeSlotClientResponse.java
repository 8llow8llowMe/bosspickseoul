package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialSalesCountByTimeSlotClientResponse(
    long salesCountTime00To06,
    long salesCountTime06To11,
    long salesCountTime11To14,
    long salesCountTime14To17,
    long salesCountTime17To21,
    long salesCountTime21To24
) {

}
