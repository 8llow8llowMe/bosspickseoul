package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 자치구 AI 리포트의 잡/캐시 저장용 스냅샷.
 *
 * <p>{@code application/info/DistrictAiReportInfo} 와 필드명·타입·중첩 구조가 1:1 이다.
 * 자치구 캐시 키에는 버전 세그먼트가 없어 모양이 바뀌면 되돌릴 방법이 없으므로 필드를 그대로 유지한다.
 */
public record DistrictAiReportSnapshot(
    String summary,
    String marketStatus,
    List<String> recommendedBusinessCategories,
    List<String> cautionBusinessCategories,
    String businessInsight,
    LocalDateTime generatedAt
) {

}
