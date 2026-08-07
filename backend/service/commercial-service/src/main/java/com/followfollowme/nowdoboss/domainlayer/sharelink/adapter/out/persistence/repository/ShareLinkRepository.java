package com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.out.persistence.entity.ShareLinkEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShareLinkRepository extends JpaRepository<ShareLinkEntity, Long> {

    Optional<ShareLinkEntity> findByShareCode(String shareCode);

    Optional<ShareLinkEntity> findByPayloadHash(String payloadHash);

    boolean existsByShareCode(String shareCode);
}
