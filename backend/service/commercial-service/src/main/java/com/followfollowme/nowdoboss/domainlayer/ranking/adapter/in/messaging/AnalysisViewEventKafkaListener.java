package com.followfollowme.nowdoboss.domainlayer.ranking.adapter.in.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.service.processor.RankingCommandProcessor;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.model.AnalysisViewEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * 분석 조회 이벤트 컨슈머.
 *
 * <p>app.ranking.enabled=true 일 때만 등록된다. 브로커가 내려가 있어도
 * spring-kafka 리스너 컨테이너가 백그라운드에서 재연결만 반복할 뿐 앱 기동/서빙에는 영향이 없다.
 * 해석 불가/집계 실패 이벤트는 로그만 남기고 건너뛴다 (poison message 재시도 루프 방지).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.ranking", name = "enabled", havingValue = "true")
public class AnalysisViewEventKafkaListener {

    private final RankingCommandProcessor rankingCommandProcessor;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "${app.ranking.events-topic}", groupId = "${spring.kafka.consumer.group-id}")
    public void onAnalysisViewEvent(String payload) {
        AnalysisViewEvent event;
        try {
            event = objectMapper.readValue(payload, AnalysisViewEvent.class);
        } catch (Exception exception) {
            log.warn("분석 조회 이벤트를 해석할 수 없어 건너뜁니다. payload={} reason={}", payload, exception.getMessage());
            return;
        }

        try {
            rankingCommandProcessor.recordView(event);
        } catch (Exception exception) {
            log.warn("분석 조회 이벤트 집계에 실패해 건너뜁니다. areaType={} areaCode={} reason={}",
                event.areaType(), event.areaCode(), exception.getMessage());
        }
    }
}
