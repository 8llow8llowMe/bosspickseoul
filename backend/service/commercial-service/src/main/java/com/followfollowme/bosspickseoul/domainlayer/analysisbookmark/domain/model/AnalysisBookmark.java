package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.time.LocalDateTime;
import lombok.Builder;

/**
 * 회원의 분석 화면 보관함 항목.
 * payload 는 공유 링크와 동일한 화면 상태 JSON(정규화된 문자열)이며 백엔드는 해석하지 않는다.
 * 공유 링크와 달리 회원 소유이고 만료되지 않는다.
 */
@Builder
public record AnalysisBookmark(
    long id,
    long memberId,
    ShareTargetType shareType,
    String payload,
    String payloadHash,
    String bookmarkName,
    LocalDateTime createdAt
) {

}
