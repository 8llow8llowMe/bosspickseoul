package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 자치구 AI 리포트의 잡/캐시 저장용 스냅샷.
 *
 * <p>{@code application/info/DistrictAiReportInfo} 와 필드명·타입·중첩 구조가 1:1 이다.
 * 자치구 캐시 키에는 이제 버전 세그먼트가 있으므로, 필드 모양을 바꾸려면
 * {@code adapter/out/cache/AiReportCacheKeyVersion.DISTRICT} 를 올려 구버전 캐시를 무효화한다.
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
