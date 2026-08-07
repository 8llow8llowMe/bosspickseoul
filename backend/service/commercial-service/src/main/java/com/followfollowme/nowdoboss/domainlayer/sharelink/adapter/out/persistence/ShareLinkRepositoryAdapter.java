package com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.out.persistence.repository.ShareLinkRepository;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.mapper.ShareLinkMapper;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.port.out.ShareLinkRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.sharelink.domain.model.ShareLink;
import java.util.Optional;
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
    public ShareLink save(ShareLink shareLink) {
        return shareLinkMapper.toDomainFromEntity(
            shareLinkRepository.save(shareLinkMapper.toEntityFromDomain(shareLink))
        );
    }
}
