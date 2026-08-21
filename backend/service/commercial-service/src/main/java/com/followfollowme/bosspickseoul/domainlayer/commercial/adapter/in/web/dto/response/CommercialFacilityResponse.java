package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialSchoolCountItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 집객시설 정보 조회 응답")
public record CommercialFacilityResponse(

    @Schema(description = "총 집객시설 수", example = "10")
    long totalFacilityCount,

    @Schema(description = "학교 수 정보")
    CommercialSchoolCountItem schoolCountItem,

    @Schema(description = "대중교통시설 수 (지하철역 + 버스정류장)", example = "20")
    long totalTransportationFacilityCount
) {

}
