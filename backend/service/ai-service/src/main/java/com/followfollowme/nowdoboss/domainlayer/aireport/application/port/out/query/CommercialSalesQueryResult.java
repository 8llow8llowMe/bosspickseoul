package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record CommercialSalesQueryResult(
    @JsonProperty("amountByTimeSlotItem") CommercialSalesByTimeSlotQueryResult amountByTimeSlot,
    @JsonProperty("amountByDayOfWeekItem") CommercialSalesByDayOfWeekQueryResult amountByDayOfWeek,
    @JsonProperty("amountByAgeItem") CommercialSalesByAgeQueryResult amountByAge,
    @JsonProperty("amountByAgeGenderPercentItem") CommercialSalesByAgeGenderPercentQueryResult amountByAgeGenderPercent,
    @JsonProperty("countByDayOfWeekItem") CommercialSalesCountByDayOfWeekQueryResult countByDayOfWeek,
    @JsonProperty("countByTimeSlotItem") CommercialSalesCountByTimeSlotQueryResult countByTimeSlot,
    @JsonProperty("countByGenderItem") CommercialSalesCountByGenderQueryResult countByGender
) {}
