package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
public record AreaBoundaryItem(

    @Schema(description = "영역 코드", example = "11110")
    String areaCode,

    @Schema(description = "영역 이름", example = "종로구")
    String areaName,

    @Schema(description = "중심점 경도", example = "126.9773248136")
    double centerLng,

    @Schema(description = "중심점 위도", example = "37.5949153065")
    double centerLat,

    @Schema(description = "영역 경계 좌표", example = "[[126.975084766,37.6311834989],[126.9748795141,37.6304832153]]")
    List<List<Double>> boundaryCoords
) {
}
