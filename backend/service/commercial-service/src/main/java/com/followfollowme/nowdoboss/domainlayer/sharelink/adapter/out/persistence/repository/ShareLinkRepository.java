package com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.out.persistence.entity.ShareLinkEntity;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShareLinkRepository extends JpaRepository<ShareLinkEntity, Long> {

    Optional<ShareLinkEntity> findByShareCode(String shareCode);

    Optional<ShareLinkEntity> findByPayloadHash(String payloadHash);

    boolean existsByShareCode(String shareCode);

    /** 만료 정리 배치용. 한 주기에 지울 만큼만 끊어 읽어 대량 삭제로 락이 길어지는 것을 막는다. */
    List<ShareLinkEntity> findByExpiresAtBefore(LocalDateTime threshold, Limit limit);
}
