package com.followfollowme.bosspickseoul.domainlayer.map.application.model;

import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommercialHeatmapMetricType implements ScoreMetricDescribable {
    OPPORTUNITY_SCORE(
        "기회도",
        "매출, 소비력, 유동인구, 개업률 등을 종합한 상권 기회 지표입니다.",
        "점수가 높을수록 현재 업종 기준 진입 기회가 높습니다."
    ),
    RISK_SCORE(
        "위험도",
        "폐업률, 경쟁도, 취약 시간대 매출 비중 등을 종합한 상권 위험 지표입니다.",
        "점수가 높을수록 현재 업종 기준 위험 요인이 큽니다."
    ),
    CONGESTION_SCORE(
        "혼잡도",
        "유동인구와 점포 밀집도를 종합한 상권 혼잡 지표입니다.",
        "점수가 높을수록 상권 혼잡과 경쟁 체감이 큽니다."
    ),
    RESIDENT_POPULATION_SCORE(
        "거주수요",
        "거주인구와 소득 수준을 기반으로 한 생활권 수요 지표입니다.",
        "점수가 높을수록 거주 기반 소비 수요가 높습니다."
    );

    private final String displayName;
    private final String description;
    private final String scoreDescription;
}
