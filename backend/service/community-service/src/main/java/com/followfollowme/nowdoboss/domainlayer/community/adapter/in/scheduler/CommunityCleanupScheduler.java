package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.scheduler;

import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.CommunityCleanupProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 커뮤니티 정리 스케줄러 (소프트 삭제 행 하드 삭제 + 미참조 이미지 객체 회수).
 *
 * <p>각 작업을 개별 try-catch 로 감싼다. 하나가 실패해도 나머지는 수행되어야 하고,
 * 스케줄러 스레드로 예외가 올라가면 이후 실행이 멈출 수 있기 때문이다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.cleanup.community", name = "enabled", havingValue = "true")
public class CommunityCleanupScheduler {

    private final CommunityCleanupProcessor communityCleanupProcessor;

    @Scheduled(cron = "${app.cleanup.community.cron}")
    public void cleanup() {
        runQuietly("삭제된 게시글", communityCleanupProcessor::cleanupDeletedPosts);
        runQuietly("삭제된 댓글", communityCleanupProcessor::cleanupDeletedComments);
        runQuietly("미참조 이미지 객체", communityCleanupProcessor::cleanupOrphanImages);
    }

    private void runQuietly(String label, CleanupTask task) {
        try {
            int affected = task.run();
            if (affected > 0) {
                log.info("{} 정리 완료. affected={}", label, affected);
            }
        } catch (Exception exception) {
            log.warn("{} 정리에 실패했습니다. 다음 주기에 재시도합니다. reason={}", label, exception.getMessage());
        }
    }

    @FunctionalInterface
    private interface CleanupTask {

        int run();
    }
}
