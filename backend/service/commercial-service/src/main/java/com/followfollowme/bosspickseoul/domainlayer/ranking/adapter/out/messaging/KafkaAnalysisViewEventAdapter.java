package com.followfollowme.bosspickseoul.domainlayer.ranking.adapter.out.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.port.out.AnalysisViewEventPort;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.model.AnalysisViewEvent;
import com.followfollowme.bosspickseoul.global.properties.RankingProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * 분석 조회 이벤트 Kafka 발행 어댑터.
 *
 * <p>인기 순위는 부가 기능이라 브로커 장애가 분석 API 를 막으면 안 된다.
 * <ul>
 *   <li>send() 는 비동기이며, 브로커 다운 시 블로킹 시간은 producer 의 max.block.ms(yml, 1초)로 제한된다.</li>
 *   <li>발행 실패(브로커 불능, 직렬화 실패 등)는 전부 여기서 흡수하고 WARN 로그만 남긴다.</li>
 *   <li>이 클래스는 어떤 경우에도 호출자에게 예외를 던지지 않는다 (AnalysisViewEventPort 계약).</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.ranking", name = "enabled", havingValue = "true")
public class KafkaAnalysisViewEventAdapter implements AnalysisViewEventPort {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final RankingProperties rankingProperties;
    private final ObjectMapper objectMapper;

    @Override
    public void publish(AnalysisViewEvent event) {
        try {
            String key = event.areaType().name() + ":" + event.areaCode();
            String payload = objectMapper.writeValueAsString(event);

            kafkaTemplate.send(rankingProperties.eventsTopic(), key, payload)
                .whenComplete((result, throwable) -> {
                    if (throwable != null) {
                        log.warn("분석 조회 이벤트 발행에 실패해 이벤트를 버립니다. key={} reason={}", key, throwable.getMessage());
                    }
                });
        } catch (Throwable throwable) {
            log.warn("분석 조회 이벤트 발행 준비에 실패해 이벤트를 버립니다. areaType={} areaCode={} reason={}",
                event.areaType(), event.areaCode(), throwable.getMessage());
        }
    }
}
