package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * {@code GET /api/v1/commercials/{commercialCode}/services/{serviceCode}/sales} 응답 본문의 wire 표현.
 *
 * <p>{@code ...Item} 이라는 키 이름은 commercial-service 의 Presenter 가 정한 것이다. 그 이름을 아는 책임은
 * 이 어댑터 계층 타입에만 있고, {@code application/port/out/query} 의 QueryResult 는 알지 않는다.
 * peer 가 응답 필드명을 바꾸면 여기 alias 만 고치면 된다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialSalesClientResponse(
    @JsonProperty("amountByTimeSlotItem") CommercialSalesByTimeSlotClientResponse amountByTimeSlot,
    @JsonProperty("amountByDayOfWeekItem") CommercialSalesByDayOfWeekClientResponse amountByDayOfWeek,
    @JsonProperty("amountByAgeItem") CommercialSalesByAgeClientResponse amountByAge,
    @JsonProperty("amountByAgeGenderPercentItem") CommercialSalesByAgeGenderPercentClientResponse amountByAgeGenderPercent,
    @JsonProperty("countByDayOfWeekItem") CommercialSalesCountByDayOfWeekClientResponse countByDayOfWeek,
    @JsonProperty("countByTimeSlotItem") CommercialSalesCountByTimeSlotClientResponse countByTimeSlot,
    @JsonProperty("countByGenderItem") CommercialSalesCountByGenderClientResponse countByGender
) {

}
