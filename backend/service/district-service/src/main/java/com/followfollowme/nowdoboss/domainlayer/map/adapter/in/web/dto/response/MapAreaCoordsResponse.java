package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.AreaBoundaryItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
public record MapAreaCoordsResponse(

    @Schema(description = "영역 좌표 목록")
    List<AreaBoundaryItem> areas
) {
}
