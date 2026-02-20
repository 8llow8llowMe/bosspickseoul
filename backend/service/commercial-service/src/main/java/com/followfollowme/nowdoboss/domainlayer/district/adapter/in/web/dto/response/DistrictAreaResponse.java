package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 코드/명 목록 응답")
public record DistrictAreaResponse(
    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,

    @Schema(description = "자치구명", example = "강남구")
    String districtName
) {

}
