package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 행정동 AI 리포트의 잡/캐시 저장용 스냅샷.
 *
 * <p>{@code application/info/AdministrationAiReportInfo} 와 필드명·타입·중첩 구조가 1:1 이다.
 * 행정동 캐시 키에도 이제 버전 세그먼트가 있으므로, 필드 모양을 바꾸려면
 * {@code adapter/out/cache/AiReportCacheKeyVersion.ADMINISTRATION} 을 올려 구버전 캐시를 무효화한다.
 */
public record AdministrationAiReportSnapshot(
    String summary,
    String marketStatus,
    List<String> recommendedBusinessCategories,
    List<String> cautionBusinessCategories,
    String businessInsight,
    LocalDateTime generatedAt
) {

}
