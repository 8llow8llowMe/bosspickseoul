package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.CommunityPostRepository;
import com.followfollowme.nowdoboss.domainlayer.community.application.mapper.CommunityMapper;
import com.followfollowme.nowdoboss.domainlayer.community.application.model.CommunityBoardPostCriteria;
import com.followfollowme.nowdoboss.domainlayer.community.application.model.CommunityFeedCriteria;
import com.followfollowme.nowdoboss.domainlayer.community.application.model.CommunityLikedPostCriteria;
import com.followfollowme.nowdoboss.domainlayer.community.application.model.CommunitySearchPostCriteria;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.LikedCommunityPost;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityPostRepositoryAdapter implements CommunityPostRepositoryPort {

    private final CommunityPostRepository communityPostRepository;
    private final CommunityMapper communityMapper;

    @Override
    public Slice<CommunityPost> getBoardPosts(CommunityBoardPostCriteria criteria) {
        return communityPostRepository.findBoardPostsNoOffset(
            criteria.targetType(),
            criteria.targetCode(),
            CommunityPostStatus.ACTIVE,
            criteria.sortType(),
            criteria.orderType(),
            criteria.lastPostId(),
            criteria.lastLikeCount(),
            criteria.size(),
            criteria.popularSince()
        ).map(communityMapper::toDomainFromEntity);
    }

    @Override
    public Slice<CommunityPost> getFeedPosts(CommunityFeedCriteria criteria) {
        return communityPostRepository.findFeedPostsNoOffset(
            CommunityPostStatus.ACTIVE,
            criteria.sortType(),
            criteria.orderType(),
            criteria.targetType(),
            criteria.targetCode(),
            criteria.lastPostId(),
            criteria.lastLikeCount(),
            criteria.size(),
            criteria.popularSince()
        ).map(communityMapper::toDomainFromEntity);
    }

    @Override
    public Slice<LikedCommunityPost> getLikedPosts(CommunityLikedPostCriteria criteria) {
        return communityPostRepository.findLikedPostsNoOffset(
            criteria.memberId(),
            CommunityPostStatus.ACTIVE,
            criteria.sortType(),
            criteria.orderType(),
            criteria.lastPostId(),
            criteria.lastLikeCount(),
            criteria.size(),
            criteria.popularSince()
        ).map(entity -> new LikedCommunityPost(communityMapper.toDomainFromEntity(entity), null));
    }

    @Override
    public Slice<CommunityPost> searchPosts(CommunitySearchPostCriteria criteria) {
        return communityPostRepository.findSearchPostsNoOffset(
            criteria.keyword(),
            CommunityPostStatus.ACTIVE,
            criteria.sortType(),
            criteria.orderType(),
            criteria.lastPostId(),
            criteria.lastLikeCount(),
            criteria.size(),
            criteria.popularSince()
        ).map(communityMapper::toDomainFromEntity);
    }

    @Override
    public Optional<CommunityPost> findById(long postId) {
        return communityPostRepository.findById(postId).map(communityMapper::toDomainFromEntity);
    }

    @Override
    public CommunityPost save(CommunityPost post) {
        return communityMapper.toDomainFromEntity(
            communityPostRepository.save(communityMapper.toEntityFromDomain(post))
        );
    }
}