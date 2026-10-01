package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByAgeGenderPercentItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByAgeGroupItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByDayOfWeekItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialFootTrafficByTimeSlotItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 유동인구 정보 조회 응답")
public record CommercialFootTrafficResponse(

    @Schema(description = "실제로 조회한 기준 분기. 요청에서 periodCode 를 생략하면 서버가 정한 기본 분기(GET /api/v1/commercials/periods 의 defaultPeriodCode)", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String periodCode,

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
