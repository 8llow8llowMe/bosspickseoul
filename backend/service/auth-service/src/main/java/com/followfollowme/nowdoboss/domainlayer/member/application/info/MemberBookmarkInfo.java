package com.followfollowme.nowdoboss.domainlayer.member.application.info;

import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
public record MemberBookmarkInfo(
    Long id,
    Long memberId,
    MemberBookmarkTargetType targetType,
    String targetCode,
    String targetName,
    LocalDateTime createdAt
) {

}
