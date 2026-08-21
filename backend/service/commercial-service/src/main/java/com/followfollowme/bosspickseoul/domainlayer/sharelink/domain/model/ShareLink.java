package com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.time.LocalDateTime;

public record ShareLink(

    long id,

    String shareCode,

    ShareTargetType shareType,

    String payload,

    String payloadHash,

    // 비로그인 생성이 허용되므로 null 가능. 로그인 상태로 생성하면 최초 공유자가 기록된다.
    Long memberId,

    LocalDateTime expiresAt,

    LocalDateTime createdAt,

    LocalDateTime updatedAt

) {

}
