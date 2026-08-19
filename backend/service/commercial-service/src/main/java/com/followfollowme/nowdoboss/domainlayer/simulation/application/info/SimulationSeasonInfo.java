package com.followfollowme.nowdoboss.domainlayer.simulation.application.info;

import java.util.List;
import lombok.Builder;

/**
 * 성수기/비성수기 분석 — 기준 연도 분기별 매출 최대/최소 분기를 월 목록으로 환산한다.
 */
@Builder
public record SimulationSeasonInfo(
    List<Integer> peakMonths,
    List<Integer> offPeakMonths
) {

}
