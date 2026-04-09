package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "행정동 상위 지역 정보 조회 응답 DTO")
public record AdministrationDistrictAreaResponse(

    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,

    @Schema(description = "자치구명", example = "강남구")
    String districtName,

    @Schema(description = "행정동 코드", example = "11680101")
    String administrationCode,

    @Schema(description = "행정동명", example = "역삼1동")
    String administrationName
) {

}
