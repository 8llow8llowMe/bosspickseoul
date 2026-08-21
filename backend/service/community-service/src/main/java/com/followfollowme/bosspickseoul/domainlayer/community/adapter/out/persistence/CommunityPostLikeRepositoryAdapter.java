package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.CommunityPostLikeRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.application.mapper.CommunityReactionMapper;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPostLike;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityPostLikeRepositoryAdapter implements CommunityPostLikeRepositoryPort {

    private final CommunityPostLikeRepository communityPostLikeRepository;
    private final CommunityReactionMapper communityReactionMapper;

    @Override
    public boolean exists(long postId, long memberId) {
        return communityPostLikeRepository.existsByPostIdAndMemberId(postId, memberId);
    }

    @Override
    public CommunityPostLike save(CommunityPostLike like) {
        return communityReactionMapper.toDomainFromEntity(
            communityPostLikeRepository.save(communityReactionMapper.toEntityFromDomain(like))
        );
    }

    @Override
    public void delete(long postId, long memberId) {
        communityPostLikeRepository.deleteByPostIdAndMemberId(postId, memberId);
    }
}
