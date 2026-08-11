package com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.out.persistence.repository.ShareLinkRepository;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.mapper.ShareLinkMapper;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.port.out.ShareLinkRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.out.persistence.entity.ShareLinkEntity;
import com.followfollowme.nowdoboss.domainlayer.sharelink.domain.model.ShareLink;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Limit;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ShareLinkRepositoryAdapter implements ShareLinkRepositoryPort {

    private final ShareLinkRepository shareLinkRepository;
    private final ShareLinkMapper shareLinkMapper;

    @Override
    public Optional<ShareLink> findByShareCode(String shareCode) {
        return shareLinkRepository.findByShareCode(shareCode).map(shareLinkMapper::toDomainFromEntity);
    }

    @Override
    public Optional<ShareLink> findByPayloadHash(String payloadHash) {
        return shareLinkRepository.findByPayloadHash(payloadHash).map(shareLinkMapper::toDomainFromEntity);
    }

    @Override
    public boolean existsByShareCode(String shareCode) {
        return shareLinkRepository.existsByShareCode(shareCode);
    }

    @Override
    public int deleteExpiredBefore(LocalDateTime threshold, int limit) {
        List<ShareLinkEntity> expired = shareLinkRepository.findByExpiresAtBefore(threshold, Limit.of(limit));
        if (expired.isEmpty()) {
            return 0;
        }
        shareLinkRepository.deleteAll(expired);
        return expired.size();
    }

    @Override
    public ShareLink save(ShareLink shareLink) {
        return shareLinkMapper.toDomainFromEntity(
            shareLinkRepository.save(shareLinkMapper.toEntityFromDomain(shareLink))
        );
    }
}
