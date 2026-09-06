package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.CommunityCommentRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.application.mapper.CommunityMapper;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import java.util.List;
import java.util.Collection;
import java.util.Optional;
import java.util.OptionalLong;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityCommentRepositoryAdapter implements CommunityCommentRepositoryPort {

    private final CommunityCommentRepository communityCommentRepository;
    private final CommunityMapper communityMapper;

    @Override
    public List<CommunityComment> getComments(long postId) {
        return communityMapper.toCommentDomainListFromEntityList(
            communityCommentRepository.findByPostIdAndStatusOrderByCreatedAtAsc(postId, CommunityCommentStatus.ACTIVE)
        );
    }

    @Override
    public Optional<CommunityComment> findById(long commentId) {
        return communityCommentRepository.findById(commentId).map(communityMapper::toDomainFromEntity);
    }

    @Override
    public List<CommunityComment> findAllByIds(Collection<Long> commentIds) {
        if (commentIds.isEmpty()) {
            return List.of();
        }
        return communityCommentRepository.findAllById(commentIds).stream()
            .map(communityMapper::toDomainFromEntity)
            .toList();
    }

    @Override
    public CommunityComment save(CommunityComment comment) {
        return communityMapper.toDomainFromEntity(
            communityCommentRepository.save(communityMapper.toEntityFromDomain(comment))
        );
    }

    @Override
    public boolean deleteIfActive(long commentId) {
        return communityCommentRepository.deleteIfActive(
            commentId, CommunityCommentStatus.ACTIVE, CommunityCommentStatus.DELETED) == 1;
    }

    @Override
    public OptionalLong incrementLikeCountIfActive(long commentId) {
        int updated = communityCommentRepository.incrementLikeCountIfActive(
            commentId, CommunityCommentStatus.ACTIVE);
        return updatedLikeCount(commentId, updated);
    }

    @Override
    public OptionalLong decrementLikeCountIfActive(long commentId) {
        int updated = communityCommentRepository.decrementLikeCountIfActive(
            commentId, CommunityCommentStatus.ACTIVE);
        return updatedLikeCount(commentId, updated);
    }

    private OptionalLong updatedLikeCount(long commentId, int updated) {
        return updated == 0
            ? OptionalLong.empty()
            : findById(commentId).stream().mapToLong(CommunityComment::likeCount).findFirst();
    }
}
