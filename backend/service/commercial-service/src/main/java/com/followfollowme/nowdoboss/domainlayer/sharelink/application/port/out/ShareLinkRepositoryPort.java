package com.followfollowme.nowdoboss.domainlayer.sharelink.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.sharelink.domain.model.ShareLink;
import java.time.LocalDateTime;
import java.util.Optional;

public interface ShareLinkRepositoryPort {

    Optional<ShareLink> findByShareCode(String shareCode);

    Optional<ShareLink> findByPayloadHash(String payloadHash);

    boolean existsByShareCode(String shareCode);

    ShareLink save(ShareLink shareLink);

    /**
     * 만료 후 유예 기간이 지난 행을 최대 {@code limit} 건 삭제하고 삭제 건수를 반환한다.
     * 정리 배치가 사용한다.
     */
    int deleteExpiredBefore(LocalDateTime threshold, int limit);
}
