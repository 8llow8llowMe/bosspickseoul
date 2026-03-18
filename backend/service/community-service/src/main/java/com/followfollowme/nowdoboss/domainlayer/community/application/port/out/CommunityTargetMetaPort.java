package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityTargetMeta;
import java.util.Optional;

public interface CommunityTargetMetaPort {

    Optional<CommunityTargetMeta> findTargetMeta(CommunityTargetType targetType, String targetCode);
}
