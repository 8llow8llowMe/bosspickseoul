package com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidateCommercialAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidateCommercialsResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidatePresetInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.MetricBreakdownInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialCandidateQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CandidateCommercialQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CandidateCommercialsQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 뷰포트 안 상권 중 비교 후보를 골라 Info 로 만든다.
 *
 * <p>경계 조회(DB)는 MapQueryProcessor 가 자체 트랜잭션으로 끝내고, 후보 선별(Feign)은 그 밖에서 한다.
 */
@Service
@RequiredArgsConstructor
public class MapCandidateQueryProcessor {

    private static final int DEFAULT_TOP_N = 10;
    private static final int MIN_TOP_N = 5;
    private static final int MAX_TOP_N = 30;

    private final MapQueryProcessor mapQueryProcessor;
    private final CommercialCandidateQueryPort commercialCandidateQueryPort;

    public CandidateCommercialsResponseInfo getCandidateCommercials(
        double lngSW, double latSW, double lngNE, double latNE, String serviceCode, String periodCode,
        CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric, Integer topN
    ) {
        validateTopN(topN);

        CommercialHeatmapMetricType resolvedPriority = preset.resolvePriorityMetric(priorityMetric);
        int resolvedTopN = resolveTopN(topN);

        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, lngSW, latSW, lngNE, latNE);
        if (infos.isEmpty()) {
            return emptyCandidates(serviceCode, periodCode, preset, resolvedPriority, resolvedTopN);
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
            return emptyCandidates(serviceCode, periodCode, preset, resolvedPriority, resolvedTopN);
        }

        // 후보마다 경계를 다시 조회하지 않도록 뷰포트 조회 결과를 코드로 한 번에 색인한다.
        Map<String, AreaBoundaryInfo> boundaryByCode = infos.stream()
            .collect(Collectors.toMap(AreaBoundaryInfo::areaCode, Function.identity(), (a, b) -> a));

        List<CandidateCommercialAreaInfo> candidateInfos = response.items().stream()
            .map(item -> toCandidateAreaInfo(item, boundaryByCode.get(item.commercialCode())))
            .toList();

        return CandidateCommercialsResponseInfo.builder()
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
    }

    public List<CandidatePresetInfo> getCandidatePresets() {
        return Arrays.stream(CandidatePresetType.values())
            .map(preset -> CandidatePresetInfo.builder()
                .preset(preset.toMetadata())
                .defaultPriorityMetric(preset.getDefaultPriorityMetric().toScoreMetadata())
                .build())
            .toList();
    }

    private CandidateCommercialsResponseInfo emptyCandidates(
        String serviceCode, String periodCode, CandidatePresetType preset, CommercialHeatmapMetricType resolvedPriority, int resolvedTopN
    ) {
        return CandidateCommercialsResponseInfo.builder()
            .serviceCode(serviceCode)
            .periodCode(periodCode)
            .preset(preset.toMetadata())
            .priorityMetric(resolvedPriority.toScoreMetadata())
            .topN(resolvedTopN)
            .summary(buildCandidateSummary(preset, resolvedPriority, 0))
            .items(List.of())
            .build();
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

    private String buildCandidateSummary(
        CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric, int candidateCount
    ) {
        return "%s 프리셋과 %s 우선 지표 기준으로 선별한 비교 후보 상권 %d건입니다."
            .formatted(preset.getDisplayName(), priorityMetric.getDisplayName(), candidateCount);
    }

    private int resolveTopN(Integer topN) {
        if (topN == null) {
            return DEFAULT_TOP_N;
        }
        return topN;
    }

    private void validateTopN(Integer topN) {
        if (topN == null) {
            return;
        }
        if (topN < MIN_TOP_N || topN > MAX_TOP_N) {
            throw new MapException(MapErrorCode.INVALID_TOP_N);
        }
    }
}
