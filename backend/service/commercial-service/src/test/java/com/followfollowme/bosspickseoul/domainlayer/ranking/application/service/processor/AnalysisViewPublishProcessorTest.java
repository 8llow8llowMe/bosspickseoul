package com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.model.AnalysisViewEvent;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 조회 이벤트 발행이 Processor 로 내려오면서 시각을 고정할 수 있게 됐는지 못 박는다.
 *
 * <p>예전에는 세 Facade 가 {@code LocalDateTime.now()} 로 직접 시각을 만들어 테스트에서 고정할
 * 수단이 없었다. 지금은 {@link Clock} 을 주입받으므로 발행 시각이 결정적이다.
 */
class AnalysisViewPublishProcessorTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Test
    @DisplayName("주입된 Clock 기준으로 발행 시각이 정해진다")
    void publishesWithInjectedClockTime() {
        List<AnalysisViewEvent> published = new ArrayList<>();
        Instant fixedInstant = Instant.parse("2026-09-11T01:23:45Z");
        AnalysisViewPublishProcessor processor = new AnalysisViewPublishProcessor(
            published::add, Clock.fixed(fixedInstant, SEOUL));

        processor.publishView(AnalysisAreaType.DISTRICT, "11680", "강남구");

        assertThat(published).hasSize(1);
        AnalysisViewEvent event = published.get(0);
        assertThat(event.areaType()).isEqualTo(AnalysisAreaType.DISTRICT);
        assertThat(event.areaCode()).isEqualTo("11680");
        assertThat(event.areaName()).isEqualTo("강남구");
        assertThat(event.occurredAt()).isEqualTo(LocalDateTime.ofInstant(fixedInstant, SEOUL));
    }

    @Test
    @DisplayName("지역 이름이 없어도 그대로 발행한다")
    void publishesWithNullAreaName() {
        List<AnalysisViewEvent> published = new ArrayList<>();
        AnalysisViewPublishProcessor processor = new AnalysisViewPublishProcessor(
            published::add, Clock.fixed(Instant.parse("2026-09-11T01:23:45Z"), SEOUL));

        processor.publishView(AnalysisAreaType.COMMERCIAL, "3110001", null);

        assertThat(published).hasSize(1);
        assertThat(published.get(0).areaName()).isNull();
    }

}
