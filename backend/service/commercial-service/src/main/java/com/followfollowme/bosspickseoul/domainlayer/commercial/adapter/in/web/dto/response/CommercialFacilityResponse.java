package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialSchoolCountItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 집객시설 정보 조회 응답")
public record CommercialFacilityResponse(

    @Schema(description = "실제로 조회한 기준 분기. 요청에서 periodCode 를 생략하면 서버가 정한 기본 분기(GET /api/v1/commercials/periods 의 defaultPeriodCode)", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String periodCode,

    @Schema(description = "총 집객시설 수", example = "10")
    long totalFacilityCount,

    @Schema(description = "학교 수 정보")
    CommercialSchoolCountItem schoolCountItem,

    @Schema(description = "대중교통시설 수 (지하철역 + 버스정류장)", example = "20")
    long totalTransportationFacilityCount
) {

}
