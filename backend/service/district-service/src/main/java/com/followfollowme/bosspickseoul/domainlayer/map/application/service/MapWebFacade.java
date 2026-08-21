package com.followfollowme.bosspickseoul.domainlayer.map.application.service;

import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CandidatePresetsResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialHeatmapResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.presenter.MapPresenter;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidateCommercialAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidateCommercialsResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidatePresetInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialComparePreviewInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialHeatmapAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialHeatmapResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialProfileAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialProfileKeyMetricsInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.ComparePreviewMetricInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.ComparePreviewTargetInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.MetricBreakdownInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.in.MapWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialCandidateQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialHeatmapQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialProfileQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CandidateCommercialQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CandidateCommercialsQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialComparePreviewQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialHeatmapScoreQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialProfileKeyMetricsQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialProfileQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.ComparePreviewMetricQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.ComparePreviewTargetQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import com.followfollowme.bosspickseoul.shared.enums.GradeLevel;
import com.followfollowme.bosspickseoul.shared.enums.HeatmapModeType;
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
    private final CommercialHeatmapQueryPort commercialHeatmapQueryPort;
    private final CommercialCandidateQueryPort commercialCandidateQueryPort;
    private final CommercialProfileQueryPort commercialProfileQueryPort;

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
        double lngSW, double latSW, double lngNE, double latNE, String serviceCode, String periodCode,
        CommercialHeatmapMetricType metricType, CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric, boolean composite
    ) {
        validateHeatmapRequest(composite, metricType, preset, priorityMetric);

        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, lngSW, latSW, lngNE, latNE);
        List<String> commercialCodes = infos.stream().map(AreaBoundaryInfo::areaCode).toList();

        String priorityMetricName = priorityMetric == null ? null : priorityMetric.name();
        CommercialHeatmapScoresQueryResult scoreResponse = composite
            ? commercialHeatmapQueryPort.getCompositeHeatmapScores(
                commercialCodes,
                serviceCode,
                preset.name(),
                priorityMetricName,
                periodCode
            )
            : commercialHeatmapQueryPort.getHeatmapScores(
                commercialCodes,
                serviceCode,
                metricType.name(),
                periodCode
            );

        Map<String, CommercialHeatmapScoreQueryResult> scoresByCode = scoreResponse == null || scoreResponse.scores() == null
            ? Map.of()
            : scoreResponse.scores().stream()
                .collect(Collectors.toMap(CommercialHeatmapScoreQueryResult::commercialCode, Function.identity()));

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
                    .grade(score == null ? GradeLevel.INSUFFICIENT.name() : score.grade())
                    .summaryLabel(score == null ? "데이터 부족" : score.summaryLabel())
                    .build();
            })
            .toList();

        CommercialHeatmapResponseInfo responseInfo = CommercialHeatmapResponseInfo.builder()
            .mode(scoreResponse == null || scoreResponse.mode() == null
                ? (composite ? HeatmapModeType.COMPOSITE.toMetadata() : HeatmapModeType.SINGLE_METRIC.toMetadata())
                : scoreResponse.mode())
            .serviceCode(serviceCode)
            .periodCode(periodCode)
            .metricType(scoreResponse == null
                ? (metricType == null ? null : metricType.toScoreMetadata())
                : scoreResponse.metricType())
            .preset(scoreResponse == null
                ? (preset == null ? null : preset.toMetadata())
                : scoreResponse.preset())
            .priorityMetric(scoreResponse == null
                ? (priorityMetric == null ? null : priorityMetric.toScoreMetadata())
                : scoreResponse.priorityMetric())
            .summary(scoreResponse == null || scoreResponse.summary() == null
                ? buildHeatmapSummary(composite, metricType, preset, priorityMetric)
                : scoreResponse.summary())
            .areas(heatmapInfos)
            .build();

        return mapPresenter.toCommercialHeatmapResponse(responseInfo);
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
        double lngSW, double latSW, double lngNE, double latNE, String serviceCode, String periodCode,
        CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric, Integer topN
    ) {
        validateTopN(topN);

        CommercialHeatmapMetricType resolvedPriority = resolvePriorityMetric(preset, priorityMetric);
        int resolvedTopN = resolveTopN(topN);

        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, lngSW, latSW, lngNE, latNE);
        if (infos.isEmpty()) {
            CandidateCommercialsResponseInfo emptyResponse = CandidateCommercialsResponseInfo.builder()
                .serviceCode(serviceCode)
                .periodCode(periodCode)
                .preset(preset.toMetadata())
                .priorityMetric(resolvedPriority.toScoreMetadata())
                .topN(resolvedTopN)
                .summary(buildCandidateSummary(preset, resolvedPriority, 0))
                .items(List.of())
                .build();
            return mapPresenter.toCandidateCommercialsResponse(emptyResponse);
        }

        List<String> commercialCodes = infos.stream().map(AreaBoundaryInfo::areaCode).toList();

        String priorityMetricName = priorityMetric == null ? null : priorityMetric.name();
        CandidateCommercialsQueryResult response = commercialCandidateQueryPort.getTopCandidates(
            commercialCodes,
            serviceCode,
            preset.name(),
            priorityMetricName,
            topN,
            periodCode
        );

        if (response == null || response.items() == null) {
            CandidateCommercialsResponseInfo emptyResponse = CandidateCommercialsResponseInfo.builder()
                .serviceCode(serviceCode)
                .periodCode(periodCode)
                .preset(preset.toMetadata())
                .priorityMetric(resolvedPriority.toScoreMetadata())
                .topN(resolvedTopN)
                .summary(buildCandidateSummary(preset, resolvedPriority, 0))
                .items(List.of())
                .build();
            return mapPresenter.toCandidateCommercialsResponse(emptyResponse);
        }

        Map<String, AreaBoundaryInfo> boundaryByCode = infos.stream()
            .collect(Collectors.toMap(AreaBoundaryInfo::areaCode, Function.identity(), (a, b) -> a));

        List<CandidateCommercialAreaInfo> candidateInfos = response.items().stream()
            .map(item -> toCandidateAreaInfo(item, boundaryByCode.get(item.commercialCode())))
            .toList();

        CandidateCommercialsResponseInfo responseInfo = CandidateCommercialsResponseInfo.builder()
            .serviceCode(response.serviceCode() == null ? serviceCode : response.serviceCode())
            .periodCode(response.periodCode() == null ? periodCode : response.periodCode())
            .preset(response.preset() == null ? preset.toMetadata() : response.preset())
            .priorityMetric(response.priorityMetric() == null ? resolvedPriority.toScoreMetadata() : response.priorityMetric())
            .topN(response.topN() == null ? resolvedTopN : response.topN())
            .summary(response.summary() == null
                ? buildCandidateSummary(preset, resolvedPriority, candidateInfos.size())
                : response.summary())
            .items(candidateInfos)
            .build();

        return mapPresenter.toCandidateCommercialsResponse(responseInfo);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialProfileResponse getCommercialProfile(String commercialCode, String serviceCode, String periodCode) {
        CommercialProfileQueryResult result = commercialProfileQueryPort
            .getCommercialProfile(commercialCode, serviceCode, periodCode);
        CommercialProfileAreaInfo info = toCommercialProfileAreaInfo(result);
        return mapPresenter.toCommercialProfileResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialComparePreviewResponse getCommercialComparePreview(
        String leftCommercialCode, String rightCommercialCode, String serviceCode, String periodCode
    ) {
        CommercialComparePreviewQueryResult result = commercialProfileQueryPort
            .getCommercialComparePreview(leftCommercialCode, rightCommercialCode, serviceCode, periodCode);
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
            .selectionReason(item.selectionReason())
            .opportunityLabel(item.opportunityLabel())
            .riskLabel(item.riskLabel())
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
        CommercialProfileKeyMetricsQueryResult keyMetricsResult = result.keyMetrics();
        CommercialProfileKeyMetricsInfo keyMetrics = keyMetricsResult == null ? null : CommercialProfileKeyMetricsInfo.builder()
            .totalSalesAmount(keyMetricsResult.totalSalesAmount())
            .totalFootTraffic(keyMetricsResult.totalFootTraffic())
            .totalStoreCount(keyMetricsResult.totalStoreCount())
            .similarStoreCount(keyMetricsResult.similarStoreCount())
            .openingRate(keyMetricsResult.openingRate())
            .closureRate(keyMetricsResult.closureRate())
            .totalResidentPopulation(keyMetricsResult.totalResidentPopulation())
            .monthlyAverageIncomeAmount(keyMetricsResult.monthlyAverageIncomeAmount())
            .totalFacilityCount(keyMetricsResult.totalFacilityCount())
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
            .insightOneLiner(result.insightOneLiner())
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

    private void validateHeatmapRequest(boolean composite, CommercialHeatmapMetricType metricType, CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric) {

        if (composite && preset == null) {
            throw new MapException(MapErrorCode.HEATMAP_PRESET_REQUIRED);
        }
        if (!composite && metricType == null) {
            throw new MapException(MapErrorCode.HEATMAP_METRIC_TYPE_REQUIRED);
        }
        if (composite && metricType != null) {
            throw new MapException(MapErrorCode.HEATMAP_METRIC_TYPE_NOT_ALLOWED);
        }
        if (!composite && (preset != null || priorityMetric != null)) {
            throw new MapException(MapErrorCode.HEATMAP_PRESET_NOT_ALLOWED);
        }
    }

    private String buildHeatmapSummary(boolean composite, CommercialHeatmapMetricType metricType, CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric) {

        if (composite) {
            CommercialHeatmapMetricType resolvedPriority = resolvePriorityMetric(preset, priorityMetric);
            return "%s 프리셋과 %s 우선 지표 기준으로 계산한 상권 복합 히트맵입니다."
                .formatted(preset.getDisplayName(), resolvedPriority.getDisplayName());
        }
        return "%s 기준으로 조회한 상권 히트맵 결과입니다.".formatted(metricType.getDisplayName());
    }

    private String buildCandidateSummary(
        CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric, int candidateCount
    ) {
        return "%s 프리셋과 %s 우선 지표 기준으로 선별한 비교 후보 상권 %d건입니다."
            .formatted(preset.getDisplayName(), priorityMetric.getDisplayName(), candidateCount);
    }

    private CommercialHeatmapMetricType resolvePriorityMetric(CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric) {
        return priorityMetric == null ? preset.getDefaultPriorityMetric() : priorityMetric;
    }

    private int resolveTopN(Integer topN) {
        if (topN == null) {
            return 10;
        }
        return topN;
    }

    private void validateTopN(Integer topN) {
        if (topN == null) {
            return;
        }
        if (topN < 5 || topN > 30) {
            throw new MapException(MapErrorCode.INVALID_TOP_N);
        }
    }
}
