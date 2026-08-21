package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.global.properties.RankingProperties;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.config.TopicConfig;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * 인기 순위 이벤트 토픽 선언.
 *
 * <p>Kafka 브로커는 {@code auto.create.topics.enable=false} 로 운영하므로 토픽이 없으면
 * producer 의 send 가 UNKNOWN_TOPIC_OR_PARTITION 으로 실패한다. 발행 실패는 요청 경로를 막지 않도록
 * WARN 로그만 남기고 흡수하기 때문에, 토픽을 만들지 않은 채 켜면 "앱은 정상인데 순위만 안 쌓이는"
 * 조용한 실패가 된다. 그래서 토픽을 코드로 선언해 기동 시 KafkaAdmin 이 만들도록 한다.
 *
 * <p>토픽 생성은 auto-create 설정과 무관한 별도 admin API(CreateTopics)라 브로커 설정을 바꾸지 않아도 된다.
 * 이미 있으면 건너뛰므로 재기동해도 안전하다.
 *
 * <p>브로커가 내려가 있으면 KafkaAdmin 이 오류 로그만 남기고 기동을 막지 않는다
 * ({@code fatalIfBrokerNotAvailable} 기본 false). 즉 "브로커 없이도 기동" 성질은 유지된다.
 * enabled=false 일 때는 NewTopic 빈이 없어 KafkaAdmin 이 브로커 접속을 아예 시도하지 않는다.
 */
@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.ranking", name = "enabled", havingValue = "true")
public class RankingTopicConfig {

    private final RankingProperties rankingProperties;

    @Bean
    public NewTopic analysisViewEventsTopic() {
        // 이벤트는 Redis 집계용 원본이라 순위 집계 창(window-hours)보다 오래 남기면 충분하다.
        // 브로커 기본 보관(7일)을 그대로 쓰면 재처리에 쓰지도 않는 로그가 디스크만 차지한다.
        Duration retention = Duration.ofHours((long) rankingProperties.windowHours() * 2);

        return TopicBuilder.name(rankingProperties.eventsTopic())
            .partitions(rankingProperties.topicPartitions())
            .replicas(rankingProperties.topicReplicas())
            .config(TopicConfig.RETENTION_MS_CONFIG, String.valueOf(retention.toMillis()))
            .build();
    }
}
