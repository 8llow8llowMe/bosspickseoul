package com.followfollowme.bosspickseoul.domainlayer.map.application.service;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CandidatePresetsResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialHeatmapResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.presenter.MapPresenter;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidateCommercialsResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidatePresetInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialComparePreviewInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialHeatmapResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialProfileAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.in.MapWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapCandidateQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapHeatmapQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapProfileQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 지도 유스케이스 오케스트레이터.
 *
 * <p>이 Facade 에는 트랜잭션을 걸지 않는다. DB 트랜잭션 경계는 {@link MapQueryProcessor} 가 소유한다.
 * 히트맵·후보·프로필 유스케이스는 commercial-service Feign 호출을 포함하는데, 그 호출을 트랜잭션
 * 안에서 기다리면 상대 서비스가 느려지는 동안 DB 커넥션을 점유해 Feign 과 무관한 좌표 조회 API 까지
 * 함께 끌어내린다.
 */
@Service
@RequiredArgsConstructor
public class MapWebFacade implements MapWebUseCase {

    private final MapQueryProcessor mapQueryProcessor;
    private final MapHeatmapQueryProcessor mapHeatmapQueryProcessor;
    private final MapCandidateQueryProcessor mapCandidateQueryProcessor;
    private final MapProfileQueryProcessor mapProfileQueryProcessor;
    private final MapPresenter mapPresenter;

    @Override
    public MapAreaCoordsResponse getCommercialAreaCoords(double lngSW, double latSW, double lngNE, double latNE) {
        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, lngSW, latSW, lngNE, latNE);
        return mapPresenter.toMapAreaCoordsResponse(infos);
    }

    @Override
    public MapAreaCoordsResponse getAdministrationAreaCoords(double lngSW, double latSW, double lngNE, double latNE) {
        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.ADMINISTRATION, lngSW, latSW, lngNE, latNE);
        return mapPresenter.toMapAreaCoordsResponse(infos);
    }

    @Override
    public MapAreaCoordsResponse getDistrictAreaCoords(double lngSW, double latSW, double lngNE, double latNE) {
        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.DISTRICT, lngSW, latSW, lngNE, latNE);
        return mapPresenter.toMapAreaCoordsResponse(infos);
    }

    @Override
    public CommercialHeatmapResponse getCommercialHeatmap(
        double lngSW, double latSW, double lngNE, double latNE, String serviceCode, String periodCode,
        CommercialHeatmapMetricType metricType, CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric, boolean composite
    ) {
        CommercialHeatmapResponseInfo info = mapHeatmapQueryProcessor.getCommercialHeatmap(
            lngSW, latSW, lngNE, latNE, serviceCode, periodCode, metricType, preset, priorityMetric, composite
        );
        return mapPresenter.toCommercialHeatmapResponse(info);
    }

    @Override
    public CandidatePresetsResponse getCandidatePresets() {
        List<CandidatePresetInfo> infos = mapCandidateQueryProcessor.getCandidatePresets();
        return mapPresenter.toCandidatePresetsResponse(infos);
    }

    @Override
    public CandidateCommercialsResponse getCandidateCommercials(
        double lngSW, double latSW, double lngNE, double latNE, String serviceCode, String periodCode,
        CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric, Integer topN
    ) {
        CandidateCommercialsResponseInfo info = mapCandidateQueryProcessor.getCandidateCommercials(
            lngSW, latSW, lngNE, latNE, serviceCode, periodCode, preset, priorityMetric, topN
        );
        return mapPresenter.toCandidateCommercialsResponse(info);
    }

    @Override
    public CommercialProfileResponse getCommercialProfile(String commercialCode, String serviceCode, String periodCode) {
        CommercialProfileAreaInfo info = mapProfileQueryProcessor.getCommercialProfile(commercialCode, serviceCode, periodCode);
        return mapPresenter.toCommercialProfileResponse(info);
    }

    @Override
    public CommercialComparePreviewResponse getCommercialComparePreview(String leftCommercialCode, String rightCommercialCode, String serviceCode, String periodCode) {
        CommercialComparePreviewInfo info = mapProfileQueryProcessor.getCommercialComparePreview(leftCommercialCode, rightCommercialCode, serviceCode, periodCode);
        return mapPresenter.toCommercialComparePreviewResponse(info);
    }
}
