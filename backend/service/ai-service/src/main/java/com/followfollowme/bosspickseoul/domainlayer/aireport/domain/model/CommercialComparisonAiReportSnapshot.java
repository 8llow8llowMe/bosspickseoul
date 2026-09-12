package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 상권 비교 AI 리포트의 잡/캐시 저장용 스냅샷.
 *
 * <p>{@code application/info/CommercialComparisonAiReportInfo} 와 필드명·타입·중첩 구조가 1:1 이다.
 * Redis 에 이미 기록된 JSON 과 구조적으로 바인딩되므로 필드명을 바꾸면 예외 없이 조용히 null 이 된다.
 */
public record CommercialComparisonAiReportSnapshot(
    String summary,
    String recommendedSide,
    List<String> recommendedReasons,
    String riskComparison,
    String timeSlotInsight,
    String customerSegmentInsight,
    List<String> operationStrategy,
    String businessInsight,
    LocalDateTime generatedAt
) {

}
