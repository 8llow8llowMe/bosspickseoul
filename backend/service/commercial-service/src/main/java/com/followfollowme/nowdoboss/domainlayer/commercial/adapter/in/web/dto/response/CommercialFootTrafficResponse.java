package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByAgeGenderPercentItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByAgeGroupItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByDayOfWeekItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByTimeSlotItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 유동인구 정보 조회 응답")
public record CommercialFootTrafficResponse(

    @Schema(description = "시간대별 유동인구")
    CommercialFootTrafficByTimeSlotItem byTimeSlotItem,

    @Schema(description = "요일별 유동인구")
    CommercialFootTrafficByDayOfWeekItem byDayOfWeekItem,

    @Schema(description = "연령대별 유동인구")
    CommercialFootTrafficByAgeGroupItem byAgeGroupItem,

    @Schema(description = "연령대 및 성별 유동인구 비율")
    CommercialFootTrafficByAgeGenderPercentItem byAgeGenderPercentItem
) {

}
