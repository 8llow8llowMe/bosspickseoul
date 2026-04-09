package com.followfollowme.nowdoboss.domainlayer.map.application.service;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialHeatmapResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.feign.CommercialHeatmapClient;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CommercialHeatmapAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.presenter.MapPresenter;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.in.MapWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialHeatmapScoreQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.nowdoboss.domainlayer.map.application.service.processor.MapQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.map.domain.enums.AreaType;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MapWebFacade implements MapWebUseCase {

    private final MapQueryProcessor mapQueryProcessor;
    private final MapPresenter mapPresenter;
    private final CommercialHeatmapClient commercialHeatmapClient;

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

    @Override
    @Transactional(readOnly = true)
    public CommercialHeatmapResponse getCommercialHeatmap(
        double lngSW,
        double latSW,
        double lngNE,
        double latNE,
        String serviceCode,
        String periodCode,
        CommercialHeatmapMetricType metricType
    ) {
        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, lngSW, latSW, lngNE, latNE);
        List<String> commercialCodes = infos.stream().map(AreaBoundaryInfo::areaCode).toList();

        CommercialHeatmapScoresQueryResult scoreResponse = commercialHeatmapClient.getHeatmapScores(
            commercialCodes,
            serviceCode,
            metricType.name(),
            periodCode
        ).dataBody();

        Map<String, CommercialHeatmapScoreQueryResult> scoresByCode = scoreResponse == null || scoreResponse.scores() == null
            ? Map.of()
            : scoreResponse.scores().stream().collect(java.util.stream.Collectors.toMap(CommercialHeatmapScoreQueryResult::commercialCode, Function.identity()));

        List<CommercialHeatmapAreaInfo> heatmapInfos = infos.stream()
            .map(info -> {
                CommercialHeatmapScoreQueryResult score = scoresByCode.get(info.areaCode());
                return CommercialHeatmapAreaInfo.builder()
                    .areaCode(info.areaCode())
                    .areaName(info.areaName())
                    .centerLng(info.centerLng())
                    .centerLat(info.centerLat())
                    .boundaryCoords(info.boundaryCoords())
                    .metricType(metricType.name())
                    .score(score == null ? null : score.score())
                    .grade(score == null ? "INSUFFICIENT" : score.grade())
                    .summaryLabel(score == null ? "Insufficient data" : score.summaryLabel())
                    .build();
            })
            .toList();

        return mapPresenter.toCommercialHeatmapResponse(heatmapInfos);
    }
}
