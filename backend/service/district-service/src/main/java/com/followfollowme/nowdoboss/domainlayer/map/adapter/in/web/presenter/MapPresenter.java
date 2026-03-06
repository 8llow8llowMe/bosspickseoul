package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.AreaBoundaryItem;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.AreaBoundaryInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MapPresenter {

    public MapAreaCoordsResponse toMapAreaCoordsResponse(List<AreaBoundaryInfo> infos) {
        List<AreaBoundaryItem> areas = infos.stream()
            .map(info -> AreaBoundaryItem.builder()
                .areaCode(info.areaCode())
                .areaName(info.areaName())
                .centerLng(info.centerLng())
                .centerLat(info.centerLat())
                .boundaryCoords(info.boundaryCoords())
                .build())
            .toList();

        return MapAreaCoordsResponse.builder()
            .areas(areas)
            .build();
    }
}
