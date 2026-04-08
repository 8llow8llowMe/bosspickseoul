package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record CommercialSalesCountByTimeSlotQueryResult(
    long salesCountTime00To06,
    long salesCountTime06To11,
    long salesCountTime11To14,
    long salesCountTime14To17,
    long salesCountTime17To21,
    long salesCountTime21To24
) {

}

