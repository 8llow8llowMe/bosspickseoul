package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "행정동 소속 상권 목록 조회 응답 DTO")
public record CommercialAreaResponse(

    @Schema(description = "상권 코드", example = "3110125")
    String commercialCode,

    @Schema(description = "상권명", example = "강남역")
    String commercialName,

    @Schema(description = "상권 분류 코드", example = "A")
    String commercialClassificationCode,

    @Schema(description = "상권 분류명", example = "골목상권")
    String commercialClassificationName,

    @Schema(description = "중심 위도 (WGS84)", example = "37.498095")
    double centerLat,

    @Schema(description = "중심 경도 (WGS84)", example = "127.027610")
    double centerLng
) {

}
