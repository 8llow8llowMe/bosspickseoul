package com.followfollowme.bosspickseoul.domainlayer.map.application.model;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CandidatePresetType implements CodeNameDescribable {
    BALANCED(
        "균형형",
        "기회·위험·혼잡·거주수요 네 축을 균형 있게 반영한 기본 추천 프리셋입니다.",
        CommercialHeatmapMetricType.OPPORTUNITY_SCORE
    ),
    AGGRESSIVE_OPPORTUNITY(
        "공격형",
        "기회도와 혼잡도에 가중치를 싣고 위험도 회피는 낮춘 공격적 진입 프리셋입니다.",
        CommercialHeatmapMetricType.OPPORTUNITY_SCORE
    ),
    STABLE_LOW_RISK(
        "안정형",
        "위험 회피와 거주 기반 수요를 중시한 안정적인 진입 프리셋입니다.",
        CommercialHeatmapMetricType.RISK_SCORE
    ),
    LOW_BUDGET_RESIDENT(
        "저예산 생활권형",
        "경쟁이 덜한 거주 기반 상권을 우선하는 저예산 창업 프리셋입니다.",
        CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE
    ),
    YOUTH_STARTUP(
        "청년창업형",
        "20~30대 유동인구·기회도를 중시하고 초기비용을 낮춘 청년 창업 프리셋입니다.",
        CommercialHeatmapMetricType.OPPORTUNITY_SCORE
    ),
    RE_EMPLOYMENT_STARTUP(
        "재취업창업형",
        "40~50대 거주 기반 수요와 안정성을 중시하는 재취업 창업 프리셋입니다.",
        CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE
    );

    private final String displayName;
    private final String description;
    private final CommercialHeatmapMetricType defaultPriorityMetric;
}
