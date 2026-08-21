package com.followfollowme.bosspickseoul.domainlayer.sharelink.application.info;

import com.fasterxml.jackson.databind.JsonNode;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.domain.enums.ShareTargetType;
import java.time.LocalDateTime;

public record ShareLinkResolveInfo(

    ShareTargetType shareType,

    JsonNode payload,

    LocalDateTime createdAt,

    LocalDateTime expiresAt

) {

}
