package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 하위 행정동 정보 응답 DTO")
public record AdministrationAreaResponse(

    @Schema(description = "행정동 코드", example = "11680101")
    String administrationCode,

    @Schema(description = "행정동 이름", example = "역삼동")
    String administrationCodeName,

    @Schema(description = "중심 위도 (WGS84)", example = "37.501274")
    double centerLat,

    @Schema(description = "중심 경도 (WGS84)", example = "127.039585")
    double centerLng
) {

}
