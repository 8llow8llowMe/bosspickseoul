package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "행정동 하위 상권 영역 정보 응답 DTO")
public record CommercialAreaResponse(

    @Schema(description = "상권 코드", example = "3110125")
    String commercialCode,

    @Schema(description = "상권 코드명", example = "사근동살곶이상점가")
    String commercialCodeName,

    @Schema(description = "상권 분류 코드", example = "A")
    String commercialClassificationCode,

    @Schema(description = "상권 분류 이름", example = "골목상권")
    String commercialClassificationCodeName,

    @Schema(description = "중심 위도 (WGS84)", example = "37.498095")
    double centerLat,

    @Schema(description = "중심 경도 (WGS84)", example = "127.027610")
    double centerLng
) {

}
