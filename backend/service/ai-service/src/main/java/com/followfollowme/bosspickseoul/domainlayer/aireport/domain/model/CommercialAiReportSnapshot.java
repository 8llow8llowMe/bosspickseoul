package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 상권 AI 리포트의 잡/캐시 저장용 스냅샷.
 *
 * <p>{@code application/info/CommercialAiReportInfo} 와 필드명·타입·중첩 구조가 1:1 이다.
 * Redis 에 이미 기록된 JSON 과 구조적으로 바인딩되므로 필드명을 바꾸면(대소문자 포함) 예외 없이 조용히 null 이 된다.
 * 필드를 손대야 한다면 캐시 키 버전을 올리거나 마이그레이션을 함께 설계한다.
 */
public record CommercialAiReportSnapshot(
    String summary,
    List<String> strengths,
    List<String> risks,
    List<String> recommendedBusinessCategories,
    List<String> recommendedCustomerSegments,
    List<String> recommendedOperatingHours,
    List<String> avoidOperatingHours,
    List<String> targetAgeGroups,
    List<String> targetGenders,
    List<String> operationTips,
    String businessInsight,
    LocalDateTime generatedAt
) {

}
