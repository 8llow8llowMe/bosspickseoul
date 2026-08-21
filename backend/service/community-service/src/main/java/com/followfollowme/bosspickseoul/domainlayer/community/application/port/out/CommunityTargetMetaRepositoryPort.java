package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityTargetMeta;
import java.util.Optional;

public interface CommunityTargetMetaRepositoryPort {

    Optional<CommunityTargetMeta> findTargetMeta(CommunityTargetType targetType, String targetCode);
}
