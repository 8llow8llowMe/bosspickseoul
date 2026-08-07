package com.followfollowme.nowdoboss.domainlayer.ranking.adapter.out.messaging;

import static org.assertj.core.api.Assertions.assertThatCode;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.model.AnalysisViewEvent;
import com.followfollowme.nowdoboss.global.properties.RankingProperties;
import java.time.LocalDateTime;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.SendResult;
import java.util.concurrent.CompletableFuture;

/**
 * 핵심 계약 검증: Kafka 가 어떤 방식으로 실패해도 publish() 는 호출자에게 예외를 던지지 않는다.
 * (인기 순위는 부가 기능 — 발행 실패가 분석 API 응답을 막으면 안 된다)
 */
class KafkaAnalysisViewEventAdapterTest {

    private final RankingProperties properties = new RankingProperties(true, "bosspick.analysis-events", 24, 50);
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private AnalysisViewEvent event() {
        return new AnalysisViewEvent(AnalysisAreaType.COMMERCIAL, "3110008", null, LocalDateTime.now());
    }

    @Test
    void publish_doesNotThrowWhenSendThrowsSynchronously() {
        KafkaTemplate<String, String> throwingTemplate = new KafkaTemplate<>(new StubProducerFactory()) {
            @Override
            public CompletableFuture<SendResult<String, String>> send(String topic, String key, String data) {
                throw new IllegalStateException("브로커 메타데이터 조회 실패 (max.block.ms 초과)");
            }
        };
        KafkaAnalysisViewEventAdapter adapter = new KafkaAnalysisViewEventAdapter(throwingTemplate, properties, objectMapper);

        assertThatCode(() -> adapter.publish(event())).doesNotThrowAnyException();
    }

    @Test
    void publish_doesNotThrowWhenSendFailsAsynchronously() {
        KafkaTemplate<String, String> failingTemplate = new KafkaTemplate<>(new StubProducerFactory()) {
            @Override
            public CompletableFuture<SendResult<String, String>> send(String topic, String key, String data) {
                return CompletableFuture.failedFuture(new IllegalStateException("전송 타임아웃"));
            }
        };
        KafkaAnalysisViewEventAdapter adapter = new KafkaAnalysisViewEventAdapter(failingTemplate, properties, objectMapper);

        assertThatCode(() -> adapter.publish(event())).doesNotThrowAnyException();
    }

    @Test
    void publish_doesNotThrowOnSuccess() {
        KafkaTemplate<String, String> succeedingTemplate = new KafkaTemplate<>(new StubProducerFactory()) {
            @Override
            public CompletableFuture<SendResult<String, String>> send(String topic, String key, String data) {
                return CompletableFuture.completedFuture(
                    new SendResult<>(new ProducerRecord<>(topic, key, data), null));
            }
        };
        KafkaAnalysisViewEventAdapter adapter = new KafkaAnalysisViewEventAdapter(succeedingTemplate, properties, objectMapper);

        assertThatCode(() -> adapter.publish(event())).doesNotThrowAnyException();
    }

    /** KafkaTemplate 생성용 스텁 — send 를 전부 오버라이드하므로 실제 producer 는 만들어지지 않는다. */
    private static class StubProducerFactory implements ProducerFactory<String, String> {

        @Override
        public org.apache.kafka.clients.producer.Producer<String, String> createProducer() {
            throw new UnsupportedOperationException("테스트에서는 실제 producer 를 생성하지 않는다");
        }
    }
}
