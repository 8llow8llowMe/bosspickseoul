package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.candidate.CandidateCommercialInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.candidate.MetricBreakdownInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap.CommercialAllMetricScoresInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoreInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CandidatePresetType;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
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

    private static final int DEFAULT_TOP_N = 10;
    private static final int MIN_TOP_N = 5;
    private static final int MAX_TOP_N = 30;
    private static final double TAG_HIGH_THRESHOLD = 70D;
    private static final double TAG_LOW_THRESHOLD = 30D;

    private final CommercialHeatmapQueryProcessor commercialHeatmapQueryProcessor;

    public List<CommercialHeatmapScoreInfo> getCompositeHeatmapScores(
        String periodCode,
        String serviceCode,
        List<String> commercialCodes,
        CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric
    ) {
        if (commercialCodes == null || commercialCodes.isEmpty()) {
            return List.of();
        }

        List<CommercialAllMetricScoresInfo> allScores =
            commercialHeatmapQueryProcessor.getAllMetricScores(periodCode, serviceCode, commercialCodes);

        ScoreMetricMetadata compositeMetadata = buildCompositeMetadata(preset, priorityMetric);

        List<CommercialHeatmapScoreInfo> result = new ArrayList<>(allScores.size());
        for (CommercialAllMetricScoresInfo entry : allScores) {
            Map<CommercialHeatmapMetricType, Double> rawScores = extractRawScores(entry);
            Double composite = rawScores.isEmpty() ? null : preset.computeComposite(rawScores, priorityMetric);

            result.add(CommercialHeatmapScoreInfo.builder()
                .commercialCode(entry.commercialCode())
                .commercialName(entry.commercialCode())
                .metricType(compositeMetadata)
                .score(composite)
                .grade(compositeGrade(composite))
                .summaryLabel(compositeSummaryLabel(composite, preset))
                .build());
        }
        return result;
    }

    private ScoreMetricMetadata buildCompositeMetadata(CandidatePresetType preset, CommercialHeatmapMetricType priorityMetric) {
        String priorityLabel = priorityMetric == null
            ? preset.getDefaultPriorityMetric().getDisplayName()
            : priorityMetric.getDisplayName();
        String description = "프리셋 %s 가중치와 우선 지표 %s 기준으로 4개 지표를 가중 합성한 복합 점수입니다."
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

    public List<CandidateCommercialInfo> getTopCandidates(
        String periodCode,
        String serviceCode,
        List<String> commercialCodes,
        CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric,
        Integer topN
    ) {
        if (commercialCodes == null || commercialCodes.isEmpty()) {
            return List.of();
        }

        int limit = clampTopN(topN);
        List<CommercialAllMetricScoresInfo> allScores =
            commercialHeatmapQueryProcessor.getAllMetricScores(periodCode, serviceCode, commercialCodes);

        List<Ranked> ranked = new ArrayList<>(allScores.size());
        for (CommercialAllMetricScoresInfo entry : allScores) {
            Map<CommercialHeatmapMetricType, Double> rawScores = extractRawScores(entry);
            Double composite = rawScores.isEmpty() ? null : preset.computeComposite(rawScores, priorityMetric);
            ranked.add(new Ranked(entry, composite));
        }

        ranked.sort(Comparator.comparing((Ranked r) -> r.composite() == null ? Double.NEGATIVE_INFINITY : r.composite())
            .reversed());

        List<CandidateCommercialInfo> result = new ArrayList<>(Math.min(limit, ranked.size()));
        int rank = 1;
        for (Ranked item : ranked) {
            if (rank > limit) {
                break;
            }
            if (item.composite() == null) {
                continue;
            }
            result.add(toCandidateInfo(rank, item, preset, priorityMetric));
            rank++;
        }
        return result;
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
        int rank,
        Ranked item,
        CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric
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

        return CandidateCommercialInfo.builder()
            .rank(rank)
            .commercialCode(item.source().commercialCode())
            .commercialName(item.source().commercialCode())
            .compositeScore(item.composite())
            .grade(compositeGrade(item.composite()))
            .summaryLabel(preset.getDisplayName() + " 추천")
            .metricBreakdown(breakdown)
            .reasonTags(buildReasonTags(item.source(), preset, priorityMetric))
            .build();
    }

    private List<String> buildReasonTags(
        CommercialAllMetricScoresInfo source,
        CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric
    ) {
        CommercialHeatmapMetricType priority = priorityMetric == null ? preset.getDefaultPriorityMetric() : priorityMetric;
        List<String> tags = new ArrayList<>(3);

        CommercialHeatmapScoreInfo prioritySource = source.scoresByMetric().get(priority);
        if (prioritySource != null && prioritySource.score() != null) {
            tags.add(buildPriorityTag(priority, prioritySource.score()));
        }

        for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
            if (metric == priority || tags.size() >= 3) {
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
            default -> score >= TAG_HIGH_THRESHOLD ? label + " 상위" : label + " 평이";
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
        if (composite == null) {
            return "INSUFFICIENT";
        }
        if (composite >= TAG_HIGH_THRESHOLD) {
            return "HIGH";
        }
        if (composite >= 40D) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private int clampTopN(Integer topN) {
        if (topN == null) {
            return DEFAULT_TOP_N;
        }
        return Math.max(MIN_TOP_N, Math.min(MAX_TOP_N, topN));
    }

    private record Ranked(CommercialAllMetricScoresInfo source, Double composite) {
    }
}
