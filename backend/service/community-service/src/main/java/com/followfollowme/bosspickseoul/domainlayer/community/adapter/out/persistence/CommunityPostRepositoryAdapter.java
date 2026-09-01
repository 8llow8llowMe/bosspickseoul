package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.CommunityPostRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.application.mapper.CommunityMapper;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityBoardPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityFeedCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityLikedPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunitySearchPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.LikedCommunityPost;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.SliceQueryResult;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityPostRepositoryAdapter implements CommunityPostRepositoryPort {

    private final CommunityPostRepository communityPostRepository;
    private final CommunityMapper communityMapper;

    @Override
    public SliceQueryResult<CommunityPost> getBoardPosts(CommunityBoardPostCriteria criteria) {
        return toSliceQueryResult(communityPostRepository.findBoardPostsNoOffset(
            criteria.targetType(),
            criteria.targetCode(),
            CommunityPostStatus.ACTIVE,
            criteria.sortType(),
            criteria.orderType(),
            criteria.lastPostId(),
            criteria.lastLikeCount(),
            criteria.size(),
            criteria.popularSince()
        ).map(communityMapper::toDomainFromEntity));
    }

    @Override
    public SliceQueryResult<CommunityPost> getFeedPosts(CommunityFeedCriteria criteria) {
        return toSliceQueryResult(communityPostRepository.findFeedPostsNoOffset(
            CommunityPostStatus.ACTIVE,
            criteria.sortType(),
            criteria.orderType(),
            criteria.targetType(),
            criteria.targetCode(),
            criteria.lastPostId(),
            criteria.lastLikeCount(),
            criteria.size(),
            criteria.popularSince()
        ).map(communityMapper::toDomainFromEntity));
    }

    @Override
    public SliceQueryResult<LikedCommunityPost> getLikedPosts(CommunityLikedPostCriteria criteria) {
        return toSliceQueryResult(communityPostRepository.findLikedPostsNoOffset(
            criteria.memberId(),
            CommunityPostStatus.ACTIVE,
            criteria.sortType(),
            criteria.orderType(),
            criteria.lastPostId(),
            criteria.lastLikeCount(),
            criteria.size(),
            criteria.popularSince()
        ).map(entity -> new LikedCommunityPost(communityMapper.toDomainFromEntity(entity), null)));
    }

    @Override
    public SliceQueryResult<CommunityPost> searchPosts(CommunitySearchPostCriteria criteria) {
        return toSliceQueryResult(communityPostRepository.findSearchPostsNoOffset(
            criteria.keyword(),
            CommunityPostStatus.ACTIVE,
            criteria.sortType(),
            criteria.orderType(),
            criteria.lastPostId(),
            criteria.lastLikeCount(),
            criteria.size(),
            criteria.popularSince()
        ).map(communityMapper::toDomainFromEntity));
    }

    @Override
    public Optional<CommunityPost> findById(long postId) {
        return communityPostRepository.findById(postId).map(communityMapper::toDomainFromEntity);
    }

    @Override
    public List<CommunityPost> findAllByIds(Collection<Long> postIds) {
        if (postIds.isEmpty()) {
            return List.of();
        }
        return communityPostRepository.findAllById(postIds).stream()
            .map(communityMapper::toDomainFromEntity)
            .toList();
    }

    @Override
    public CommunityPost save(CommunityPost post) {
        return communityMapper.toDomainFromEntity(
            communityPostRepository.save(communityMapper.toEntityFromDomain(post))
        );
    }

    /** Spring Data 의 Slice 를 포트 계약(SliceQueryResult)으로 바꾼다 — 프레임워크 타입은 여기서 멈춘다. */
    private <T> SliceQueryResult<T> toSliceQueryResult(org.springframework.data.domain.Slice<T> slice) {
        return SliceQueryResult.of(slice.getContent(), slice.hasNext());
    }
}
