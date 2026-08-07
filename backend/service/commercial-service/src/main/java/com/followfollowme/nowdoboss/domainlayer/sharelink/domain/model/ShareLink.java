package com.followfollowme.nowdoboss.domainlayer.sharelink.domain.model;

import com.followfollowme.nowdoboss.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.time.LocalDateTime;

public record ShareLink(

    long id,

    String shareCode,

    ShareTargetType shareType,

    String payload,

    String payloadHash,

    long memberId,

    LocalDateTime expiresAt,

    LocalDateTime createdAt,

    LocalDateTime updatedAt

) {

}
