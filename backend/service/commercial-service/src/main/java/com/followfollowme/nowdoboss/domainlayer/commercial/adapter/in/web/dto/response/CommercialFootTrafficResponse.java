package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAgeGenderPercentFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAgeGroupFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialDayOfWeekFootTrafficItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialTimeSlotFootTrafficItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 유동 인구 정보 조회 응답 DTO")
public record CommercialFootTrafficResponse(

    @Schema(description = "시간대별 유동 인구 정보")
    CommercialTimeSlotFootTrafficItem timeSlotFootTrafficItem,

    @Schema(description = "요일별 유동 인구 정보")
    CommercialDayOfWeekFootTrafficItem dayOfWeekFootTrafficItem,

    @Schema(description = "연령대별 유동 인구 정보")
    CommercialAgeGroupFootTrafficItem ageGroupFootTrafficItem,

    @Schema(description = "연령대 및 성별 유동 인구 비율 정보")
    CommercialAgeGenderPercentFootTrafficItem ageGenderPercentFootTrafficItem
) {

}
