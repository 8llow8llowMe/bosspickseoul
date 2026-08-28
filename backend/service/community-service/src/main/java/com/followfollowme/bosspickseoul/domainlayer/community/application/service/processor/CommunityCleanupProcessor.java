package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCleanupRepositoryPort;
import com.followfollowme.bosspickseoul.global.properties.CommunityCleanupProperties;
import com.followfollowme.bosspickseoul.storage.client.ObjectStorageClient;
import com.followfollowme.bosspickseoul.storage.model.StorageDomain;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class CommunityCleanupProcessor {

    private final CommunityCleanupRepositoryPort communityCleanupRepositoryPort;
    private final CommunityCleanupProperties cleanupProperties;
    private final ObjectStorageClient objectStorageClient;

    /**
     * 소프트 삭제 후 보존 기간이 지난 게시글을 하드 삭제한다. 딸린 이미지 파일도 함께 회수한다.
     *
     * @return 삭제된 이미지 파일 수
     */
    @Transactional
    public int cleanupDeletedPosts() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(cleanupProperties.retentionDays());
        List<String> imageKeys = communityCleanupRepositoryPort.hardDeleteExpiredPosts(
            threshold, cleanupProperties.batchSize());
        // 커밋 이후에 지운다. 트랜잭션이 롤백되면 게시글은 살아 있는데 파일만 사라진다.
        objectStorageClient.deleteAllAfterCommit(imageKeys);
        return imageKeys.size();
    }

    @Transactional
    public int cleanupDeletedComments() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(cleanupProperties.retentionDays());
        return communityCleanupRepositoryPort.hardDeleteExpiredComments(threshold, cleanupProperties.batchSize());
    }

    /**
     * 어느 게시글에도 연결되지 않은 이미지 객체를 회수한다.
     *
     * <p>업로드 API 는 키만 발급하고 게시글 작성 시점에 연결하므로, 업로드만 하고 글을 쓰지 않으면
     * 객체가 영구히 남는다. 이 정리가 그 경로를 회수한다.
     *
     * <p><b>나이 조건이 안전장치다.</b> 방금 업로드해 아직 연결되지 않은 객체를 지우면 사용자가
     * 작성 중인 글의 이미지가 사라진다. {@code orphanMinAgeHours} 보다 오래된 객체만 대상으로 삼는다.
     *
     * <p>읽기 전용 트랜잭션으로 참조 키를 모은 뒤 파일만 지우므로 DB 쓰기는 없다.
     */
    @Transactional(readOnly = true)
    public int cleanupOrphanImages() {
        List<String> candidates = objectStorageClient.listObjectKeysOlderThan(
            StorageDomain.COMMUNITY_POST.prefix() + "/", Duration.ofHours(cleanupProperties.orphanMinAgeHours()));
        if (candidates.isEmpty()) {
            return 0;
        }

        // 참조 여부는 한 번에 모아 와서 메모리에서 판정한다. 후보마다 조회하면 후보 수만큼 왕복이 생긴다.
        Set<String> referenced = new HashSet<>(communityCleanupRepositoryPort.findAllReferencedImageKeys());
        int deleted = 0;
        // 삭제만 키 단위로 반복한다. 오브젝트 스토리지는 호출 단위가 객체 하나라 묶을 수 없다 (N+1 아님).
        for (String candidate : candidates) {
            if (referenced.contains(candidate)) {
                continue;
            }
            objectStorageClient.deleteQuietly(candidate);
            deleted++;
        }
        return deleted;
    }
}
