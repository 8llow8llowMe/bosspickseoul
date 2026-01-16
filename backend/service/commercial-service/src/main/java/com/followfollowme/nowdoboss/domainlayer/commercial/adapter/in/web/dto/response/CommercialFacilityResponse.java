package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialSchoolCountItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 집객 시설 조회 응답 DTO")
public record CommercialFacilityResponse(

    @Schema(description = "집객 시설 수", example = "10")
    long facilityCount,

    @Schema(description = "상권 내의 학교 수 정보")
    CommercialSchoolCountItem schoolCountItem,

    @Schema(description = "교통 시설 수", example = "20")
    long transportCount
) {

}
