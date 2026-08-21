package com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.CommercialProfileKeyMetricsItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "후보 상권 프로필 응답 DTO")
public record CommercialProfileResponse(

    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,

    @Schema(description = "상권명")
    String commercialName,

    @Schema(description = "자치구 코드")
    String districtCode,

    @Schema(description = "자치구 이름")
    String districtName,

    @Schema(description = "행정동 코드")
    String administrationCode,

    @Schema(description = "행정동 이름")
    String administrationName,

    @Schema(description = "중심점 경도", nullable = true)
    Double centerLng,

    @Schema(description = "중심점 위도", nullable = true)
    Double centerLat,

    @Schema(description = "영역 경계 좌표 (1단계에서는 비어있을 수 있음)")
    List<List<Double>> boundaryCoords,

    @Schema(description = "핵심 지표. Feign 응답 유실 시 null 가능", nullable = true)
    CommercialProfileKeyMetricsItem keyMetrics
) {

}
