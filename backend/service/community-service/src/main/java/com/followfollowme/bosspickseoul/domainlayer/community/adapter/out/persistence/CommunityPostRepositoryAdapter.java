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
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;
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

    @Override
    public Optional<CommunityPost> updateContentIfActive(
        long postId, long memberId, String title, String content, LocalDateTime updatedAt
    ) {
        int updated = communityPostRepository.updateContentIfActive(
            postId, memberId, title, content, updatedAt, CommunityPostStatus.ACTIVE);
        return updated == 0 ? Optional.empty() : findById(postId);
    }

    @Override
    public boolean deleteIfActive(long postId) {
        return communityPostRepository.deleteIfActive(
            postId, CommunityPostStatus.ACTIVE, CommunityPostStatus.DELETED) == 1;
    }

    @Override
    public Optional<CommunityPost> incrementViewCountIfActive(long postId) {
        int updated = communityPostRepository.incrementViewCountIfActive(postId, CommunityPostStatus.ACTIVE);
        return updated == 0 ? Optional.empty() : findById(postId);
    }

    @Override
    public OptionalLong incrementLikeCountIfActive(long postId) {
        return updatedLikeCount(
            postId, communityPostRepository.incrementLikeCountIfActive(postId, CommunityPostStatus.ACTIVE));
    }

    @Override
    public OptionalLong decrementLikeCountIfActive(long postId) {
        return updatedLikeCount(
            postId, communityPostRepository.decrementLikeCountIfActive(postId, CommunityPostStatus.ACTIVE));
    }

    @Override
    public OptionalLong incrementCommentCountIfActive(long postId) {
        return updatedCommentCount(
            postId, communityPostRepository.incrementCommentCountIfActive(postId, CommunityPostStatus.ACTIVE));
    }

    @Override
    public OptionalLong decrementCommentCountIfActive(long postId) {
        return updatedCommentCount(
            postId, communityPostRepository.decrementCommentCountIfActive(postId, CommunityPostStatus.ACTIVE));
    }

    private OptionalLong updatedLikeCount(long postId, int updated) {
        return updated == 0
            ? OptionalLong.empty()
            : findById(postId).stream().mapToLong(CommunityPost::likeCount).findFirst();
    }

    private OptionalLong updatedCommentCount(long postId, int updated) {
        return updated == 0
            ? OptionalLong.empty()
            : findById(postId).stream().mapToLong(CommunityPost::commentCount).findFirst();
    }

    /** Spring Data 의 Slice 를 포트 계약(SliceQueryResult)으로 바꾼다 — 프레임워크 타입은 여기서 멈춘다. */
    private <T> SliceQueryResult<T> toSliceQueryResult(org.springframework.data.domain.Slice<T> slice) {
        return SliceQueryResult.of(slice.getContent(), slice.hasNext());
    }
}
