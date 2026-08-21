package com.followfollowme.bosspickseoul.domainlayer.sharelink.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.service.processor.ShareLinkCleanupProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 만료된 공유 링크 정리 스케줄러.
 *
 * <p>스케줄러는 in-adapter 다. 시간(cron)이 트리거라는 점만 다르고, 애플리케이션 계층을 호출하는
 * 역할은 Controller 와 같다.
 *
 * <p>실패해도 예외를 밖으로 던지지 않는다. 정리 실패는 다음 주기에 다시 시도하면 되고,
 * 스케줄러 스레드에서 예외가 올라가면 이후 실행이 멈출 수 있다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.cleanup.share-link", name = "enabled", havingValue = "true")
public class ShareLinkCleanupScheduler {

    private final ShareLinkCleanupProcessor shareLinkCleanupProcessor;

    @Scheduled(cron = "${app.cleanup.share-link.cron}")
    public void cleanupExpiredShareLinks() {
        try {
            int deleted = shareLinkCleanupProcessor.cleanupExpired();
            if (deleted > 0) {
                log.info("만료된 공유 링크를 정리했습니다. deleted={}", deleted);
            }
        } catch (Exception exception) {
            log.warn("공유 링크 정리에 실패했습니다. 다음 주기에 재시도합니다. reason={}", exception.getMessage());
        }
    }
}
