package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * {@code GET /api/v1/commercials/{commercialCode}/foot-traffic} 응답 본문의 wire 표현.
 *
 * <p>{@code ...Item} alias 를 아는 책임은 이 어댑터 계층 타입에만 있다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialFootTrafficClientResponse(
    @JsonProperty("byTimeSlotItem") CommercialFootTrafficByTimeSlotClientResponse byTimeSlot,
    @JsonProperty("byDayOfWeekItem") CommercialFootTrafficByDayOfWeekClientResponse byDayOfWeek,
    @JsonProperty("byAgeGroupItem") CommercialFootTrafficByAgeGroupClientResponse byAgeGroup,
    @JsonProperty("byAgeGenderPercentItem") CommercialFootTrafficByAgeGenderPercentClientResponse byAgeGenderPercent
) {

}
