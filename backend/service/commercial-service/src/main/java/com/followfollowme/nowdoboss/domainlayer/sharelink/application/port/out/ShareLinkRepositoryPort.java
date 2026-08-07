package com.followfollowme.nowdoboss.domainlayer.sharelink.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.sharelink.domain.model.ShareLink;
import java.util.Optional;

public interface ShareLinkRepositoryPort {

    Optional<ShareLink> findByShareCode(String shareCode);

    Optional<ShareLink> findByPayloadHash(String payloadHash);

    boolean existsByShareCode(String shareCode);

    ShareLink save(ShareLink shareLink);
}
