package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.CommunityCommentLikeRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.application.mapper.CommunityReactionMapper;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityCommentLike;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityCommentLikeRepositoryAdapter implements CommunityCommentLikeRepositoryPort {

    private final CommunityCommentLikeRepository communityCommentLikeRepository;
    private final CommunityReactionMapper communityReactionMapper;

    @Override
    public boolean exists(long commentId, long memberId) {
        return communityCommentLikeRepository.existsByCommentIdAndMemberId(commentId, memberId);
    }

    @Override
    public CommunityCommentLike save(CommunityCommentLike like) {
        return communityReactionMapper.toDomainFromEntity(
            communityCommentLikeRepository.save(communityReactionMapper.toEntityFromDomain(like))
        );
    }

    @Override
    public boolean delete(long commentId, long memberId) {
        return communityCommentLikeRepository.deleteByCommentIdAndMemberId(commentId, memberId) == 1;
    }
}
