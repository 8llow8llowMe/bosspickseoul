package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "행정동 코드 기준 상위 지역 정보")
public record AdministrationDistrictAreaResponse(

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
