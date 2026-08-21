package com.followfollowme.bosspickseoul.domainlayer.ranking.adapter.out.messaging;

import com.followfollowme.bosspickseoul.domainlayer.ranking.application.port.out.AnalysisViewEventPort;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.model.AnalysisViewEvent;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 랭킹 파이프라인이 꺼져 있을 때(app.ranking.enabled=false, 기본값)의 발행 어댑터.
 * Kafka 없이도 분석 API 호출부가 그대로 동작하도록 이벤트를 조용히 버린다.
 */
@Component
@ConditionalOnProperty(prefix = "app.ranking", name = "enabled", havingValue = "false", matchIfMissing = true)
public class NoOpAnalysisViewEventAdapter implements AnalysisViewEventPort {

    @Override
    public void publish(AnalysisViewEvent event) {
        // 의도된 no-op
    }
}
