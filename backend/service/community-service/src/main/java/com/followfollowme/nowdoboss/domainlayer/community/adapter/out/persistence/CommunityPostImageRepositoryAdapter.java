package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostImageEntity;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.CommunityPostImageRepository;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.out.CommunityPostImageRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPostImage;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityPostImageRepositoryAdapter implements CommunityPostImageRepositoryPort {

    private final CommunityPostImageRepository communityPostImageRepository;

    @Override
    public List<CommunityPostImage> findByPostId(long postId) {
        return communityPostImageRepository.findByPostIdOrderBySortOrderAsc(postId).stream()
            .map(this::toDomain)
            .toList();
    }

    @Override
    public Map<Long, List<CommunityPostImage>> findByPostIds(List<Long> postIds) {
        if (postIds == null || postIds.isEmpty()) {
            return Map.of();
        }
        return communityPostImageRepository.findByPostIdInOrderBySortOrderAsc(postIds).stream()
            .map(this::toDomain)
            .collect(Collectors.groupingBy(CommunityPostImage::postId));
    }

    @Override
    public List<CommunityPostImage> saveAll(List<CommunityPostImage> images) {
        List<CommunityPostImageEntity> entities = images.stream().map(this::toEntity).toList();
        return communityPostImageRepository.saveAll(entities).stream().map(this::toDomain).toList();
    }

    @Override
    public void deleteByPostId(long postId) {
        communityPostImageRepository.deleteByPostId(postId);
    }

    private CommunityPostImage toDomain(CommunityPostImageEntity entity) {
        return new CommunityPostImage(entity.getId(), entity.getPostId(), entity.getImageKey(), entity.getSortOrder());
    }

    private CommunityPostImageEntity toEntity(CommunityPostImage image) {
        return CommunityPostImageEntity.builder()
            .id(image.id())
            .postId(image.postId())
            .imageKey(image.imageKey())
            .sortOrder(image.sortOrder())
            .build();
    }
}
