package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialFootTrafficByTimeSlotClientResponse(
    long footTrafficTime00To06,
    long footTrafficTime06To11,
    long footTrafficTime11To14,
    long footTrafficTime14To17,
    long footTrafficTime17To21,
    long footTrafficTime21To24
) {

}
