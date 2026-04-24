package com.followfollowme.nowdoboss.domainlayer.commercial.application.model;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import java.util.EnumMap;
import java.util.Map;
import lombok.Getter;

@Getter
public enum CandidatePresetType implements CodeNameDescribable {
    BALANCED(
        "균형형",
        "기회·위험·혼잡·거주수요 네 축을 균형 있게 반영한 기본 추천 프리셋입니다.",
        CommercialHeatmapMetricType.OPPORTUNITY_SCORE,
        0.30, 0.25, 0.15, 0.30
    ),
    AGGRESSIVE_OPPORTUNITY(
        "공격형",
        "기회도와 혼잡도에 가중치를 싣고 위험도 회피는 낮춘 공격적 진입 프리셋입니다.",
        CommercialHeatmapMetricType.OPPORTUNITY_SCORE,
        0.55, 0.10, 0.20, 0.15
    ),
    STABLE_LOW_RISK(
        "안정형",
        "위험 회피와 거주 기반 수요를 중시한 안정적인 진입 프리셋입니다.",
        CommercialHeatmapMetricType.RISK_SCORE,
        0.20, 0.40, 0.05, 0.35
    ),
    LOW_BUDGET_RESIDENT(
        "저예산 생활권형",
        "경쟁이 덜한 거주 기반 상권을 우선하는 저예산 창업 프리셋입니다.",
        CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE,
        0.20, 0.25, 0.05, 0.50
    ),
    YOUTH_STARTUP(
        "청년창업형",
        "20~30대 유동인구·기회도를 중시하고 초기비용을 낮춘 청년 창업 프리셋입니다.",
        CommercialHeatmapMetricType.OPPORTUNITY_SCORE,
        0.45, 0.20, 0.25, 0.10
    ),
    RE_EMPLOYMENT_STARTUP(
        "재취업창업형",
        "40~50대 거주 기반 수요와 안정성을 중시하는 재취업 창업 프리셋입니다.",
        CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE,
        0.20, 0.35, 0.05, 0.40
    );

    private static final double PRIORITY_BOOST = 0.20;

    private final String displayName;
    private final String description;
    private final CommercialHeatmapMetricType defaultPriorityMetric;
    private final double opportunityWeight;
    private final double riskWeight;
    private final double congestionWeight;
    private final double residentPopulationWeight;

    CandidatePresetType(
        String displayName,
        String description,
        CommercialHeatmapMetricType defaultPriorityMetric,
        double opportunityWeight,
        double riskWeight,
        double congestionWeight,
        double residentPopulationWeight
    ) {
        this.displayName = displayName;
        this.description = description;
        this.defaultPriorityMetric = defaultPriorityMetric;
        this.opportunityWeight = opportunityWeight;
        this.riskWeight = riskWeight;
        this.congestionWeight = congestionWeight;
        this.residentPopulationWeight = residentPopulationWeight;
    }

    public Map<CommercialHeatmapMetricType, Double> weightsWithPriority(CommercialHeatmapMetricType priorityMetric) {
        Map<CommercialHeatmapMetricType, Double> base = new EnumMap<>(CommercialHeatmapMetricType.class);
        base.put(CommercialHeatmapMetricType.OPPORTUNITY_SCORE, opportunityWeight);
        base.put(CommercialHeatmapMetricType.RISK_SCORE, riskWeight);
        base.put(CommercialHeatmapMetricType.CONGESTION_SCORE, congestionWeight);
        base.put(CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE, residentPopulationWeight);

        CommercialHeatmapMetricType priority = priorityMetric == null ? defaultPriorityMetric : priorityMetric;
        base.merge(priority, PRIORITY_BOOST, Double::sum);

        double total = base.values().stream().mapToDouble(Double::doubleValue).sum();
        if (total <= 0D) {
            return base;
        }
        Map<CommercialHeatmapMetricType, Double> normalized = new EnumMap<>(CommercialHeatmapMetricType.class);
        base.forEach((metric, weight) -> normalized.put(metric, weight / total));
        return normalized;
    }

    public double computeComposite(
        Map<CommercialHeatmapMetricType, Double> scores,
        CommercialHeatmapMetricType priorityMetric
    ) {
        Map<CommercialHeatmapMetricType, Double> weights = weightsWithPriority(priorityMetric);
        double composite = 0D;
        for (Map.Entry<CommercialHeatmapMetricType, Double> entry : weights.entrySet()) {
            Double raw = scores.get(entry.getKey());
            if (raw == null) {
                continue;
            }
            double contribution = entry.getKey() == CommercialHeatmapMetricType.RISK_SCORE
                ? 100D - raw
                : raw;
            composite += contribution * entry.getValue();
        }
        return Math.max(0D, Math.min(100D, composite));
    }
}
