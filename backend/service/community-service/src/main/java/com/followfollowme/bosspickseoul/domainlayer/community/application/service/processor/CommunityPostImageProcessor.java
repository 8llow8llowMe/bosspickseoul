package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostImageRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPostImage;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import com.followfollowme.bosspickseoul.storage.model.StorageDomain;
import com.followfollowme.bosspickseoul.storage.util.ObjectKeyFactory;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class CommunityPostImageProcessor {

    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final CommunityPostImageRepositoryPort communityPostImageRepositoryPort;

    public List<CommunityPostImage> getImages(long postId) {
        return communityPostImageRepositoryPort.findByPostId(postId);
    }

    public Map<Long, List<CommunityPostImage>> getImagesByPostIds(List<Long> postIds) {
        return communityPostImageRepositoryPort.findByPostIds(postIds);
    }

    /**
     * 게시글의 이미지 목록을 요청받은 키로 교체하고, 더 이상 쓰이지 않는 키를 반환한다.
     *
     * <p>호출부(Facade)가 반환된 키를 커밋 이후에 삭제한다. 여기서 바로 지우면
     * 트랜잭션이 롤백됐을 때 DB 에는 이미지가 남았는데 파일만 사라진 상태가 된다.
     *
     * <p>키 소유권을 반드시 검증한다. 검증이 없으면 남이 올린 파일의 키를 알아내
     * 자기 게시글에 붙일 수 있다.
     */
    @Transactional
    public List<String> replaceImages(long memberId, long postId, List<String> requestedImageKeys) {
        List<String> newImageKeys = normalize(requestedImageKeys);
        newImageKeys.forEach(imageKey ->
            ObjectKeyFactory.validateOwnership(imageKey, StorageDomain.COMMUNITY_POST, memberId));

        List<CommunityPostImage> existingImages = communityPostImageRepositoryPort.findByPostId(postId);
        List<String> removedImageKeys = existingImages.stream()
            .map(CommunityPostImage::imageKey)
            .filter(existingKey -> !newImageKeys.contains(existingKey))
            .toList();

        communityPostImageRepositoryPort.deleteByPostId(postId);
        if (!newImageKeys.isEmpty()) {
            List<CommunityPostImage> images = new ArrayList<>(newImageKeys.size());
            for (int index = 0; index < newImageKeys.size(); index++) {
                images.add(new CommunityPostImage(
                    snowflakeIdGenerator.generateId(), postId, newImageKeys.get(index), index));
            }
            communityPostImageRepositoryPort.saveAll(images);
        }

        return removedImageKeys;
    }

    /** null/빈 값 제거 + 중복 제거. 순서는 요청 순서를 유지한다. */
    private List<String> normalize(List<String> imageKeys) {
        if (imageKeys == null) {
            return List.of();
        }
        return new ArrayList<>(new LinkedHashSet<>(
            imageKeys.stream().filter(key -> key != null && !key.isBlank()).toList()
        ));
    }
}
