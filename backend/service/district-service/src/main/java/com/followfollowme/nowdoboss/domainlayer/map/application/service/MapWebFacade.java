package com.followfollowme.nowdoboss.domainlayer.map.application.service;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CandidatePresetsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialHeatmapResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.feign.CommercialCandidateClient;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.feign.CommercialHeatmapClient;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.feign.CommercialProfileClient;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CandidateCommercialAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CandidatePresetInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CommercialComparePreviewInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CommercialHeatmapAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CommercialProfileAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CommercialProfileKeyMetricsInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.ComparePreviewMetricInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.ComparePreviewTargetInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.MetricBreakdownInfo;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.presenter.MapPresenter;
import com.followfollowme.nowdoboss.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.nowdoboss.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.in.MapWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CandidateCommercialQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CandidateCommercialsQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialComparePreviewQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialHeatmapScoreQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialProfileKeyMetricsQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialProfileQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.ComparePreviewMetricQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.ComparePreviewTargetQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.service.processor.MapQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.map.domain.enums.AreaType;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MapWebFacade implements MapWebUseCase {

    private final MapQueryProcessor mapQueryProcessor;
    private final MapPresenter mapPresenter;
    private final CommercialHeatmapClient commercialHeatmapClient;
    private final CommercialCandidateClient commercialCandidateClient;
    private final CommercialProfileClient commercialProfileClient;

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
        CommercialHeatmapMetricType metricType,
        CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric,
        boolean composite
    ) {
        if (composite && preset == null) {
            throw new IllegalArgumentException("composite=true 인 경우 preset 은 필수입니다.");
        }
        if (!composite && metricType == null) {
            throw new IllegalArgumentException("composite=false 인 경우 metricType 은 필수입니다.");
        }

        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, lngSW, latSW, lngNE, latNE);
        List<String> commercialCodes = infos.stream().map(AreaBoundaryInfo::areaCode).toList();

        CommercialHeatmapScoresQueryResult scoreResponse = composite
            ? commercialHeatmapClient.getCompositeHeatmapScores(
                commercialCodes,
                serviceCode,
                preset.name(),
                priorityMetric == null ? null : priorityMetric.name(),
                periodCode
            ).dataBody()
            : commercialHeatmapClient.getHeatmapScores(
                commercialCodes,
                serviceCode,
                metricType.name(),
                periodCode
            ).dataBody();

        Map<String, CommercialHeatmapScoreQueryResult> scoresByCode = scoreResponse == null || scoreResponse.scores() == null
            ? Map.of()
            : scoreResponse.scores().stream().collect(Collectors.toMap(CommercialHeatmapScoreQueryResult::commercialCode, Function.identity()));

        CommercialHeatmapMetricType fallbackMetric = composite ? null : metricType;

        List<CommercialHeatmapAreaInfo> heatmapInfos = infos.stream()
            .map(info -> {
                CommercialHeatmapScoreQueryResult score = scoresByCode.get(info.areaCode());
                return CommercialHeatmapAreaInfo.builder()
                    .areaCode(info.areaCode())
                    .areaName(info.areaName())
                    .centerLng(info.centerLng())
                    .centerLat(info.centerLat())
                    .boundaryCoords(info.boundaryCoords())
                    .metricType(score != null ? score.metricType()
                        : (fallbackMetric != null ? fallbackMetric.toScoreMetadata() : null))
                    .score(score == null ? null : score.score())
                    .grade(score == null ? "INSUFFICIENT" : score.grade())
                    .summaryLabel(score == null ? "Insufficient data" : score.summaryLabel())
                    .build();
            })
            .toList();

        return mapPresenter.toCommercialHeatmapResponse(heatmapInfos);
    }

    @Override
    public CandidatePresetsResponse getCandidatePresets() {
        List<CandidatePresetInfo> infos = Arrays.stream(CandidatePresetType.values())
            .map(preset -> CandidatePresetInfo.builder()
                .preset(preset.toMetadata())
                .defaultPriorityMetric(preset.getDefaultPriorityMetric().toScoreMetadata())
                .build())
            .toList();
        return mapPresenter.toCandidatePresetsResponse(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public CandidateCommercialsResponse getCandidateCommercials(
        double lngSW,
        double latSW,
        double lngNE,
        double latNE,
        String serviceCode,
        String periodCode,
        CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric,
        Integer topN
    ) {
        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, lngSW, latSW, lngNE, latNE);
        if (infos.isEmpty()) {
            return mapPresenter.toCandidateCommercialsResponse(List.of());
        }

        List<String> commercialCodes = infos.stream().map(AreaBoundaryInfo::areaCode).toList();

        CandidateCommercialsQueryResult response = commercialCandidateClient.getTopCandidates(
            commercialCodes,
            serviceCode,
            preset.name(),
            priorityMetric == null ? null : priorityMetric.name(),
            topN,
            periodCode
        ).dataBody();

        if (response == null || response.items() == null) {
            return mapPresenter.toCandidateCommercialsResponse(List.of());
        }

        Map<String, AreaBoundaryInfo> boundaryByCode = infos.stream()
            .collect(Collectors.toMap(AreaBoundaryInfo::areaCode, Function.identity(), (a, b) -> a));

        List<CandidateCommercialAreaInfo> candidateInfos = response.items().stream()
            .map(item -> toCandidateAreaInfo(item, boundaryByCode.get(item.commercialCode())))
            .toList();

        return mapPresenter.toCandidateCommercialsResponse(candidateInfos);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialProfileResponse getCommercialProfile(String commercialCode, String serviceCode, String periodCode) {
        CommercialProfileQueryResult result = commercialProfileClient.getCommercialProfile(commercialCode, serviceCode, periodCode).dataBody();
        CommercialProfileAreaInfo info = toCommercialProfileAreaInfo(result);
        return mapPresenter.toCommercialProfileResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialComparePreviewResponse getCommercialComparePreview(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    ) {
        CommercialComparePreviewQueryResult result = commercialProfileClient.getCommercialComparePreview(
            leftCommercialCode,
            rightCommercialCode,
            serviceCode,
            periodCode
        ).dataBody();
        CommercialComparePreviewInfo info = toCommercialComparePreviewInfo(result);
        return mapPresenter.toCommercialComparePreviewResponse(info);
    }

    private CandidateCommercialAreaInfo toCandidateAreaInfo(CandidateCommercialQueryResult item, AreaBoundaryInfo boundary) {
        List<MetricBreakdownInfo> breakdown = item.metricBreakdown() == null
            ? List.of()
            : item.metricBreakdown().stream()
                .map(metric -> MetricBreakdownInfo.builder()
                    .metricType(metric.metricType())
                    .score(metric.score())
                    .grade(metric.grade())
                    .summaryLabel(metric.summaryLabel())
                    .build())
                .toList();

        return CandidateCommercialAreaInfo.builder()
            .rank(item.rank())
            .areaCode(item.commercialCode())
            .areaName(boundary == null ? item.commercialName() : boundary.areaName())
            .centerLng(boundary == null ? null : boundary.centerLng())
            .centerLat(boundary == null ? null : boundary.centerLat())
            .boundaryCoords(boundary == null ? List.of() : boundary.boundaryCoords())
            .compositeScore(item.compositeScore())
            .grade(item.grade())
            .summaryLabel(item.summaryLabel())
            .metricBreakdown(breakdown)
            .reasonTags(item.reasonTags() == null ? List.of() : item.reasonTags())
            .build();
    }

    private CommercialProfileAreaInfo toCommercialProfileAreaInfo(CommercialProfileQueryResult result) {
        if (result == null) {
            return CommercialProfileAreaInfo.builder()
                .boundaryCoords(List.of())
                .build();
        }
        CommercialProfileKeyMetricsQueryResult km = result.keyMetrics();
        CommercialProfileKeyMetricsInfo keyMetrics = km == null ? null : CommercialProfileKeyMetricsInfo.builder()
            .totalSalesAmount(km.totalSalesAmount())
            .totalFootTraffic(km.totalFootTraffic())
            .totalStoreCount(km.totalStoreCount())
            .similarStoreCount(km.similarStoreCount())
            .openingRate(km.openingRate())
            .closureRate(km.closureRate())
            .totalResidentPopulation(km.totalResidentPopulation())
            .monthlyAverageIncomeAmount(km.monthlyAverageIncomeAmount())
            .totalFacilityCount(km.totalFacilityCount())
            .build();

        return CommercialProfileAreaInfo.builder()
            .commercialCode(result.commercialCode())
            .commercialName(result.commercialName())
            .districtCode(result.districtCode())
            .districtName(result.districtName())
            .administrationCode(result.administrationCode())
            .administrationName(result.administrationName())
            .centerLng(null)
            .centerLat(null)
            .boundaryCoords(List.of())
            .keyMetrics(keyMetrics)
            .build();
    }

    private CommercialComparePreviewInfo toCommercialComparePreviewInfo(CommercialComparePreviewQueryResult result) {
        if (result == null) {
            return CommercialComparePreviewInfo.builder()
                .headlineMetrics(List.of())
                .build();
        }
        List<ComparePreviewMetricInfo> metrics = result.headlineMetrics() == null
            ? List.of()
            : result.headlineMetrics().stream()
                .map(this::toComparePreviewMetricInfo)
                .toList();

        return CommercialComparePreviewInfo.builder()
            .left(toComparePreviewTargetInfo(result.left()))
            .right(toComparePreviewTargetInfo(result.right()))
            .recommendedSide(result.recommendedSide())
            .headlineMetrics(metrics)
            .build();
    }

    private ComparePreviewTargetInfo toComparePreviewTargetInfo(ComparePreviewTargetQueryResult target) {
        if (target == null) {
            return null;
        }
        return ComparePreviewTargetInfo.builder()
            .commercialCode(target.commercialCode())
            .commercialName(target.commercialName())
            .districtCode(target.districtCode())
            .districtName(target.districtName())
            .administrationCode(target.administrationCode())
            .administrationName(target.administrationName())
            .build();
    }

    private ComparePreviewMetricInfo toComparePreviewMetricInfo(ComparePreviewMetricQueryResult metric) {
        return ComparePreviewMetricInfo.builder()
            .label(metric.label())
            .leftValue(metric.leftValue())
            .rightValue(metric.rightValue())
            .diffValue(metric.diffValue())
            .diffRate(metric.diffRate())
            .winnerSide(metric.winnerSide())
            .build();
    }
}
