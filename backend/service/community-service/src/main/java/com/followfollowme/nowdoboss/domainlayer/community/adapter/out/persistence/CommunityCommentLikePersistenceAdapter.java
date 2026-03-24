package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.CommunityCommentLikeRepository;
import com.followfollowme.nowdoboss.domainlayer.community.application.mapper.CommunityReactionMapper;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityCommentLikePort;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityCommentLike;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityCommentLikePersistenceAdapter implements CommunityCommentLikePort {

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
    public void delete(long commentId, long memberId) {
        communityCommentLikeRepository.deleteByCommentIdAndMemberId(commentId, memberId);
    }
}
