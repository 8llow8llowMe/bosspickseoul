package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.HeatmapAreaItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 히트맵 응답")
public record CommercialHeatmapResponse(
    @Schema(description = "상권 히트맵 영역 목록")
    List<HeatmapAreaItem> areas
) {

}
