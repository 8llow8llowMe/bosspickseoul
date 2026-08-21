package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityCommentEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.CommunityCommentRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.CommunityPostImageRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.CommunityPostRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCleanupRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityCleanupRepositoryAdapter implements CommunityCleanupRepositoryPort {

    private final CommunityPostRepository communityPostRepository;
    private final CommunityCommentRepository communityCommentRepository;
    private final CommunityPostImageRepository communityPostImageRepository;

    @Override
    public List<String> hardDeleteExpiredPosts(LocalDateTime threshold, int limit) {
        List<CommunityPostEntity> targets = communityPostRepository.findByStatusAndUpdatedAtBefore(
            CommunityPostStatus.DELETED, threshold, Limit.of(limit));
        if (targets.isEmpty()) {
            return List.of();
        }

        List<Long> postIds = targets.stream().map(CommunityPostEntity::getId).toList();
        // 파일은 호출부가 커밋 이후에 지운다. 여기서 지우면 트랜잭션 롤백 시 파일만 사라진다.
        List<String> imageKeys = communityPostImageRepository.findByPostIdInOrderBySortOrderAsc(postIds).stream()
            .map(image -> image.getImageKey())
            .toList();

        communityPostImageRepository.deleteByPostIdIn(postIds);
        communityPostRepository.deleteAll(targets);
        return imageKeys;
    }

    @Override
    public int hardDeleteExpiredComments(LocalDateTime threshold, int limit) {
        List<CommunityCommentEntity> targets = communityCommentRepository.findByStatusAndUpdatedAtBefore(
            CommunityCommentStatus.DELETED, threshold, Limit.of(limit));
        if (targets.isEmpty()) {
            return 0;
        }
        communityCommentRepository.deleteAll(targets);
        return targets.size();
    }

    @Override
    public List<String> findAllReferencedImageKeys() {
        return communityPostImageRepository.findAllImageKeys();
    }
}
