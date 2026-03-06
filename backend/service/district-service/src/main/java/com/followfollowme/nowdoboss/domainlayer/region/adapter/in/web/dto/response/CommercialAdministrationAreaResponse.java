package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권 코드 기준 소속 행정동/자치구 정보")
public record CommercialAdministrationAreaResponse(

    @Schema(description = "자치구 코드")
    String districtCode,

    @Schema(description = "자치구명")
    String districtCodeName,

    @Schema(description = "행정동 코드")
    String administrationCode,

    @Schema(description = "행정동명")
    String administrationCodeName
) {

}