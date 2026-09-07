package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;
import com.followfollowme.bosspickseoul.common.util.KoreanJosa;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.candidate.CandidateCommercialInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.candidate.CandidateCommercialsResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.candidate.MetricBreakdownInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialAllMetricScoresInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoreInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoresResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.shared.enums.GradeLevel;
import com.followfollowme.bosspickseoul.shared.enums.HeatmapModeType;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialCandidateQueryProcessor {

    private static final double TAG_HIGH_THRESHOLD = 70D;
    private static final double TAG_LOW_THRESHOLD = 30D;

    private final CommercialHeatmapQueryProcessor commercialHeatmapQueryProcessor;
    private final CommercialBlueOceanQueryProcessor commercialBlueOceanQueryProcessor;

    public static CandidatePresetType resolvePresetFromServiceCode(String serviceCode) {
        if (serviceCode == null) {
            return CandidatePresetType.BALANCED;
        }
        if (serviceCode.startsWith("CS1")) {
            return CandidatePresetType.AGGRESSIVE_OPPORTUNITY;
        }
        if (serviceCode.startsWith("CS2")) {
            return CandidatePresetType.STABLE_LOW_RISK;
        }
        return CandidatePresetType.BALANCED;
    }

    public CommercialHeatmapScoresResponseInfo getCompositeHeatmapScores(
        String periodCode, String serviceCode, List<String> commercialCodes,
        CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric
    ) {
        CommercialHeatmapMetricType resolvedPriority = priorityMetric == null
            ? preset.getDefaultPriorityMetric()
            : priorityMetric;

        if (commercialCodes == null || commercialCodes.isEmpty()) {
            return CommercialHeatmapScoresResponseInfo.builder()
                .mode(HeatmapModeType.COMPOSITE.toMetadata())
                .serviceCode(serviceCode)
                .periodCode(periodCode)
                .preset(preset.toMetadata())
                .priorityMetric(resolvedPriority.toScoreMetadata())
                .summary(buildCompositeSummary(preset, resolvedPriority))
                .scores(List.of())
                .build();
        }

        List<CommercialAllMetricScoresInfo> allScores =
            commercialHeatmapQueryProcessor.getAllMetricScores(periodCode, serviceCode, commercialCodes);

        ScoreMetricMetadata compositeMetadata = buildCompositeMetadata(preset, resolvedPriority);

        List<CommercialHeatmapScoreInfo> result = new ArrayList<>(allScores.size());
        for (CommercialAllMetricScoresInfo entry : allScores) {
            Map<CommercialHeatmapMetricType, Double> rawScores = extractRawScores(entry);
            Double composite = rawScores.isEmpty() ? null : preset.computeComposite(rawScores, resolvedPriority);

            List<MetricBreakdownInfo> breakdown = new ArrayList<>(CommercialHeatmapMetricType.values().length);
            for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
                CommercialHeatmapScoreInfo scoreInfo = entry.scoresByMetric().get(metric);
                if (scoreInfo != null) {
                    breakdown.add(MetricBreakdownInfo.builder()
                        .metricType(scoreInfo.metricType())
                        .score(scoreInfo.score())
                        .grade(scoreInfo.grade())
                        .summaryLabel(scoreInfo.summaryLabel())
                        .build());
                }
            }

            result.add(CommercialHeatmapScoreInfo.builder()
                .commercialCode(entry.commercialCode())
                .commercialName(entry.commercialName())
                .metricType(compositeMetadata)
                .score(composite)
                .grade(compositeGrade(composite))
                .summaryLabel(compositeSummaryLabel(composite, preset))
                .breakdown(breakdown.isEmpty() ? null : breakdown)
                .build());
        }

        return CommercialHeatmapScoresResponseInfo.builder()
            .mode(HeatmapModeType.COMPOSITE.toMetadata())
            .serviceCode(serviceCode)
            .periodCode(periodCode)
            .preset(preset.toMetadata())
            .priorityMetric(resolvedPriority.toScoreMetadata())
            .summary(buildCompositeSummary(preset, resolvedPriority))
            .scores(result)
            .build();
    }

    public CandidateCommercialsResponseInfo getTopCandidates(
        String periodCode, String serviceCode, List<String> commercialCodes,
        CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric, int topN
    ) {
        CommercialHeatmapMetricType resolvedPriority = priorityMetric == null
            ? preset.getDefaultPriorityMetric()
            : priorityMetric;

        if (commercialCodes == null || commercialCodes.isEmpty()) {
            return CandidateCommercialsResponseInfo.builder()
                .serviceCode(serviceCode)
                .periodCode(periodCode)
                .preset(preset.toMetadata())
                .priorityMetric(resolvedPriority.toScoreMetadata())
                .topN(topN)
                .summary(buildCandidateSummary(preset, resolvedPriority, 0))
                .items(List.of())
                .build();
        }

        List<CommercialAllMetricScoresInfo> allScores =
            commercialHeatmapQueryProcessor.getAllMetricScores(periodCode, serviceCode, commercialCodes);

        List<Ranked> ranked = new ArrayList<>(allScores.size());
        for (CommercialAllMetricScoresInfo entry : allScores) {
            Map<CommercialHeatmapMetricType, Double> rawScores = extractRawScores(entry);
            Double composite = rawScores.isEmpty() ? null : preset.computeComposite(rawScores, resolvedPriority);
            ranked.add(new Ranked(entry, composite));
        }

        ranked.sort(Comparator.comparing((Ranked candidate) -> candidate.composite() == null
                ? Double.NEGATIVE_INFINITY
                : candidate.composite())
            .reversed());

        List<CandidateCommercialInfo> result = new ArrayList<>(Math.min(topN, ranked.size()));
        int rank = 1;
        for (Ranked item : ranked) {
            if (rank > topN) {
                break;
            }
            if (item.composite() == null) {
                continue;
            }
            result.add(toCandidateInfo(rank, item, preset, resolvedPriority));
            rank++;
        }

        return CandidateCommercialsResponseInfo.builder()
            .serviceCode(serviceCode)
            .periodCode(periodCode)
            .preset(preset.toMetadata())
            .priorityMetric(resolvedPriority.toScoreMetadata())
            .topN(topN)
            .summary(buildCandidateSummary(preset, resolvedPriority, result.size()))
            .items(result)
            .build();
    }

    private ScoreMetricMetadata buildCompositeMetadata(
        CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric
    ) {
        String priorityLabel = priorityMetric.getDisplayName();
        String description = "%s 가중치와 우선 지표 %s 기준으로 4개 지표를 합산한 복합 점수입니다."
            .formatted(preset.getDisplayName(), priorityLabel);
        return ScoreMetricMetadata.of(
            "COMPOSITE_" + preset.name(),
            preset.getDisplayName() + " 복합점수",
            description,
            "점수가 높을수록 프리셋 기준 추천 적합도가 높습니다."
        );
    }

    private String compositeSummaryLabel(Double composite, CandidatePresetType preset) {
        if (composite == null) {
            return "데이터 부족";
        }
        if (composite >= TAG_HIGH_THRESHOLD) {
            return preset.getDisplayName() + " 적합도 높음";
        }
        if (composite >= 40D) {
            return preset.getDisplayName() + " 적합도 보통";
        }
        return preset.getDisplayName() + " 적합도 낮음";
    }

    private Map<CommercialHeatmapMetricType, Double> extractRawScores(CommercialAllMetricScoresInfo entry) {
        Map<CommercialHeatmapMetricType, Double> scores = new EnumMap<>(CommercialHeatmapMetricType.class);
        for (Map.Entry<CommercialHeatmapMetricType, CommercialHeatmapScoreInfo> pair : entry.scoresByMetric().entrySet()) {
            Double score = pair.getValue() == null ? null : pair.getValue().score();
            if (score != null) {
                scores.put(pair.getKey(), score);
            }
        }
        return scores;
    }

    private CandidateCommercialInfo toCandidateInfo(
        int rank, Ranked item, CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric
    ) {
        List<MetricBreakdownInfo> breakdown = new ArrayList<>(CommercialHeatmapMetricType.values().length);
        for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
            CommercialHeatmapScoreInfo scoreInfo = item.source().scoresByMetric().get(metric);
            if (scoreInfo == null) {
                continue;
            }
            breakdown.add(MetricBreakdownInfo.builder()
                .metricType(scoreInfo.metricType())
                .score(scoreInfo.score())
                .grade(scoreInfo.grade())
                .summaryLabel(scoreInfo.summaryLabel())
                .build());
        }

        String opportunityLabel = resolveLabel(item.source(), CommercialHeatmapMetricType.OPPORTUNITY_SCORE);
        String riskLabel = resolveLabel(item.source(), CommercialHeatmapMetricType.RISK_SCORE);

        return CandidateCommercialInfo.builder()
            .rank(rank)
            .commercialCode(item.source().commercialCode())
            .commercialName(item.source().commercialName())
            .compositeScore(item.composite())
            .grade(compositeGrade(item.composite()))
            .summaryLabel(preset.getDisplayName() + " 추천")
            .selectionReason(buildSelectionReason(
                preset.getDisplayName(), priorityMetric.getDisplayName(), opportunityLabel, riskLabel))
            .opportunityLabel(opportunityLabel)
            .riskLabel(riskLabel)
            .metricBreakdown(breakdown)
            .reasonTags(buildReasonTags(item.source(), preset, priorityMetric))
            .build();
    }

    /**
     * 추천 카드에 그대로 보이는 문장을 만든다.
     *
     * <p>앞절은 무엇을 우선 봤는지(지표명), 뒷절은 그래서 어땠는지(요약 라벨)로 역할을 가른다.
     * 두 자리에 같은 요약 라벨을 넣으면 "기회도는 기회도 높음이며" 처럼 지표명이 겹친다 —
     * 요약 라벨이 이미 지표명을 품고 있기 때문이다
     * ({@code CommercialHeatmapQueryProcessor#buildSummaryLabel}).
     *
     * <p><b>이 문장은 요약 라벨이 지표명을 품는다는 데 기댄다.</b> 뒷절에 "기회도는 " 같은 접두사를
     * 붙이지 않고 라벨만 이어 붙이기 때문이다. 라벨 생성부나 그 폴백에서 지표명을 빼면
     * "데이터 부족 · 데이터 부족" 처럼 어느 지표가 없는지 알 수 없는 문장이 나간다.
     *
     * <p>조사는 앞말을 보고 고른다. 지표명이 데이터라 상수로 둘 수 없다.
     *
     * <p>점수 조회 없이 문구만 검증할 수 있도록 문자열만 받는 정적 메서드로 둔다.
     */
    static String buildSelectionReason(
        String presetDisplayName, String priorityMetricDisplayName, String opportunityLabel, String riskLabel
    ) {
        return "%s 기준으로 %s 우선 반영했고, %s · %s입니다."
            .formatted(
                presetDisplayName,
                KoreanJosa.appendObjective(priorityMetricDisplayName),
                opportunityLabel,
                riskLabel
            );
    }

    /**
     * 지표 요약 라벨을 꺼낸다. 라벨이 아예 없으면 지표명을 품은 폴백을 만든다.
     *
     * <p>폴백에서 지표명을 빼면 {@link #buildSelectionReason} 이 기대는 불변식이 깨진다
     * ({@code CommercialHeatmapQueryProcessor#buildSummaryLabel} 참고).
     */
    private String resolveLabel(CommercialAllMetricScoresInfo source, CommercialHeatmapMetricType metricType) {
        CommercialHeatmapScoreInfo scoreInfo = source.scoresByMetric().get(metricType);
        if (scoreInfo == null || scoreInfo.summaryLabel() == null) {
            return metricType.getDisplayName() + " 데이터 부족";
        }
        return scoreInfo.summaryLabel();
    }

    private String buildCandidateSummary(
        CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric, int candidateCount
    ) {
        return "%s 프리셋과 %s 우선 지표 기준으로 선별한 비교 후보 상권 %d건입니다."
            .formatted(preset.getDisplayName(), priorityMetric.getDisplayName(), candidateCount);
    }

    private String buildCompositeSummary(
        CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric
    ) {
        return "%s 프리셋과 %s 우선 지표 기준으로 계산한 상권 복합 히트맵입니다."
            .formatted(preset.getDisplayName(), priorityMetric.getDisplayName());
    }

    private List<String> buildReasonTags(
        CommercialAllMetricScoresInfo source, CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric
    ) {
        List<String> tags = new ArrayList<>(3);

        CommercialHeatmapScoreInfo prioritySource = source.scoresByMetric().get(priorityMetric);
        if (prioritySource != null && prioritySource.score() != null) {
            tags.add(buildPriorityTag(priorityMetric, prioritySource.score()));
        }

        for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
            if (metric == priorityMetric || tags.size() >= 3) {
                continue;
            }
            CommercialHeatmapScoreInfo info = source.scoresByMetric().get(metric);
            if (info == null || info.score() == null) {
                continue;
            }
            String tag = buildSecondaryTag(metric, info.score());
            if (tag != null) {
                tags.add(tag);
            }
        }

        return tags;
    }

    private String buildPriorityTag(CommercialHeatmapMetricType metric, double score) {
        String label = metric.getDisplayName();
        return switch (metric) {
            case RISK_SCORE -> score >= TAG_HIGH_THRESHOLD ? label + " 주의" : label + " 양호";
            default -> score >= TAG_HIGH_THRESHOLD ? label + " 우세" : label + " 반영";
        };
    }

    private String buildSecondaryTag(CommercialHeatmapMetricType metric, double score) {
        String label = metric.getDisplayName();
        if (metric == CommercialHeatmapMetricType.RISK_SCORE) {
            if (score <= TAG_LOW_THRESHOLD) {
                return label + " 낮음";
            }
            if (score >= TAG_HIGH_THRESHOLD) {
                return label + " 높음";
            }
            return null;
        }
        if (score >= TAG_HIGH_THRESHOLD) {
            return label + " 높음";
        }
        if (score <= TAG_LOW_THRESHOLD) {
            return label + " 낮음";
        }
        return null;
    }

    private String compositeGrade(Double composite) {
        return GradeLevel.fromScore(composite).name();
    }

    public CandidateCommercialsResponseInfo getTopCandidatesByService(
        String periodCode, String serviceCode, List<String> commercialCodes, int topN
    ) {
        CandidatePresetType preset = resolvePresetFromServiceCode(serviceCode);
        CandidateCommercialsResponseInfo response =
            getTopCandidates(periodCode, serviceCode, commercialCodes, preset, preset.getDefaultPriorityMetric(), topN);

        // 블루오션 업종(행정동엔 많은데 내 상권엔 적은 업종)은 확정된 Top N 에만 붙인다.
        // 후보 전체에 붙이면 후보 수만큼 지역 조회가 늘어나므로 추천 경로 전용으로 제한한다.
        List<CandidateCommercialInfo> enrichedItems = response.items().stream()
            .map(item -> item.withBlueOceanCategories(
                commercialBlueOceanQueryProcessor.getBlueOceanCategories(periodCode, item.commercialCode())))
            .toList();

        return CandidateCommercialsResponseInfo.builder()
            .serviceCode(response.serviceCode())
            .periodCode(response.periodCode())
            .preset(response.preset())
            .priorityMetric(response.priorityMetric())
            .topN(response.topN())
            .summary(response.summary())
            .items(enrichedItems)
            .build();
    }

    private record Ranked(CommercialAllMetricScoresInfo source, Double composite) {

    }
}
