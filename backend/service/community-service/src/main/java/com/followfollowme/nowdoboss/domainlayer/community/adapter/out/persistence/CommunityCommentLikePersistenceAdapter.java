package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityCommentLikeEntity;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.CommunityCommentLikeRepository;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityCommentLikePort;
import com.followfollowme.nowdoboss.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityCommentLikePersistenceAdapter implements CommunityCommentLikePort {

    private final CommunityCommentLikeRepository communityCommentLikeRepository;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    @Override
    public boolean existsCommentLike(long commentId, long memberId) {
        return communityCommentLikeRepository.existsByCommentIdAndMemberId(commentId, memberId);
    }

    @Override
    public void saveCommentLike(long commentId, long memberId) {
        communityCommentLikeRepository.save(CommunityCommentLikeEntity.builder()
            .id(snowflakeIdGenerator.nextId())
            .commentId(commentId)
            .memberId(memberId)
            .createdAt(LocalDateTime.now())
            .build());
    }

    @Override
    public void deleteCommentLike(long commentId, long memberId) {
        communityCommentLikeRepository.deleteByCommentIdAndMemberId(commentId, memberId);
    }
}
