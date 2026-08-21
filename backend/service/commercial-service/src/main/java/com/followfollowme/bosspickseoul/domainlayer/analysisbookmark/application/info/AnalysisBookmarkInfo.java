package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.info;

import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
public record AnalysisBookmarkInfo(
    long bookmarkId,
    ShareTargetType shareType,
    String payload,
    String bookmarkName,
    LocalDateTime createdAt
) {

}
