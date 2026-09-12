package com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialHeatmapAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialHeatmapResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialHeatmapQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialHeatmapScoreQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import com.followfollowme.bosspickseoul.shared.enums.GradeLevel;
import com.followfollowme.bosspickseoul.shared.enums.HeatmapModeType;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 뷰포트 안 상권 경계에 commercial-service 점수를 얹어 히트맵 Info 를 만든다.
 *
 * <p>경계 조회(DB)와 점수 조회(Feign)를 한 트랜잭션으로 묶지 않는다. DB 구간은 MapQueryProcessor 가
 * 자체 트랜잭션으로 처리하고, 여기서는 그 결과를 받아 원격 호출만 이어 붙인다.
 */
@Service
@RequiredArgsConstructor
public class MapHeatmapQueryProcessor {

    private final MapQueryProcessor mapQueryProcessor;
    private final CommercialHeatmapQueryPort commercialHeatmapQueryPort;

    public CommercialHeatmapResponseInfo getCommercialHeatmap(
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

        // 상권별 점수를 코드로 한 번에 색인한다. 영역마다 포트를 다시 부르면 N+1 원격 호출이 된다.
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

        return CommercialHeatmapResponseInfo.builder()
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
    }

    private void validateHeatmapRequest(
        boolean composite, CommercialHeatmapMetricType metricType, CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric
    ) {
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

    private String buildHeatmapSummary(
        boolean composite, CommercialHeatmapMetricType metricType, CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric
    ) {
        if (composite) {
            CommercialHeatmapMetricType resolvedPriority = preset.resolvePriorityMetric(priorityMetric);
            return "%s 프리셋과 %s 우선 지표 기준으로 계산한 상권 복합 히트맵입니다."
                .formatted(preset.getDisplayName(), resolvedPriority.getDisplayName());
        }
        return "%s 기준으로 조회한 상권 히트맵 결과입니다.".formatted(metricType.getDisplayName());
    }
}
