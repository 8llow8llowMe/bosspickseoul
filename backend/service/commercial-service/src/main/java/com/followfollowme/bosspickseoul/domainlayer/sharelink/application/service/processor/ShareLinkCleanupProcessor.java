package com.followfollowme.bosspickseoul.domainlayer.sharelink.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.port.out.ShareLinkRepositoryPort;
import com.followfollowme.bosspickseoul.global.properties.CleanupProperties;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class ShareLinkCleanupProcessor {

    private final ShareLinkRepositoryPort shareLinkRepositoryPort;
    private final CleanupProperties cleanupProperties;

    /**
     * 만료 후 유예 기간이 지난 공유 링크를 삭제하고 삭제 건수를 반환한다.
     *
     * <p>만료 즉시 지우지 않는 이유는, 만료 직후 접근하는 사용자에게 "만료된 링크"(410)로 안내해야 하기 때문이다.
     * 행이 사라지면 404(존재하지 않는 링크)가 되어 사용자가 원인을 오해한다.
     */
    @Transactional
    public int cleanupExpired() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(cleanupProperties.retentionDays());
        return shareLinkRepositoryPort.deleteExpiredBefore(threshold, cleanupProperties.batchSize());
    }
}
