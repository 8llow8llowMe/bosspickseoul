package com.followfollowme.nowdoboss.domainlayer.map.application.service;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.presenter.MapPresenter;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.in.MapWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.map.application.service.processor.MapQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.map.domain.enums.AreaType;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MapWebFacade implements MapWebUseCase {

    private final MapQueryProcessor mapQueryProcessor;
    private final MapPresenter mapPresenter;

    @Override
    @Transactional(readOnly = true)
    public MapAreaCoordsResponse getCommercialAreaCoords(double lngSW, double latSW, double lngNE, double latNE) {
        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, lngSW, latSW, lngNE, latNE);
        return mapPresenter.toMapAreaCoordsResponse(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public MapAreaCoordsResponse getAdministrationAreaCoords(double lngSW, double latSW, double lngNE, double latNE) {
        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.ADMINISTRATION, lngSW, latSW, lngNE, latNE);
        return mapPresenter.toMapAreaCoordsResponse(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public MapAreaCoordsResponse getDistrictAreaCoords(double lngSW, double latSW, double lngNE, double latNE) {
        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.DISTRICT, lngSW, latSW, lngNE, latNE);
        return mapPresenter.toMapAreaCoordsResponse(infos);
    }
}
