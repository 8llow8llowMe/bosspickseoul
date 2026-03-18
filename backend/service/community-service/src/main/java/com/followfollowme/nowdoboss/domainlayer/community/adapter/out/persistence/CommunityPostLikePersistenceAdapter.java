package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostLikeEntity;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.CommunityPostLikeRepository;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityPostLikePort;
import com.followfollowme.nowdoboss.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityPostLikePersistenceAdapter implements CommunityPostLikePort {

    private final CommunityPostLikeRepository communityPostLikeRepository;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    @Override
    public boolean exists(long postId, long memberId) {
        return communityPostLikeRepository.existsByPostIdAndMemberId(postId, memberId);
    }

    @Override
    public void save(long postId, long memberId) {
        communityPostLikeRepository.save(CommunityPostLikeEntity.builder()
            .id(snowflakeIdGenerator.nextId())
            .postId(postId)
            .memberId(memberId)
            .createdAt(LocalDateTime.now())
            .build());
    }

    @Override
    public void delete(long postId, long memberId) {
        communityPostLikeRepository.deleteByPostIdAndMemberId(postId, memberId);
    }
}
