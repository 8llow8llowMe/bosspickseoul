package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.FootTrafficByAgeGenderPercentItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.FootTrafficByAgeGroupItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.FootTrafficByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.FootTrafficByTimeSlotItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 유동인구 정보 조회 응답")
public record FootTrafficResponse(

    @Schema(description = "시간대별 유동인구")
    FootTrafficByTimeSlotItem byTimeSlotItem,

    @Schema(description = "요일별 유동인구")
    FootTrafficByDayOfWeekItem byDayOfWeekItem,

    @Schema(description = "연령대별 유동인구")
    FootTrafficByAgeGroupItem byAgeGroupItem,

    @Schema(description = "연령대 및 성별 유동인구 비율")
    FootTrafficByAgeGenderPercentItem byAgeGenderPercentItem
) {

}